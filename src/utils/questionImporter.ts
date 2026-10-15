import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { Question, QuestionType, Difficulty } from '../types';

export interface ImportResult {
  questions: Question[];
  errors: string[];
  totalParsed: number;
}

// Normalize question type from various aliases
export function normalizeQuestionType(raw: string | undefined): QuestionType {
  if (!raw) return 'PG';
  const clean = raw.trim().toUpperCase();
  if (clean === 'PGK' || clean.includes('KOMPLEKS') || clean.includes('MULTI')) return 'PGK';
  if (clean === 'BS' || clean.includes('BENAR') || clean.includes('TRUE') || clean === 'B/S') return 'BS';
  if (clean === 'ISIAN' || clean.includes('ISIAN') || clean.includes('SHORT') || clean === 'SA') return 'ISIAN';
  if (clean === 'URAIAN' || clean.includes('URAIAN') || clean.includes('ESSAY') || clean === 'ESAI') return 'URAIAN';
  return 'PG';
}

// Normalize difficulty
export function normalizeDifficulty(raw: string | undefined): Difficulty {
  if (!raw) return 'REGULER';
  const clean = raw.trim().toUpperCase();
  if (clean.includes('HOTS') || clean.includes('TINGGI') || clean.includes('SULIT')) return 'HOTS';
  return 'REGULER';
}

