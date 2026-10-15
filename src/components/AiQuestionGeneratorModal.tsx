import React, { useState } from 'react';
import {
  Sparkles,
  X,
  RefreshCw,
  Check,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sliders,
  Layers,
  Flame,
  Zap,
  Trash2,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
} from 'lucide-react';
import { Question, QuestionType, Difficulty } from '../types';

interface AiQuestionGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubjectName: string;
  activeSubjectClass?: string;
  existingQuestionCount: number;
  onAddQuestions: (newQuestions: Question[], mode: 'append' | 'replace') => void;
}

const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  matematika: [
    'Pecahan Campuran dan Desimal',
    'Geometri dan Luas Bangun Datar',
    'Statistika: Modus, Median, dan Mean',
    'Operasi Hitung Bilangan Bulat',
    'Kecepatan, Jarak, dan Waktu',
    'Perbandingan dan Skala Peta',
  ],
  ipa: [
    'Sistem Pencernaan dan Peredaran Darah Manusia',
    'Rantai Makanan dan Ekosistem Sawah',
    'Siklus Air dan Pengaruhnya Terhadap Bumi',
    'Perpindahan Kalor Secara Konduksi, Konveksi, Radiasi',
    'Gaya Magnet dan Energi Listrik Alternatif',
  ],
  bahasa: [
    'Teks Fabel dan Menentukan Amanat Cerita',
    'Menentukan Gagasan Pokok dan Kalimat Pengembang',
    'Teks Eksplanasi Fenomena Alam',
    'Menemukan Informasi Tersurat dan Tersirat',
    'Kosakata Baku dan Kalimat Efektif',
  ],
  literasi: [
    'Teks Informasi: Pola Hidup Sehat di Era Digital',
    'Teks Sastra: Nilai Kejujuran dan Kerjasama',
    'Menganalisis Grafik Konsumsi Energi Ramah Lingkungan',
    'Menilai Akurasi Fakta dan Opini pada Berita',
  ],
  ips: [
    'Peninggalan Sejarah Kerajaan Hindu, Buddha, dan Islam',
    'Kegiatan Ekonomi: Produksi, Distribusi, Konsumsi',
    'Keragaman Budaya dan Suku Bangsa Indonesia',
    'Kenampakan Alam dan Pemanfaatan Sumber Daya',
  ],
  ppkn: [
    'Penerapan Nilai-Nilai Sila Pancasila di Sekolah',
    'Hak, Kewajiban, dan Tanggung Jawab Warga Negara',
    'Musyawarah untuk Mencapai Mufakat',
    'Menjaga Persatuan dan Kesatuan Bangsa',
  ],
};

const SAMPLE_STIMULUS_TEXT = `Di sebuah desa lereng pegunungan, warga desa membudidayakan lebah madu trigona. Berbeda dengan lebah hutan pada umumnya, lebah trigona tidak memiliki sengat sehingga aman dipelihara di sekitar pekarangan rumah. 

Setiap keluarga rata-rata memiliki 8 kotak sarang lebah. Dalam waktu tiga bulan, satu kotak sarang mampu menghasilkan sekitar 500 ml madu murni. Madu tersebut kemudian dikemas dalam botol kaca higienis berukuran 250 ml dan dijual ke koperasi desa seharga Rp 45.000 per botol. 

Koperasi desa mencatat bahwa selain meningkatkan pendapatan keluarga, keberadaan lebah juga membantu penyerbukan tanaman buah kopi dan alpukat di perkebunan warga, sehingga hasil panen buah meningkat hingga 30% dibanding tahun sebelumnya.`;

