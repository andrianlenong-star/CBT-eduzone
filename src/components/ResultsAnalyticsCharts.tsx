import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Layers,
  School,
  Award,
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
} from 'lucide-react';
import { ExamResult } from '../types';

interface ResultsAnalyticsChartsProps {
  results: ExamResult[];
  activeSubjectName?: string;
  onLoadSampleData?: () => void;
}

// Sample mock data for demonstration if user has empty results
const DEMO_CLASS_RESULTS: ExamResult[] = [
  { id: 'd1', nama: 'Ahmad Faiz', kelas: 'Kelas 5A', nilai: 88, benar: 22, totalSoal: 25, selesaiPada: '2026-09-26 08:30', pelanggaran: 0, mapelNama: 'Matematika' },
  { id: 'd2', nama: 'Siti Rahma', kelas: 'Kelas 5A', nilai: 92, benar: 23, totalSoal: 25, selesaiPada: '2026-09-26 08:45', pelanggaran: 0, mapelNama: 'Matematika' },
  { id: 'd3', nama: 'Budi Santoso', kelas: 'Kelas 5A', nilai: 84, benar: 21, totalSoal: 25, selesaiPada: '2026-09-26 09:00', pelanggaran: 0, mapelNama: 'Matematika' },
  { id: 'd4', nama: 'Dewi Lestari', kelas: 'Kelas 5B', nilai: 76, benar: 19, totalSoal: 25, selesaiPada: '2026-09-26 09:15', pelanggaran: 0, mapelNama: 'Matematika' },
  { id: 'd5', nama: 'Eko Prasetyo', kelas: 'Kelas 5B', nilai: 72, benar: 18, totalSoal: 25, selesaiPada: '2026-09-26 09:30', pelanggaran: 1, mapelNama: 'Matematika' },
  { id: 'd6', nama: 'Fajar Nugroho', kelas: 'Kelas 5B', nilai: 80, benar: 20, totalSoal: 25, selesaiPada: '2026-09-26 09:40', pelanggaran: 0, mapelNama: 'Matematika' },
  { id: 'd7', nama: 'Gita Pertiwi', kelas: 'Kelas 5C', nilai: 96, benar: 24, totalSoal: 25, selesaiPada: '2026-09-26 10:00', pelanggaran: 0, mapelNama: 'Matematika' },
  { id: 'd8', nama: 'Hendra Wijaya', kelas: 'Kelas 5C', nilai: 90, benar: 22, totalSoal: 25, selesaiPada: '2026-09-26 10:15', pelanggaran: 0, mapelNama: 'Matematika' },
  { id: 'd9', nama: 'Indah Kusuma', kelas: 'Kelas 6A', nilai: 82, benar: 20, totalSoal: 25, selesaiPada: '2026-09-26 10:30', pelanggaran: 0, mapelNama: 'IPA' },
  { id: 'd10', nama: 'Joko Prabowo', kelas: 'Kelas 6A', nilai: 88, benar: 22, totalSoal: 25, selesaiPada: '2026-09-26 10:45', pelanggaran: 0, mapelNama: 'IPA' },
  { id: 'd11', nama: 'Kirana Putri', kelas: 'Kelas 6B', nilai: 78, benar: 19, totalSoal: 25, selesaiPada: '2026-09-26 11:00', pelanggaran: 0, mapelNama: 'IPA' },
  { id: 'd12', nama: 'Lukman Hakim', kelas: 'Kelas 6B', nilai: 68, benar: 17, totalSoal: 25, selesaiPada: '2026-09-26 11:15', pelanggaran: 0, mapelNama: 'IPA' },
  { id: 'd13', nama: 'Maya Sari', kelas: 'Kelas 5A', nilai: 94, benar: 23, totalSoal: 25, selesaiPada: '2026-09-26 11:30', pelanggaran: 0, mapelNama: 'Bahasa Indonesia' },
  { id: 'd14', nama: 'Nanda Pratama', kelas: 'Kelas 5B', nilai: 86, benar: 21, totalSoal: 25, selesaiPada: '2026-09-26 11:45', pelanggaran: 0, mapelNama: 'Bahasa Indonesia' },
  { id: 'd15', nama: 'Oki Setiawan', kelas: 'Kelas 5C', nilai: 84, benar: 21, totalSoal: 25, selesaiPada: '2026-09-26 12:00', pelanggaran: 0, mapelNama: 'Bahasa Indonesia' },
];

const KKM_STANDARD = 75;

// Color palettes for bars
const BAR_COLORS = [
  '#4f46e5', // indigo
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
];