// Parse JSON format
export function parseJSONQuestions(jsonText: string): ImportResult {
  const errors: string[] = [];
  const questions: Question[] = [];

  try {
    const parsed = JSON.parse(jsonText);
    let rawItems: any[] = [];

    if (Array.isArray(parsed)) {
      rawItems = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) rawItems = parsed.questions;
      else if (Array.isArray(parsed.soal)) rawItems = parsed.soal;
      else if (Array.isArray(parsed.data)) rawItems = parsed.data;
      else if (Array.isArray(parsed.items)) rawItems = parsed.items;
      else if (Array.isArray(parsed.butir_soal)) rawItems = parsed.butir_soal;
      else {
        errors.push('Struktur JSON tidak memuat daftar soal (array questions/soal/data/items).');
        return { questions: [], errors, totalParsed: 0 };
      }
    } else {
      errors.push('Format berkas JSON tidak valid.');
      return { questions: [], errors, totalParsed: 0 };
    }

    rawItems.forEach((item, idx) => {
      const lineNum = idx + 1;
      const content = String(
        item.content || item.soal || item.pertanyaan || item.text || item.question || item.naskah || ''
      ).trim();
      if (!content) {
        errors.push(`Baris ${lineNum}: Teks soal/pertanyaan kosong, dilewati.`);
        return;
      }

      const tipe = normalizeQuestionType(item.tipe || item.type || item.jenis);
      const difficulty = normalizeDifficulty(item.difficulty || item.kesulitan || item.tingkat);
      const image = item.image || item.gambar || item.foto || null;

      let options: string[] = [];
      const rawOptions = item.options ?? item.pilihan ?? item.opsi;
      if (Array.isArray(rawOptions)) {
        options = rawOptions.map((o: any) => String(o).trim());
      } else if (rawOptions && typeof rawOptions === 'object') {
        // Options as object { A: '...', B: '...' }
        options = Object.values(rawOptions).map((o: any) => String(o).trim());
      } else if (typeof rawOptions === 'string') {
        options = rawOptions.split(/[|;]/).map((o: string) => o.trim()).filter(Boolean);
      } else {
        // Check for individual option keys (opsi_a, opsi_b, etc. or a, b, c, d)
        const optA = item.opsi_a ?? item.pilihan_a ?? item.opsiA ?? item.pilihanA ?? item.a ?? item.A;
        const optB = item.opsi_b ?? item.pilihan_b ?? item.opsiB ?? item.pilihanB ?? item.b ?? item.B;
        const optC = item.opsi_c ?? item.pilihan_c ?? item.opsiC ?? item.pilihanC ?? item.c ?? item.C;
        const optD = item.opsi_d ?? item.pilihan_d ?? item.opsiD ?? item.pilihanD ?? item.d ?? item.D;
        const optE = item.opsi_e ?? item.pilihan_e ?? item.opsiE ?? item.pilihanE ?? item.e ?? item.E;
        const collected = [optA, optB, optC, optD, optE].filter((x) => x !== undefined && x !== null);
        if (collected.length > 0) {
          options = collected.map((s) => String(s).trim()).filter(Boolean);
        }
      }

      // Handle answer based on type
      let answer: string | string[] = '';
      const rawAns =
        item.answer !== undefined
          ? item.answer
          : item.kunci !== undefined
          ? item.kunci
          : item.jawaban !== undefined
          ? item.jawaban
          : item.correct_answer !== undefined
          ? item.correct_answer
          : item.key;

      if (tipe === 'PGK') {
        if (Array.isArray(rawAns)) {
          answer = rawAns.map((a: any) => String(a).trim().toUpperCase()).sort();
        } else if (typeof rawAns === 'string') {
          answer = rawAns.toUpperCase().split(/[,;+]/).map((s) => s.trim()).filter(Boolean).sort();
        } else {
          answer = ['A'];
        }
        if (options.length === 0) {
          options = ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
        }
      } else if (tipe === 'BS') {
        options = ['Benar', 'Salah'];
        const strAns = String(rawAns || 'Benar').trim().toLowerCase();
        answer = strAns.includes('salah') || strAns === 'false' || strAns === 's' ? 'Salah' : 'Benar';
      } else if (tipe === 'ISIAN') {
        options = [];
        answer = String(rawAns || '').trim();
      } else if (tipe === 'URAIAN') {
        options = [];
        answer = String(rawAns || '').trim();
      } else {
        // PG
        answer = String(rawAns || 'A').trim().toUpperCase();
        if (options.length === 0) {
          options = ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
        }
      }

      questions.push({
        id: `q-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        tipe,
        content,
        options,
        answer,
        difficulty,
        image: typeof image === 'string' && image.trim() ? image.trim() : null,
      });
    });
  } catch (err: any) {
    errors.push(`Gagal membaca berkas JSON: ${err.message || String(err)}`);
  }

  return { questions, errors, totalParsed: questions.length };
}

// Split CSV row taking into account quotes and commas
function parseCSVLine(text: string, delimiter = ','): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

// Parse CSV format
export function parseCSVQuestions(csvText: string): ImportResult {
  const errors: string[] = [];
  const questions: Question[] = [];

  // Remove BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // Detect delimiter (, or ; or \t)
  const firstLine = cleanText.split('\n')[0] || '';
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  let delimiter = ',';
  if (semiCount > commaCount && semiCount >= tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  // Split lines respecting multiline quotes
  const lines: string[] = [];
  let currentLine = '';
  let insideQuote = false;

  for (const rawLine of cleanText.split(/\r?\n/)) {
    if (!rawLine.trim() && !insideQuote) continue;
    currentLine = currentLine ? `${currentLine}\n${rawLine}` : rawLine;
    const quoteCount = (currentLine.match(/"/g) || []).length;
    insideQuote = quoteCount % 2 !== 0;

    if (!insideQuote) {
      lines.push(currentLine);
      currentLine = '';
    }
  }

  if (lines.length < 2) {
    errors.push('Berkas CSV/Excel kosong atau tidak memiliki baris data.');
    return { questions: [], errors, totalParsed: 0 };
  }

  const rawHeader = parseCSVLine(lines[0], delimiter);
  const header = rawHeader.map((h) => h.toLowerCase().replace(/[\s_\-\.\:]+/g, ''));

  // SAFE Column index lookup: strict matching for single letters to prevent 'soal' from matching 'a'!
  const findCol = (...aliases: string[]) =>
    header.findIndex((h) =>
      aliases.some((a) => {
        const cleanA = a.toLowerCase().replace(/[\s_\-\.\:]+/g, '');
        if (cleanA.length === 1) {
          // Strict match for single letters 'a', 'b', 'c', 'd', 'e'
          return (
            h === cleanA ||
            h === `opsi${cleanA}` ||
            h === `pilihan${cleanA}` ||
            h === `opt${cleanA}` ||
            h === `option${cleanA}` ||
            h === `jawaban${cleanA}`
          );
        }
        return h === cleanA || h.startsWith(cleanA) || (cleanA.length >= 4 && h.includes(cleanA));
      })
    );

  const idxTipe = findCol('tipe', 'type', 'jenissoal', 'jenis');
  const idxContent = findCol('content', 'soal', 'pertanyaan', 'question', 'teks', 'butirsoal', 'naskah');
  const idxA = findCol('opsia', 'pilihana', 'a');
  const idxB = findCol('opsib', 'pilihanb', 'b');
  const idxC = findCol('opsic', 'pilihanc', 'c');
  const idxD = findCol('opsid', 'pilihand', 'd');
  const idxE = findCol('opsie', 'pilihane', 'e');
  const idxOptions = findCol('options', 'pilihan', 'opsi');
  const idxAnswer = findCol('kunci', 'answer', 'jawaban', 'kuncitutorial', 'kuncisoal');
  const idxDiff = findCol('difficulty', 'kesulitan', 'tingkat', 'level');
  const idxImage = findCol('image', 'gambar', 'foto', 'urlgambar');

  if (idxContent === -1) {
    errors.push(
      'Kolom pertanyaan/soal tidak ditemukan di baris header CSV (misal: "soal", "pertanyaan", atau "content").'
    );
    return { questions: [], errors, totalParsed: 0 };
  }

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter);
    const content = (row[idxContent] || '').trim();
    if (!content) continue;

    const rawTipe = idxTipe !== -1 ? row[idxTipe] : 'PG';
    const tipe = normalizeQuestionType(rawTipe);
    const difficulty = normalizeDifficulty(idxDiff !== -1 ? row[idxDiff] : 'REGULER');
    const image = idxImage !== -1 && row[idxImage]?.trim() ? row[idxImage].trim() : null;
    const rawAnswer = idxAnswer !== -1 ? row[idxAnswer] : '';

    let options: string[] = [];

    if (idxA !== -1 && idxB !== -1) {
      // Individual columns for options
      const optA = row[idxA] || '';
      const optB = row[idxB] || '';
      const optC = idxC !== -1 ? row[idxC] || '' : '';
      const optD = idxD !== -1 ? row[idxD] || '' : '';
      const optE = idxE !== -1 ? row[idxE] || '' : '';
      options = [optA, optB, optC, optD, optE].map((s) => s.trim()).filter(Boolean);
    } else if (idxOptions !== -1 && row[idxOptions]) {
      // Combined options column separated by | or ;
      options = row[idxOptions].split(/[|;]/).map((s) => s.trim()).filter(Boolean);
    }

    let answer: string | string[] = '';

    if (tipe === 'PGK') {
      answer = (rawAnswer || 'A')
        .toUpperCase()
        .split(/[,;+]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .sort();
      if (options.length === 0) {
        options = ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
      }
    } else if (tipe === 'BS') {
      options = ['Benar', 'Salah'];
      const strAns = (rawAnswer || 'Benar').trim().toLowerCase();
      answer = strAns.includes('salah') || strAns === 'false' || strAns === 's' ? 'Salah' : 'Benar';
    } else if (tipe === 'ISIAN') {
      options = [];
      answer = (rawAnswer || '').trim();
    } else if (tipe === 'URAIAN') {
      options = [];
      answer = (rawAnswer || '').trim();
    } else {
      // PG
      answer = (rawAnswer || 'A').trim().toUpperCase();
      if (options.length === 0) {
        options = ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
      }
    }

    questions.push({
      id: `q-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      tipe,
      content,
      options,
      answer,
      difficulty,
      image,
    });
  }

  return { questions, errors, totalParsed: questions.length };
}

// Parse Excel format (.xlsx, .xls)
export function parseExcelQuestions(arrayBuffer: ArrayBuffer): ImportResult {
  const errors: string[] = [];

  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      errors.push('Berkas Excel kosong atau tidak memiliki lembar kerja (worksheet).');
      return { questions: [], errors, totalParsed: 0 };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const csvContent = XLSX.utils.sheet_to_csv(sheet, { FS: ';' });
    if (!csvContent || !csvContent.trim()) {
      errors.push('Lembar kerja Excel kosong atau tidak memuat data.');
      return { questions: [], errors, totalParsed: 0 };
    }

    return parseCSVQuestions(csvContent);
  } catch (err: any) {
    errors.push(`Gagal membaca berkas Excel: ${err.message || String(err)}`);
    return { questions: [], errors, totalParsed: 0 };
  }
}

