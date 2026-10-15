import { Question, ExamSettings, ExamResult } from '../types';

export function generateStandaloneHtml(
  questions: Question[],
  settings: ExamSettings,
  results: ExamResult[],
  studentOnly: boolean = false
): string {
  const jsonQuestions = JSON.stringify(questions, null, 2);
  const jsonSettings = JSON.stringify(settings, null, 2);
  const jsonResults = JSON.stringify(studentOnly ? [] : results, null, 2);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${settings.judul} - ${settings.sekolah}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
    .no-select { user-select: none; -webkit-user-select: none; }
    .portal-bg { background: linear-gradient(135deg, #0056b3 0%, #003d82 100%); }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .opt-card { border: 2px solid #f1f5f9; padding: 1.25rem; border-radius: 1.5rem; cursor: pointer; display: flex; align-items: center; gap: 1rem; transition: all 0.2s; background: #fff; }
    .opt-card:hover { border-color: #3b82f6; background-color: #eff6ff; }
    .opt-card.selected { border-color: #2563eb; background-color: #dbeafe; box-shadow: 0 0 0 4px #bfdbfe; }
    .nav-btn { height: 3rem; width: 100%; border-radius: 1rem; font-weight: 900; font-size: 0.75rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; border: 2px solid #f1f5f9; cursor: pointer; }
    .nav-btn.answered { background: #22c55e; color: #fff; border-color: #16a34a; box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.2); }
    .nav-btn.current { box-shadow: 0 0 0 3px #2563eb; border-color: #fff; transform: scale(1.05); }
    .nav-btn.doubt { background: #eab308; color: #fff; border-color: #ca8a04; }
    .nav-btn.normal { background: #f8fafc; color: #64748b; }
  </style>
</head>
<body class="no-select text-slate-800">

  <!-- OVERLAY ANTI-CHEAT -->
  <div id="cheat-overlay" class="fixed inset-0 bg-red-700/98 z-[9999] text-white hidden flex-col items-center justify-center text-center p-6 backdrop-blur-md">
    <i class="fas fa-exclamation-triangle text-8xl mb-6"></i>
    <h1 class="text-5xl font-black mb-4 uppercase tracking-tight">PELANGGARAN TERDETEKSI!</h1>
    <p class="text-xl mb-8 max-w-lg font-medium">Dilarang berpindah tab atau meminimalkan browser saat ujian berlangsung.</p>
    <div class="text-8xl font-black mb-8 bg-white text-red-700 px-10 py-3 rounded-3xl shadow-2xl" id="cheat-timer">10</div>
    <button onclick="dismissCheat()" class="bg-white text-slate-900 px-12 py-4 rounded-full font-black uppercase shadow-2xl hover:bg-slate-100 transition">Kembali Ke Ujian</button>
  </div>

  <!-- 1. PORTAL VIEW -->
  <div id="view-portal" class="portal-bg min-h-screen flex flex-col items-center justify-center p-6 text-white text-center">
    <div class="max-w-4xl w-full">
      <img id="portal-logo" src="${settings.logoUrl}" class="h-24 mx-auto mb-6 drop-shadow-xl object-contain" alt="Logo Sekolah">
      <div id="portal-sekolah-badge" class="inline-block bg-white/10 backdrop-blur-sm text-blue-200 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">${settings.sekolah}</div>
      <h1 id="portal-sekolah" class="text-4xl md:text-6xl font-black uppercase tracking-tight mb-3 leading-tight">${settings.sekolah}</h1>
      <p id="portal-judul" class="text-xl md:text-2xl font-bold opacity-90 mb-2">${settings.judul}</p>
      <div class="inline-block bg-yellow-400/20 text-yellow-300 border border-yellow-300/30 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-10">
        Tahun Ajaran <span id="portal-ta">${settings.tahunAjaran || '2025/2026'}</span> • <span id="portal-mapel">${settings.mapel}</span>
      </div>

      ${
        studentOnly
          ? `
      <div class="max-w-md mx-auto">
        <div onclick="showLogin('siswa')" class="bg-white/10 backdrop-blur-md p-10 rounded-[3rem] cursor-pointer hover:bg-white hover:text-slate-900 transition-all border border-white/20 shadow-2xl">
          <i class="fas fa-user-graduate text-5xl mb-6 text-yellow-300"></i>
          <h3 class="text-3xl font-black uppercase mb-3">Peserta Ujian</h3>
          <p class="text-sm opacity-80 mb-6 font-medium">Masuk menggunakan Nama, Kelas, dan Token Ujian</p>
          <div class="bg-blue-600 text-white py-4 rounded-full font-black uppercase tracking-wider shadow-lg">Mulai Ujian Sekarang</div>
        </div>
      </div>
      `
          : `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <div onclick="showLogin('siswa')" class="bg-white/10 backdrop-blur-md p-10 rounded-[3rem] cursor-pointer hover:bg-white hover:text-slate-900 transition-all border border-white/20 shadow-2xl">
          <i class="fas fa-user-graduate text-5xl mb-6 text-yellow-300"></i>
          <h3 class="text-3xl font-black uppercase mb-3">Peserta Ujian</h3>
          <p class="text-sm opacity-80 mb-6 font-medium">Masuk menggunakan Nama, Kelas, dan Token Ujian</p>
          <div class="bg-blue-600 text-white py-4 rounded-full font-black uppercase tracking-wider shadow-lg">Mulai Ujian</div>
        </div>

        <div onclick="showLogin('guru')" class="bg-slate-950/40 backdrop-blur-md p-10 rounded-[3rem] cursor-pointer hover:bg-white hover:text-slate-900 transition-all border border-white/10 shadow-2xl">
          <i class="fas fa-user-shield text-5xl mb-6 text-blue-300"></i>
          <h3 class="text-3xl font-black uppercase mb-3">Panel Guru</h3>
          <p class="text-sm opacity-80 mb-6 font-medium">Kelola Bank Soal, Atur Token & Rekap Hasil Nilai</p>
          <div class="bg-slate-800 text-white py-4 rounded-full font-black uppercase tracking-wider shadow-lg">Akses Guru</div>
        </div>
      </div>
      `
      }
    </div>
  </div>

  <!-- 2. LOGIN VIEW -->
  <div id="view-login" class="hidden portal-bg min-h-screen flex items-center justify-center p-6">
    <div class="max-w-md w-full bg-white p-10 rounded-[4rem] shadow-2xl text-center border-b-8 border-yellow-400">
      <h2 id="login-title" class="text-3xl font-black text-blue-900 uppercase mb-8">Login Peserta</h2>
      
      <div id="form-siswa" class="space-y-4 mb-8">
        <input type="text" id="input-nama" placeholder="Nama Lengkap Siswa" class="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-blue-600 text-center text-lg">
        <input type="text" id="input-kelas" placeholder="Kelas (contoh: 5A / 6B)" class="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none focus:border-blue-600 text-center text-lg">
        <input type="text" id="input-token" placeholder="TOKEN UJIAN" class="w-full p-5 bg-slate-100 border-2 rounded-2xl font-black outline-none focus:border-blue-600 text-center text-2xl uppercase tracking-[0.3em] text-blue-900">
      </div>

      <div id="form-guru" class="hidden mb-8">
        <input type="password" id="input-password" placeholder="••••••" class="w-full p-6 bg-slate-50 border-2 rounded-2xl font-black outline-none focus:border-blue-600 text-center text-4xl tracking-widest text-slate-800">
      </div>

      <button onclick="handleLoginAction()" class="w-full bg-blue-600 text-white py-5 rounded-full font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition">Masuk</button>
      <button onclick="switchView('portal')" class="mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600">Batal / Kembali</button>
    </div>
  </div>

  <!-- 3. EXAM VIEW -->
  <div id="view-exam" class="hidden h-screen flex flex-col bg-slate-50 overflow-hidden">
    <header class="bg-blue-700 text-white p-4 px-8 flex justify-between items-center shadow-lg shrink-0 border-b-4 border-yellow-400">
      <div class="flex items-center gap-4">
        <img src="${settings.logoUrl}" class="h-10 bg-white p-1 rounded-lg">
        <div class="text-left leading-none">
          <h1 id="exam-title-display" class="font-black text-lg uppercase tracking-tight">${settings.judul}</h1>
          <p id="exam-mapel-display" class="text-xs text-blue-200 uppercase font-semibold mt-1">${settings.mapel}</p>
        </div>
      </div>
      <div class="flex items-center gap-6">
        <div class="bg-slate-900/60 px-6 py-2 rounded-2xl font-black text-2xl text-yellow-300 border border-white/20" id="timer-box">00:00:00</div>
        <div class="text-right leading-none hidden md:block">
          <p id="display-nama" class="font-black uppercase text-base">SISWA</p>
          <p id="display-kelas" class="text-xs text-blue-200 font-semibold mt-1">KELAS</p>
        </div>
      </div>
    </header>

    <!-- Visual Remaining Time Progress Bar -->
    <div class="w-full bg-white border-b border-slate-200/80 px-6 py-2.5 shadow-sm shrink-0 z-10">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5 text-xs">
        <div class="flex items-center gap-2">
          <i class="fas fa-hourglass-half text-blue-600"></i>
          <span class="font-black uppercase tracking-wider text-slate-700 text-[11px]">Sisa Waktu:</span>
          <span id="progress-time-display" class="font-mono font-black text-xs px-2.5 py-0.5 rounded-md border bg-slate-50 text-slate-800 border-slate-200">00:00:00</span>
          <span id="progress-percent-badge" class="font-bold text-[10px] px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">100% Tersisa</span>
        </div>
        <div class="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
          <span>Total Durasi: <strong id="progress-total-durasi" class="text-slate-800 font-bold">${settings.durasiMenit || 60} Menit</strong></span>
        </div>
      </div>
      <div class="relative w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 shadow-inner">
        <div id="exam-progress-bar-fill" class="h-full rounded-full transition-all duration-1000 ease-linear bg-gradient-to-r from-emerald-500 to-teal-500" style="width: 100%;"></div>
      </div>
    </div>

    <div class="flex-grow flex p-6 gap-6 overflow-hidden">
      <!-- Navigation Sidebar -->
      <div class="w-72 bg-white rounded-3xl shadow-md p-6 flex flex-col h-full border border-slate-200">
        <h3 class="font-black text-slate-400 uppercase text-xs tracking-widest mb-6 text-center border-b pb-3">Daftar Soal</h3>
        <div id="nav-grid" class="grid grid-cols-4 gap-2.5 overflow-y-auto pr-1 custom-scrollbar flex-grow content-start"></div>
        <button onclick="confirmSelesai()" class="mt-6 bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-red-700 transition">Selesai Ujian</button>
      </div>

      <!-- Question Content -->
      <div class="flex-grow flex flex-col gap-4 h-full">
        <div class="bg-white rounded-3xl shadow-md flex-grow p-8 md:p-12 overflow-y-auto border border-slate-200 custom-scrollbar text-left relative">
          <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <span id="q-number" class="bg-blue-600 text-white font-black px-6 py-1.5 rounded-full text-xs uppercase tracking-wider">SOAL NO 1</span>
            <div class="flex gap-2">
              <span id="q-diff" class="bg-slate-100 text-slate-600 font-bold px-4 py-1 rounded-full text-xs uppercase border">REGULER</span>
              <span id="q-type-label" class="bg-yellow-100 text-yellow-800 font-bold px-4 py-1 rounded-full text-xs uppercase">PILIHAN GANDA</span>
            </div>
          </div>

          <div id="q-image-container" class="mb-6 hidden">
            <img id="q-image" src="" class="max-h-64 rounded-2xl border-4 border-slate-100 mx-auto" alt="Gambar Soal">
          </div>

          <div id="q-text" class="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed mb-8">Memuat teks soal...</div>
          <div id="q-options" class="space-y-3 max-w-4xl"></div>
        </div>

        <div class="flex gap-4 shrink-0">
          <button onclick="prevQ()" class="flex-1 bg-white border-2 border-slate-200 py-4 rounded-2xl font-bold uppercase text-slate-600 tracking-wider shadow hover:bg-slate-50 transition">Sebelumnya</button>
          <label class="flex-[0.4] bg-yellow-400 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-white cursor-pointer shadow hover:bg-yellow-500 transition text-base">
            <input type="checkbox" id="chk-doubt" onchange="markDoubt()" class="w-5 h-5 accent-yellow-700 rounded"> RAGU
          </label>
          <button onclick="nextQ()" class="flex-1 bg-blue-600 py-4 rounded-2xl font-black uppercase text-white tracking-wider shadow-lg hover:bg-blue-700 transition">Berikutnya</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 4. RESULT VIEW -->
  <div id="view-result" class="hidden portal-bg min-h-screen flex items-center justify-center p-6 text-center">
    <div class="max-w-xl w-full bg-white p-12 rounded-[4rem] shadow-2xl border-b-[12px] border-blue-600">
      <div class="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl font-black">
        <i class="fas fa-check"></i>
      </div>
      <h2 class="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2">Ujian Selesai!</h2>
      <p id="res-info" class="text-slate-500 font-medium mb-8">Jawaban berhasil dikirim ke sistem.</p>
      
      <div class="bg-blue-50 p-8 rounded-3xl border border-blue-100 mb-8">
        <p class="text-xs text-blue-500 uppercase font-black tracking-widest mb-2">Nilai Akhir</p>
        <h1 id="res-score" class="text-8xl font-black text-blue-700 leading-none">0</h1>
        <p id="res-breakdown" class="text-xs text-slate-500 font-bold mt-4 uppercase">Benar 0 dari 0 Soal</p>
      </div>

      <button onclick="location.reload()" class="w-full bg-slate-900 text-white py-5 rounded-full font-black uppercase tracking-wider hover:bg-black transition">Tutup / Kembali ke Portal</button>
    </div>
  </div>

  <!-- 5. TEACHER MANAGEMENT VIEW -->
  ${
    studentOnly
      ? ''
      : `
  <div id="view-guru" class="hidden h-screen flex flex-col bg-slate-100 overflow-hidden text-left">
    <header class="bg-slate-900 text-white p-4 px-8 flex justify-between items-center shadow-lg shrink-0">
      <div class="flex items-center gap-3">
        <img id="guru-logo-thumb" src="${settings.logoUrl}" class="h-9 w-9 object-contain bg-white rounded-xl p-1" alt="Logo">
        <div>
          <h1 id="guru-sekolah-display" class="font-black text-lg uppercase tracking-tight leading-none">${settings.sekolah}</h1>
          <p class="text-[11px] text-slate-400 font-semibold uppercase mt-1">
            <span id="guru-judul-display">${settings.judul}</span> • T.A. <span id="guru-ta-display">${settings.tahunAjaran || '2025/2026'}</span>
          </p>
        </div>
      </div>
      <button onclick="location.reload()" class="bg-red-500/20 text-red-400 border border-red-500/30 px-5 py-2 rounded-full font-black text-xs uppercase hover:bg-red-500 hover:text-white transition">Keluar</button>
    </header>

    <main class="flex-grow p-6 md:p-8 overflow-y-auto custom-scrollbar">
      <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Left Column: Settings & Input -->
        <div class="lg:col-span-5 space-y-6">
          <!-- Exam Settings -->
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 class="font-black uppercase text-xs mb-4 text-blue-600 flex items-center gap-2">
              <i class="fas fa-sliders-h"></i> 1. Pengaturan Identitas & Ujian
            </h3>
            <div class="space-y-3">
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Upload / URL Logo Sekolah</label>
                <div class="flex gap-2">
                  <input type="text" id="set-logo" placeholder="URL Logo Sekolah" class="w-full p-2.5 bg-slate-50 rounded-xl border text-xs">
                  <label class="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-700 flex items-center gap-1 shrink-0">
                    <i class="fas fa-upload"></i> Unggah
                    <input type="file" accept="image/*" class="hidden" onchange="uploadLogoStandalone(event)">
                  </label>
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Nama Sekolah</label>
                <input type="text" id="set-sekolah" placeholder="Nama Sekolah" class="w-full p-2.5 bg-slate-50 rounded-xl border text-xs font-bold">
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Judul Ujian</label>
                  <input type="text" id="set-judul" placeholder="Judul Ujian" class="w-full p-2.5 bg-slate-50 rounded-xl border text-xs font-bold">
                </div>
                <div>
                  <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Tahun Ajaran</label>
                  <input type="text" id="set-ta" placeholder="2025/2026" class="w-full p-2.5 bg-slate-50 rounded-xl border text-xs font-bold">
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Mata Pelajaran</label>
                <input type="text" id="set-mapel" placeholder="Mata Pelajaran" class="w-full p-2.5 bg-slate-50 rounded-xl border text-xs font-bold">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Durasi (Menit)</label>
                  <input type="number" id="set-durasi" placeholder="Menit" class="w-full p-2.5 bg-slate-50 rounded-xl border text-xs font-bold">
                </div>
                <div>
                  <label class="block text-[11px] font-black uppercase text-slate-500 mb-1">Token Masuk</label>
                  <input type="text" id="set-token" placeholder="Token" class="w-full p-2.5 bg-yellow-50 border-yellow-300 text-blue-900 rounded-xl border text-center font-black uppercase text-xs">
                </div>
              </div>
              <button onclick="saveSettings()" class="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-xs tracking-wider hover:bg-black transition">Simpan Pengaturan</button>
            </div>
          </div>

          <!-- Add Question Form -->
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 class="font-black uppercase text-xs mb-4 text-blue-600 flex items-center gap-2">
              <i class="fas fa-plus-circle"></i> 2. Tambah Soal Baru
            </h3>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-2">
                <select id="guru-tipe" onchange="toggleFormSoal()" class="p-3 bg-blue-50 border border-blue-200 rounded-xl font-bold text-xs uppercase">
                  <option value="PG">Pilihan Ganda (PG)</option>
                  <option value="PGK">PG Kompleks (PGK)</option>
                  <option value="BS">Benar / Salah (BS)</option>
                </select>
                <select id="guru-diff" class="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs uppercase">
                  <option value="REGULER">REGULER</option>
                  <option value="HOTS">HOTS</option>
                </select>
              </div>

              <textarea id="guru-soal" placeholder="Ketik isi pertanyaan..." class="w-full p-4 border rounded-xl h-24 text-sm font-medium bg-slate-50"></textarea>
              <input type="text" id="guru-image" placeholder="URL Gambar (Opsional/Boleh Kosong)" class="w-full p-3 border rounded-xl text-xs bg-slate-50">

              <div id="area-opsi" class="space-y-2">
                <input type="text" id="opt-1" placeholder="Pilihan A" class="w-full p-2.5 border rounded-lg text-xs">
                <input type="text" id="opt-2" placeholder="Pilihan B" class="w-full p-2.5 border rounded-lg text-xs">
                <input type="text" id="opt-3" placeholder="Pilihan C" class="w-full p-2.5 border rounded-lg text-xs">
                <input type="text" id="opt-4" placeholder="Pilihan D" class="w-full p-2.5 border rounded-lg text-xs">
              </div>

              <input type="text" id="guru-kunci" placeholder="Kunci: A (atau A,C untuk PGK, Benar untuk BS)" class="w-full p-3 bg-green-50 border border-green-200 rounded-xl text-center font-black uppercase text-xs">

              <button onclick="addSoal()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-md hover:bg-blue-700 transition">Tambahkan Ke Bank Soal</button>
            </div>
          </div>
        </div>

        <!-- Right Column: Question Bank & Results -->
        <div class="lg:col-span-7 space-y-6">
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-black uppercase text-xs text-slate-700 flex items-center gap-2">
                <i class="fas fa-list"></i> Bank Soal Aktif
              </h3>
              <span id="count-soal" class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black">0 Soal</span>
            </div>
            <div id="guru-list-soal" class="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-2"></div>
          </div>

          <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-black uppercase text-xs text-slate-700 flex items-center gap-2">
                <i class="fas fa-table"></i> Rekap Nilai Siswa
              </h3>
              <button onclick="exportCSV()" class="bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase hover:bg-green-700 transition">
                <i class="fas fa-file-excel mr-1"></i> Download CSV
              </button>
            </div>
            <div class="overflow-x-auto border rounded-2xl">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 uppercase text-[10px] font-black border-b text-slate-600">
                  <tr>
                    <th class="p-3">Nama Siswa</th>
                    <th class="p-3">Kelas</th>
                    <th class="p-3 text-center">Nilai</th>
                    <th class="p-3 text-center">Waktu</th>
                  </tr>
                </thead>
                <tbody id="scoreTableBody" class="divide-y text-slate-700"></tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
  `
  }

  <script>
    // Inisialisasi Data
    let questions = ${jsonQuestions};
    let settings = ${jsonSettings};
    let results = ${jsonResults};
    const isStudentOnlyMode = ${studentOnly};

    let userAnswers = {};
    let userDoubts = {};
    let currentIdx = 0;
    let timer = null;
    let examTimeLeft = settings.durasiMenit * 60;
    let isExamActive = false;
    let cheatCounter = 10;
    let cheatTimer = null;
    let currentUser = { nama: '', kelas: '' };

    function switchView(viewId) {
      document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
      const target = document.getElementById('view-' + viewId);
      if (target) target.classList.remove('hidden');
    }

    function showLogin(mode) {
      if (isStudentOnlyMode && mode === 'guru') return;
      window.loginMode = mode;
      switchView('login');
      document.getElementById('login-title').innerText = mode === 'siswa' ? 'Login Peserta' : 'Verifikasi Guru';
      document.getElementById('form-siswa').classList.toggle('hidden', mode !== 'siswa');
      const formGuru = document.getElementById('form-guru');
      if (formGuru) formGuru.classList.toggle('hidden', mode !== 'guru');
    }

    function handleLoginAction() {
      if (window.loginMode === 'guru') {
        const pass = document.getElementById('input-password').value;
        if (pass === settings.adminPass) {
          switchView('guru');
          renderGuruSoal();
          loadDashboard();
        } else {
          alert('Password Guru Salah! Default: ' + settings.adminPass);
        }
      } else {
        const nama = document.getElementById('input-nama').value.trim();
        const kelas = document.getElementById('input-kelas').value.trim();
        const token = document.getElementById('input-token').value.trim().toUpperCase();

        if (!nama || !kelas || !token) return alert('Harap isi Nama, Kelas, dan Token Ujian!');
        if (token !== settings.token.toUpperCase()) return alert('Token Ujian Salah! Hubungi pengawas/guru.');
        if (questions.length === 0) return alert('Bank soal masih kosong. Silakan hubungi guru.');

        currentUser = { nama, kelas };
        document.getElementById('display-nama').innerText = nama;
        document.getElementById('display-kelas').innerText = kelas;
        document.getElementById('exam-title-display').innerText = settings.judul;
        document.getElementById('exam-mapel-display').innerText = settings.mapel;

        startExam();
      }
    }

    function startExam() {
      isExamActive = true;
      examTimeLeft = settings.durasiMenit * 60;
      currentIdx = 0;
      userAnswers = {};
      userDoubts = {};
      switchView('exam');
      renderNav();
      renderSoal();
      startTimer();
      try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); } catch(e){}
    }

    function startTimer() {
      if (timer) clearInterval(timer);
      const timerBox = document.getElementById('timer-box');
      const progressTimeDisplay = document.getElementById('progress-time-display');
      const progressPercentBadge = document.getElementById('progress-percent-badge');
      const examProgressBarFill = document.getElementById('exam-progress-bar-fill');
      const totalSeconds = Math.max(1, (settings.durasiMenit || 60) * 60);

      timer = setInterval(() => {
        examTimeLeft--;
        if (examTimeLeft < 0) examTimeLeft = 0;
        const h = Math.floor(examTimeLeft / 3600);
        const m = Math.floor((examTimeLeft % 3600) / 60);
        const s = examTimeLeft % 60;
        const timeStr = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        const pct = Math.max(0, Math.min(100, (examTimeLeft / totalSeconds) * 100));

        if (timerBox) {
          timerBox.innerText = timeStr;
          if (examTimeLeft <= 60) {
            timerBox.className = 'bg-rose-600 text-white px-6 py-2 rounded-2xl font-black text-2xl border border-rose-400 animate-pulse';
          } else if (examTimeLeft <= 300) {
            timerBox.className = 'bg-amber-500 text-slate-950 px-6 py-2 rounded-2xl font-black text-2xl border border-amber-300';
          } else {
            timerBox.className = 'bg-slate-900/60 px-6 py-2 rounded-2xl font-black text-2xl text-yellow-300 border border-white/20';
          }
        }

        if (progressTimeDisplay) progressTimeDisplay.innerText = timeStr;
        if (progressPercentBadge) {
          progressPercentBadge.innerText = Math.round(pct) + '% Tersisa';
          if (examTimeLeft <= 60) {
            progressPercentBadge.className = 'font-bold text-[10px] px-2 py-0.5 rounded-full border bg-rose-100 text-rose-800 border-rose-300 animate-pulse';
          } else if (examTimeLeft <= 300) {
            progressPercentBadge.className = 'font-bold text-[10px] px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300';
          } else {
            progressPercentBadge.className = 'font-bold text-[10px] px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200';
          }
        }
        if (examProgressBarFill) {
          examProgressBarFill.style.width = pct + '%';
          if (examTimeLeft <= 60) {
            examProgressBarFill.className = 'h-full rounded-full transition-all duration-1000 ease-linear bg-gradient-to-r from-rose-500 to-red-600 animate-pulse';
          } else if (examTimeLeft <= 300) {
            examProgressBarFill.className = 'h-full rounded-full transition-all duration-1000 ease-linear bg-gradient-to-r from-amber-400 to-orange-500';
          } else {
            examProgressBarFill.className = 'h-full rounded-full transition-all duration-1000 ease-linear bg-gradient-to-r from-emerald-500 to-teal-500';
          }
        }

        if (examTimeLeft <= 0) {
          clearInterval(timer);
          alert('Waktu ujian telah habis! Sistem secara otomatis mengumpulkan lembar jawaban Anda.');
          finishExam();
        }
      }, 1000);
    }

    function renderSoal() {
      const q = questions[currentIdx];
      document.getElementById('q-number').innerText = 'SOAL NO ' + (currentIdx + 1);
      document.getElementById('q-diff').innerText = q.difficulty;
      document.getElementById('q-type-label').innerText = 
        q.tipe === 'PG' ? 'PILIHAN GANDA' : 
        (q.tipe === 'PGK' ? 'PG KOMPLEKS' : 
        (q.tipe === 'BS' ? 'BENAR / SALAH' : 
        (q.tipe === 'ISIAN' ? 'ISIAN SINGKAT' : 'URAIAN / ESSAY')));
      document.getElementById('q-text').innerText = q.content;

      const imgContainer = document.getElementById('q-image-container');
      const imgEl = document.getElementById('q-image');
      if (q.image) {
        imgEl.src = q.image;
        imgContainer.classList.remove('hidden');
      } else {
        imgContainer.classList.add('hidden');
      }

      const area = document.getElementById('q-options');
      area.innerHTML = '';

      if (q.tipe === 'PG' || q.tipe === 'BS') {
        const opts = q.tipe === 'BS' ? ['Benar', 'Salah'] : q.options;
        opts.forEach((opt, i) => {
          const key = q.tipe === 'BS' ? opt : String.fromCharCode(65 + i);
          const isSelected = userAnswers[currentIdx] === key;
          const card = document.createElement('div');
          card.className = 'opt-card ' + (isSelected ? 'selected' : '');
          card.innerHTML = '<span class="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-black text-sm shrink-0">' + key + '</span><span class="font-bold text-slate-800">' + opt + '</span>';
          card.onclick = () => saveAnswer(key);
          area.appendChild(card);
        });
      } else if (q.tipe === 'PGK') {
        const selectedList = Array.isArray(userAnswers[currentIdx]) ? userAnswers[currentIdx] : [];
        q.options.forEach((opt, i) => {
          const key = String.fromCharCode(65 + i);
          const isSelected = selectedList.includes(key);
          const card = document.createElement('div');
          card.className = 'opt-card ' + (isSelected ? 'selected' : '');
          card.innerHTML = '<span class="w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm shrink-0 ' + (isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600') + '">' + key + '</span><span class="font-bold text-slate-800">' + opt + '</span>';
          card.onclick = () => toggleAnswerPGK(key);
          area.appendChild(card);
        });
      } else if (q.tipe === 'ISIAN') {
        const curVal = typeof userAnswers[currentIdx] === 'string' ? userAnswers[currentIdx] : '';
        const box = document.createElement('div');
        box.className = 'bg-slate-50 p-6 rounded-2xl border-2 border-slate-200';
        box.innerHTML = '<label class="block text-xs font-black uppercase text-slate-600 mb-2">Jawaban Isian Singkat:</label>' +
          '<input type="text" id="input-isian" class="w-full p-4 bg-white border-2 border-slate-300 rounded-xl font-bold text-slate-900 text-base outline-none focus:border-blue-600" placeholder="Ketik jawaban singkat Anda di sini..." value="' + (curVal ? curVal.replace(/"/g, '&quot;') : '') + '">';
        area.appendChild(box);
        const inputEl = document.getElementById('input-isian');
        inputEl.oninput = (e) => {
          userAnswers[currentIdx] = e.target.value;
          delete userDoubts[currentIdx];
          renderNav();
        };
      } else if (q.tipe === 'URAIAN') {
        const curVal = typeof userAnswers[currentIdx] === 'string' ? userAnswers[currentIdx] : '';
        const box = document.createElement('div');
        box.className = 'bg-slate-50 p-6 rounded-2xl border-2 border-slate-200';
        box.innerHTML = '<label class="block text-xs font-black uppercase text-slate-600 mb-2">Jawaban Uraian / Essay:</label>' +
          '<textarea id="input-uraian" rows="6" class="w-full p-4 bg-white border-2 border-slate-300 rounded-xl font-medium text-slate-900 text-sm outline-none focus:border-blue-600" placeholder="Tuliskan jawaban uraian lengkap Anda di sini...">' + (curVal ? curVal.replace(/</g, '&lt;') : '') + '</textarea>';
        area.appendChild(box);
        const inputEl = document.getElementById('input-uraian');
        inputEl.oninput = (e) => {
          userAnswers[currentIdx] = e.target.value;
          delete userDoubts[currentIdx];
          renderNav();
        };
      }

      document.getElementById('chk-doubt').checked = !!userDoubts[currentIdx];
      renderNav();
    }

    function saveAnswer(val) {
      userAnswers[currentIdx] = val;
      delete userDoubts[currentIdx];
      renderSoal();
    }

    function toggleAnswerPGK(key) {
      if (!Array.isArray(userAnswers[currentIdx])) userAnswers[currentIdx] = [];
      const arr = userAnswers[currentIdx];
      const idx = arr.indexOf(key);
      if (idx > -1) arr.splice(idx, 1);
      else arr.push(key);
      delete userDoubts[currentIdx];
      renderSoal();
    }

    function markDoubt() {
      if (document.getElementById('chk-doubt').checked) userDoubts[currentIdx] = true;
      else delete userDoubts[currentIdx];
      renderNav();
    }

    function renderNav() {
      const grid = document.getElementById('nav-grid');
      grid.innerHTML = '';
      questions.forEach((_, i) => {
        let state = 'normal';
        const hasAns = userAnswers[i] !== undefined && userAnswers[i] !== null && 
          (Array.isArray(userAnswers[i]) ? userAnswers[i].length > 0 : String(userAnswers[i]).trim() !== '');
        if (userDoubts[i]) state = 'doubt';
        else if (hasAns) state = 'answered';

        const btn = document.createElement('div');
        btn.className = 'nav-btn ' + state + (i === currentIdx ? ' current' : '');
        btn.innerText = i + 1;
        btn.onclick = () => { currentIdx = i; renderSoal(); };
        grid.appendChild(btn);
      });
    }

    function nextQ() {
      if (currentIdx < questions.length - 1) {
        currentIdx++;
        renderSoal();
      } else {
        confirmSelesai();
      }
    }

    function prevQ() {
      if (currentIdx > 0) {
        currentIdx--;
        renderSoal();
      }
    }

    function confirmSelesai() {
      if (confirm('Apakah Anda yakin ingin menyelesaikan ujian sekarang?')) finishExam();
    }

    function finishExam() {
      isExamActive = false;
      if (timer) clearInterval(timer);
      try { if (document.exitFullscreen) document.exitFullscreen(); } catch(e){}

      let correct = 0;
      questions.forEach((q, i) => {
        const userAns = userAnswers[i];
        if (!userAns) return;

        if (q.tipe === 'PGK') {
          const correctArr = Array.isArray(q.answer) ? q.answer : q.answer.split(',').map(s=>s.trim());
          if (Array.isArray(userAns)) {
            const s1 = [...userAns].sort().join(',');
            const s2 = [...correctArr].sort().join(',');
            if (s1 === s2) correct++;
          }
        } else if (q.tipe === 'ISIAN') {
          const accepted = Array.isArray(q.answer) ? q.answer.map(s=>s.trim().toLowerCase()) : String(q.answer).split(/[,;/|]/).map(s=>s.trim().toLowerCase()).filter(Boolean);
          const u = String(userAns).trim().toLowerCase();
          if (accepted.length > 0 ? accepted.includes(u) : u === String(q.answer).trim().toLowerCase()) correct++;
        } else if (q.tipe === 'URAIAN') {
          if (String(userAns).trim().length > 3) correct++;
        } else {
          if (String(userAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase()) {
            correct++;
          }
        }
      });

      const score = Math.round((correct / (questions.length || 1)) * 100);
      switchView('result');
      document.getElementById('res-score').innerText = score;
      document.getElementById('res-info').innerText = currentUser.nama + ' (' + currentUser.kelas + ')';
      document.getElementById('res-breakdown').innerText = 'Benar ' + correct + ' dari ' + questions.length + ' Soal';

      results.push({
        id: 'res-' + Date.now(),
        nama: currentUser.nama,
        kelas: currentUser.kelas,
        nilai: score,
        benar: correct,
        totalSoal: questions.length,
        selesaiPada: new Date().toLocaleTimeString('id-ID'),
        pelanggaran: 0
      });
    }

    // Guru / Admin Functions
    function toggleFormSoal() {
      const tipe = document.getElementById('guru-tipe').value;
      const area = document.getElementById('area-opsi');
      const kunci = document.getElementById('guru-kunci');
      if (tipe === 'BS') {
        area.classList.add('hidden');
        kunci.placeholder = 'Ketik: Benar atau Salah';
      } else if (tipe === 'PGK') {
        area.classList.remove('hidden');
        kunci.placeholder = 'Kunci PGK pisahkan koma (contoh: A,C)';
      } else {
        area.classList.remove('hidden');
        kunci.placeholder = 'Kunci PG: A / B / C / D';
      }
    }

    function addSoal() {
      const tipe = document.getElementById('guru-tipe').value;
      const diff = document.getElementById('guru-diff').value;
      const content = document.getElementById('guru-soal').value.trim();
      const image = document.getElementById('guru-image').value.trim() || null;
      const kunciRaw = document.getElementById('guru-kunci').value.trim();

      if (!content || !kunciRaw) return alert('Pertanyaan dan Kunci Jawaban wajib diisi!');

      let options = [];
      let answer = kunciRaw;

      if (tipe === 'BS') {
        options = ['Benar', 'Salah'];
        answer = kunciRaw.toLowerCase() === 'benar' ? 'Benar' : 'Salah';
      } else {
        options = [
          document.getElementById('opt-1').value.trim() || 'Pilihan A',
          document.getElementById('opt-2').value.trim() || 'Pilihan B',
          document.getElementById('opt-3').value.trim() || 'Pilihan C',
          document.getElementById('opt-4').value.trim() || 'Pilihan D'
        ];
        if (tipe === 'PGK') {
          answer = kunciRaw.toUpperCase().split(',').map(s=>s.trim()).filter(Boolean);
        } else {
          answer = kunciRaw.toUpperCase();
        }
      }

      questions.push({
        id: 'q-' + Date.now(),
        tipe,
        content,
        image,
        options,
        answer,
        difficulty: diff
      });

      document.getElementById('guru-soal').value = '';
      document.getElementById('guru-image').value = '';
      document.getElementById('guru-kunci').value = '';
      renderGuruSoal();
      alert('Soal berhasil ditambahkan!');
    }

    function renderGuruSoal() {
      const list = document.getElementById('guru-list-soal');
      document.getElementById('count-soal').innerText = questions.length + ' Soal';
      if (questions.length === 0) {
        list.innerHTML = '<p class="text-slate-400 italic text-center py-6">Belum ada soal.</p>';
        return;
      }
      list.innerHTML = questions.map((q, i) => \`
        <div class="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center">
          <div class="text-left overflow-hidden">
            <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700 mr-2">\${q.tipe}</span>
            <span class="text-[10px] font-bold text-slate-400 mr-2">[\${q.difficulty}]</span>
            <p class="font-bold text-slate-800 text-sm mt-1 truncate max-w-md">\${i+1}. \${q.content}</p>
            <p class="text-xs text-green-600 font-bold mt-1">Kunci: \${Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}</p>
          </div>
          <button onclick="deleteSoal(\${i})" class="text-red-500 hover:text-red-700 p-2"><i class="fas fa-trash"></i></button>
        </div>
      \`).join('');
    }

    function deleteSoal(idx) {
      if (confirm('Hapus butir soal ini?')) {
        questions.splice(idx, 1);
        renderGuruSoal();
      }
    }

    function uploadLogoStandalone(e) {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          document.getElementById('set-logo').value = evt.target.result;
          settings.logoUrl = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    }

    function saveSettings() {
      settings.logoUrl = document.getElementById('set-logo').value || settings.logoUrl;
      settings.sekolah = document.getElementById('set-sekolah').value || settings.sekolah;
      settings.judul = document.getElementById('set-judul').value || settings.judul;
      settings.tahunAjaran = document.getElementById('set-ta').value || settings.tahunAjaran || '2025/2026';
      settings.mapel = document.getElementById('set-mapel').value || settings.mapel;
      settings.durasiMenit = parseInt(document.getElementById('set-durasi').value) || settings.durasiMenit;
      settings.token = (document.getElementById('set-token').value || settings.token).toUpperCase();

      // Update DOM
      document.getElementById('portal-logo').src = settings.logoUrl;
      document.getElementById('portal-sekolah').innerText = settings.sekolah;
      document.getElementById('portal-sekolah-badge').innerText = settings.sekolah;
      document.getElementById('portal-judul').innerText = settings.judul;
      document.getElementById('portal-ta').innerText = settings.tahunAjaran;
      document.getElementById('portal-mapel').innerText = settings.mapel;
      document.getElementById('guru-logo-thumb').src = settings.logoUrl;
      document.getElementById('guru-sekolah-display').innerText = settings.sekolah;
      document.getElementById('guru-judul-display').innerText = settings.judul;
      document.getElementById('guru-ta-display').innerText = settings.tahunAjaran;

      alert('Pengaturan Ujian & Identitas Sekolah Berhasil Diperbarui!');
    }

    function loadDashboard() {
      document.getElementById('set-logo').value = settings.logoUrl || '';
      document.getElementById('set-sekolah').value = settings.sekolah || '';
      document.getElementById('set-judul').value = settings.judul;
      document.getElementById('set-ta').value = settings.tahunAjaran || '2025/2026';
      document.getElementById('set-mapel').value = settings.mapel;
      document.getElementById('set-durasi').value = settings.durasiMenit;
      document.getElementById('set-token').value = settings.token;

      const tbody = document.getElementById('scoreTableBody');
      if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400 italic">Belum ada data nilai.</td></tr>';
        return;
      }
      tbody.innerHTML = results.map(r => \`
        <tr>
          <td class="p-3 font-bold text-slate-800">\${r.nama}</td>
          <td class="p-3 font-medium">\${r.kelas}</td>
          <td class="p-3 text-center font-black text-blue-600">\${r.nilai}</td>
          <td class="p-3 text-center text-slate-500">\${r.selesaiPada}</td>
        </tr>
      \`).join('');
    }

    function exportCSV() {
      let csv = "Nama,Kelas,Nilai,Benar,Total Soal,Waktu\\n";
      results.forEach(r => {
        csv += '"' + r.nama + '","' + r.kelas + '",' + r.nilai + ',' + r.benar + ',' + r.totalSoal + ',"' + r.selesaiPada + '"\\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Rekap_Nilai_' + (settings.mapel.replace(/\\s+/g, '_')) + '.csv';
      link.click();
    }

    // Anti-Cheat Events
    window.addEventListener('blur', () => {
      if (!isExamActive) return;
      document.getElementById('cheat-overlay').classList.remove('hidden');
      document.getElementById('cheat-overlay').classList.add('flex');
      cheatCounter = 10;
      document.getElementById('cheat-timer').innerText = cheatCounter;
      if (cheatTimer) clearInterval(cheatTimer);
      cheatTimer = setInterval(() => {
        cheatCounter--;
        document.getElementById('cheat-timer').innerText = cheatCounter;
        if (cheatCounter <= 0) {
          clearInterval(cheatTimer);
          dismissCheat();
          finishExam();
        }
      }, 1000);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && isExamActive) {
        window.dispatchEvent(new Event('blur'));
      }
    });

    function dismissCheat() {
      if (cheatTimer) clearInterval(cheatTimer);
      document.getElementById('cheat-overlay').classList.add('hidden');
      document.getElementById('cheat-overlay').classList.remove('flex');
    }

    document.addEventListener('contextmenu', e => e.preventDefault());
  </script>
</body>
</html>`;
}
