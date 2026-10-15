import express from 'express';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateFallbackQuestions(
  mapel: string,
  jenjang: string,
  topik: string | string[],
  jumlah: number,
  tipeSoal: string,
  tingkatKesulitan: string,
  stimulusText?: string
) {
  const result: any[] = [];
  const typesPool =
    tipeSoal === 'CAMPURAN'
      ? ['PG', 'PGK', 'BS', 'ISIAN', 'URAIAN']
      : [tipeSoal];

  const cleanMapel = mapel || 'Mata Pelajaran';
  const rawTopik = Array.isArray(topik) ? topik.join(', ') : (topik || 'Konsep Dasar');
  const topicsList = rawTopik
    .split(/[,;\n]+/)
    .map((t: string) => t.trim())
    .filter(Boolean);
  const activeTopics = topicsList.length > 0 ? topicsList : ['Konsep Dasar'];

  const hasStimulus = stimulusText && stimulusText.trim().length > 10;
  const stimulusPrefix = hasStimulus
    ? `[Berdasarkan Wacana: "${stimulusText!.trim().slice(0, 80)}..."]\n\n`
    : '';

  const pgTemplates = [
    {
      q: (t: string, m: string, j: string) =>
        `Manakah pernyataan yang paling tepat menggambarkan karakteristik utama dari "${t}" pada materi ${m} (${j})?`,
      opts: (t: string) => [
        `Memahami prinsip dasar serta fungsi terapan dari ${t} secara komprehensif`,
        `Hanya menghafalkan rumus tanpa memahami hubungan sebab-akibat`,
        `Mengabaikan keterkaitan antara pengamatan fakta dan kesimpulan`,
        `Membatasi penalaran pada satu sudut pandang tanpa verifikasi data`,
      ],
      ans: 'A',
      exp: (t: string) =>
        `Pilihan A tepat karena mencakup pemahaman prinsip dan aplikasi nyata materi ${t}.`,
    },
    {
      q: (t: string, m: string, j: string) =>
        `Dalam situasi nyata di lingkungan sekolah atau masyarakat, penerapan konsep "${t}" paling tepat dicontohkan oleh kegiatan...`,
      opts: (t: string) => [
        `Memanfaatkan prinsip ${t} untuk mengatasi hambatan kegiatan bersama secara efektif`,
        `Menghindari keterlibatan dalam perencanaan maupun evaluasi kelompok`,
        `Menyelesaikan persoalan secara tergesa-gesa tanpa memperhatikan pedoman`,
        `Mengambil keputusan berdasarkan dugaan tanpa rujukan data yang valid`,
      ],
      ans: 'A',
      exp: (t: string) =>
        `Pilihan A merupakan wujud penerapan kontekstual dari ${t} dalam kehidupan sehari-hari.`,
    },
    {
      q: (t: string, m: string, _j: string) =>
        `Seorang siswa melakukan penyelidikan terkait fenomena "${t}". Langkah pertama yang paling kritis dan sistematis untuk dilakukan adalah...`,
      opts: (t: string) => [
        `Mengidentifikasi masalah dan merumuskan pertanyaan penyelidikan tentang ${t}`,
        `Langsung menarik simpulan tanpa mengumpulkan data pendukung`,
        `Menyalin hasil temuan orang lain tanpa melakukan uji kebenaran`,
        `Mengubah data agar sesuai dengan dugaan awal sebelum diuji`,
      ],
      ans: 'A',
      exp: (_t: string) =>
        `Langkah awal metode ilmiah yang benar adalah identifikasi masalah dan perumusan pertanyaan.`,
    },
  ];

  for (let i = 0; i < jumlah; i++) {
    const qType = typesPool[i % typesPool.length];
    const cleanTopik = activeTopics[i % activeTopics.length];
    const isHots =
      tingkatKesulitan === 'HOTS'
        ? true
        : tingkatKesulitan === 'REGULER'
        ? false
        : i % 2 === 1;

    const diff = isHots ? 'HOTS' : 'REGULER';
    const id = `q-ai-fallback-${Date.now()}-${i + 1}-${Math.floor(100 + Math.random() * 900)}`;

    if (qType === 'PG') {
      const tmpl = pgTemplates[i % pgTemplates.length];
      result.push({
        id,
        tipe: 'PG',
        difficulty: diff,
        content: `${stimulusPrefix}${tmpl.q(cleanTopik, cleanMapel, jenjang)}`,
        image: null,
        options: tmpl.opts(cleanTopik),
        answer: tmpl.ans,
        explanation: tmpl.exp(cleanTopik),
      });
    } else if (qType === 'PGK') {
      result.push({
        id,
        tipe: 'PGK',
        difficulty: 'HOTS',
        content: `${stimulusPrefix}Perhatikan kajian tentang materi "${cleanTopik}". Pilihlah DUA pernyataan yang benar dan logis dalam menganalisis fenomena tersebut!`,
        image: null,
        options: [
          `Pemahaman mendalam mengenai kaidah ${cleanTopik} mempermudah pemecahan masalah terapan`,
          `Data yang dikumpulkan harus diuji keabsahan dan konsistensinya sebelum ditarik simpulan`,
          `Hasil analisis tidak memerlukan verifikasi atau pembandingan dengan teori yang relevan`,
          `Setiap simpulan dapat dibuat tanpa memerlukan bukti konkret atau pengamatan terukur`,
        ],
        answer: ['A', 'B'],
        explanation: `Pernyataan A dan B adalah dua kaidah ilmiah yang benar dalam mendalami materi ${cleanTopik}.`,
      });
    } else if (qType === 'BS') {
      const isTrue = i % 2 === 0;
      result.push({
        id,
        tipe: 'BS',
        difficulty: diff,
        content: isTrue
          ? `${stimulusPrefix}Dalam konsep materi "${cleanTopik}" (${cleanMapel}), penerapan prosedur ilmiah yang sistematis akan menghasilkan solusi yang valid dan dapat dipertanggungjawabkan.`
          : `${stimulusPrefix}Pada materi "${cleanTopik}", seluruh permasalahan dapat diselesaikan dengan mengabaikan data empiris dan fakta objektif.`,
        image: null,
        options: ['Benar', 'Salah'],
        answer: isTrue ? 'Benar' : 'Salah',
        explanation: isTrue
          ? `Pernyataan bernilai BENAR karena metode ilmiah yang sistematis merupakan fondasi materi ${cleanTopik}.`
          : `Pernyataan bernilai SALAH karena setiap analisis ilmiah wajib berlandaskan data dan fakta objektif.`,
      });
    } else if (qType === 'ISIAN') {
      result.push({
        id,
        tipe: 'ISIAN',
        difficulty: diff,
        content: `${stimulusPrefix}Sebutkan istilah ilmiah atau kata kunci utama yang mendasari proses pada pembelajaran materi "${cleanTopik}"!`,
        image: null,
        options: [],
        answer: cleanTopik.toLowerCase().split(' ')[0] || 'konsep dasar',
        explanation: `Kata kunci utama yang dicari berkaitan langsung dengan materi pokok ${cleanTopik}.`,
      });
    } else {
      // URAIAN
      result.push({
        id,
        tipe: 'URAIAN',
        difficulty: 'HOTS',
        content: `${stimulusPrefix}Jelaskan secara komprehensif bagaimana prinsip "${cleanTopik}" dapat diterapkan untuk menyelesaikan permasalahan nyata pada lingkungan sekitar peserta didik (${jenjang})!`,
        image: null,
        options: [],
        answer: `Rubrik Jawaban: 1. Penjelasan definisi dan konsep dasar (Bobot 30%); 2. Identifikasi masalah kontekstual yang relevan (Bobot 35%); 3. Langkah-langkah penyelesaian terstruktur dan simpulan logis (Bobot 35%).`,
        explanation: `Siswa diharapkan mampu menguraikan konsep, menyajikan contoh nyata, dan merumuskan solusi berbasis materi ${cleanTopik}.`,
      });
    }
  }

  return result;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '35mb' }));

  // In-memory Real-Time Proctoring Store
  interface LiveProctorSessionServer {
    id: string;
    nama: string;
    kelas: string;
    nisn?: string;
    mapelId: string;
    mapelNama: string;
    soalSekarang: number;
    totalSoal: number;
    dijawab: number;
    pelanggaran: number;
    livePhoto: string | null;
    status: 'online' | 'warning' | 'submitted' | 'offline';
    cameraActive: boolean;
    fullscreenActive: boolean;
    lastPing: string;
    adminWarningMessage?: string;
    audioActive?: boolean;
    audioLevel?: number;
    vadActive?: boolean;
    audioAnomaly?: string | null;
    audioMutedByProctor?: boolean;
  }
  const activeProctorSessions = new Map<string, LiveProctorSessionServer>();

  // Proctoring API Endpoints for Live CCTV & Proctoring
  const deletedProctorSessionIds = new Set<string>();

  app.get('/api/proctor/sessions', (_req, res) => {
    const now = Date.now();
    const list: LiveProctorSessionServer[] = [];
    for (const [id, sess] of activeProctorSessions.entries()) {
      const decodedId = decodeURIComponent(id);
      if (deletedProctorSessionIds.has(id) || deletedProctorSessionIds.has(decodedId)) {
        activeProctorSessions.delete(id);
        continue;
      }
      const pingAge = now - new Date(sess.lastPing || 0).getTime();
      // Drop sessions older than 20 minutes if submitted or offline
      if (pingAge > 1200000) {
        activeProctorSessions.delete(id);
        continue;
      }
      const isStale = pingAge > 90000;
      list.push({
        ...sess,
        status: sess.status === 'submitted' ? 'submitted' : isStale ? 'offline' : sess.status,
      });
    }
    res.json({
      success: true,
      sessions: list,
      deletedIds: Array.from(deletedProctorSessionIds),
    });
  });

  const activeProctorWarnings = new Map<string, { message: string; timestamp: number }>();
  let globalBroadcastWarning: { message: string; timestamp: number } | null = null;

  app.post('/api/proctor/session', (req, res) => {
    const session = req.body as LiveProctorSessionServer;
    if (!session || !session.id) {
      return res.status(400).json({ success: false, message: 'Invalid session data' });
    }
    const rawId = session.id;
    const decodedId = decodeURIComponent(rawId);
    // If admin already deleted this session, reject update and do not revive
    if (deletedProctorSessionIds.has(rawId) || deletedProctorSessionIds.has(decodedId)) {
      return res.json({ success: false, deleted: true, message: 'Session has been deleted by proctor' });
    }
    const directWarning = activeProctorWarnings.get(rawId) || activeProctorWarnings.get(decodedId);
    const existing = activeProctorSessions.get(rawId) || activeProctorSessions.get(decodedId);
    const warningToPreserve = session.adminWarningMessage || directWarning?.message || existing?.adminWarningMessage || globalBroadcastWarning?.message;

    const updated: LiveProctorSessionServer = {
      ...existing,
      ...session,
      adminWarningMessage: warningToPreserve,
      lastPing: new Date().toISOString(),
    };
    activeProctorSessions.set(rawId, updated);
    res.json({
      success: true,
      adminWarningMessage: warningToPreserve || null,
      warningTimestamp: directWarning?.timestamp || globalBroadcastWarning?.timestamp || null,
    });
  });

  app.post('/api/proctor/warning', (req, res) => {
    const { sessionId, warningMessage, studentName } = req.body;
    if (!sessionId || !warningMessage) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }
    const entry = { message: String(warningMessage), timestamp: Date.now() };
    if (sessionId === 'all' || sessionId === 'broadcast') {
      globalBroadcastWarning = entry;
      for (const [id, s] of activeProctorSessions.entries()) {
        s.adminWarningMessage = warningMessage;
        s.status = 'warning';
        activeProctorSessions.set(id, s);
      }
    } else {
      activeProctorWarnings.set(sessionId, entry);
      activeProctorWarnings.set(decodeURIComponent(sessionId), entry);
      const sess = activeProctorSessions.get(sessionId) || activeProctorSessions.get(decodeURIComponent(sessionId));
      if (sess) {
        sess.adminWarningMessage = warningMessage;
        sess.status = 'warning';
        activeProctorSessions.set(sessionId, sess);
      }
      if (studentName) {
        const cleanName = String(studentName).toLowerCase().trim();
        for (const [id, s] of activeProctorSessions.entries()) {
          if (s.nama && s.nama.toLowerCase().trim() === cleanName) {
            s.adminWarningMessage = warningMessage;
            s.status = 'warning';
            activeProctorSessions.set(id, s);
            activeProctorWarnings.set(id, entry);
          }
        }
      }
    }
    res.json({ success: true });
  });

  app.get('/api/proctor/warning/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const directWarning = activeProctorWarnings.get(sessionId) || activeProctorWarnings.get(decodeURIComponent(sessionId));
    const sess = activeProctorSessions.get(sessionId) || activeProctorSessions.get(decodeURIComponent(sessionId));
    
    let nameWarning: { message: string; timestamp: number } | null = null;
    const studentNameQuery = req.query.nama ? String(req.query.nama).toLowerCase().trim() : null;
    if (studentNameQuery) {
      for (const s of activeProctorSessions.values()) {
        if (s.nama && s.nama.toLowerCase().trim() === studentNameQuery && s.adminWarningMessage) {
          nameWarning = { message: s.adminWarningMessage, timestamp: Date.now() };
          break;
        }
      }
    }

    const warningMsg = directWarning?.message || sess?.adminWarningMessage || nameWarning?.message || globalBroadcastWarning?.message || null;
    const warningTime = directWarning?.timestamp || nameWarning?.timestamp || globalBroadcastWarning?.timestamp || null;
    res.json({
      success: true,
      warningMessage: warningMsg,
      warningTimestamp: warningTime,
    });
  });

  app.post('/api/proctor/warning/ack', (req, res) => {
    const { sessionId, studentName } = req.body;
    if (sessionId === 'all' || sessionId === 'broadcast') {
      globalBroadcastWarning = null;
    }
    if (sessionId) {
      activeProctorWarnings.delete(sessionId);
      activeProctorWarnings.delete(decodeURIComponent(sessionId));
      const s = activeProctorSessions.get(sessionId) || activeProctorSessions.get(decodeURIComponent(sessionId));
      if (s) {
        delete s.adminWarningMessage;
        if (s.pelanggaran === 0) s.status = 'online';
        activeProctorSessions.set(sessionId, s);
      }
    }
    if (studentName) {
      const cleanName = String(studentName).toLowerCase().trim();
      for (const [id, s] of activeProctorSessions.entries()) {
        if (s.nama && s.nama.toLowerCase().trim() === cleanName) {
          delete s.adminWarningMessage;
          activeProctorSessions.set(id, s);
          activeProctorWarnings.delete(id);
        }
      }
    }
    res.json({ success: true, acknowledged: true });
  });

  // Server-side storage for proctor recordings
  const serverProctorRecordings = new Map<string, any>();

  app.get('/api/proctor/recordings', (_req, res) => {
    res.json({
      success: true,
      recordings: Array.from(serverProctorRecordings.values()).sort(
        (a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime()
      ),
    });
  });

  app.post('/api/proctor/recordings', (req, res) => {
    const rec = req.body;
    if (rec && rec.id) {
      serverProctorRecordings.set(rec.id, {
        ...rec,
        savedAt: new Date().toISOString(),
      });
      return res.json({ success: true });
    }
    res.status(400).json({ success: false, message: 'Invalid recording metadata' });
  });

  app.delete('/api/proctor/recordings/:id', (req, res) => {
    const { id } = req.params;
    if (id) {
      serverProctorRecordings.delete(id);
    }
    res.json({ success: true });
  });

  app.delete('/api/proctor/recordings', (_req, res) => {
    serverProctorRecordings.clear();
    res.json({ success: true, cleared: true });
  });

  app.delete('/api/proctor/session/:sessionId', (req, res) => {
    const rawId = req.params.sessionId;
    if (rawId) {
      const decodedId = decodeURIComponent(rawId);
      deletedProctorSessionIds.add(rawId);
      deletedProctorSessionIds.add(decodedId);
      activeProctorSessions.delete(rawId);
      activeProctorSessions.delete(decodedId);
      for (const k of Array.from(activeProctorSessions.keys())) {
        if (k === rawId || k === decodedId || decodeURIComponent(k) === decodedId) {
          deletedProctorSessionIds.add(k);
          activeProctorSessions.delete(k);
        }
      }
    }
    res.json({ success: true, deleted: true });
  });

  // ==========================================
  // WEBRTC VOIP & AUDIO PROCTORING SUBSYSTEM
  // ==========================================
  interface WebRtcSignalPacket {
    id: string;
    from: string; // studentId or 'proctor'
    to: string; // studentId or 'proctor' or 'all'
    type: 'offer' | 'answer' | 'ice-candidate' | 'audio-mute' | 'ping';
    data: any;
    timestamp: number;
  }
  const pendingRtcSignals = new Map<string, WebRtcSignalPacket[]>();

  // 1. Generate short-lived room authentication token with WebRTC ICE servers & Opus 16kbps profile
  app.post('/api/webrtc/token', (req, res) => {
    const { sessionId, role, name } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId diperlukan' });
    }
    const cleanSessionId = decodeURIComponent(String(sessionId));
    const token = `cbt-rtc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours

    res.json({
      success: true,
      token,
      sessionId: cleanSessionId,
      role: role || 'student',
      name: name || 'Peserta CBT',
      roomId: 'cbt-live-exam-voice-room',
      expiresAt,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      codecProfile: {
        codec: 'opus',
        bitrateKbps: 16, // 16kbps upstream Opus with VAD
        sampleRate: 16000, // 16kHz wideband audio
        channels: 1, // Mono stream for efficient exam voice
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  });

  // 2. WebRTC Signaling: Broker SDP Offers, Answers, and ICE Candidates
  app.post('/api/webrtc/signal', (req, res) => {
    const { from, to, type, data } = req.body;
    if (!from || !to || !type) {
      return res.status(400).json({ success: false, message: 'Parameter signal tidak lengkap' });
    }
    const targetKey = decodeURIComponent(String(to));
    const packet: WebRtcSignalPacket = {
      id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      from: decodeURIComponent(String(from)),
      to: targetKey,
      type,
      data,
      timestamp: Date.now(),
    };

    const existing = pendingRtcSignals.get(targetKey) || [];
    existing.push(packet);
    pendingRtcSignals.set(targetKey, existing.slice(-60));
    res.json({ success: true, signalId: packet.id });
  });

  // 3. WebRTC Signals Poller / Receiver
  app.get('/api/webrtc/signals/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const cleanId = decodeURIComponent(sessionId);
    const directSignals = pendingRtcSignals.get(cleanId) || pendingRtcSignals.get(sessionId) || [];
    const broadcastSignals = pendingRtcSignals.get('all') || [];
    
    // Clear direct signals once collected
    pendingRtcSignals.set(cleanId, []);
    pendingRtcSignals.set(sessionId, []);

    res.json({
      success: true,
      signals: [...directSignals, ...broadcastSignals],
    });
  });

  // 4. Two-Way Intercom (Push-to-Talk) Proctors to Students
  interface IntercomBroadcast {
    id: string;
    proctorName: string;
    targetSessionId: string; // 'all' or studentSessionId
    audioDataUrl: string; // base64 webm/wav audio clip
    timestamp: number;
    textAnnouncement?: string;
  }
  const pendingIntercomMessages = new Map<string, IntercomBroadcast[]>();

  app.post('/api/proctor/intercom', (req, res) => {
    const { targetSessionId, audioDataUrl, proctorName, textAnnouncement } = req.body;
    if (!audioDataUrl && !textAnnouncement) {
      return res.status(400).json({ success: false, message: 'Audio stream atau teks pengumuman kosong' });
    }
    const cleanTarget = decodeURIComponent(String(targetSessionId || 'all'));
    const broadcast: IntercomBroadcast = {
      id: `intercom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      proctorName: proctorName || 'Pengawas Ujian',
      targetSessionId: cleanTarget,
      audioDataUrl: audioDataUrl || '',
      textAnnouncement: textAnnouncement || 'Pengawas sedang mengumumkan melalui interkom suara.',
      timestamp: Date.now(),
    };

    const targetList = pendingIntercomMessages.get(cleanTarget) || [];
    targetList.push(broadcast);
    pendingIntercomMessages.set(cleanTarget, targetList.slice(-20));

    res.json({ success: true, broadcastId: broadcast.id });
  });

  app.get('/api/proctor/intercom/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const cleanId = decodeURIComponent(sessionId);
    const directList = pendingIntercomMessages.get(cleanId) || pendingIntercomMessages.get(sessionId) || [];
    const globalList = pendingIntercomMessages.get('all') || [];

    // Filter out messages older than 30 seconds
    const now = Date.now();
    const validMessages = [...directList, ...globalList].filter((m) => now - m.timestamp < 30000);

    // Drain retrieved direct messages
    pendingIntercomMessages.set(cleanId, []);
    pendingIntercomMessages.set(sessionId, []);

    res.json({
      success: true,
      messages: validMessages,
    });
  });

  // Global Subjects Store & Sync with File-Backed Persistence
  const SUBJECTS_FILE_PATH = path.join(__dirname, 'data_subjects.json');

  const INITIAL_SUBJECTS_LIST = [
    {
      id: "simulasi-tka-bahasa-indonesia",
      kode: "SIM-TKA-IND",
      nama: "Simulasi TKA Bahasa Indonesia",
      guruPengampu: "Tim Asesmen & Literasi TKA",
      kelas: "Kelas 5 & 6",
      passwordBankSoal: "guru123",
      color: "blue",
      deskripsi: "Simulasi Tes Kemampuan Akademik (TKA) Bahasa Indonesia dengan 35 butir soal standar kurikulum nasional.",
      settings: {
        judul: "Asesmen EduZone CBT",
        mapel: "Simulasi TKA Bahasa Indonesia",
        sekolah: "EduZone",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png",
        logoShape: "rounded",
        logoFit: "contain",
        tahunAjaran: "2025/2026",
        durasiMenit: 75,
        token: "SIMTKA26",
        adminPass: "112233",
        acakSoal: false,
        tampilkanNilai: true,
        akhiriOtomatisJikaCurang: true,
        kameraPengawasAktif: true,
        kunciLayarPenuh: true,
      },
      questions: [],
      results: []
    },
    {
      id: "tka-1-bahasa-indonesia",
      kode: "TKA-IND",
      nama: "TKA 1 Bahasa Indonesia",
      guruPengampu: "Guru Bahasa Indonesia TKA",
      kelas: "Kelas 5 & 6",
      passwordBankSoal: "guru123",
      color: "purple",
      deskripsi: "Tes Kemampuan Akademik (TKA) 1 Bahasa Indonesia.",
      settings: {
        judul: "Asesmen TKA 1 Bahasa Indonesia",
        mapel: "TKA 1 Bahasa Indonesia",
        sekolah: "EduZone",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png",
        logoShape: "rounded",
        logoFit: "contain",
        tahunAjaran: "2025/2026",
        durasiMenit: 60,
        token: "TKAIND26",
        adminPass: "112233",
        acakSoal: false,
        tampilkanNilai: true,
        akhiriOtomatisJikaCurang: true,
        kameraPengawasAktif: true,
        kunciLayarPenuh: true,
      },
      questions: [],
      results: []
    },
    {
      id: "tka-1-matematika",
      kode: "TKA-MTK",
      nama: "TKA 1 Matematika",
      guruPengampu: "Guru Matematika TKA",
      kelas: "Kelas 5 & 6",
      passwordBankSoal: "guru123",
      color: "emerald",
      deskripsi: "Tes Kemampuan Akademik (TKA) 1 Matematika.",
      settings: {
        judul: "Asesmen TKA 1 Matematika",
        mapel: "TKA 1 Matematika",
        sekolah: "EduZone",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png",
        logoShape: "rounded",
        logoFit: "contain",
        tahunAjaran: "2025/2026",
        durasiMenit: 60,
        token: "TKAMTK26",
        adminPass: "112233",
        acakSoal: false,
        tampilkanNilai: true,
        akhiriOtomatisJikaCurang: true,
        kameraPengawasAktif: true,
        kunciLayarPenuh: true,
      },
      questions: [],
      results: []
    }
  ];

  function loadStoredSubjects(): any[] {
    const ALLOWED_DEFAULT_IDS = new Set([
      'simulasi-tka-bahasa-indonesia',
      'tka-1-bahasa-indonesia',
      'tka-1-matematika',
    ]);
    try {
      if (fs.existsSync(SUBJECTS_FILE_PATH)) {
        const raw = fs.readFileSync(SUBJECTS_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Keep only:
          // 1) The 3 allowed core subjects
          // 2) Any subject where questions have actually been created by the teacher (questions.length > 0)
          // Prune legacy removed default subjects (literasi-numerasi, matematika, etc.)
          const filtered = parsed.filter((s: any) => {
            const sid = String(s.id || '').toLowerCase();
            if (ALLOWED_DEFAULT_IDS.has(sid)) return true;
            if (Array.isArray(s.questions) && s.questions.length > 0) return true;
            return false;
          });
          // Ensure all 3 allowed default subjects exist in the list
          const existingIds = new Set(filtered.map((s: any) => String(s.id || '').toLowerCase()));
          const missing = INITIAL_SUBJECTS_LIST.filter(
            (init) => !existingIds.has(init.id.toLowerCase())
          );
          const finalList = missing.length > 0 ? [...filtered, ...missing] : filtered;
          saveStoredSubjects(finalList);
          return finalList;
        }
      }
    } catch (e) {
      console.warn('Gagal membaca data_subjects.json:', e);
    }
    saveStoredSubjects(INITIAL_SUBJECTS_LIST);
    return INITIAL_SUBJECTS_LIST;
  }

  function saveStoredSubjects(list: any[]): void {
    try {
      fs.writeFileSync(SUBJECTS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Gagal menulis data_subjects.json:', e);
    }
  }

  let storedSubjectsCache: any[] = loadStoredSubjects();

  app.get('/api/subjects', (_req, res) => {
    if (!storedSubjectsCache || storedSubjectsCache.length === 0) {
      storedSubjectsCache = loadStoredSubjects();
    }
    res.json({
      success: true,
      subjects: storedSubjectsCache,
    });
  });

  app.post('/api/subjects', (req, res) => {
    const { subjects } = req.body;
    if (Array.isArray(subjects) && subjects.length > 0) {
      storedSubjectsCache = subjects;
      saveStoredSubjects(storedSubjectsCache);
    }
    res.json({
      success: true,
      count: storedSubjectsCache ? storedSubjectsCache.length : 0,
      subjects: storedSubjectsCache,
    });
  });

  app.delete('/api/subjects/:id', (req, res) => {
    const rawId = req.params.id;
    const decodedId = decodeURIComponent(rawId).toLowerCase();
    if (!storedSubjectsCache || storedSubjectsCache.length === 0) {
      storedSubjectsCache = loadStoredSubjects();
    }
    if (decodedId && storedSubjectsCache) {
      storedSubjectsCache = storedSubjectsCache.filter((s: any) => {
        const sid = String(s.id || '').toLowerCase();
        const scode = String(s.kode || '').toLowerCase();
        const snama = String(s.nama || '').toLowerCase();
        return sid !== decodedId && scode !== decodedId && snama !== decodedId;
      });
      saveStoredSubjects(storedSubjectsCache);
    }
    res.json({
      success: true,
      count: storedSubjectsCache ? storedSubjectsCache.length : 0,
      subjects: storedSubjectsCache,
    });
  });

  app.delete('/api/proctor/sessions/all', (_req, res) => {
    for (const id of activeProctorSessions.keys()) {
      deletedProctorSessionIds.add(id);
    }
    activeProctorSessions.clear();
    res.json({ success: true });
  });

  // Status & Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // AI Question Generator Endpoint
  app.post('/api/ai/generate-questions', async (req, res) => {
    const {
      mapel = 'Matematika',
      jenjangKelas = 'Kelas 5 SD',
      topik = 'Umum',
      jumlah = 5,
      tipeSoal = 'CAMPURAN',
      tingkatKesulitan = 'CAMPURAN',
      stimulusText = '',
      instruksiTambahan = '',
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Generating curriculum-aligned fallback questions.');
      const fallbackQuestions = generateFallbackQuestions(
        mapel,
        jenjangKelas,
        topik,
        Number(jumlah) || 5,
        tipeSoal,
        tingkatKesulitan,
        stimulusText
      );
      return res.json({
        success: true,
        isFallback: true,
        message: 'Kunci API Gemini belum diatur di secrets. Sistem menampilkan contoh butir soal kurikulum bermutu tinggi.',
        questions: fallbackQuestions,
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `Anda adalah pakar pendidik dan pembuat soal asesmen standar pendidikan nasional (Kurikulum Merdeka / CBT / ANBK) di Indonesia.
Tugas Anda adalah merumuskan butir-butir soal ujian yang bermutu tinggi, faktual, mendidik, memiliki kunci jawaban yang valid, dengan bahasa Indonesia baku yang sesuai dengan tingkat kognitif dan usia peserta didik.

Aturan Pembuatan Soal Berdasarkan Tipe:
1. 'PG' (Pilihan Ganda Tunggal):
   - options HARUS berisi tepat 4 pilihan (A, B, C, D) yang jelas, masuk akal, dan tidak ambigu.
   - answer HARUS berupa SATU huruf kapital: 'A', 'B', 'C', atau 'D'.
2. 'PGK' (Pilihan Ganda Kompleks):
   - options HARUS berisi tepat 4 pilihan (A, B, C, D).
   - Jawaban benar LEBIH DARI SATU (misalnya 2 atau 3 pilihan benar).
   - Sertakan petunjuk jelas di dalam teks soal, misalnya: "(Pilihlah DUA jawaban yang benar!)".
   - answer HARUS berupa huruf-huruf kapital dipisahkan koma, contoh: 'A, C' atau 'B, D'.
3. 'BS' (Benar - Salah):
   - options HARUS tepat: ["Benar", "Salah"].
   - answer HARUS salah satu dari kata "Benar" atau "Salah".
4. 'ISIAN' (Isian Singkat):
   - options HARUS array kosong [].
   - answer HARUS berupa kata/frasa kunci singkat (1-3 kata) yang pasti.
5. 'URAIAN' (Uraian / Essay):
   - options HARUS array kosong [].
   - answer HARUS berisi rubrik jawaban lengkap dan poin-poin penjelasan penting.

Aturan Tingkat Kesulitan:
- 'REGULER': Menguji pemahaman konsep, pengetahuan dasar, atau aplikasi langsung (C1-C3).
- 'HOTS' (Higher Order Thinking Skills): Menguji kemampuan analisis, evaluasi, penalaran kritis, pemecahan masalah konteks nyata, atau interpretasi data/kasus (C4-C6).

Pastikan kunci jawaban 100% akurat. Sertakan pembahasan singkat yang mendidik di kolom explanation.`;

      const rawTopikStr = Array.isArray(topik) ? topik.join(', ') : (topik || 'Umum');
      const isMultiTopic = rawTopikStr.includes(',');

      let userPrompt = `Buatlah tepat ${jumlah || 5} butir soal asesmen dengan spesifikasi berikut:
- Mata Pelajaran: ${mapel}
- Jenjang / Kelas: ${jenjangKelas}
- Topik / Pokok Bahasan Materi: ${rawTopikStr} ${
        isMultiTopic
          ? '(PENTING: Sebarkan butir-butir soal secara merata mencakup seluruh topik pokok bahasan yang dipilih di atas)'
          : ''
      }
- Tipe Soal yang Diminta: ${tipeSoal} ${
        tipeSoal === 'CAMPURAN'
          ? '(Kombinasikan beragam tipe: PG, PGK, BS, ISIAN, dan URAIAN)'
          : `(Semua soal bertipe ${tipeSoal})`
      }
- Tingkat Kesulitan: ${tingkatKesulitan} ${
        tingkatKesulitan === 'CAMPURAN'
          ? '(Proporsional seimbang antara REGULER dan HOTS)'
          : `(Tingkat kesulitan ${tingkatKesulitan})`
      }`;

      if (stimulusText && stimulusText.trim()) {
        userPrompt += `\n\nTEKS STIMULUS / BACAAN / WACANA (Wajib menjadi rujukan utama seluruh butir pertanyaan):\n"""\n${stimulusText.trim()}\n"""\nBuat soal-soal di atas berdasarkan stimulus/bacaan ini.`;
      }

      if (instruksiTambahan && instruksiTambahan.trim()) {
        userPrompt += `\n\nINSTRUKSI KHUSUS DARI GURU:\n${instruksiTambahan.trim()}`;
      }

      const genConfig = {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Daftar butir soal asesmen yang digenerate',
          items: {
            type: Type.OBJECT,
            properties: {
              tipe: {
                type: Type.STRING,
                description: "Tipe soal: 'PG', 'PGK', 'BS', 'ISIAN', atau 'URAIAN'",
              },
              difficulty: {
                type: Type.STRING,
                description: "Tingkat kesulitan: 'REGULER' atau 'HOTS'",
              },
              content: {
                type: Type.STRING,
                description: 'Teks stimulus/cerita wacana (jika ada) dan pertanyaan soal',
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "Daftar opsi pilihan jawaban. 4 opsi untuk PG dan PGK, ['Benar', 'Salah'] untuk BS, kosong [] untuk ISIAN dan URAIAN.",
              },
              answer: {
                type: Type.STRING,
                description:
                  "Kunci jawaban: huruf tunggal 'A'/'B'/'C'/'D' untuk PG, daftar huruf 'A, C' untuk PGK, 'Benar'/'Salah' untuk BS, kata kunci untuk ISIAN, rubrik untuk URAIAN.",
              },
              explanation: {
                type: Type.STRING,
                description: 'Pembahasan ringkas kunci jawaban',
              },
            },
            required: ['tipe', 'difficulty', 'content', 'options', 'answer'],
          },
        },
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: genConfig,
        });
      } catch (firstErr: any) {
        console.warn('First Gemini attempt failed, retrying after 1.5s...', firstErr?.message);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: genConfig,
        });
      }

      const text = response.text || '[]';
      let rawList: any[] = [];
      try {
        rawList = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse Gemini JSON response:', parseErr, text);
        throw new Error('Format respon AI tidak valid.');
      }

      if (!Array.isArray(rawList) || rawList.length === 0) {
        throw new Error('AI tidak menghasilkan butir soal.');
      }

      const formattedQuestions = rawList.map((item, idx) => {
        let tipe = (item.tipe || 'PG').toUpperCase();
        if (!['PG', 'PGK', 'BS', 'ISIAN', 'URAIAN'].includes(tipe)) {
          tipe = 'PG';
        }

        const difficulty = item.difficulty?.toUpperCase() === 'HOTS' ? 'HOTS' : 'REGULER';
        let options: string[] = Array.isArray(item.options) ? item.options : [];

        let answer: string | string[] = item.answer || 'A';

        if (tipe === 'BS') {
          options = ['Benar', 'Salah'];
          const ansStr = String(answer).toLowerCase();
          answer = ansStr.includes('benar') || ansStr === 'true' || ansStr === 'b' ? 'Benar' : 'Salah';
        } else if (tipe === 'ISIAN' || tipe === 'URAIAN') {
          options = [];
          answer = String(answer).trim();
        } else if (tipe === 'PGK') {
          if (Array.isArray(answer)) {
            answer = answer.map((a) => String(a).trim().toUpperCase());
          } else if (typeof answer === 'string') {
            const matches = answer.toUpperCase().match(/[A-E]/g);
            answer = matches && matches.length > 0 ? Array.from(new Set(matches)) : ['A', 'B'];
          } else {
            answer = ['A', 'B'];
          }
          if (options.length < 4) {
            const letters = ['A', 'B', 'C', 'D'];
            while (options.length < 4) {
              options.push(`Pilihan ${letters[options.length]}`);
            }
          }
        } else {
          // PG
          if (options.length < 4) {
            const letters = ['A', 'B', 'C', 'D'];
            while (options.length < 4) {
              options.push(`Pilihan ${letters[options.length]}`);
            }
          }
          if (typeof answer === 'string') {
            const match = answer.toUpperCase().match(/[A-D]/);
            answer = match ? match[0] : 'A';
          } else {
            answer = 'A';
          }
        }

        return {
          id: `q-ai-${Date.now()}-${idx + 1}-${Math.floor(100 + Math.random() * 900)}`,
          tipe,
          difficulty,
          content: item.content || `Pertanyaan ${idx + 1}`,
          image: null,
          options,
          answer,
          explanation: item.explanation || '',
        };
      });

      return res.json({
        success: true,
        questions: formattedQuestions,
        message: `Berhasil menghasilkan ${formattedQuestions.length} butir soal dengan Google Gemini AI.`,
      });
    } catch (apiError: any) {
      console.error('Error generating questions with Gemini:', apiError);
      const fallbackQuestions = generateFallbackQuestions(
        mapel,
        jenjangKelas,
        topik,
        Number(jumlah) || 5,
        tipeSoal,
        tingkatKesulitan,
        stimulusText
      );
      return res.json({
        success: true,
        isFallback: true,
        warning: apiError?.message || 'Terjadi kendala saat menghubungi AI',
        message: 'Menghasilkan butir soal kurikulum alternatif karena kendala koneksi AI.',
        questions: fallbackQuestions,
      });
    }
  });

  // Helper to parse question blocks from raw text
  function parseTextToQuestions(text: string) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    interface TempBlock {
      headerNumber: number;
      lines: string[];
    }
    const blocks: TempBlock[] = [];
    let currentBlock: TempBlock | null = null;
    const qStartRegex = /^(?:no\.?\s*|soal\s*|pertanyaan\s*)?(\d+)[\.\)\:\-]\s*(.*)$/i;

    for (const line of lines) {
      const match = line.match(qStartRegex);
      const isOptionLine = /^[A-Ea-e][\.\)]\s*/.test(line);
      const isKeyLine = /^(kunci|jawaban|tipe|kesulitan|gambar|answer)/i.test(line);

      if (match && !isOptionLine && !isKeyLine) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = {
          headerNumber: parseInt(match[1], 10),
          lines: [match[2] ? match[2].trim() : ''],
        };
      } else if (currentBlock) {
        currentBlock.lines.push(line);
      } else {
        currentBlock = {
          headerNumber: 1,
          lines: [line],
        };
      }
    }
    if (currentBlock) blocks.push(currentBlock);

    const questions: any[] = [];
    blocks.forEach((block, bIdx) => {
      const options: string[] = [];
      let rawKey = '';
      let rawTipe = '';
      let rawDiff = '';
      const contentLines: string[] = [];
      const optRegex = /^[A-Ea-e][\.\)]\s*(.+)$/;
      const keyRegex = /^(?:kunci(?:\s*jawaban)?|jawaban|answer)\s*[:=]\s*(.+)$/i;
      const typeRegex = /^(?:tipe(?:\s*soal)?|type)\s*[:=]\s*(.+)$/i;
      const diffRegex = /^(?:kesulitan|tingkat|difficulty)\s*[:=]\s*(.+)$/i;

      for (const line of block.lines) {
        if (!line.trim()) continue;
        const keyMatch = line.match(keyRegex);
        if (keyMatch) { rawKey = keyMatch[1].trim(); continue; }
        const typeMatch = line.match(typeRegex);
        if (typeMatch) { rawTipe = typeMatch[1].trim(); continue; }
        const diffMatch = line.match(diffRegex);
        if (diffMatch) { rawDiff = diffMatch[1].trim(); continue; }
        const optMatch = line.match(optRegex);
        if (optMatch) { options.push(optMatch[1].trim()); continue; }
        contentLines.push(line);
      }

      const content = contentLines.join('\n').trim();
      if (!content) return;

      let tipe = 'PG';
      const cleanT = rawTipe.toUpperCase();
      if (cleanT.includes('PGK') || cleanT.includes('KOMPLEKS')) tipe = 'PGK';
      else if (cleanT.includes('BS') || cleanT.includes('BENAR')) tipe = 'BS';
      else if (cleanT.includes('ISIAN')) tipe = 'ISIAN';
      else if (cleanT.includes('URAIAN') || cleanT.includes('ESSAY')) tipe = 'URAIAN';
      else if (options.length === 0) tipe = 'URAIAN';

      let answer: any = rawKey || 'A';
      if (tipe === 'BS') {
        const lower = String(rawKey).toLowerCase();
        answer = lower.includes('benar') || lower === 'b' ? 'Benar' : 'Salah';
      } else if (tipe === 'PGK') {
        const matches = String(rawKey).toUpperCase().match(/[A-E]/g);
        answer = matches && matches.length > 0 ? Array.from(new Set(matches)) : ['A', 'B'];
      }

      questions.push({
        id: `q-pdf-parsed-${Date.now()}-${bIdx + 1}-${Math.floor(100 + Math.random() * 900)}`,
        tipe,
        difficulty: rawDiff.toUpperCase().includes('HOTS') ? 'HOTS' : 'REGULER',
        content,
        image: null,
        options: tipe === 'BS' ? ['Benar', 'Salah'] : tipe === 'ISIAN' || tipe === 'URAIAN' ? [] : options.length > 0 ? options : ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
        answer,
        explanation: '',
      });
    });
    return questions;
  }

  // PDF Question Parser Endpoint (AI Multi-modal + Text Extraction Fallback)
  app.post('/api/parse-pdf-questions', async (req, res) => {
    const { base64, filename } = req.body;
    if (!base64) {
      return res.status(400).json({ success: false, message: 'Data berkas PDF tidak ditemukan.' });
    }

    const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Try Gemini Vision / Document understanding if API key is configured
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const systemInstruction = `Anda adalah ahli ekstraksi naskah soal ujian dan asesmen sekolah.
Tugas Anda adalah membaca dan mengekstrak seluruh butir soal dari dokumen PDF naskah ujian yang diberikan.
Kenali butir pertanyaan, nomor soal, teks stimulus/wacana, pilihan jawaban (A, B, C, D), dan kunci jawaban yang valid.
Format jawaban harus berupa JSON array yang memuat objek butir soal lengkap.
Jika kunci jawaban tidak tertulis dalam naskah, analisislah jawaban yang paling benar dan tepat.
Tipe soal: 'PG' (Pilihan Ganda Tunggal), 'PGK' (Pilihan Ganda Kompleks), 'BS' (Benar Salah), 'ISIAN' (Isian Singkat), 'URAIAN' (Uraian/Essay).`;

        const genConfig = {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Daftar butir soal asesmen yang diekstrak dari dokumen PDF',
            items: {
              type: Type.OBJECT,
              properties: {
                tipe: {
                  type: Type.STRING,
                  description: "Tipe soal: 'PG', 'PGK', 'BS', 'ISIAN', atau 'URAIAN'",
                },
                difficulty: {
                  type: Type.STRING,
                  description: "Tingkat kesulitan: 'REGULER' atau 'HOTS'",
                },
                content: {
                  type: Type.STRING,
                  description: 'Teks soal atau stimulus dan pertanyaan lengkap',
                },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Opsi jawaban (4 opsi untuk PG dan PGK, ['Benar', 'Salah'] untuk BS, [] untuk ISIAN dan URAIAN)",
                },
                answer: {
                  type: Type.STRING,
                  description: "Kunci jawaban: 'A'/'B'/'C'/'D' untuk PG, 'A, B' untuk PGK, 'Benar'/'Salah' untuk BS, kata kunci untuk ISIAN, rubrik untuk URAIAN",
                },
                explanation: {
                  type: Type.STRING,
                  description: 'Pembahasan ringkas kunci jawaban',
                },
              },
              required: ['tipe', 'difficulty', 'content', 'options', 'answer'],
            },
          },
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: 'application/pdf',
              },
            },
            'Ekstrak seluruh butir soal dari dokumen PDF ujian ini secara terstruktur sesuai format skema JSON.',
          ],
          config: genConfig,
        });

        const text = response.text || '[]';
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const questions = parsed.map((item, idx) => {
            let tipe = (item.tipe || 'PG').toUpperCase();
            if (!['PG', 'PGK', 'BS', 'ISIAN', 'URAIAN'].includes(tipe)) tipe = 'PG';
            let options = Array.isArray(item.options) ? item.options : [];
            let answer: any = item.answer || 'A';
            if (tipe === 'BS') {
              options = ['Benar', 'Salah'];
              const str = String(answer).toLowerCase();
              answer = str.includes('benar') || str === 'true' || str === 'b' ? 'Benar' : 'Salah';
            } else if (tipe === 'PGK') {
              if (Array.isArray(answer)) {
                answer = answer.map((a) => String(a).trim().toUpperCase());
              } else {
                const matches = String(answer).toUpperCase().match(/[A-E]/g);
                answer = matches && matches.length > 0 ? Array.from(new Set(matches)) : ['A', 'B'];
              }
              if (options.length < 4) {
                while (options.length < 4) options.push(`Pilihan ${String.fromCharCode(65 + options.length)}`);
              }
            } else if (tipe === 'ISIAN' || tipe === 'URAIAN') {
              options = [];
              answer = String(answer).trim();
            } else {
              if (options.length < 4) {
                while (options.length < 4) options.push(`Pilihan ${String.fromCharCode(65 + options.length)}`);
              }
              const match = String(answer).toUpperCase().match(/[A-D]/);
              answer = match ? match[0] : 'A';
            }

            return {
              id: `q-pdf-ai-${Date.now()}-${idx + 1}-${Math.floor(100 + Math.random() * 900)}`,
              tipe,
              difficulty: item.difficulty?.toUpperCase() === 'HOTS' ? 'HOTS' : 'REGULER',
              content: item.content || `Pertanyaan ${idx + 1}`,
              image: null,
              options,
              answer,
              explanation: item.explanation || '',
            };
          });

          return res.json({
            success: true,
            source: 'gemini',
            questions,
            message: `Berhasil mengekstrak ${questions.length} butir soal dari "${filename || 'PDF'}" dengan Google Gemini AI.`,
          });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini PDF extraction encountered an issue, trying raw text fallback:', geminiErr?.message);
      }
    }

    // 2. Fallback: Extract text from PDF buffer using pdf-parse
    try {
      const { PDFParse } = await import('pdf-parse');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const parser = new PDFParse({ data: buffer });
      if (typeof (parser as any).load === 'function') {
        await (parser as any).load();
      }
      const textResult = await parser.getText();
      const rawText = textResult?.text || '';

      if (!rawText.trim()) {
        return res.status(422).json({
          success: false,
          message: 'Berkas PDF tidak memuat teks yang dapat diekstrak atau merupakan pindaian gambar murni.',
        });
      }

      // Parse question blocks
      const questions = parseTextToQuestions(rawText);
      if (questions.length === 0) {
        return res.status(422).json({
          success: false,
          message: 'Teks PDF berhasil dibaca namun format butir soal tidak terdeteksi (gunakan penomoran seperti "1. Pertanyaan...", "A. Pilihan...", "Kunci: A").',
        });
      }

      return res.json({
        success: true,
        source: 'text-parser',
        questions,
        message: `Berhasil mengekstrak ${questions.length} butir soal dari teks PDF "${filename || 'PDF'}".`,
      });
    } catch (parseErr: any) {
      console.error('PDF parsing error:', parseErr);
      return res.status(500).json({
        success: false,
        message: `Gagal memproses berkas PDF: ${parseErr?.message || String(parseErr)}`,
      });
    }
  });

  // Serve static files in production or mount Vite in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