export const ResultsAnalyticsCharts: React.FC<ResultsAnalyticsChartsProps> = ({
  results,
  activeSubjectName = 'Semua Mapel',
  onLoadSampleData,
}) => {
  // Mode: 'kelas' (per kelas) | 'mapel' (per mata pelajaran) | 'tren' (kronologis waktu)
  const [viewMode, setViewMode] = useState<'kelas' | 'mapel' | 'tren'>('kelas');
  // Chart visual type: 'bar' | 'area' | 'line'
  const [chartType, setChartType] = useState<'bar' | 'area' | 'line'>('bar');
  // Sort order: 'avgDesc' | 'avgAsc' | 'name' | 'count'
  const [sortBy, setSortBy] = useState<'avgDesc' | 'avgAsc' | 'name' | 'count'>('avgDesc');
  // Use demo data if current results are empty
  const [showDemoData, setShowDemoData] = useState<boolean>(false);

  const effectiveResults = useMemo(() => {
    if (results && results.length > 0 && !showDemoData) {
      return results;
    }
    if (showDemoData || results.length === 0) {
      return DEMO_CLASS_RESULTS;
    }
    return results;
  }, [results, showDemoData]);

  const isUsingDemo = results.length === 0 || showDemoData;

  // Aggregate Data by Class
  const classData = useMemo(() => {
    const map: Record<string, { total: number; sum: number; max: number; min: number; tuntas: number; scores: number[] }> = {};

    effectiveResults.forEach((r) => {
      const cls = r.kelas?.trim() || 'Tanpa Kelas';
      if (!map[cls]) {
        map[cls] = { total: 0, sum: 0, max: -Infinity, min: Infinity, tuntas: 0, scores: [] };
      }
      map[cls].total += 1;
      map[cls].sum += r.nilai;
      map[cls].scores.push(r.nilai);
      if (r.nilai > map[cls].max) map[cls].max = r.nilai;
      if (r.nilai < map[cls].min) map[cls].min = r.nilai;
      if (r.nilai >= KKM_STANDARD) map[cls].tuntas += 1;
    });

    const list = Object.entries(map).map(([k, v]) => {
      const avg = Number((v.sum / v.total).toFixed(1));
      const tuntasPercent = Math.round((v.tuntas / v.total) * 100);
      return {
        name: k,
        rataRata: avg,
        tertinggi: v.max === -Infinity ? 0 : v.max,
        terendah: v.min === Infinity ? 0 : v.min,
        peserta: v.total,
        ketuntasan: tuntasPercent,
        kkm: KKM_STANDARD,
      };
    });

    // Sort list
    if (sortBy === 'avgDesc') list.sort((a, b) => b.rataRata - a.rataRata);
    else if (sortBy === 'avgAsc') list.sort((a, b) => a.rataRata - b.rataRata);
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'count') list.sort((a, b) => b.peserta - a.peserta);

    return list;
  }, [effectiveResults, sortBy]);

  // Aggregate Data by Subject
  const subjectData = useMemo(() => {
    const map: Record<string, { total: number; sum: number; max: number; min: number; tuntas: number }> = {};

    effectiveResults.forEach((r) => {
      const sub = r.mapelNama?.trim() || 'Ujian Umum';
      if (!map[sub]) {
        map[sub] = { total: 0, sum: 0, max: -Infinity, min: Infinity, tuntas: 0 };
      }
      map[sub].total += 1;
      map[sub].sum += r.nilai;
      if (r.nilai > map[sub].max) map[sub].max = r.nilai;
      if (r.nilai < map[sub].min) map[sub].min = r.nilai;
      if (r.nilai >= KKM_STANDARD) map[sub].tuntas += 1;
    });

    const list = Object.entries(map).map(([k, v]) => {
      const avg = Number((v.sum / v.total).toFixed(1));
      const tuntasPercent = Math.round((v.tuntas / v.total) * 100);
      return {
        name: k,
        rataRata: avg,
        tertinggi: v.max === -Infinity ? 0 : v.max,
        terendah: v.min === Infinity ? 0 : v.min,
        peserta: v.total,
        ketuntasan: tuntasPercent,
        kkm: KKM_STANDARD,
      };
    });

    if (sortBy === 'avgDesc') list.sort((a, b) => b.rataRata - a.rataRata);
    else if (sortBy === 'avgAsc') list.sort((a, b) => a.rataRata - b.rataRata);
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'count') list.sort((a, b) => b.peserta - a.peserta);

    return list;
  }, [effectiveResults, sortBy]);

  // Chronological Session Trend
  const trendData = useMemo(() => {
    // Sort results by time
    const sorted = [...effectiveResults].sort((a, b) => {
      return (a.selesaiPada || '').localeCompare(b.selesaiPada || '');
    });

    // Group by date or display running average
    let cumulativeSum = 0;
    return sorted.map((r, idx) => {
      cumulativeSum += r.nilai;
      const runningAvg = Number((cumulativeSum / (idx + 1)).toFixed(1));
      // Extract brief label
      const timeStr = r.selesaiPada ? r.selesaiPada.split(' ')[1] || r.selesaiPada.slice(-5) : `#${idx + 1}`;
      return {
        name: `${r.nama.split(' ')[0]} (${timeStr})`,
        nilai: r.nilai,
        rataRataKumulatif: runningAvg,
        kkm: KKM_STANDARD,
        kelas: r.kelas,
        mapel: r.mapelNama,
      };
    });
  }, [effectiveResults]);

  // Pick dataset based on viewMode
  const currentChartData: any[] =
    viewMode === 'kelas' ? classData : viewMode === 'mapel' ? subjectData : trendData;

  // Calculated overall statistics
  const stats = useMemo(() => {
    if (effectiveResults.length === 0) {
      return { total: 0, overallAvg: 0, topGroup: '-', lowestGroup: '-', totalKetuntasan: 0 };
    }
    const total = effectiveResults.length;
    const overallAvg = Number((effectiveResults.reduce((a, b) => a + b.nilai, 0) / total).toFixed(1));
    const passCount = effectiveResults.filter((r) => r.nilai >= KKM_STANDARD).length;
    const totalKetuntasan = Math.round((passCount / total) * 100);

    const targetList = viewMode === 'mapel' ? subjectData : classData;
    const topGroup = targetList.length > 0 ? targetList[0].name : '-';
    const lowestGroup = targetList.length > 0 ? targetList[targetList.length - 1].name : '-';

    return { total, overallAvg, topGroup, lowestGroup, totalKetuntasan };
  }, [effectiveResults, viewMode, classData, subjectData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-2 min-w-[200px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-black text-white text-sm flex items-center gap-1.5">
              {viewMode === 'kelas' ? (
                <School className="w-4 h-4 text-indigo-400" />
              ) : (
                <Layers className="w-4 h-4 text-emerald-400" />
              )}
              <span>{label || data.name}</span>
            </span>
            {data.peserta && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                {data.peserta} Siswa
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-[11px]">
            {data.rataRata !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rata-rata Nilai:</span>
                <span
                  className={`font-black text-sm px-2 py-0.5 rounded-lg ${
                    data.rataRata >= 75
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : data.rataRata >= 60
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {data.rataRata}
                </span>
              </div>
            )}

            {data.nilai !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nilai Siswa:</span>
                <span className="font-bold text-white text-sm">{data.nilai}</span>
              </div>
            )}

            {data.rataRataKumulatif !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rata-rata Berjalan:</span>
                <span className="font-bold text-cyan-300">{data.rataRataKumulatif}</span>
              </div>
            )}

            {data.tertinggi !== undefined && (
              <div className="flex items-center justify-between text-slate-300">
                <span>Nilai Tertinggi:</span>
                <span className="font-bold text-emerald-400">{data.tertinggi}</span>
              </div>
            )}

            {data.terendah !== undefined && (
              <div className="flex items-center justify-between text-slate-300">
                <span>Nilai Terendah:</span>
                <span className="font-bold text-rose-400">{data.terendah}</span>
              </div>
            )}

            {data.ketuntasan !== undefined && (
              <div className="flex items-center justify-between border-t border-slate-800 pt-1.5 mt-1">
                <span className="text-slate-400">Ketuntasan (≥{KKM_STANDARD}):</span>
                <span
                  className={`font-bold ${
                    data.ketuntasan >= 75 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {data.ketuntasan}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Analisis Visual CBT</span>
            </span>
            <h3 className="text-lg font-black tracking-tight text-slate-900">
              Tren Nilai Rata-Rata Siswa
            </h3>
            {isUsingDemo && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Pratinjau Data Simulasi</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Visualisasi interaktif perbandingan performa capaian kompetensi peserta didik per kelas atau mata pelajaran.
          </p>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Class vs Subject vs Time */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('kelas')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kelas'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              <span>Per Kelas ({classData.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('mapel')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'mapel'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Per Mata Pelajaran ({subjectData.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('tren')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'tren'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tren Waktu</span>
            </button>
          </div>

          {/* Chart Type Toggle */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                chartType === 'bar' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Batang / Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                chartType === 'area' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Area Halus"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="avgDesc">Rata-rata Tertinggi</option>
              <option value="avgAsc">Rata-rata Terendah</option>
              <option value="name">Nama (A-Z)</option>
              <option value="count">Jumlah Peserta</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">
            Rata-rata Gabungan
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-indigo-950">{stats.overallAvg}</span>
            <span className="text-xs text-indigo-600 font-bold">/ 100</span>
          </div>
          <p className="text-[11px] text-indigo-700/80 font-medium mt-0.5">
            Dari {stats.total} total ujian
          </p>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">
            {viewMode === 'mapel' ? 'Mapel Terbaik' : 'Kelas Tertinggi'}
          </span>
          <div className="text-lg font-black text-emerald-950 mt-1 truncate">
            {stats.topGroup}
          </div>
          <p className="text-[11px] text-emerald-700/80 font-medium mt-0.5">
            Capaian rata-rata terunggul
          </p>
        </div>

        <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">
            Tingkat Ketuntasan
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-950">{stats.totalKetuntasan}%</span>
            <span className="text-xs text-amber-700 font-bold">Lulus KKM</span>
          </div>
          <p className="text-[11px] text-amber-700/80 font-medium mt-0.5">
            Batas KKM: {KKM_STANDARD}
          </p>
        </div>

        <div className="bg-purple-50/60 border border-purple-100 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider block">
            Perlu Pembinaan
          </span>
          <div className="text-lg font-black text-purple-950 mt-1 truncate">
            {stats.lowestGroup}
          </div>
          <p className="text-[11px] text-purple-700/80 font-medium mt-0.5">
            Fokus penguatan materi
          </p>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-4 sm:p-6">
        <div className="h-80 sm:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={currentChartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <ReferenceLine
                  y={KKM_STANDARD}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Batas KKM (${KKM_STANDARD})`,
                    fill: '#dc2626',
                    fontSize: 11,
                    fontWeight: 'bold',
                    position: 'insideTopRight',
                  }}
                />

                {viewMode === 'tren' ? (
                  <>
                    <Bar
                      dataKey="nilai"
                      name="Nilai Siswa"
                      fill="#4f46e5"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={45}
                    />
                    <Line
                      type="monotone"
                      dataKey="rataRataKumulatif"
                      name="Rata-rata Kumulatif"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </>
                ) : (
                  <>
                    <Bar
                      dataKey="rataRata"
                      name="Nilai Rata-rata"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={55}
                    >
                      {currentChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="tertinggi"
                      name="Nilai Tertinggi"
                      fill="#10b981"
                      opacity={0.35}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={30}
                    />
                  </>
                )}
              </BarChart>
            ) : chartType === 'area' ? (
              <AreaChart data={currentChartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <ReferenceLine
                  y={KKM_STANDARD}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Batas KKM (${KKM_STANDARD})`,
                    fill: '#dc2626',
                    fontSize: 11,
                    fontWeight: 'bold',
                    position: 'insideTopRight',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={viewMode === 'tren' ? 'nilai' : 'rataRata'}
                  name={viewMode === 'tren' ? 'Nilai Siswa' : 'Nilai Rata-rata'}
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAvg)"
                />
                {viewMode !== 'tren' && (
                  <Area
                    type="monotone"
                    dataKey="tertinggi"
                    name="Nilai Tertinggi"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    fillOpacity={1}
                    fill="url(#colorMax)"
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart data={currentChartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <ReferenceLine
                  y={KKM_STANDARD}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Batas KKM (${KKM_STANDARD})`,
                    fill: '#dc2626',
                    fontSize: 11,
                    fontWeight: 'bold',
                    position: 'insideTopRight',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={viewMode === 'tren' ? 'nilai' : 'rataRata'}
                  name={viewMode === 'tren' ? 'Nilai Siswa' : 'Nilai Rata-rata'}
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                />
                {viewMode !== 'tren' && (
                  <Line
                    type="monotone"
                    dataKey="tertinggi"
                    name="Nilai Tertinggi"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 4, fill: '#10b981' }}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Details & Toggle Demo Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {viewMode === 'kelas'
              ? 'Menampilkan rata-rata nilai siswa dikelompokkan berdasarkan rombongan belajar (Kelas).'
              : viewMode === 'mapel'
              ? 'Menampilkan rata-rata nilai siswa per mata pelajaran asesmen yang telah dikerjakan.'
              : 'Menampilkan urutan waktu penyelesaian ujian oleh masing-masing siswa beserta rata-rata kumulatif.'}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {results.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDemoData(!showDemoData)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              {showDemoData ? 'Tampilkan Data Asli Sekolah' : 'Lihat Contoh Simulasi Multi-Kelas'}
            </button>
          )}

          {results.length === 0 && onLoadSampleData && (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              + Muat 10 Data Nilai Ujian
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