// Parse Word DOCX format using mammoth
export async function parseWordQuestions(arrayBuffer: ArrayBuffer): Promise<ImportResult> {
  const errors: string[] = [];
  const questions: Question[] = [];

  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    if (!text.trim()) {
      errors.push('Dokumen Word kosong atau tidak dapat diekstrak.');
      return { questions, errors, totalParsed: 0 };
    }

    // Split document into potential question blocks.
    // Common patterns: "1. ", "1) ", "No. 1", "Soal 1", "Pertanyaan 1"
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
      // Check if this line looks like a new question start, but not an option or sub-point
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
        // Line before any number, initiate first block if contains text
        currentBlock = {
          headerNumber: 1,
          lines: [line],
        };
      }
    }
    if (currentBlock) blocks.push(currentBlock);

    blocks.forEach((block, bIdx) => {
      let content = '';
      const options: string[] = [];
      let rawKey = '';
      let rawTipe = '';
      let rawDiff = '';
      let rawImage = '';

      const contentLines: string[] = [];
      const optRegex = /^[A-Ea-e][\.\)]\s*(.+)$/;
      const keyRegex = /^(?:kunci(?:\s*jawaban)?|jawaban|answer)\s*[:=]\s*(.+)$/i;
      const typeRegex = /^(?:tipe(?:\s*soal)?|type)\s*[:=]\s*(.+)$/i;
      const diffRegex = /^(?:kesulitan|tingkat|difficulty)\s*[:=]\s*(.+)$/i;
      const imgRegex = /^(?:gambar|image|foto)\s*[:=]\s*(.+)$/i;

      for (const line of block.lines) {
        if (!line.trim()) continue;

        const keyMatch = line.match(keyRegex);
        if (keyMatch) {
          rawKey = keyMatch[1].trim();
          continue;
        }

        const typeMatch = line.match(typeRegex);
        if (typeMatch) {
          rawTipe = typeMatch[1].trim();
          continue;
        }

        const diffMatch = line.match(diffRegex);
        if (diffMatch) {
          rawDiff = diffMatch[1].trim();
          continue;
        }

        const imgMatch = line.match(imgRegex);
        if (imgMatch) {
          rawImage = imgMatch[1].trim();
          continue;
        }

        const optMatch = line.match(optRegex);
        if (optMatch) {
          options.push(optMatch[1].trim());
          continue;
        }

        // Otherwise it's part of the question content
        contentLines.push(line);
      }

      content = contentLines.join('\n').trim();
      if (!content) {
        if (options.length > 0) {
          content = `Pertanyaan #${block.headerNumber || bIdx + 1}`;
        } else {
          return; // Skip empty block
        }
      }

      // Auto-detect question type if not explicitly stated
      let tipe: QuestionType = 'PG';
      if (rawTipe) {
        tipe = normalizeQuestionType(rawTipe);
      } else {
        const lowerKey = rawKey.toLowerCase();
        if (lowerKey === 'benar' || lowerKey === 'salah' || lowerKey === 'true' || lowerKey === 'false') {
          tipe = 'BS';
        } else if (rawKey.includes(',') || rawKey.includes(';') || rawKey.length > 2 && /^[A-E\s,]+$/i.test(rawKey)) {
          tipe = 'PGK';
        } else if (options.length === 0) {
          if (/jelaskan|mengapa|bagaimana|sebutkan|uraikan|analisis/i.test(content) || rawKey.length > 30) {
            tipe = 'URAIAN';
          } else {
            tipe = 'ISIAN';
          }
        } else {
          tipe = 'PG';
        }
      }

      const difficulty = normalizeDifficulty(rawDiff);

      let finalAnswer: string | string[] = '';
      if (tipe === 'PGK') {
        finalAnswer = (rawKey || 'A')
          .toUpperCase()
          .split(/[,;+]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .sort();
        if (options.length === 0) {
          options.push('Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D');
        }
      } else if (tipe === 'BS') {
        const s = (rawKey || 'Benar').trim().toLowerCase();
        finalAnswer = s.includes('salah') || s === 'false' ? 'Salah' : 'Benar';
        if (options.length === 0) options.push('Benar', 'Salah');
      } else if (tipe === 'ISIAN' || tipe === 'URAIAN') {
        finalAnswer = rawKey.trim();
        // options stay empty
      } else {
        // PG
        finalAnswer = (rawKey || 'A').trim().toUpperCase();
        if (options.length === 0) {
          options.push('Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D');
        }
      }

      questions.push({
        id: `q-${Date.now()}-${bIdx}-${Math.random().toString(36).substr(2, 4)}`,
        tipe,
        content,
        options,
        answer: finalAnswer,
        difficulty,
        image: rawImage || null,
      });
    });

    if (questions.length === 0) {
      errors.push('Tidak ada butir soal yang berhasil terdeteksi dalam berkas Word. Pastikan format soal menggunakan nomor seperti "1. Teks soal" diikuti opsi "A. Pilihan" dan "Kunci: A".');
    }
  } catch (err: any) {
    errors.push(`Gagal membaca berkas Word: ${err.message || String(err)}`);
  }

  return { questions, errors, totalParsed: questions.length };
}

