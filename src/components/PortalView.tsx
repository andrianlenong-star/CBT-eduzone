import React, { useState } from 'react';
import {
  LogIn,
  Shield,
  BookOpen,
  Key,
  CheckCircle,
  GraduationCap,
  School,
} from 'lucide-react';
import { ExamSettings, SubjectPackage } from '../types';
import { getLogoShapeClass, getLogoFitClass, LogoShape, LogoFit } from '../utils/logoHelper';

interface PortalViewProps {
  subjects?: SubjectPackage[];
  activeSubjectId?: string;
  onSelectSubject?: (id: string) => void;
  settings: ExamSettings;
  activeSubject?: SubjectPackage;
  totalQuestions: number;
  onSelectRole: (role: 'siswa' | 'guru') => void;
  isSiswaOnly?: boolean;
  onToggleSiswaOnly?: (enable: boolean) => void;
  onUpdateLogo?: (newUrl: string) => void;
  onUpdateLogoShape?: (newShape: LogoShape, newFit?: LogoFit) => void;
}

export const PortalView: React.FC<PortalViewProps> = ({
  subjects = [],
  activeSubjectId = 'literasi-numerasi',
  onSelectSubject,
  settings,
  activeSubject,
  totalQuestions,
  onSelectRole,
  isSiswaOnly = false,
  onToggleSiswaOnly,
  onUpdateLogo,
  onUpdateLogoShape,
}) => {
  const logoShape: LogoShape = settings.logoShape || 'rounded';
  const logoFit: LogoFit = settings.logoFit || 'contain';
  const shapeClass = getLogoShapeClass(logoShape);
  const fitClass = getLogoFitClass(logoFit);

  const [logoImgError, setLogoImgError] = useState(false);

  // Reset logo error whenever settings.logoUrl updates
  React.useEffect(() => {
    setLogoImgError(false);
  }, [settings.logoUrl]);

  // Hanya ambil mata pelajaran yang benar-benar memiliki butir soal / sedang diujikan
  const availableExamSubjects = subjects.filter(
    (s) => Array.isArray(s.questions) && s.questions.length > 0
  );

  const currentSubject =
    activeSubject ||
    availableExamSubjects.find((s) => s.id === activeSubjectId) ||
    availableExamSubjects[0] ||
    subjects.find((s) => s.id === activeSubjectId) ||
    subjects[0] ||
    null;

  const currentSettings = currentSubject?.settings || settings;
  const currentTotalQuestions = currentSubject?.questions?.length ?? totalQuestions;

  const defaultLogoFallback = "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png";
  const displayLogoUrl = (!logoImgError && settings.logoUrl) ? settings.logoUrl : defaultLogoFallback;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0056b3] via-[#004b9e] to-[#003875] text-white flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 py-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-12 sm:w-20 sm:h-14 px-2 py-1 rounded-[999px] bg-white/20 backdrop-blur-md border border-white/30 shadow-md flex items-center justify-center shrink-0">
            <img
              src={displayLogoUrl}
              alt="Logo Sekolah"
              className="w-full h-full object-contain rounded-full drop-shadow-md"
              onError={() => setLogoImgError(true)}
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-300/30 text-[10px] font-black uppercase tracking-widest mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse"></span>
              <span>EDUZONE CBT</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-tight text-white drop-shadow-sm">
              {settings.sekolah && !settings.sekolah.toLowerCase().includes('unity')
                ? settings.sekolah.replace(/Edu\s+Zone/gi, 'EduZone')
                : 'EduZone'}
            </h2>
            <p className="text-[11px] text-blue-200 font-semibold tracking-wider uppercase">
              portal asesmen eduzone cbt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 text-xs font-bold text-blue-100">
            <School className="w-4 h-4 text-yellow-300" />
            <span>Tahun Ajaran {settings.tahunAjaran || '2025/2026'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full my-auto py-8 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-black tracking-widest uppercase mb-4 shadow-inner">
          <CheckCircle className="w-3.5 h-3.5 text-yellow-300" />
          <span>EDUZONE CBT • Sistem Ujian Berbasis Komputer & Tablet</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-none mb-6 drop-shadow-md">
          {settings.judul && !settings.judul.toLowerCase().includes('unity') && !settings.judul.toLowerCase().includes('candy')
            ? settings.judul.replace(/Edu\s+Zone/gi, 'EduZone')
            : 'EduZone CBT'}
        </h1>

        {/* Bagian Logo Sekolah di Bagian Tengah Interface - Tampilan Bersih & Elegan */}
        <div className="max-w-lg mx-auto mb-8">
          <div className="relative bg-white/10 backdrop-blur-md border border-white/25 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl flex flex-col items-center">
            {/* Logo Image Display - Bersih, Sesuai Pengaturan Admin di Panel Guru */}
            <div className={`relative w-48 h-36 sm:w-56 sm:h-40 md:w-64 md:h-44 px-5 py-2.5 rounded-[999px] bg-white/15 backdrop-blur-xl border-4 border-white/40 shadow-2xl flex items-center justify-center transition-all`}>
              <img
                key={displayLogoUrl}
                src={displayLogoUrl}
                alt="Logo Sekolah"
                className={`w-full h-full ${fitClass} ${shapeClass} drop-shadow-[0_16px_36px_rgba(0,0,0,0.4)]`}
                onError={() => setLogoImgError(true)}
              />
            </div>

            {/* Tulisan Identitas Satuan Pendidikan */}
            <div className="mt-5 flex flex-col items-center gap-1.5 w-full text-center px-4">
              <div className="inline-block px-5 py-1.5 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/25 shadow-md">
                <span className="text-sm sm:text-base font-black uppercase tracking-wider text-yellow-300 drop-shadow-sm">
                  {settings.sekolah && !settings.sekolah.toLowerCase().includes('unity')
                    ? settings.sekolah.replace(/Edu\s+Zone/gi, 'EduZone')
                    : 'EduZone'}
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-semibold uppercase tracking-wider mt-0.5">
                T.A. {settings.tahunAjaran || '2025/2026'} • Token: <strong className="font-mono text-yellow-300">{currentSettings.token || settings.token}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Portal Action Cards */}
        {isSiswaOnly ? (
          <div className="max-w-lg mx-auto">
            <div
              id="portal-card-siswa"
              onClick={() => onSelectRole('siswa')}
              className="group bg-white text-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-4 border-transparent hover:border-blue-400 flex flex-col justify-between text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-100 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:bg-blue-700 transition">
                    <GraduationCap className="w-9 h-9" />
                  </div>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                    Sesi Ujian Siswa
                  </span>
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">
                  Mulai Ujian Sekarang
                </h3>
                <p className="text-slate-600 font-bold text-sm leading-relaxed mb-3">
                  {currentSubject?.nama || settings.mapel}
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl text-xs font-bold">
                    {currentTotalQuestions} Butir Soal
                  </span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-xl text-xs font-bold">
                    Durasi: {currentSettings.durasiMenit} Menit
                  </span>
                  <span className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Token: <strong className="font-mono">{currentSettings.token}</strong></span>
                  </span>
                </div>
              </div>
              <div className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-black uppercase text-sm tracking-widest text-center flex items-center justify-center gap-2 group-hover:bg-blue-700 transition shadow-md">
                <LogIn className="w-4 h-4" />
                <span>Masuk & Kerjakan Soal</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Student Entrance */}
            <div
              id="portal-card-siswa"
              onClick={() => onSelectRole('siswa')}
              className="group bg-white text-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-4 border-transparent hover:border-blue-400 flex flex-col justify-between text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none" />
              <div>
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:bg-blue-700 transition">
                  <GraduationCap className="w-9 h-9" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 mb-2">
                  Masuk Ujian
                </h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-4">
                  Khusus peserta didik: Masuk untuk memulai pengerjaan asesmen CBT.
                </p>
                <div className="text-xs text-blue-700 font-bold bg-blue-50 p-2.5 rounded-xl border border-blue-200 mb-6">
                  📚 Mapel: <strong>{currentSubject?.nama || settings.mapel}</strong> • {currentTotalQuestions} Soal
                </div>
              </div>
              <div className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-black uppercase text-sm tracking-widest text-center flex items-center justify-center gap-2 group-hover:bg-blue-700 transition shadow-md">
                <LogIn className="w-4 h-4" />
                <span>Mulai Ujian</span>
              </div>
            </div>

            {/* Teacher / Admin Entrance */}
            <div
              id="portal-card-guru"
              onClick={() => onSelectRole('guru')}
              className="group bg-slate-900/90 text-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-4 border-white/10 hover:border-slate-500 flex flex-col justify-between text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform pointer-events-none" />
              <div>
                <div className="w-16 h-16 rounded-2xl bg-slate-800 text-blue-400 flex items-center justify-center mb-6 shadow-lg border border-slate-700">
                  <Shield className="w-9 h-9" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2">
                  Panel Guru
                </h3>
                <p className="text-slate-400 font-medium text-sm leading-relaxed mb-4">
                  Akses proktor & administrator: Kelola soal, mapel, rekap nilai, cctv, dan edit tampilan interface.
                </p>
                <div className="text-xs text-amber-300 font-semibold bg-amber-500/10 p-2.5 rounded-xl border border-amber-400/20 mb-6">
                  🔒 Seluruh tampilan interface & pengaturan hanya diedit dari Panel Guru
                </div>
              </div>
              <div className="w-full bg-slate-800 text-white py-4 px-6 rounded-2xl font-black uppercase text-sm tracking-widest text-center flex items-center justify-center gap-2 group-hover:bg-slate-700 transition border border-slate-700">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Akses Manajemen</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center py-4 border-t border-white/10 text-xs text-blue-200/70 font-semibold tracking-wider relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          &copy; {new Date().getFullYear()} {settings.sekolah && !settings.sekolah.toLowerCase().includes('unity') ? settings.sekolah.replace(/Edu\s+Zone/gi, 'EduZone') : 'EduZone'} • EduZone Computer Based Testing System
        </div>
        {!isSiswaOnly && (
          <button
            type="button"
            onClick={() => onSelectRole('guru')}
            className="text-[11px] text-blue-200/80 hover:text-white hover:underline flex items-center gap-1 transition cursor-pointer"
          >
            <Shield className="w-3 h-3 text-yellow-300" />
            <span>Login Guru / Administrator</span>
          </button>
        )}
      </footer>
    </div>
  );
};
