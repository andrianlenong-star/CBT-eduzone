export type QuestionType = 'PG' | 'PGK' | 'BS' | 'ISIAN' | 'URAIAN';
export type Difficulty = 'REGULER' | 'HOTS';

export interface Question {
  id: string;
  tipe: QuestionType;
  content: string;
  image: string | null;
  instructionImage?: string | null; // Gambar petunjuk soal / stimulus / wacana
  instruction?: string; // Teks petunjuk pengerjaan / stimulus
  options: string[];
  answer: string | string[]; // Single string for PG/BS/ISIAN/URAIAN, array of strings for PGK
  difficulty: Difficulty;
}

export interface ExamSettings {
  judul: string;
  mapel: string;
  sekolah: string;
  logoUrl: string;
  logoShape?: 'oval' | 'rounded' | 'circle' | 'square';
  logoFit?: 'cover' | 'contain';
  tahunAjaran: string;
  durasiMenit: number;
  token: string;
  adminPass: string;
  acakSoal: boolean;
  tampilkanNilai: boolean;
  akhiriOtomatisJikaCurang?: boolean;
  kameraPengawasAktif?: boolean;
  kunciLayarPenuh?: boolean;
}

export interface ExamResult {
  id: string;
  nama: string;
  kelas: string;
  nilai: number;
  benar: number;
  totalSoal: number;
  selesaiPada: string;
  pelanggaran: number;
  mapelId?: string;
  mapelNama?: string;
  nisn?: string;
  answers?: Record<number, string | string[]>;
  proctoringPhotos?: string[];
  recordedVideoUrl?: string | null;
  isAutoTerminated?: boolean;
  autoTerminationReason?: string;
}

export interface SubjectPackage {
  id: string;
  kode: string;
  nama: string;
  guruPengampu?: string;
  kelas?: string;
  passwordBankSoal?: string;
  color?: string;
  deskripsi?: string;
  settings: ExamSettings;
  questions: Question[];
  results: ExamResult[];
  createdAt?: string;
  updatedAt?: string;
}

export type ActiveView = 'portal' | 'login' | 'exam' | 'result' | 'guru';
