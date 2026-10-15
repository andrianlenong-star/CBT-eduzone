import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface AntiCheatOverlayProps {
  countdown: number;
  violationCount: number;
  onDismiss: () => void;
}

export const AntiCheatOverlay: React.FC<AntiCheatOverlayProps> = ({
  countdown,
  violationCount,
  onDismiss,
}) => {
  return (
    <div className="fixed inset-0 bg-red-950/95 z-[9999] backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in select-none">
      <div className="w-28 h-28 bg-red-600/30 rounded-full flex items-center justify-center mb-6 animate-pulse border-4 border-red-500">
        <ShieldAlert className="w-16 h-16 text-red-200" />
      </div>

      <div className="inline-flex items-center gap-2 bg-red-800/80 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-4 border border-red-600">
        <AlertTriangle className="w-4 h-4 text-yellow-300" />
        <span>Pelanggaran Integritas Ujian #{violationCount}</span>
      </div>

      <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight max-w-xl mb-4 text-white">
        PERINGATAN: DILARANG PINDAH TAB!
      </h1>

      <p className="text-red-100 text-sm sm:text-base max-w-md mb-8 font-medium leading-relaxed">
        Sistem mendeteksi bahwa kursor atau jendela Anda meninggalkan halaman ujian.
        Jika waktu habis, lembar jawaban Anda akan otomatis dikumpulkan dan dinilai apa adanya!
      </p>

      {/* Countdown Digits */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="bg-white text-red-700 px-8 py-4 rounded-3xl text-6xl sm:text-7xl font-black shadow-2xl font-mono">
          {String(countdown).padStart(2, '0')}
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="bg-white text-red-900 px-10 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl hover:bg-slate-100 active:scale-95 transition-all"
      >
        Saya Paham & Kembali Mengerjakan
      </button>

      <p className="text-xs text-red-300/80 mt-6 font-semibold">
        Seluruh aktivitas pergantian layar dicatat dan dilaporkan kepada Pengawas / Guru.
      </p>
    </div>
  );
};
