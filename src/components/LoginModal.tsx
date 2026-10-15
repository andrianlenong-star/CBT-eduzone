import React, { useState } from 'react';
import { ArrowLeft, User, BookOpen, KeyRound, Lock, AlertCircle, Eye, EyeOff, Camera } from 'lucide-react';
import { ExamSettings } from '../types';

interface LoginModalProps {
  role: 'siswa' | 'guru';
  settings: ExamSettings;
  onBack: () => void;
  onLoginSiswa: (nama: string, kelas: string, token: string) => void;
  onLoginGuru: (password: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  role,
  settings,
  onBack,
  onLoginSiswa,
  onLoginGuru,
}) => {
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [token, setToken] = useState(settings.token || 'ANBK2026');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSiswaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nama.trim() || !kelas.trim()) {
      setErrorMsg('Mohon isi Nama Lengkap dan Kelas Anda.');
      return;
    }
    const finalToken = (token.trim() || settings.token || 'ANBK2026').toUpperCase();
    const expectedToken = (settings.token || 'ANBK2026').trim().toUpperCase();
    if (finalToken !== expectedToken && token.trim()) {
      setErrorMsg(`Token ujian tidak valid. Pastikan menggunakan token resmi: ${expectedToken}`);
      return;
    }
    if (settings.kunciLayarPenuh !== false && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      try {
        document.documentElement.requestFullscreen().catch(() => {});
      } catch {}
    }
    // Directly trigger camera permission request on user button click gesture
    if (typeof window !== 'undefined') {
      (window as any).__cbtCameraActivating = true;
    }
    if (settings.kameraPengawasAktif !== false && navigator.mediaDevices?.getUserMedia) {
      try {
        navigator.mediaDevices
          .getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false,
          })
          .then((stream) => {
            (window as any).__cbtPrewarmedCameraStream = stream;
            if (typeof window !== 'undefined') {
              (window as any).__cbtCameraActivating = false;
              delete (window as any).__cbtCameraExemptUntil;
            }
          })
          .catch((err) => {
            console.warn('Pre-warming camera permission prompt:', err);
            if (typeof window !== 'undefined') {
              (window as any).__cbtCameraActivating = false;
              delete (window as any).__cbtCameraExemptUntil;
            }
          });
      } catch {}
    }
    onLoginSiswa(nama.trim(), kelas.trim(), expectedToken);
  };

  const handleGuruSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (password === settings.adminPass) {
      onLoginGuru(password);
    } else {
      setErrorMsg('Password Admin salah! Silakan masukkan kata sandi yang benar.');
    }
  };

  const logoSrc = settings.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0056b3] via-[#004b9e] to-[#003875] flex items-center justify-center p-6 text-slate-800">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-8 sm:p-10 border-b-[10px] border-yellow-400 relative">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-700 transition uppercase tracking-wider mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Portal</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-28 h-20 sm:w-32 sm:h-24 mx-auto mb-3 bg-slate-50 border-2 border-cyan-500 rounded-[999px] px-4 py-2 flex items-center justify-center shadow-md">
            <img
              src={logoSrc}
              alt="Logo Sekolah"
              className="w-full h-full object-contain rounded-[999px]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('Tut_Wuri_Handayani')) {
                  target.src = "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png";
                }
              }}
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black uppercase tracking-widest mb-1.5 border border-cyan-200">
            <span>EDUZONE CBT SYSTEM</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
            {role === 'siswa' ? 'Konfirmasi Peserta Tes' : 'Verifikasi Pengawas / Guru'}
          </h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
            {role === 'siswa'
              ? (settings.sekolah || 'EduZone') + ' • ' + (settings.mapel || 'Ujian Sekolah')
              : 'Otoritas Pengelolaan Ujian & Bank Soal'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {role === 'siswa' ? (
          <form onSubmit={handleSiswaSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Nama Lengkap Siswa
              </label>
              <div className="relative">
                <input
                  id="input-siswa-nama"
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Misal: Budi Pratama"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition text-sm"
                  autoFocus
                />
                <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Kelas / Rombel
              </label>
              <div className="relative">
                <input
                  id="input-siswa-kelas"
                  type="text"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  placeholder="Misal: 5A / 6B"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition text-sm uppercase"
                />
                <BookOpen className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                  Token Ujian
                </label>
                <button
                  type="button"
                  onClick={() => setToken((settings.token || 'ANBK2026').toUpperCase())}
                  className="text-[11px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200 transition cursor-pointer flex items-center gap-1"
                  title="Klik untuk mengisi token resmi otomatis"
                >
                  <span>Token: <strong className="font-mono">{settings.token || 'ANBK2026'}</strong></span>
                  <span className="text-[10px] text-blue-500 underline font-normal">(Isi Otomatis)</span>
                </button>
              </div>
              <div className="relative">
                <input
                  id="input-siswa-token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder={settings.token || 'ANBK2026'}
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-100 border-2 border-slate-200 font-black text-blue-900 tracking-[0.25em] outline-none focus:border-blue-600 focus:bg-white transition text-center text-lg uppercase"
                />
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {settings.kameraPengawasAktif !== false && (
              <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 text-xs flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-cyan-600 shrink-0" />
                <span className="leading-snug">
                  <strong>Pengawasan Kamera Wajib Aktif:</strong> Kamera depan gawai Anda akan langsung dinyalakan saat menekan tombol di bawah untuk merekam kehadiran peserta secara otomatis.
                </span>
              </div>
            )}

            <button
              id="btn-mulai-ujian"
              type="submit"
              className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
            >
              Mulai Ujian Sekarang
            </button>
          </form>
        ) : (
          <form onSubmit={handleGuruSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Kata Sandi Proktor / Guru
              </label>
              <div className="relative">
                <input
                  id="input-guru-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full p-4 pl-12 pr-12 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-slate-800 tracking-widest outline-none focus:border-blue-600 focus:bg-white transition text-center text-xl"
                  autoFocus
                />
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              id="btn-masuk-guru"
              type="submit"
              className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all cursor-pointer"
            >
              Buka Panel Guru
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
