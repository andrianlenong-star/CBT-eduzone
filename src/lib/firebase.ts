import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ExamResult, SubjectPackage } from '../types';

// Initialize Firebase App singleton
export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use the provisioned Firestore database instance
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

const RESULTS_COLLECTION = 'exam_results';

/**
 * Kirim hasil ujian siswa ke Firebase Firestore secara realtime
 */
export async function submitExamResultToCloud(
  result: ExamResult,
  extra?: { mapelId?: string; mapelNama?: string; nisn?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const docId = result.id || `res_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const docRef = doc(db, RESULTS_COLLECTION, docId);

    const payload = {
      id: docId,
      nama: result.nama || 'Siswa',
      kelas: result.kelas || '-',
      nilai: Number(result.nilai) || 0,
      benar: Number(result.benar) || 0,
      totalSoal: Number(result.totalSoal) || 0,
      selesaiPada: result.selesaiPada || new Date().toLocaleString('id-ID'),
      pelanggaran: Number(result.pelanggaran) || 0,
      mapelId: extra?.mapelId || result.mapelId || 'literasi-numerasi',
      mapelNama: extra?.mapelNama || result.mapelNama || '',
      nisn: extra?.nisn || result.nisn || '',
      answers: result.answers || {},
      createdAt: new Date().toISOString(),
    };

    await setDoc(docRef, payload, { merge: true });
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Gagal mengirim nilai ke Firebase Firestore:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Berlangganan (realtime listener) data nilai ujian siswa di Firestore
 * Setiap kali siswa selesai ujian di perangkat mana pun, callback onUpdate akan langsung dipanggil!
 */
export function subscribeToCloudResults(
  onUpdate: (results: ExamResult[]) => void,
  onError?: (error: Error) => void
): () => void {
  try {
    const colRef = collection(db, RESULTS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ExamResult[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            nama: data.nama || 'Siswa',
            kelas: data.kelas || '-',
            nilai: Number(data.nilai) || 0,
            benar: Number(data.benar) || 0,
            totalSoal: Number(data.totalSoal) || 0,
            selesaiPada: data.selesaiPada || '-',
            pelanggaran: Number(data.pelanggaran) || 0,
            mapelId: data.mapelId,
            mapelNama: data.mapelNama,
            nisn: data.nisn,
          });
        });
        onUpdate(list);
      },
      (error) => {
        console.warn('Firestore subscription error (mungkin offline atau izin):', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Gagal membuat realtime subscription Firestore:', err);
    return () => {};
  }
}

/**
 * Hapus satu data nilai dari cloud
 */
export async function deleteCloudResult(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, RESULTS_COLLECTION, id));
    return true;
  } catch (err) {
    console.error('Gagal menghapus nilai dari Firestore:', err);
    return false;
  }
}

/**
 * Hapus seluruh data nilai dari cloud (atau untuk mapel tertentu)
 */
export async function clearAllCloudResults(mapelId?: string): Promise<boolean> {
  try {
    const colRef = collection(db, RESULTS_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) return true;

    const batch = writeBatch(db);
    let count = 0;
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (!mapelId || data.mapelId === mapelId) {
        batch.delete(docSnap.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return true;
  } catch (err) {
    console.error('Gagal membersihkan seluruh nilai di Firestore:', err);
    return false;
  }
}

const CONFIG_COLLECTION = 'app_config';
const GLOBAL_CONFIG_DOC = 'global_settings';

/**
 * Simpan logo dan pengaturan sekolah ke cloud Firestore agar siswa di perangkat apa pun otomatis melihat logo yang sama
 */
export async function saveGlobalSchoolConfigToCloud(config: {
  logoUrl?: string;
  sekolah?: string;
  judul?: string;
}): Promise<boolean> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, GLOBAL_CONFIG_DOC);
    await setDoc(
      docRef,
      {
        ...config,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('Gagal menyimpan logo/konfigurasi ke cloud:', err);
    return false;
  }
}

/**
 * Berlangganan perubahan logo dan pengaturan sekolah secara realtime dari Firestore
 */
export function subscribeToGlobalSchoolConfig(
  onUpdate: (config: { logoUrl?: string; sekolah?: string; judul?: string }) => void
): () => void {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, GLOBAL_CONFIG_DOC);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          onUpdate({
            logoUrl: data.logoUrl,
            sekolah: data.sekolah,
            judul: data.judul,
          });
        }
      },
      (error) => {
        console.warn('Gagal membaca konfigurasi cloud:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Error saat subscribe konfigurasi:', err);
    return () => {};
  }
}

export interface LiveProctorSession {
  id: string; // unik per sesi siswa
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
  // VoIP & Audio Proctoring fields
  audioActive?: boolean;
  audioLevel?: number; // 0 - 100 RMS volume
  vadActive?: boolean; // Voice Activity Detection: student is actively speaking
  audioAnomaly?: string | null; // e.g. "BISIKAN_TERDETEKSI" | "SUARA_GADUH_SPARSE"
  audioMutedByProctor?: boolean; // Proctor muted student's stream in matrix
}

const PROCTOR_COLLECTION = 'live_proctor_sessions';

/**
 * Kirim / perbarui detak jantung dan foto kamera live siswa ke Firestore & server API
 */
const inMemoryDeletedSessionIds = new Set<string>();

export function getDeletedProctorSessionIds(): Set<string> {
  const set = new Set<string>(inMemoryDeletedSessionIds);
  try {
    const raw = localStorage.getItem('cbt_deleted_session_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => {
          if (id) {
            set.add(id);
            set.add(decodeURIComponent(id));
          }
        });
      }
    }
  } catch {}
  return set;
}

export function markProctorSessionAsDeleted(sessionId: string): void {
  if (!sessionId) return;
  const decoded = decodeURIComponent(sessionId);
  inMemoryDeletedSessionIds.add(sessionId);
  inMemoryDeletedSessionIds.add(decoded);
  try {
    const set = getDeletedProctorSessionIds();
    set.add(sessionId);
    set.add(decoded);
    localStorage.setItem('cbt_deleted_session_ids', JSON.stringify(Array.from(set)));
  } catch {}

  // Remove from localStorage active sessions
  try {
    const raw = localStorage.getItem('cbt_active_proctor_sessions');
    if (raw) {
      const map = JSON.parse(raw);
      delete map[sessionId];
      delete map[decoded];
      localStorage.setItem('cbt_active_proctor_sessions', JSON.stringify(map));
    }
  } catch {}
}

const proctorSessionDeleteListeners = new Set<(id?: string) => void>();

let proctorBroadcastChannel: BroadcastChannel | null = null;
export function getProctorBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!proctorBroadcastChannel) {
    try {
      proctorBroadcastChannel = new BroadcastChannel('cbt_proctor_channel');
    } catch {
      return null;
    }
  }
  return proctorBroadcastChannel;
}

export async function updateStudentLiveProctorSession(
  session: LiveProctorSession
): Promise<boolean> {
  // If this session was already deleted by proctor, never recreate it!
  const deletedSet = getDeletedProctorSessionIds();
  if (deletedSet.has(session.id)) {
    return false;
  }

  const timestamp = new Date().toISOString();
  const sessionWithTime = {
    ...session,
    lastPing: timestamp,
  };

  // 1. Instant cross-tab broadcast via singleton BroadcastChannel
  try {
    const bc = getProctorBroadcastChannel();
    if (bc) {
      bc.postMessage({
        type: 'PROCTOR_HEARTBEAT',
        session: sessionWithTime,
      });
    }
  } catch {}

  // 2. Instant event in current window
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cbt-proctor-heartbeat', { detail: sessionWithTime })
      );
    }
  } catch {}

  // 3. Save to localStorage
  try {
    const localMap = JSON.parse(localStorage.getItem('cbt_active_proctor_sessions') || '{}');
    localMap[session.id] = sessionWithTime;
    localStorage.setItem('cbt_active_proctor_sessions', JSON.stringify(localMap));
  } catch {}

  // 4. Post to Express Server
  try {
    const res = await fetch('/api/proctor/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionWithTime),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.deleted) {
        markProctorSessionAsDeleted(session.id);
        return false;
      }
      if (json?.adminWarningMessage) {
        triggerLocalWarning(session.id, json.adminWarningMessage);
      }
    }
  } catch {}

  // 5. Save to Firestore (non-blocking)
  try {
    const docRef = doc(db, PROCTOR_COLLECTION, session.id);
    setDoc(docRef, sessionWithTime, { merge: true }).catch(() => {});
  } catch {}

  return true;
}

/**
 * Berlangganan data seluruh peserta ujian yang sedang aktif mengerjakan secara realtime (CCTV Admin)
 */
export function subscribeToLiveProctorSessions(
  onUpdate: (sessions: LiveProctorSession[]) => void
): () => void {
  const sessionMap = new Map<string, LiveProctorSession>();

  const emitMerged = () => {
    const deletedSet = getDeletedProctorSessionIds();
    const now = Date.now();
    const list: LiveProctorSession[] = [];
    for (const [id, data] of sessionMap.entries()) {
      if (deletedSet.has(id)) {
        sessionMap.delete(id);
        continue;
      }
      const lastPingTime = new Date(data.lastPing).getTime();
      const isStale = now - lastPingTime > 90000;
      list.push({
        ...data,
        status: data.status === 'submitted' ? 'submitted' : isStale ? 'offline' : data.status,
      });
    }
    // Sort online/warning first, then submitted
    list.sort((a, b) => {
      if (a.status === 'warning' && b.status !== 'warning') return -1;
      if (b.status === 'warning' && a.status !== 'warning') return 1;
      if (a.status === 'online' && b.status === 'offline') return -1;
      return new Date(b.lastPing).getTime() - new Date(a.lastPing).getTime();
    });
    onUpdate(list);
  };

  const onInstantDelete = (deletedId?: string) => {
    if (deletedId) {
      sessionMap.delete(deletedId);
    } else {
      sessionMap.clear();
    }
    emitMerged();
  };
  proctorSessionDeleteListeners.add(onInstantDelete);

  // 1. BroadcastChannel instant listener for video-call frequency updates
  let broadcastChannel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('cbt_proctor_channel');
      broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (data && data.type === 'PROCTOR_HEARTBEAT' && data.session?.id) {
          const deletedSet = getDeletedProctorSessionIds();
          if (!deletedSet.has(data.session.id)) {
            sessionMap.set(data.session.id, data.session);
            emitMerged();
          }
        }
      };
    }
  } catch {}

  // 2. CustomEvent listener
  const onCustomHeartbeat = (e: any) => {
    const session = e.detail;
    if (session?.id) {
      const deletedSet = getDeletedProctorSessionIds();
      if (!deletedSet.has(session.id)) {
        sessionMap.set(session.id, session);
        emitMerged();
      }
    }
  };
  window.addEventListener('cbt-proctor-heartbeat', onCustomHeartbeat);

  // 3. Storage event listener (sync across tabs)
  const onStorageChange = (e: StorageEvent) => {
    if (e.key === 'cbt_active_proctor_sessions' && e.newValue) {
      try {
        const map = JSON.parse(e.newValue);
        const deletedSet = getDeletedProctorSessionIds();
        for (const s of Object.values(map) as LiveProctorSession[]) {
          if (s?.id && !deletedSet.has(s.id)) {
            sessionMap.set(s.id, s);
          }
        }
        emitMerged();
      } catch {}
    }
  };
  window.addEventListener('storage', onStorageChange);

  // Poll Express API for instantaneous updates
  const pollServer = async () => {
    try {
      const res = await fetch('/api/proctor/sessions');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.sessions)) {
          // Sync any deleted IDs reported by server
          if (Array.isArray(json.deletedIds)) {
            json.deletedIds.forEach((id: string) => {
              if (id) {
                inMemoryDeletedSessionIds.add(id);
                inMemoryDeletedSessionIds.add(decodeURIComponent(id));
              }
            });
          }

          const deletedSet = getDeletedProctorSessionIds();
          const activeIdsFromServer = new Set<string>();
          json.sessions.forEach((s: any) => {
            if (s?.id) {
              activeIdsFromServer.add(s.id);
              activeIdsFromServer.add(decodeURIComponent(s.id));
            }
          });

          // Only prune sessions that are in deletedSet or have gone stale (> 15 minutes)
          const nowTime = Date.now();
          for (const [existingId, sessData] of sessionMap.entries()) {
            if (deletedSet.has(existingId) || deletedSet.has(decodeURIComponent(existingId))) {
              sessionMap.delete(existingId);
              continue;
            }
            const pingAge = nowTime - new Date(sessData.lastPing || 0).getTime();
            if (pingAge > 900000) {
              sessionMap.delete(existingId);
            }
          }

          for (const s of json.sessions) {
            if (!s?.id || deletedSet.has(s.id) || deletedSet.has(decodeURIComponent(s.id))) {
              sessionMap.delete(s.id);
              continue;
            }
            const existing = sessionMap.get(s.id);
            if (!existing || new Date(s.lastPing).getTime() >= new Date(existing.lastPing).getTime()) {
              sessionMap.set(s.id, s);
            }
          }
          emitMerged();
        }
      }
    } catch {
      // Fallback from localStorage
      const deletedSet = getDeletedProctorSessionIds();
      try {
        const localMap = JSON.parse(localStorage.getItem('cbt_active_proctor_sessions') || '{}');
        for (const s of Object.values(localMap) as LiveProctorSession[]) {
          if (!deletedSet.has(s.id) && !deletedSet.has(decodeURIComponent(s.id)) && !sessionMap.has(s.id)) {
            sessionMap.set(s.id, s);
          }
        }
        emitMerged();
      } catch {}
    }
  };

  pollServer();
  const pollInterval = setInterval(pollServer, 1000);

  // Firestore real-time snapshot
  let unsubscribeFirestore = () => {};
  try {
    const colRef = collection(db, PROCTOR_COLLECTION);
    unsubscribeFirestore = onSnapshot(
      colRef,
      (snapshot) => {
        const deletedSet = getDeletedProctorSessionIds();

        // Handle document deletions immediately!
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            sessionMap.delete(change.doc.id);
            sessionMap.delete(decodeURIComponent(change.doc.id));
          }
        });

        snapshot.forEach((docSnap) => {
          const id = docSnap.id;
          if (deletedSet.has(id) || deletedSet.has(decodeURIComponent(id))) {
            sessionMap.delete(id);
            deleteDoc(docSnap.ref).catch(() => {});
            return;
          }
          const data = docSnap.data() as LiveProctorSession;
          const s = { ...data, id };
          const existing = sessionMap.get(id);
          if (!existing || new Date(s.lastPing).getTime() >= new Date(existing.lastPing).getTime()) {
            sessionMap.set(id, s);
          }
        });
        emitMerged();
      },
      (err) => {
        console.warn('Gagal subscribe live proctor sessions Firestore, polling lokal aktif:', err);
      }
    );
  } catch (err) {
    console.warn('Error saat subscribe live proctor sessions:', err);
  }

  return () => {
    proctorSessionDeleteListeners.delete(onInstantDelete);
    clearInterval(pollInterval);
    unsubscribeFirestore();
  };
}

// Global listener set for active student warning subscriptions
const activeWarningListeners = new Map<string, Set<(message: string) => void>>();

export function triggerLocalWarning(sessionId: string, message: string) {
  const set = activeWarningListeners.get(sessionId);
  if (set) {
    set.forEach((fn) => {
      try {
        fn(message);
      } catch {}
    });
  }
  // Also notify any wildcard or general listener
  const allSet = activeWarningListeners.get('all');
  if (allSet) {
    allSet.forEach((fn) => {
      try {
        fn(message);
      } catch {}
    });
  }
}

/**
 * Admin mengirimkan pesan teguran / peringatan langsung ke layar peserta tertentu
 */
export async function sendAdminWarningToStudent(
  sessionId: string,
  warningMessage: string,
  studentName?: string
): Promise<boolean> {
  const now = Date.now();

  // 1. Trigger local in-memory event directly (instant within same browser window/tab)
  triggerLocalWarning(sessionId, warningMessage);
  if (studentName) {
    triggerLocalWarning(studentName.toLowerCase().trim(), warningMessage);
  }

  // 2. Broadcast via singleton BroadcastChannel (ultra fast cross-tab sync in all modern browsers)
  try {
    const bc = getProctorBroadcastChannel();
    if (bc) {
      bc.postMessage({
        type: 'PROCTOR_WARNING',
        sessionId,
        studentName: studentName || '',
        message: warningMessage,
        timestamp: now,
      });
    }
  } catch {}

  // 3. Trigger CustomEvent on window
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cbt-admin-warning', {
          detail: { sessionId, studentName, message: warningMessage, timestamp: now },
        })
      );
    }
  } catch {}

  // 4. Broadcast via LocalStorage (instant across different tabs in same browser)
  try {
    const payload = JSON.stringify({ message: warningMessage, timestamp: now, studentName, sessionId });
    localStorage.setItem(`cbt_warning_${sessionId}`, payload);
    if (studentName) {
      localStorage.setItem(`cbt_warning_name_${encodeURIComponent(studentName.toLowerCase().trim())}`, payload);
    }
    if (sessionId === 'all' || sessionId === 'broadcast') {
      localStorage.setItem('cbt_warning_broadcast', payload);
      localStorage.setItem('cbt_warning_active', payload);
    }
  } catch {}

  // 5. Post to Express Server API
  try {
    await fetch('/api/proctor/warning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, warningMessage, studentName }),
    });
  } catch {}

  // 6. Post to Firestore
  try {
    const docRef = doc(db, PROCTOR_COLLECTION, sessionId);
    await setDoc(
      docRef,
      {
        adminWarningMessage: warningMessage,
        warningTimestamp: now,
        status: 'warning',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('Gagal mengirim teguran ke siswa:', err);
    return false;
  }
}

export async function acknowledgeAdminWarning(sessionId: string, studentName?: string): Promise<void> {
  try {
    localStorage.removeItem(`cbt_warning_${sessionId}`);
    localStorage.removeItem('cbt_warning_active');
    localStorage.removeItem('cbt_warning_broadcast');
    if (studentName) {
      localStorage.removeItem(`cbt_warning_name_${encodeURIComponent(studentName.toLowerCase().trim())}`);
    }
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cbt-admin-warning-ack', { detail: { sessionId, studentName } }));
    }
  } catch {}
  try {
    await fetch('/api/proctor/warning/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, studentName }),
    });
  } catch {}
}

/**
 * Siswa mendengarkan pesan peringatan dari Admin secara realtime
 */
export function subscribeToStudentAdminWarning(
  sessionId: string,
  onWarning: (message: string) => void,
  studentName?: string
): () => void {
  let lastTimestamp = 0;
  let lastMessage = '';

  const handleIncoming = (msg: string, ts?: number) => {
    if (!msg || !msg.trim()) return;
    const nowTime = ts || Date.now();
    if (msg !== lastMessage || nowTime !== lastTimestamp) {
      lastMessage = msg;
      lastTimestamp = nowTime;
      onWarning(msg);
    }
  };

  // 1. Register to local in-memory listeners
  if (!activeWarningListeners.has(sessionId)) {
    activeWarningListeners.set(sessionId, new Set());
  }
  activeWarningListeners.get(sessionId)!.add(handleIncoming);

  if (studentName) {
    const nameKey = studentName.toLowerCase().trim();
    if (!activeWarningListeners.has(nameKey)) {
      activeWarningListeners.set(nameKey, new Set());
    }
    activeWarningListeners.get(nameKey)!.add(handleIncoming);
  }

  // 2. BroadcastChannel listener (instant cross-tab messaging)
  const onBcMessage = (event: MessageEvent) => {
    const data = event.data;
    if (data && data.type === 'PROCTOR_WARNING' && data.message) {
      const matchSession = !data.sessionId || data.sessionId === 'all' || data.sessionId === 'broadcast' || data.sessionId === sessionId;
      const matchName = !data.studentName || (studentName && data.studentName.toLowerCase().trim() === studentName.toLowerCase().trim());
      if (matchSession || matchName) {
        handleIncoming(data.message, data.timestamp);
      }
    }
  };
  try {
    const bc = getProctorBroadcastChannel();
    if (bc) {
      bc.addEventListener('message', onBcMessage);
    }
  } catch {}

  // 3. CustomEvent listener
  const handleCustomEvent = (e: any) => {
    const detail = e.detail;
    if (detail && detail.message) {
      const matchSession = !detail.sessionId || detail.sessionId === 'all' || detail.sessionId === 'broadcast' || detail.sessionId === sessionId;
      const matchName = !detail.studentName || (studentName && detail.studentName.toLowerCase().trim() === studentName.toLowerCase().trim());
      if (matchSession || matchName) {
        handleIncoming(detail.message, detail.timestamp);
      }
    }
  };
  window.addEventListener('cbt-admin-warning', handleCustomEvent);

  // Listen for local warning ack so subsequent identical messages trigger properly
  const onLocalAck = () => {
    lastMessage = '';
    lastTimestamp = 0;
  };
  window.addEventListener('cbt-admin-warning-ack', onLocalAck);

  // 4. Storage event listener (immediate sync between tabs)
  const checkLocalStorage = () => {
    try {
      const nameKey = studentName ? `cbt_warning_name_${encodeURIComponent(studentName.toLowerCase().trim())}` : '';
      const localRaw =
        localStorage.getItem(`cbt_warning_${sessionId}`) ||
        (nameKey ? localStorage.getItem(nameKey) : null) ||
        localStorage.getItem('cbt_warning_broadcast');
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        const matchSession = !parsed.sessionId || parsed.sessionId === 'all' || parsed.sessionId === 'broadcast' || parsed.sessionId === sessionId;
        const matchName = !parsed.studentName || (studentName && parsed.studentName.toLowerCase().trim() === studentName.toLowerCase().trim());
        if ((matchSession || matchName) && parsed?.message && parsed?.timestamp && Date.now() - parsed.timestamp < 120000) {
          handleIncoming(parsed.message, parsed.timestamp);
        }
      }
    } catch {}
  };

  const handleStorage = (e: StorageEvent) => {
    const isTargetKey =
      e.key === `cbt_warning_${sessionId}` ||
      e.key === 'cbt_warning_broadcast' ||
      (studentName && e.key === `cbt_warning_name_${encodeURIComponent(studentName.toLowerCase().trim())}`);

    if (isTargetKey && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.message) {
          handleIncoming(parsed.message, parsed.timestamp);
        }
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // Check localStorage immediately on mount
  checkLocalStorage();

  // 5. Fast Server Polling & LocalStorage Polling (every 1000ms)
  const checkServerWarning = async () => {
    checkLocalStorage();
    try {
      const queryParam = studentName ? `?nama=${encodeURIComponent(studentName)}` : '';
      const res = await fetch(`/api/proctor/warning/${sessionId}${queryParam}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.warningMessage) {
          handleIncoming(json.warningMessage, json.warningTimestamp);
        }
      }
    } catch {}
  };
  const interval = setInterval(checkServerWarning, 1000);

  // 6. Firestore Realtime Snapshot
  let unsubFirestore = () => {};
  try {
    const docRef = doc(db, PROCTOR_COLLECTION, sessionId);
    unsubFirestore = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.adminWarningMessage) {
          handleIncoming(data.adminWarningMessage, data.warningTimestamp);
        }
      }
    });
  } catch {}

  return () => {
    activeWarningListeners.get(sessionId)?.delete(handleIncoming);
    if (studentName) {
      activeWarningListeners.get(studentName.toLowerCase().trim())?.delete(handleIncoming);
    }
    try {
      const bc = getProctorBroadcastChannel();
      if (bc) {
        bc.removeEventListener('message', onBcMessage);
      }
    } catch {}
    window.removeEventListener('cbt-admin-warning', handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    clearInterval(interval);
    unsubFirestore();
  };
}