// Helper to trigger browser download
function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download Sample Templates
export function downloadCSVTemplate() {
  const csvContent =
    '\uFEFF' +
    'tipe,content,opsi_a,opsi_b,opsi_c,opsi_d,kunci,difficulty,image\n' +
    'PG,"Apa ibukota negara Indonesia?","Surabaya","Jakarta","Bandung","Medan","B","REGULER",""\n' +
    'PGK,"Manakah yang termasuk pulau besar di Indonesia?","Sumatra","Bali","Kalimantan","Madura","A,C","HOTS",""\n' +
    'BS,"Pancasila adalah dasar negara Republik Indonesia.","","","","","Benar","REGULER",""\n' +
    'ISIAN,"Siapakah nama presiden pertama Republik Indonesia?","","","","","Ir. Soekarno","REGULER",""\n' +
    'URAIAN,"Jelaskan secara singkat proses siklus air (hidrologi) di bumi!","","","","","Evaporasi (penguapan air), kondensasi (pembentukan awan), presipitasi (hujan), dan infiltrasi (penyerapan air ke tanah).","HOTS",""\n';

  triggerDownload('Template_Import_Soal_CBT.csv', csvContent, 'text/csv;charset=utf-8;');
}

export function downloadJSONTemplate() {
  const template = [
    {
      tipe: 'PG',
      content: 'Apa ibukota negara Republik Indonesia?',
      options: ['Surabaya', 'Jakarta', 'Bandung', 'Medan'],
      answer: 'B',
      difficulty: 'REGULER',
      image: null,
    },
    {
      tipe: 'PGK',
      content: 'Manakah yang termasuk pulau besar di Indonesia? (Pilihan Ganda Kompleks)',
      options: ['Sumatra', 'Bali', 'Kalimantan', 'Madura'],
      answer: ['A', 'C'],
      difficulty: 'HOTS',
      image: null,
    },
    {
      tipe: 'BS',
      content: 'Pancasila adalah dasar negara Republik Indonesia.',
      options: ['Benar', 'Salah'],
      answer: 'Benar',
      difficulty: 'REGULER',
      image: null,
    },
    {
      tipe: 'ISIAN',
      content: 'Siapakah nama presiden pertama Republik Indonesia?',
      options: [],
      answer: 'Ir. Soekarno',
      difficulty: 'REGULER',
      image: null,
    },
    {
      tipe: 'URAIAN',
      content: 'Jelaskan secara singkat proses siklus air di bumi!',
      options: [],
      answer: 'Evaporasi (penguapan), kondensasi (pembentukan awan), presipitasi (hujan), infiltrasi.',
      difficulty: 'HOTS',
      image: null,
    },
  ];

  triggerDownload('Template_Import_Soal_CBT.json', JSON.stringify(template, null, 2), 'application/json;charset=utf-8;');
}

