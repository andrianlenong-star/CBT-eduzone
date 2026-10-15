import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, RotateCcw, Eye, EyeOff, ShieldCheck, ShieldAlert, BookOpen, Camera, Video, Download } from 'lucide-react';
import { Question, ExamSettings, ExamResult } from '../types';

interface ResultViewProps {
  result: ExamResult;
  questions: Question[];
  userAnswers: Record<number, string | string[]>;
  settings: ExamSettings;
  onReturnToPortal: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  questions,
  userAnswers,
  settings,
  onReturnToPortal,
}) => {
  const [showReview, setShowReview] = useState(false);

  // Helper to format answers
  const formatAns = (ans: string | string[] | undefined) => {
    if (!ans) return '(Tidak dijawab)';
    if (Array.isArray(ans)) return ans.sort().join(', ');
    return String(ans);
  };

  const isAnswerCorrect = (q: Question, idx: number) => {
    const userAns = userAnswers[idx];
    if (!userAns) return false;
    if (q.tipe === 'PGK') {
      const correctArr = Array.isArray(q.answer)
        ? q.answer
        : q.answer.split(',').map((s) => s.trim());
      if (!Array.isArray(userAns)) return false;
      const s1 = [...userAns].sort().join(',');
      const s2 = [...correctArr].sort().join(',');
      return s1 === s2;
    } else if (q.tipe === 'ISIAN') {
      const accepted = Array.isArray(q.answer)
        ? q.answer.map((a) => a.trim().toLowerCase())
        : String(q.answer).split(/[,;/|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      const u = String(userAns).trim().toLowerCase();
      return accepted.length > 0 ? accepted.includes(u) : u === String(q.answer).trim().toLowerCase();
    } else if (q.tipe === 'URAIAN') {
      return String(userAns).trim().length > 3;
    } else {
      return String(userAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0056b3] via-[#004b9e] to-[#003875] flex items-center justify-center p-6 text-slate-800">
      <div className="max-w-2xl w-full bg-white rounded-[3.5rem] shadow-2xl p-8 sm:p-12 border-b-[12px] border-cyan-600 my-8">
        {/* School Logo Oval & Header Icon */}
        <div className="text-center mb-6">
          <div className="w-28 h-20 sm:w-32 sm:h-24 mx-auto mb-3 bg-white border-3 border-cyan-500 rounded-[999px] px-4 py-2 flex items-center justify-center shadow-lg">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo Sekolah"
                className="w-full h-full object-contain rounded-[999px]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Award className="w-10 h-10 text-cyan-600" />
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black uppercase tracking-widest mb-1.5 border border-cyan-200">
            <span>EDUZONE CBT • LEMBAR HASIL PESERTA</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-900 mb-1">
            Ujian Telah Selesai!
          </h2>
          <p className="text-slate-500 font-bold text-sm">
            {result.nama} • Kelas {result.kelas}
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-900 px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider border border-cyan-200 shadow-2xs">
            <BookOpen className="w-4 h-4 text-cyan-600" />
            <span>{result.mapelNama || settings.mapel || 'Ujian Sekolah'} • {settings.sekolah || 'EduZone'}</span>
          </div>
        </div>

        {/* Auto-Termination Alert if triggered */}
        {result.isAutoTerminated && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-left text-xs font-medium space-y-1">
            <div className="flex items-center gap-2 font-black text-rose-800 uppercase text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Ujian Diakhiri Otomatis oleh Sistem Integritas</span>
            </div>
            <p>{result.autoTerminationReason || 'Terdeteksi berpindah tab atau keluar dari mode ujian layar penuh.'}</p>
          </div>
        )}

        {/* Score Card */}
        {settings.tampilkanNilai ? (
          <div className="bg-gradient-to-b from-blue-50 to-indigo-50/60 p-8 rounded-3xl border border-blue-100 text-center mb-8 relative overflow-hidden">
            <p className="text-xs text-blue-600 font-black tracking-widest uppercase mb-2">
              Nilai Skor Akhir
            </p>
            <div className="text-7xl sm:text-8xl font-black text-blue-700 tracking-tight leading-none my-2 font-mono">
              {result.nilai}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs font-bold text-slate-600 uppercase tracking-wide">
              <span>Benar: <strong className="text-emerald-600">{result.benar}</strong></span>
              <span>•</span>
              <span>Salah: <strong className="text-rose-600">{result.totalSoal - result.benar}</strong></span>
              <span>•</span>
              <span>Total: <strong>{result.totalSoal} Soal</strong></span>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 p-6 rounded-3xl text-center mb-8 text-sm font-semibold text-slate-600">
            Jawaban Anda telah tersimpan ke sistem server ujian. Hasil nilai akan diumumkan oleh guru/pengawas.
          </div>
        )}

        {/* Integrity status */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-8 text-xs font-bold">
          <div className="flex items-center gap-2">
            {result.pelanggaran === 0 ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            )}
            <span className="text-slate-700">Integritas Ujian:</span>
          </div>
          <span
            className={
              result.pelanggaran === 0 ? 'text-emerald-700' : 'text-amber-700'
            }
          >
            {result.pelanggaran === 0
              ? 'Bersih (Tanpa Pelanggaran Tab)'
              : `${result.pelanggaran} Kali Terdeteksi Pindah Tab`}
          </span>
        </div>

        {/* Proctoring Photos Preview if available */}
        {result.proctoringPhotos && result.proctoringPhotos.length > 0 && (
          <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-600" />
                <span>Foto Rekaman Kamera Pengawas ({result.proctoringPhotos.length} Foto)</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ● Terekam
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {result.proctoringPhotos.map((photo, pIdx) => (
                <img
                  key={pIdx}
                  src={photo}
                  alt={`Proctoring Snapshot ${pIdx + 1}`}
                  className="w-28 h-20 object-cover rounded-xl border border-slate-300 shadow-xs shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        {/* Video Rekaman Kamera Siswa */}
        {result.recordedVideoUrl && (
          <div className="mb-6 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 text-left space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>Hasil Rekaman Video Kamera Pengawas (Webcam)</span>
              </span>
              <a
                href={result.recordedVideoUrl}
                download={`rekaman-${result.nama.toLowerCase().replace(/\s+/g, '-')}.webm`}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Unduh Video</span>
              </a>
            </div>
            <div className="rounded-xl overflow-hidden bg-black aspect-video max-h-56 mx-auto flex items-center justify-center">
              <video
                src={result.recordedVideoUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button
            onClick={() => setShowReview(!showReview)}
            className="flex-1 py-4 px-6 rounded-2xl border-2 border-slate-200 text-slate-700 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 hover:bg-slate-50 transition"
          >
            {showReview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showReview ? 'Sembunyikan Pembahasan' : 'Lihat Rekap Jawaban'}</span>
          </button>

          <button
            onClick={onReturnToPortal}
            className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 text-white font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 hover:bg-black transition shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>

        {/* Review Answers List */}
        {showReview && (
          <div className="mt-8 pt-8 border-t border-slate-100 space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
              Daftar Evaluasi Butir Soal:
            </h4>
            {questions.map((q, idx) => {
              const correct = isAnswerCorrect(q, idx);
              return (
                <div
                  key={q.id || idx}
                  className={`p-4 rounded-2xl border text-xs text-left ${
                    correct
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-800">
                      Soal #{idx + 1} ({q.tipe})
                    </span>
                    <span
                      className={`font-black flex items-center gap-1 ${
                        correct ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {correct ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Benar
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Salah
                        </>
                      )}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-700 mb-2 leading-relaxed">
                    {q.content}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 font-bold">Jawaban Anda: </span>
                      <strong className={correct ? 'text-emerald-700' : 'text-rose-700'}>
                        {formatAns(userAnswers[idx])}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Kunci Resmi: </span>
                      <strong className="text-blue-700">
                        {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