/**
 * Hapus sesi proctor ketika ujian telah selesai secara permanen
 */
export async function removeStudentLiveProctorSession(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const decoded = decodeURIComponent(sessionId);

  // 1. Mark permanently deleted in client storage and in-memory set immediately
  markProctorSessionAsDeleted(sessionId);
  markProctorSessionAsDeleted(decoded);

  // 2. Notify in-memory subscribers for instantaneous removal
  proctorSessionDeleteListeners.forEach((fn) => {
    try {
      fn(sessionId);
      fn(decoded);
    } catch {}
  });

  // 3. Delete from Server
  try {
    await fetch(`/api/proctor/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
  } catch {}

  // 4. Delete from Firestore (both raw and decoded if different)
  try {
    await deleteDoc(doc(db, PROCTOR_COLLECTION, sessionId));
    if (decoded !== sessionId) {
      await deleteDoc(doc(db, PROCTOR_COLLECTION, decoded));
    }
  } catch {}

  // 5. Clean local storage active sessions
  try {
    const raw = localStorage.getItem('cbt_active_proctor_sessions');
    if (raw) {
      const map = JSON.parse(raw);
      delete map[sessionId];
      delete map[decoded];
      localStorage.setItem('cbt_active_proctor_sessions', JSON.stringify(map));
    }
  } catch {}

  return true;
}

/**
 * Hapus seluruh sesi rekaman multi-camera peserta ujian sekaligus
 */
export async function removeAllStudentLiveProctorSessions(sessionIdsToClear?: string[]): Promise<boolean> {
  // 1. Mark all session IDs as deleted in client storage and in-memory set
  try {
    if (sessionIdsToClear && sessionIdsToClear.length > 0) {
      sessionIdsToClear.forEach((id) => {
        if (id) {
          markProctorSessionAsDeleted(id);
          markProctorSessionAsDeleted(decodeURIComponent(id));
        }
      });
    }
    localStorage.removeItem('cbt_active_proctor_sessions');
  } catch {}

  // 2. Notify in-memory subscribers for instantaneous removal
  proctorSessionDeleteListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });

  // 3. Delete from Server
  try {
    await fetch('/api/proctor/sessions/all', { method: 'DELETE' });
  } catch {}

  // 4. Delete all from Firestore
  try {
    const colRef = collection(db, PROCTOR_COLLECTION);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const deletePromises = snap.docs.map((d) => {
        markProctorSessionAsDeleted(d.id);
        return deleteDoc(d.ref);
      });
      await Promise.all(deletePromises);
    }
    return true;
  } catch (err) {
    console.warn('Gagal menghapus seluruh sesi proctor di Firestore:', err);
    return true;
  }
}

/**
 * Ambil data paket mata pelajaran terbaru dari cloud/server secara on-demand
 */
export async function fetchCloudSubjects(): Promise<SubjectPackage[] | null> {
  try {
    const res = await fetch('/api/subjects');
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.subjects) && data.subjects.length > 0) {
        return data.subjects;
      }
    }
  } catch {}

  try {
    const docRef = doc(db, CONFIG_COLLECTION, 'school_subjects');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.list) && data.list.length > 0) {
        return data.list;
      }
    }
  } catch {}
  return null;
}

/**
 * Simpan daftar paket mata pelajaran (termasuk TKA 1 Matematika & Bahasa Indonesia)
 * ke Cloud Firestore & Express server agar tersimpan permanen lintas sesi dan gawai
 */
export async function saveSubjectsToCloud(subjects: SubjectPackage[]): Promise<boolean> {
  if (!Array.isArray(subjects) || subjects.length === 0) return false;

  // 1. Post to Express Server
  try {
    fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjects }),
    }).catch(() => {});
  } catch {}

  // 2. Save to Firestore
  try {
    const docRef = doc(db, CONFIG_COLLECTION, 'school_subjects');
    const cleanSubjects = JSON.parse(JSON.stringify(subjects));
    await setDoc(
      docRef,
      {
        list: cleanSubjects,
        updatedAt: new Date().toISOString(),
      }
    );
    return true;
  } catch (err) {
    console.warn('Gagal menyimpan subjects ke cloud Firestore:', err);
    return false;
  }
}

/**
 * Berlangganan sinkronisasi mata pelajaran secara realtime dari Firestore & server
 */
export function subscribeToCloudSubjects(
  onUpdate: (subjects: SubjectPackage[]) => void
): () => void {
  // 1. Fetch from server endpoint first for instantaneous cache
  fetch('/api/subjects')
    .then((r) => r.json())
    .then((data) => {
      if (data?.success && Array.isArray(data.subjects) && data.subjects.length > 0) {
        onUpdate(data.subjects);
      }
    })
    .catch(() => {});

  // 2. Real-time Firestore subscription
  try {
    const docRef = doc(db, CONFIG_COLLECTION, 'school_subjects');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.list) && data.list.length > 0) {
            onUpdate(data.list);
          }
        }
      },
      (error) => {
        console.warn('Firestore subscription error for subjects:', error);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Permintaan Token WebRTC / Room VoIP untuk Peserta Ujian dan Pengawas
 */
export async function getWebRtcRoomToken(
  sessionId: string,
  role: 'student' | 'proctor',
  name?: string
): Promise<any> {
  try {
    const res = await fetch('/api/webrtc/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, role, name }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Gagal memperoleh token WebRTC:', err);
  }
  return null;
}

/**
 * Kirim sinyal WebRTC (SDP Offer/Answer/ICE Candidate)
 */
export async function sendWebRtcSignal(
  from: string,
  to: string,
  type: string,
  data: any
): Promise<boolean> {
  try {
    const res = await fetch('/api/webrtc/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, type, data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Ambil antrean sinyal WebRTC untuk sesi siswa atau pengawas
 */
export async function fetchWebRtcSignals(sessionId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/webrtc/signals/${encodeURIComponent(sessionId)}`);
    if (res.ok) {
      const json = await res.json();
      return json?.signals || [];
    }
  } catch {}
  return [];
}