export const AiQuestionGeneratorModal: React.FC<AiQuestionGeneratorModalProps> = ({
  isOpen,
  onClose,
  activeSubjectName,
  activeSubjectClass = 'Kelas 5 SD',
  existingQuestionCount,
  onAddQuestions,
}) => {
  // Step: 'configure' | 'review'
  const [step, setStep] = useState<'configure' | 'review'>('configure');

  // Form Parameters
  const [mapel, setMapel] = useState(activeSubjectName || 'Matematika');
  const [jenjangKelas, setJenjangKelas] = useState(activeSubjectClass || 'Kelas 5 SD');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [jumlah, setJumlah] = useState<number>(5);
  const [tipeSoal, setTipeSoal] = useState<string>('CAMPURAN');
  const [tingkatKesulitan, setTingkatKesulitan] = useState<string>('CAMPURAN');
  const [stimulusText, setStimulusText] = useState('');
  const [showStimulusBox, setShowStimulusBox] = useState(false);
  const [instruksiTambahan, setInstruksiTambahan] = useState('');

  // Generation State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('Memulai AI Generator...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Review & Selection State
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [insertMode, setInsertMode] = useState<'append' | 'replace'>('append');

  if (!isOpen) return null;

  // Determine quick suggestions based on mapel
  const getSuggestions = () => {
    const lower = (mapel || '').toLowerCase();
    for (const [key, suggestions] of Object.entries(TOPIC_SUGGESTIONS)) {
      if (lower.includes(key)) return suggestions;
    }
    return [
      'Konsep Dasar dan Prinsip Utama',
      'Penerapan Praktis Sehari-hari',
      'Analisis Kasus dan Pemecahan Masalah',
      'Identifikasi Fakta dan Kaidah Ilmiah',
    ];
  };

  // Multi-Topic Handlers
  const toggleTopic = (topicName: string) => {
    const trimmed = topicName.trim();
    if (!trimmed) return;
    setSelectedTopics((prev) =>
      prev.includes(trimmed) ? prev.filter((t) => t !== trimmed) : [...prev, trimmed]
    );
  };

  const handleAddCustomTopic = () => {
    const trimmed = customTopicInput.trim();
    if (!trimmed) return;
    if (!selectedTopics.includes(trimmed)) {
      setSelectedTopics((prev) => [...prev, trimmed]);
    }
    setCustomTopicInput('');
  };

  const handleRemoveTopic = (topicName: string) => {
    setSelectedTopics((prev) => prev.filter((t) => t !== topicName));
  };

  const handleSelectAllSuggestions = () => {
    const suggestions = getSuggestions();
    setSelectedTopics((prev) => {
      const set = new Set([...prev, ...suggestions]);
      return Array.from(set);
    });
  };

  const handleClearAllTopics = () => {
    setSelectedTopics([]);
    setCustomTopicInput('');
  };

  const handleGenerate = async () => {
    const finalTopics = [...selectedTopics];
    if (customTopicInput.trim() && !finalTopics.includes(customTopicInput.trim())) {
      finalTopics.push(customTopicInput.trim());
    }

    if (finalTopics.length === 0 && !stimulusText.trim()) {
      setErrorMessage('Mohon pilih minimal 1 topik / pokok bahasan materi atau masukkan Teks Stimulus.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    setLoadingPhase('Menghubungkan ke Google Gemini AI...');

    const phaseTimers = [
      setTimeout(() => setLoadingPhase('Menganalisis materi kurikulum dan sebaran topik...'), 1200),
      setTimeout(() => setLoadingPhase(`Merumuskan butir-butir pertanyaan (${jumlah} soal)...`), 2600),
      setTimeout(() => setLoadingPhase('Menyusun opsi jawaban, pengecoh, dan kunci valid...'), 4200),
    ];

    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapel,
          jenjangKelas,
          topik: finalTopics.join(', ') || 'Pemahaman Wacana',
          topikList: finalTopics,
          jumlah: Number(jumlah) || 5,
          tipeSoal,
          tingkatKesulitan,
          stimulusText: stimulusText.trim(),
          instruksiTambahan: instruksiTambahan.trim(),
        }),
      });

      phaseTimers.forEach(clearTimeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Server merespon dengan status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data.message || 'Gagal menghasilkan butir soal dari AI.');
      }

      setGeneratedQuestions(data.questions);
      setSelectedQuestionIds(data.questions.map((q: Question) => q.id));
      if (data.isFallback) {
        setSuccessInfo(data.message || 'Berhasil menghasilkan butir soal kurikulum terstruktur.');
      } else {
        setSuccessInfo(data.message || `Berhasil menghasilkan ${data.questions.length} butir soal dengan Gemini AI!`);
      }
      setStep('review');
    } catch (err: any) {
      phaseTimers.forEach(clearTimeout);
      console.error('Error generating questions:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses permintaan AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedQuestionIds.length === generatedQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(generatedQuestions.map((q) => q.id));
    }
  };

  const handleDeletePreviewQuestion = (id: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelectedQuestionIds((prev) => prev.filter((item) => item !== id));
  };

  const handleConfirmInsert = () => {
    const questionsToInsert = generatedQuestions.filter((q) => selectedQuestionIds.includes(q.id));
    if (questionsToInsert.length === 0) {
      alert('Pilih minimal 1 butir soal untuk dimasukkan ke bank soal.');
      return;
    }

    onAddQuestions(questionsToInsert, insertMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 px-6 py-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-yellow-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI Generator
                </span>
                <span className="text-purple-200 text-xs font-semibold">
                  Google Gemini 3.8
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight">
                Pembuat Soal Asesmen Otomatis (CBT / Kurikulum Merdeka)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep('configure')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
                step === 'configure'
                  ? 'bg-purple-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>1. Parameter Soal</span>
            </button>
            <span className="text-slate-300">➔</span>
            <button
              type="button"
              disabled={generatedQuestions.length === 0}
              onClick={() => generatedQuestions.length > 0 && setStep('review')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
                step === 'review'
                  ? 'bg-purple-600 text-white shadow-xs font-black'
                  : generatedQuestions.length > 0
                  ? 'text-slate-600 hover:text-purple-700 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                2. Tinjau & Pilih Soal ({generatedQuestions.length})
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Target: <strong className="text-indigo-700">{mapel}</strong> ({existingQuestionCount} soal saat ini)
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
          {/* STEP 1: CONFIGURE FORM */}
          {step === 'configure' && (
            <div className="space-y-6">
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-1">
                    <p className="font-bold">Gagal Menghasilkan Soal</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mata Pelajaran */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mata Pelajaran:</span>
                  </label>
                  <input
                    type="text"
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                    placeholder="Contoh: Matematika, IPA, Bahasa Indonesia..."
                    className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
                  />
                </div>

                {/* Jenjang / Kelas */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tingkat Kelas / Jenjang:</span>
                  </label>
                  <input
                    type="text"
                    value={jenjangKelas}
                    onChange={(e) => setJenjangKelas(e.target.value)}
                    placeholder="Contoh: Kelas 5 SD, Kelas 6 SD, SMP..."
                    className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Topik / Pokok Bahasan Materi (Bisa Pilih Lebih dari 1) */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>Topik / Pokok Bahasan Materi: <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Bisa Pilih Lebih dari 1
                    </span>
                  </div>

                  {selectedTopics.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                        {selectedTopics.length} Topik Terpilih
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllTopics}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  )}
                </div>

                {/* Display Selected Topics as Badges */}
                {selectedTopics.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-purple-50/60 rounded-xl border border-purple-200/80">
                    {selectedTopics.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-xl shadow-xs animate-in fade-in"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(item)}
                          className="hover:bg-purple-700 rounded-full p-0.5 transition cursor-pointer"
                          title="Hapus topik ini"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 font-medium italic">
                    Belum ada topik dipilih. Klik rekomendasi di bawah atau ketik topik baru.
                  </p>
                )}

                {/* Input to Add Custom Topic */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTopic();
                      }
                    }}
                    placeholder="Ketik topik materi baru lalu tekan Enter atau klik + Tambah..."
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTopic}
                    disabled={!customTopicInput.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah</span>
                  </button>
                </div>

                {/* Quick Topic Suggestion Chips with Multi-Select Toggle */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>Rekomendasi Topik {mapel} (Klik untuk memilih lebih dari 1):</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllSuggestions}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    >
                      Pilih Semua Rekomendasi
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {getSuggestions().map((sug, i) => {
                      const isSelected = selectedTopics.includes(sug);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleTopic(sug)}
                          className={`text-[11px] px-3 py-1.5 rounded-xl transition cursor-pointer border flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-700 font-black shadow-xs ring-2 ring-purple-300'
                              : 'bg-slate-50 hover:bg-purple-50 hover:border-purple-200 text-slate-700 border-slate-200 font-semibold'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{sug}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Soal Configuration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                {/* Jumlah Soal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Jumlah Soal:
                  </label>
                  <select
                    value={jumlah}
                    onChange={(e) => setJumlah(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={3}>3 Butir Soal (Uji Cepat)</option>
                    <option value={5}>5 Butir Soal (Standar Singkat)</option>
                    <option value={10}>10 Butir Soal (Kuis Harian)</option>
                    <option value={15}>15 Butir Soal (Penilaian Harian)</option>
                    <option value={20}>20 Butir Soal (Penilaian Tengah Semester)</option>
                    <option value={25}>25 Butir Soal (Penilaian Akhir Semester)</option>
                    <option value={30}>30 Butir Soal (Try Out Sekolah)</option>
                    <option value={35}>35 Butir Soal (Standar Lengkap ANBK / Ujian Sekolah)</option>
                    <option value={40}>40 Butir Soal (Asesmen Lengkap 40 Soal)</option>
                  </select>
                </div>

                {/* Tipe Soal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Tipe Butir Soal:
                  </label>
                  <select
                    value={tipeSoal}
                    onChange={(e) => setTipeSoal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="CAMPURAN">Campuran (PG, PGK, BS, Isian, Uraian)</option>
                    <option value="PG">Hanya Pilihan Ganda (PG A-B-C-D)</option>
                    <option value="PGK">Hanya PG Kompleks (Jawaban &gt; 1)</option>
                    <option value="BS">Hanya Benar - Salah (BS)</option>
                    <option value="ISIAN">Hanya Isian Singkat</option>
                    <option value="URAIAN">Hanya Uraian / Essay</option>
                  </select>
                </div>

                {/* Tingkat Kesulitan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Tingkat Kognitif:</span>
                  </label>
                  <select
                    value={tingkatKesulitan}
                    onChange={(e) => setTingkatKesulitan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="CAMPURAN">Campuran (Proporsional Reguler + HOTS)</option>
                    <option value="REGULER">Reguler (C1-C3 Pemahaman & Penerapan)</option>
                    <option value="HOTS">HOTS (C4-C6 Analisis & Evaluasi)</option>
                  </select>
                </div>
              </div>

              {/* Stimulus / Bacaan Section (Collapsible) */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowStimulusBox(!showStimulusBox)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-slate-800">
                      Teks Stimulus / Wacana Bacaan (Opsional)
                    </span>
                    {stimulusText.trim() && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Ada Teks ({stimulusText.trim().length} karakter)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <span>{showStimulusBox ? 'Sembunyikan' : 'Buka Stimulus'}</span>
                    {showStimulusBox ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {showStimulusBox && (
                  <div className="p-4 space-y-2 border-t border-slate-200 bg-white">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Tempelkan cerita pendek, artikel berita, kutipan fabel, atau data studi kasus. AI akan membuat soal-soal asesmen yang berpatokan langsung pada stimulus ini (sangat cocok untuk <strong>Asesmen Literasi ANBK</strong>).
                    </p>
                    <textarea
                      rows={5}
                      value={stimulusText}
                      onChange={(e) => setStimulusText(e.target.value)}
                      placeholder="Tempelkan bacaan / wacana di sini..."
                      className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setStimulusText(SAMPLE_STIMULUS_TEXT)}
                        className="text-purple-600 hover:text-purple-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Muat Contoh Wacana (Peternak Lebah Trigona)</span>
                      </button>

                      {stimulusText && (
                        <button
                          type="button"
                          onClick={() => setStimulusText('')}
                          className="text-rose-500 hover:text-rose-700 font-bold text-[11px] cursor-pointer"
                        >
                          Kosongkan Teks
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Instruksi Tambahan (Opsional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Instruksi Khusus untuk AI (Opsional):</span>
                </label>
                <input
                  type="text"
                  value={instruksiTambahan}
                  onChange={(e) => setInstruksiTambahan(e.target.value)}
                  placeholder="Contoh: Gunakan nama tokoh khas daerah Indonesia, sertakan contoh perhitungan..."
                  className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Loading Overlay / Banner */}
              {isLoading && (
                <div className="p-6 bg-purple-50 border-2 border-purple-300 rounded-3xl text-center space-y-3 shadow-inner animate-in fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-600/30 animate-spin">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-purple-900">
                      Gemini AI Sedang Bekerja...
                    </h4>
                    <p className="text-xs font-bold text-purple-700 animate-pulse mt-0.5">
                      {loadingPhase}
                    </p>
                  </div>
                  <p className="text-[11px] text-purple-600/80 max-w-md mx-auto">
                    Proses ini membutuhkan waktu beberapa detik untuk memastikan butir soal, opsi pengecoh, dan kunci jawaban valid.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW & SELECTION */}
          {step === 'review' && (
            <div className="space-y-5">
              {successInfo && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successInfo}</span>
                </div>
              )}

              {/* Filter / Selection Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {selectedQuestionIds.length === generatedQuestions.length
                        ? 'Batal Pilih Semua'
                        : 'Pilih Semua'}
                    </span>
                  </button>
                  <span className="text-xs font-bold text-slate-700">
                    <strong className="text-purple-700 font-black">
                      {selectedQuestionIds.length}
                    </strong>{' '}
                    dari {generatedQuestions.length} butir soal dipilih
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">
                    Metode Penyimpanan:
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setInsertMode('append')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        insertMode === 'append'
                          ? 'bg-purple-600 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Tambahkan soal baru ke dalam bank soal yang sudah ada"
                    >
                      + Tambahkan (Append)
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsertMode('replace')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        insertMode === 'replace'
                          ? 'bg-rose-600 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Gantikan seluruh bank soal pada mapel ini dengan soal baru dari AI"
                    >
                      Timpa Semua (Replace)
                    </button>
                  </div>
                </div>
              </div>

              {/* Questions List Preview */}
              <div className="space-y-4">
                {generatedQuestions.map((q, index) => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  const isHots = q.difficulty === 'HOTS';

                  return (
                    <div
                      key={q.id || index}
                      className={`p-5 rounded-2xl border transition shadow-sm ${
                        isSelected
                          ? 'bg-white border-purple-300 ring-2 ring-purple-500/20'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectQuestion(q.id)}
                              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                            />
                            <span className="text-xs font-black text-slate-800">
                              Nomor {index + 1}
                            </span>
                          </label>

                          {/* Tipe Badge */}
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                              q.tipe === 'PG'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : q.tipe === 'PGK'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : q.tipe === 'BS'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : q.tipe === 'ISIAN'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {q.tipe === 'PG'
                              ? 'Pilihan Ganda'
                              : q.tipe === 'PGK'
                              ? 'PG Kompleks'
                              : q.tipe === 'BS'
                              ? 'Benar - Salah'
                              : q.tipe === 'ISIAN'
                              ? 'Isian Singkat'
                              : 'Uraian / Essay'}
                          </span>

                          {/* Difficulty Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isHots
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isHots ? <Flame className="w-3 h-3 text-rose-600" /> : null}
                            <span>{q.difficulty}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePreviewQuestion(q.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer"
                          title="Hapus butir soal ini dari daftar pratinjau"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Question Content */}
                      <p className="text-xs font-semibold text-slate-800 whitespace-pre-line leading-relaxed mb-3">
                        {q.content}
                      </p>

                      {/* Options rendering */}
                      {q.tipe === 'PG' && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                          {q.options.map((opt, optIdx) => {
                            const letter = String.fromCharCode(65 + optIdx);
                            const isCorrect = q.answer === letter;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2 rounded-xl border flex items-start gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {isCorrect && (
                                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-black shrink-0">
                                    Kunci
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.tipe === 'PGK' && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                          {q.options.map((opt, optIdx) => {
                            const letter = String.fromCharCode(65 + optIdx);
                            const correctArr = Array.isArray(q.answer)
                              ? q.answer
                              : [q.answer];
                            const isCorrect = correctArr.includes(letter);
                            return (
                              <div
                                key={optIdx}
                                className={`p-2 rounded-xl border flex items-start gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {isCorrect && (
                                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-black shrink-0">
                                    Kunci Benar
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.tipe === 'BS' && (
                        <div className="flex items-center gap-3 text-xs mb-3">
                          <span className="text-slate-500 font-medium">Kunci Jawaban:</span>
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase ${
                              q.answer === 'Benar'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {String(q.answer)}
                          </span>
                        </div>
                      )}

                      {(q.tipe === 'ISIAN' || q.tipe === 'URAIAN') && (
                        <div className="bg-slate-100/80 p-2.5 rounded-xl text-xs space-y-1 mb-2">
                          <span className="font-bold text-slate-600 text-[11px] block">
                            Kunci Jawaban / Rubrik Penilaian:
                          </span>
                          <p className="text-slate-800 font-mono font-medium">
                            {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                          </p>
                        </div>
                      )}

                      {/* Explanation if available */}
                      {(q as any).explanation && (
                        <div className="text-[11px] text-slate-500 bg-purple-50/50 p-2 rounded-xl border border-purple-100 flex items-start gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Pembahasan:</strong> {(q as any).explanation}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {step === 'configure' ? (
              <span>
                Soal yang dihasilkan dapat ditinjau dan disaring terlebih dahulu sebelum dimasukkan.
              </span>
            ) : (
              <span>
                {insertMode === 'append' ? (
                  <span>
                    Soal akan ditambahkan ke <strong>{existingQuestionCount}</strong> soal yang sudah ada.
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold">
                    Peringatan: Seluruh {existingQuestionCount} soal lama akan digantikan oleh soal terpilih.
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {step === 'review' ? (
              <>
                <button
                  type="button"
                  onClick={() => setStep('configure')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  Kembali ke Parameter
                </button>
                <button
                  type="button"
                  onClick={handleConfirmInsert}
                  disabled={selectedQuestionIds.length === 0}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-lg cursor-pointer ${
                    selectedQuestionIds.length > 0
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Masukkan ({selectedQuestionIds.length}) Soal ke Bank Soal
                  </span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>
                    {isLoading ? 'Menghasilkan Soal...' : `✨ Buat ${jumlah} Soal Sekarang`}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