export function downloadExcelTemplate() {
  const data = [
    ['tipe', 'content', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'kunci', 'difficulty', 'image'],
    ['PG', 'Apa ibukota negara Indonesia?', 'Surabaya', 'Jakarta', 'Bandung', 'Medan', 'B', 'REGULER', ''],
    ['PGK', 'Manakah yang termasuk pulau besar di Indonesia?', 'Sumatra', 'Bali', 'Kalimantan', 'Madura', 'A,C', 'HOTS', ''],
    ['BS', 'Pancasila adalah dasar negara Republik Indonesia.', '', '', '', '', 'Benar', 'REGULER', ''],
    ['ISIAN', 'Siapakah nama presiden pertama Republik Indonesia?', '', '', '', '', 'Ir. Soekarno', 'REGULER', ''],
    ['URAIAN', 'Jelaskan secara singkat proses siklus air di bumi!', '', '', '', '', 'Evaporasi, kondensasi, presipitasi, dan infiltrasi.', 'HOTS', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Soal');
  XLSX.writeFile(wb, 'Template_Import_Soal_CBT.xlsx');
}

export function downloadWordTemplateGuide() {
  const guide =
`CONTOH FORMAT PENULISAN SOAL DI MICROSOFT WORD (.DOCX / .DOC)
============================================================
Anda dapat menyalin contoh di bawah ini ke Microsoft Word, lalu simpan sebagai berkas .docx dan unggah ke panel CBT.

1. Apa ibukota negara Indonesia?
A. Surabaya
B. Jakarta
C. Bandung
D. Medan
Kunci: B
Tipe: PG
Kesulitan: REGULER

2. Manakah yang termasuk pulau besar di Indonesia?
A. Sumatra
B. Bali
C. Kalimantan
D. Madura
Kunci: A, C
Tipe: PGK
Kesulitan: HOTS

3. Pancasila merupakan dasar negara Republik Indonesia.
Kunci: Benar
Tipe: BS
Kesulitan: REGULER

4. Siapakah nama presiden pertama Republik Indonesia?
Kunci: Ir. Soekarno
Tipe: ISIAN
Kesulitan: REGULER

5. Jelaskan secara singkat proses siklus air di bumi!
Kunci: Evaporasi, kondensasi, presipitasi, dan infiltrasi ke dalam tanah.
Tipe: URAIAN
Kesulitan: HOTS
`;

  triggerDownload('Panduan_Format_Word_DOCX.txt', guide, 'text/plain;charset=utf-8;');
}

export function downloadPdfTemplateGuide() {
  const guide = `=====================================================
PANDUAN FORMAT BERKAS PDF SOAL UJIAN (EDUZONE CBT)
=====================================================

Sistem EduZone CBT menggunakan mesin ekstraksi cerdas multi-modal
bertenaga Google Gemini AI dan PDF Parser untuk mengekstrak naskah soal
secara otomatis dari dokumen PDF.

Format penulisan yang direkomendasikan agar seluruh nomor, opsi,
dan kunci jawaban terdeteksi secara sempurna:

1. Penomoran Soal:
   Gunakan angka diikuti titik, kurung tutup, atau titik dua.
   Contoh:
   1. Ibukota negara Indonesia yang baru di Kalimantan Timur adalah...
   A. Balikpapan
   B. Nusantara
   C. Samarinda
   D. Pontianak
   Kunci: B
   Tipe: PG
   Kesulitan: REGULER

2. Tipe Soal Pilihan Ganda Kompleks (PGK):
   2. Manakah yang termasuk pulau besar di wilayah Indonesia? (Pilih dua)
   A. Sumatra
   B. Bali
   C. Kalimantan
   D. Madura
   Kunci: A, C
   Tipe: PGK
   Kesulitan: HOTS

3. Tipe Soal Benar - Salah (BS):
   3. Indonesia merdeka pada tanggal 17 Agustus 1945.
   Kunci: Benar
   Tipe: BS
   Kesulitan: REGULER

4. Tipe Soal Isian Singkat:
   4. Siapakah presiden pertama Republik Indonesia?
   Kunci: Ir. Soekarno
   Tipe: ISIAN
   Kesulitan: REGULER

5. Tipe Soal Uraian / Essay:
   5. Jelaskan secara singkat tahapan siklus air di bumi!
   Kunci: Evaporasi, kondensasi, presipitasi, dan infiltrasi.
   Tipe: URAIAN
   Kesulitan: HOTS

Catatan Tambahan:
- Dokumen PDF dapat dibuat dari Microsoft Word (Save As PDF), Canva, Google Docs, atau aplikasi naskah soal lainnya.
- Jika naskah PDF asli tidak memuat tulisan "Kunci:", AI akan otomatis menganalisis dan menentukan kunci jawaban yang paling tepat.
`;

  triggerDownload('Panduan_Format_PDF_EduZone.txt', guide, 'text/plain;charset=utf-8;');
}

// Parse PDF format via server endpoint (Gemini Multimodal Vision + PDF text extraction fallback)
export async function parsePdfQuestions(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  try {
    // Convert file to base64
    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const response = await fetch('/api/parse-pdf-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        base64,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      errors.push(data.message || 'Gagal memproses naskah soal dari berkas PDF.');
      return { questions: [], errors, totalParsed: 0 };
    }

    if (Array.isArray(data.questions) && data.questions.length > 0) {
      return {
        questions: data.questions,
        errors: [],
        totalParsed: data.questions.length,
      };
    } else {
      errors.push('Tidak ada butir soal yang berhasil diekstrak dari dokumen PDF ini.');
      return { questions: [], errors, totalParsed: 0 };
    }
  } catch (err: any) {
    errors.push(`Gagal mengunggah berkas PDF: ${err?.message || String(err)}`);
    return { questions: [], errors, totalParsed: 0 };
  }
}