/**
 * Proctor menyiarkan suara dua arah (Push-to-Talk Intercom) ke siswa tertentu atau semua siswa
 */
export async function sendProctorIntercomBroadcast(
  targetSessionId: string,
  audioDataUrl: string,
  proctorName?: string,
  textAnnouncement?: string
): Promise<boolean> {
  try {
    // 1. Post to Express Server API
    const res = await fetch('/api/proctor/intercom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetSessionId,
        audioDataUrl,
        proctorName: proctorName || 'Pengawas Ujian',
        textAnnouncement,
      }),
    });

    // 2. Broadcast via BroadcastChannel for instant same-browser cross-tab intercom
    const bc = getProctorBroadcastChannel();
    if (bc) {
      bc.postMessage({
        type: 'PROCTOR_INTERCOM_AUDIO',
        targetSessionId,
        audioDataUrl,
        proctorName: proctorName || 'Pengawas Ujian',
        textAnnouncement,
        timestamp: Date.now(),
      });
    }

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Siswa mendengarkan siaran interkom suara dari pengawas secara realtime
 */
export function subscribeToStudentIntercom(
  sessionId: string,
  onIntercomAudio: (audioDataUrl: string, proctorName: string, text?: string) => void
): () => void {
  // 1. BroadcastChannel instant listener
  const onBcMessage = (event: MessageEvent) => {
    const data = event.data;
    if (data && data.type === 'PROCTOR_INTERCOM_AUDIO') {
      const match = !data.targetSessionId || data.targetSessionId === 'all' || data.targetSessionId === sessionId;
      if (match && data.audioDataUrl) {
        onIntercomAudio(data.audioDataUrl, data.proctorName, data.textAnnouncement);
      }
    }
  };
  try {
    const bc = getProctorBroadcastChannel();
    if (bc) {
      bc.addEventListener('message', onBcMessage);
    }
  } catch {}

  // 2. Fast poller from server
  const pollIntercom = async () => {
    try {
      const res = await fetch(`/api/proctor/intercom/${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.messages && Array.isArray(json.messages)) {
          json.messages.forEach((m: any) => {
            if (m.audioDataUrl) {
              onIntercomAudio(m.audioDataUrl, m.proctorName, m.textAnnouncement);
            }
          });
        }
      }
    } catch {}
  };
  const interval = setInterval(pollIntercom, 1000);

  return () => {
    clearInterval(interval);
    try {
      const bc = getProctorBroadcastChannel();
      if (bc) {
        bc.removeEventListener('message', onBcMessage);
      }
    } catch {}
  };
}



