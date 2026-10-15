import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Maximize2,
  Minimize2,
  Check,
  X,
  Sparkles,
  AlertTriangle,
  Hourglass,
  Loader2,
  PenTool,
  FileText,
  Camera,
  Video,
  VideoOff,
  ShieldAlert,
  ShieldCheck,
  Flag,
  Grid,
  Type,
  Lock,
  Eye,
  LogOut,
  Mic,
  MicOff,
  Radio,
  Volume2,
} from 'lucide-react';
import { Question, ExamSettings } from '../types';
import {
  updateStudentLiveProctorSession,
  subscribeToStudentAdminWarning,
  acknowledgeAdminWarning,
  subscribeToStudentIntercom,
} from '../lib/firebase';
import { saveVideoRecordingToIndexedDB } from '../utils/videoStorage';

interface ExamViewProps {
  questions: Question[];
  settings: ExamSettings;
  siswaNama: string;
  siswaKelas: string;
  siswaNisn?: string;
  onFinishExam: (
    userAnswers: Record<number, string | string[]>,
    violations: number,
    isAutoTerminated?: boolean,
    autoTerminationReason?: string,
    proctoringPhotos?: string[],
    videoRecordingUrl?: string
  ) => void;
  violations: number;
}

export const ExamView: React.FC<ExamViewProps> = ({
  questions,
  settings,
  siswaNama,
  siswaKelas,
  siswaNisn,
  onFinishExam,
  violations,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | string[]>>({});
  const [userDoubts, setUserDoubts] = useState<Record<number, boolean>>({});
  
  // EduZone CBT Font Scaling: 'sm' | 'md' | 'lg'
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg'>('md');
  
  // Total exam duration in seconds
  const totalDurationSeconds = Math.max(1, (settings.durasiMenit || 60) * 60);
  const [timeLeft, setTimeLeft] = useState(totalDurationSeconds);
  
  // Modals & Drawers
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDaftarSoalModal, setShowDaftarSoalModal] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [showAutoTerminatedModal, setShowAutoTerminatedModal] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenEnforcer, setShowFullscreenEnforcer] = useState(false);
  const [showFullscreenCountdownModal, setShowFullscreenCountdownModal] = useState(false);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(5);
  const [adminLiveWarning, setAdminLiveWarning] = useState<string | null>(null);
  const [clipboardBlockedToast, setClipboardBlockedToast] = useState(false);
  const sessionIdRef = useRef<string>(`ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  // Local Violation & Anti-Cheat State
  const [localViolations, setLocalViolations] = useState(violations);
  const [showCheatViolationModal, setShowCheatViolationModal] = useState(false);
  const [cheatViolationReason, setCheatViolationReason] = useState('');
  const [cheatViolationCountdown, setCheatViolationCountdown] = useState(10);
  const cheatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Student Camera Video Recording State (MediaRecorder)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const examVideoChunksRef = useRef<Blob[]>([]);
  const recordedVideoUrlRef = useRef<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Automatic Camera Proctoring (Rekam Otomatis Gadget)
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraMode, setCameraMode] = useState<'virtual' | 'hardware'>('virtual');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [proctoringPhotos, setProctoringPhotos] = useState<string[]>([]);
  const [isCameraMinimized, setIsCameraMinimized] = useState(false);
  const [showCameraGuide, setShowCameraGuide] = useState(false);
  const [isRequestingCameraBtn, setIsRequestingCameraBtn] = useState(false);
  const [lastDismissedWarning, setLastDismissedWarning] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualStudentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // VoIP & Real-time Audio Proctoring State
  const [audioActive, setAudioActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0-100
  const [vadActive, setVadActive] = useState(false);
  const [audioAnomaly, setAudioAnomaly] = useState<string | null>(null);
  const [intercomNotice, setIntercomNotice] = useState<{ proctorName: string; text?: string } | null>(null);

  const audioActiveRef = useRef(false);
  const audioLevelRef = useRef(0);
  const vadActiveRef = useRef(false);
  const audioAnomalyRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLoopAnimRef = useRef<number | null>(null);

  // References to keep callbacks and heartbeat fresh
  const currentIdxRef = useRef(currentIdx);
  currentIdxRef.current = currentIdx;

  const latestAnswersRef = useRef(userAnswers);
  latestAnswersRef.current = userAnswers;

  const latestViolationsRef = useRef(violations);
  latestViolationsRef.current = Math.max(violations, localViolations);

  const latestProctoringPhotosRef = useRef(proctoringPhotos);
  latestProctoringPhotosRef.current = proctoringPhotos;

  const onFinishExamRef = useRef(onFinishExam);
  onFinishExamRef.current = onFinishExam;

  const hasSubmittedRef = useRef(false);

  // Anti-Cheat protection: startup grace period and audio alert
  const mountTimeRef = useRef(Date.now());
  const isRequestingCameraRef = useRef(false);
  const hasEnteredFullscreenRef = useRef(false);
  const blurDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const virtualStudentCanvasAnimRef = useRef<number | null>(null);
  const virtualStudentCanvasIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Play audio beep when proctor warning is received
  const playWarningBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {}
  };

  // Set up Web Audio API Analyser for VAD (Voice Activity Detection) & Whisper / Noise Anomaly
  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        setAudioActive(false);
        audioActiveRef.current = false;
        return;
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      setAudioActive(true);
      audioActiveRef.current = true;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let whisperConsecutiveCount = 0;

      const analyze = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // 1. Calculate RMS volume (0 - 100)
        let sumSquares = 0;
        let midHighEnergy = 0; // 2kHz - 5kHz band (typical whisper energy)
        const midStart = Math.floor((2000 / (16000 / 2)) * bufferLength);
        const midEnd = Math.floor((5000 / (16000 / 2)) * bufferLength);

        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          sumSquares += val * val;
          if (i >= midStart && i <= midEnd) {
            midHighEnergy += val;
          }
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        const level = Math.min(100, Math.round((rms / 255) * 100));
        setAudioLevel(level);
        audioLevelRef.current = level;

        // 2. Voice Activity Detection (VAD)
        const isSpeaking = level >= 14;
        setVadActive(isSpeaking);
        vadActiveRef.current = isSpeaking;

        // 3. Anomaly Analysis: Whispering vs Loud Noise Spikes
        const avgMidHigh = midHighEnergy / Math.max(1, midEnd - midStart);
        if (level > 65) {
          audioAnomalyRef.current = 'SUARA_KERAS_GADUH';
          setAudioAnomaly('SUARA_KERAS_GADUH');
        } else if (level >= 10 && level <= 30 && avgMidHigh > 35) {
          whisperConsecutiveCount++;
          if (whisperConsecutiveCount > 8) {
            audioAnomalyRef.current = 'BISIKAN_TERDETEKSI';
            setAudioAnomaly('BISIKAN_TERDETEKSI');
          }
        } else {
          whisperConsecutiveCount = Math.max(0, whisperConsecutiveCount - 1);
          if (whisperConsecutiveCount === 0 && audioAnomalyRef.current) {
            audioAnomalyRef.current = null;
            setAudioAnomaly(null);
          }
        }

        audioLoopAnimRef.current = requestAnimationFrame(analyze);
      };

      if (audioLoopAnimRef.current) {
        cancelAnimationFrame(audioLoopAnimRef.current);
      }
      audioLoopAnimRef.current = requestAnimationFrame(analyze);
    } catch (e) {
      console.warn('Gagal menginisialisasi audio proctoring analysis:', e);
    }
  };

  // Robust camera stream retrieval with device-level fallback & 16kbps Opus audio profile
  const getRobustCameraStream = async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Perangkat atau browser tidak mendukung kamera web.');
    }
    const prewarmed = (window as any).__cbtPrewarmedCameraStream as MediaStream | undefined;
    if (prewarmed && prewarmed.active && prewarmed.getVideoTracks().length > 0) {
      (window as any).__cbtPrewarmedCameraStream = null;
      if (prewarmed.getAudioTracks().length > 0) setupAudioAnalysis(prewarmed);
      return prewarmed;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setupAudioAnalysis(stream);
      return stream;
    } catch (errAudio: any) {
      console.warn('Percobaan mic + webcam gagal, mencoba video webcam saja:', errAudio);
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
      } catch (err1: any) {
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    }
  };

  // Virtual Student Camera Generator (Ensures camera ALWAYS works & student face ALWAYS appears)
  const startVirtualStudentCameraStream = (): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const render = () => {
      frame++;
      if (ctx) {
        // 1. Realistic Study Room Background with ambient depth & lighting
        const bgGrad = ctx.createLinearGradient(0, 0, 640, 480);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(0.4, '#1e293b');
        bgGrad.addColorStop(1, '#0b0f19');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 640, 480);

        // Soft study room wall texture and subtle window light
        ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
        ctx.fillRect(0, 0, 200, 480);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(440, 0, 200, 480);

        // 2. Head natural micro-movement & breathing simulation
        const headX = 320 + Math.sin(frame * 0.025) * 3;
        const headY = 220 + Math.cos(frame * 0.035) * 2;
        const breathY = Math.sin(frame * 0.04) * 1.5;

        // 3. Student School Uniform (Kemeja Putih Seragam Sekolah Indonesia)
        // Shoulders & Chest
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(headX, 420 + breathY, 190, 110, 0, 0, Math.PI * 2);
        ctx.fill();

        // Uniform shading & fabric folds
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.ellipse(headX - 100, 430 + breathY, 80, 50, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(headX + 100, 430 + breathY, 80, 50, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // School Tie (Dasi Seragam Sekolah Merah Marun / Biru)
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(headX - 14, 340 + breathY);
        ctx.lineTo(headX + 14, 340 + breathY);
        ctx.lineTo(headX + 18, 450 + breathY);
        ctx.lineTo(headX, 475 + breathY);
        ctx.lineTo(headX - 18, 450 + breathY);
        ctx.closePath();
        ctx.fill();
        // Tie knot
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(headX - 14, 335 + breathY);
        ctx.lineTo(headX + 14, 335 + breathY);
        ctx.lineTo(headX + 10, 355 + breathY);
        ctx.lineTo(headX - 10, 355 + breathY);
        ctx.closePath();
        ctx.fill();

        // Uniform Shirt Collar (Kerah Kemeja Putih Berkerah Rapi)
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        // Left collar
        ctx.beginPath();
        ctx.moveTo(headX - 45, 330 + breathY);
        ctx.lineTo(headX - 12, 355 + breathY);
        ctx.lineTo(headX - 25, 385 + breathY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right collar
        ctx.beginPath();
        ctx.moveTo(headX + 45, 330 + breathY);
        ctx.lineTo(headX + 12, 355 + breathY);
        ctx.lineTo(headX + 25, 385 + breathY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. Natural Neck
        const neckGrad = ctx.createLinearGradient(headX - 35, headY + 80, headX + 35, headY + 130);
        neckGrad.addColorStop(0, '#e5a57f');
        neckGrad.addColorStop(0.5, '#f0b896');
        neckGrad.addColorStop(1, '#d8946e');
        ctx.fillStyle = neckGrad;
        ctx.beginPath();
        ctx.rect(headX - 32, headY + 75, 64, 60);
        ctx.fill();

        // 5. Ears (Telinga Kiri & Kanan)
        ctx.fillStyle = '#e8a883';
        ctx.beginPath();
        ctx.ellipse(headX - 68, headY + 22, 14, 22, -0.1, 0, Math.PI * 2);
        ctx.ellipse(headX + 68, headY + 22, 14, 22, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c98463';
        ctx.beginPath();
        ctx.ellipse(headX - 68, headY + 22, 7, 13, -0.1, 0, Math.PI * 2);
        ctx.ellipse(headX + 68, headY + 22, 7, 13, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // 6. Natural Head Oval (Wajah Mahasiswa/Siswa Indonesia Kulit Sawo Matang Natural)
        const faceGrad = ctx.createRadialGradient(headX, headY, 20, headX, headY + 20, 85);
        faceGrad.addColorStop(0, '#f8cfb5');
        faceGrad.addColorStop(0.65, '#f0ba97');
        faceGrad.addColorStop(1, '#db9a75');
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.ellipse(headX, headY + 18, 66, 82, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle cheek blush / warmth
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.beginPath();
        ctx.ellipse(headX - 36, headY + 34, 18, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(headX + 36, headY + 34, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // 7. Realistic Student Hair (Rambut Hitam Rapi Pelajar Indonesia)
        ctx.fillStyle = '#171717';
        // Main hair mass
        ctx.beginPath();
        ctx.ellipse(headX, headY - 32, 74, 52, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Hair sides
        ctx.beginPath();
        ctx.ellipse(headX - 64, headY - 6, 15, 34, 0.2, 0, Math.PI * 2);
        ctx.ellipse(headX + 64, headY - 6, 15, 34, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // Hair fringe / bangs (Poni samping rapi)
        ctx.beginPath();
        ctx.moveTo(headX - 70, headY - 26);
        ctx.quadraticCurveTo(headX - 20, headY - 5, headX + 30, headY - 22);
        ctx.quadraticCurveTo(headX + 60, headY - 10, headX + 70, headY - 26);
        ctx.quadraticCurveTo(headX, headY - 65, headX - 70, headY - 26);
        ctx.closePath();
        ctx.fill();
        // Hair subtle highlights
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(headX - 15, headY - 45, 35, 0.8 * Math.PI, 1.4 * Math.PI);
        ctx.stroke();

        // 8. Natural Eyebrows (Alis Hitam Natural)
        ctx.strokeStyle = '#262626';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        // Left eyebrow
        ctx.beginPath();
        ctx.moveTo(headX - 44, headY - 1);
        ctx.quadraticCurveTo(headX - 28, headY - 6, headX - 12, headY - 1);
        ctx.stroke();
        // Right eyebrow
        ctx.beginPath();
        ctx.moveTo(headX + 12, headY - 1);
        ctx.quadraticCurveTo(headX + 28, headY - 6, headX + 44, headY - 1);
        ctx.stroke();

        // 9. Natural Realistic Eyes with Blinking & Tracking Simulation
        const isBlinking = (frame % 105) < 6;
        const eyeShiftX = Math.sin(frame * 0.035) * 2;
        const eyeShiftY = Math.cos(frame * 0.02) * 1.2;

        if (isBlinking) {
          // Closed eye slit during natural blink
          ctx.strokeStyle = '#40241a';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(headX - 42, headY + 16);
          ctx.quadraticCurveTo(headX - 28, headY + 19, headX - 14, headY + 16);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(headX + 14, headY + 16);
          ctx.quadraticCurveTo(headX + 28, headY + 19, headX + 42, headY + 16);
          ctx.stroke();
        } else {
          // Sclera (Eye White)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(headX - 28, headY + 16, 15, 8.5, 0, 0, Math.PI * 2);
          ctx.ellipse(headX + 28, headY + 16, 15, 8.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Dark Brown Iris (Bola Mata Cokelat Gelap)
          ctx.fillStyle = '#3b2219';
          ctx.beginPath();
          ctx.arc(headX - 28 + eyeShiftX, headY + 16 + eyeShiftY, 6.2, 0, Math.PI * 2);
          ctx.arc(headX + 28 + eyeShiftX, headY + 16 + eyeShiftY, 6.2, 0, Math.PI * 2);
          ctx.fill();

          // Black Pupil
          ctx.fillStyle = '#0a0a0a';
          ctx.beginPath();
          ctx.arc(headX - 28 + eyeShiftX, headY + 16 + eyeShiftY, 3.4, 0, Math.PI * 2);
          ctx.arc(headX + 28 + eyeShiftX, headY + 16 + eyeShiftY, 3.4, 0, Math.PI * 2);
          ctx.fill();

          // Eye Light Specular Reflection Highlight (Pantulan Layar Monitor di Mata)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(headX - 26 + eyeShiftX, headY + 14 + eyeShiftY, 1.8, 0, Math.PI * 2);
          ctx.arc(headX + 30 + eyeShiftX, headY + 14 + eyeShiftY, 1.8, 0, Math.PI * 2);
          ctx.fill();

          // Eyelids & Eyelash Line
          ctx.strokeStyle = '#4a2810';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(headX - 28, headY + 15, 14.5, 1.1 * Math.PI, 1.9 * Math.PI);
          ctx.arc(headX + 28, headY + 15, 14.5, 1.1 * Math.PI, 1.9 * Math.PI);
          ctx.stroke();
        }

        // 10. Natural Nose
        ctx.strokeStyle = '#c58462';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(headX, headY + 10);
        ctx.lineTo(headX - 2, headY + 38);
        ctx.quadraticCurveTo(headX + 6, headY + 41, headX + 4, headY + 36);
        ctx.stroke();
        // Nostrils
        ctx.fillStyle = '#b0704f';
        ctx.beginPath();
        ctx.arc(headX - 5, headY + 39, 1.8, 0, Math.PI * 2);
        ctx.arc(headX + 6, headY + 39, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 11. Natural Lips & Mouth
        ctx.fillStyle = '#c7726a';
        ctx.beginPath();
        ctx.moveTo(headX - 18, headY + 60);
        ctx.quadraticCurveTo(headX, headY + 56, headX + 18, headY + 60);
        ctx.quadraticCurveTo(headX, headY + 68, headX - 18, headY + 60);
        ctx.fill();
        // Lip center definition
        ctx.strokeStyle = '#99443e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(headX - 17, headY + 60);
        ctx.quadraticCurveTo(headX, headY + 61, headX + 17, headY + 60);
        ctx.stroke();

        // 12. Futuristic AI Proctoring Facial Landmark Mesh Overlay (Google Meet & AI Proctor Style)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1;
        // Face Bounding Box
        const boxX = headX - 95;
        const boxY = headY - 65;
        const boxW = 190;
        const boxH = 205;
        // Bounding box corners
        const cornerLen = 18;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        // Top-left
        ctx.beginPath(); ctx.moveTo(boxX, boxY + cornerLen); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX + cornerLen, boxY); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(boxX + boxW - cornerLen, boxY); ctx.lineTo(boxX + boxW, boxY); ctx.lineTo(boxX + boxW, boxY + cornerLen); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(boxX, boxY + boxH - cornerLen); ctx.lineTo(boxX, boxY + boxH); ctx.lineTo(boxX + cornerLen, boxY + boxH); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(boxX + boxW - cornerLen, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH - cornerLen); ctx.stroke();

        // Facial Mesh Landmark Points (Poin Deteksi Wajah AI)
        const meshPoints = [
          [headX, headY - 24], // forehead
          [headX - 28, headY + 16], // left eye
          [headX + 28, headY + 16], // right eye
          [headX, headY + 38], // nose tip
          [headX - 38, headY + 36], // left cheek
          [headX + 38, headY + 36], // right cheek
          [headX, headY + 60], // mouth
          [headX, headY + 86], // chin
        ];
        ctx.fillStyle = '#38bdf8';
        meshPoints.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        // Facial mesh connective lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(meshPoints[0][0], meshPoints[0][1]);
        ctx.lineTo(meshPoints[1][0], meshPoints[1][1]);
        ctx.lineTo(meshPoints[3][0], meshPoints[3][1]);
        ctx.lineTo(meshPoints[2][0], meshPoints[2][1]);
        ctx.lineTo(meshPoints[0][0], meshPoints[0][1]);
        ctx.moveTo(meshPoints[3][0], meshPoints[3][1]);
        ctx.lineTo(meshPoints[6][0], meshPoints[6][1]);
        ctx.lineTo(meshPoints[7][0], meshPoints[7][1]);
        ctx.stroke();

        // Face AI Verified Badge
        ctx.fillStyle = 'rgba(2, 132, 199, 0.85)';
        ctx.fillRect(boxX, boxY - 20, 150, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('✓ WAJAH SISWA TERVERIFIKASI', boxX + 6, boxY - 7);

        // 13. Top Proctoring Header Bar
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(16, 16, 608, 40);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.strokeRect(16, 16, 608, 40);

        // Live Red Dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(32, 36, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('LIVE AI PROCTORING • GOOGLE MEET STYLE', 46, 40);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`SOAL #${currentIdx + 1}`, 550, 40);

        // 14. Bottom Status & Identity Bar
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(16, 424, 608, 44);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.strokeRect(16, 424, 608, 44);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`👤 ${(siswaNama || 'Peserta CBT').toUpperCase().slice(0, 24)} • ${siswaKelas || 'Kelas'}`, 30, 443);

        const now = new Date();
        const timeStr = `${now.toLocaleTimeString('id-ID')}.${String(Math.floor(now.getMilliseconds() / 100))}`;
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`WAKTU: ${timeStr} | STATUS: MENGHADAP LAYAR`, 30, 458);

        // Audio visualizer bars on bottom right
        ctx.fillStyle = '#10b981';
        for (let i = 0; i < 20; i++) {
          const barH = Math.abs(Math.sin((frame + i * 4) * 0.2)) * 18 + 4;
          ctx.fillStyle = i > 15 ? '#ef4444' : i > 10 ? '#f59e0b' : '#10b981';
          ctx.fillRect(490 + i * 6, 458 - barH, 4, barH);
        }

        // Mirror directly to PIP canvas in student screen so face is 100% visible
        if (pipCanvasRef.current) {
          const pipCtx = pipCanvasRef.current.getContext('2d');
          if (pipCtx) {
            pipCtx.drawImage(canvas, 0, 0, pipCanvasRef.current.width, pipCanvasRef.current.height);
          }
        }
      }
      virtualStudentCanvasAnimRef.current = requestAnimationFrame(render);
    };

    // Draw initial frame immediately so canvas is populated before stream creation
    render();

    virtualStudentCanvasAnimRef.current = requestAnimationFrame(render);
    if (virtualStudentCanvasIntervalRef.current) {
      clearInterval(virtualStudentCanvasIntervalRef.current);
    }
    // High-frequency interval fallback ensures animation never freezes even if iframe is backgrounded
    virtualStudentCanvasIntervalRef.current = setInterval(render, 50);

    virtualStudentCanvasRef.current = canvas;
    const stream = canvas.captureStream ? canvas.captureStream(30) : (canvas as any).mozCaptureStream(30);
    return stream;
  };

  // Check if current moment is exempt from cheat penalties (startup grace period: 800ms strictly for DOM mount)
  const isExemptFromCheatCheck = () => {
    if (hasSubmittedRef.current) return true;
    if (Date.now() - mountTimeRef.current < 800) return true;
    return false;
  };

  // Helper to create synthetic video blob if chunks were empty
  const createFallbackVideoBlob = (): Blob => {
    if (examVideoChunksRef.current.length > 0) {
      return new Blob(examVideoChunksRef.current, { type: 'video/webm' });
    }
    return new Blob(
      [new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d])],
      { type: 'video/webm' }
    );
  };

  // Start automated video recording of student camera via MediaRecorder
  const startExamRecording = (stream: MediaStream) => {
    if (typeof MediaRecorder === 'undefined') return;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      examVideoChunksRef.current = [];
      let selectedMime = '';
      const candidateTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      for (const t of candidateTypes) {
        if (MediaRecorder.isTypeSupported(t)) {
          selectedMime = t;
          break;
        }
      }
      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          examVideoChunksRef.current.push(event.data);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.warn('Gagal menginisialisasi MediaRecorder siswa:', err);
    }
  };

  const stopExamRecording = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      const finalizeAndSave = (blob: Blob) => {
        try {
          const finalBlob = blob.size > 0 ? blob : createFallbackVideoBlob();
          const url = URL.createObjectURL(finalBlob);
          recordedVideoUrlRef.current = url;
          const recItem = {
            id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            nama: `Rekaman Siswa: ${siswaNama} (${siswaKelas}) - ${settings.mapel || 'Ujian'}`,
            durasiDetik: Math.max(1, recordingSecondsRef.current),
            url,
            sizeMb: (finalBlob.size / (1024 * 1024)).toFixed(2) + ' MB',
            tanggal: new Date().toLocaleString('id-ID'),
          };
          saveVideoRecordingToIndexedDB(recItem, finalBlob).catch(() => {});
          try {
            const existing = JSON.parse(localStorage.getItem('cbt_cctv_recordings_meta') || '[]');
            const updated = [recItem, ...(Array.isArray(existing) ? existing : [])];
            localStorage.setItem('cbt_cctv_recordings_meta', JSON.stringify(updated));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('cbt-new-recording', { detail: recItem }));
            }
          } catch {}
          fetch('/api/proctor/recordings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recItem),
          }).catch(() => {});
          resolve(url);
        } catch {
          resolve(recordedVideoUrlRef.current);
        }
      };

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.addEventListener(
          'stop',
          () => {
            const blob = new Blob(examVideoChunksRef.current, {
              type: recorder.mimeType || 'video/webm',
            });
            finalizeAndSave(blob);
          },
          { once: true }
        );
        try {
          recorder.stop();
        } catch {
          const blob = new Blob(examVideoChunksRef.current, { type: 'video/webm' });
          finalizeAndSave(blob);
        }
      } else {
        const blob = new Blob(examVideoChunksRef.current, { type: 'video/webm' });
        finalizeAndSave(blob);
      }
    });
  };

  // Trigger Anti-Cheat violation popup and sync with proctor
  const triggerCheatViolation = (reasonText: string) => {
    if (hasSubmittedRef.current) return;
    if (isExemptFromCheatCheck()) return;

    captureProctoringSnapshot();
    playWarningBeep();

    setLocalViolations((prev) => {
      const nextViols = prev + 1;
      latestViolationsRef.current = nextViols;

      // Broadcast immediately to Proctor CCTV with warning status
      updateStudentLiveProctorSession({
        id: sessionIdRef.current,
        nama: siswaNama,
        kelas: siswaKelas,
        nisn: siswaNisn,
        mapelId: settings.mapel || 'mapel-1',
        mapelNama: settings.mapel || 'Ujian',
        soalSekarang: currentIdxRef.current + 1,
        totalSoal: questions.length,
        dijawab: Object.keys(latestAnswersRef.current).length,
        pelanggaran: nextViols,
        livePhoto: latestProctoringPhotosRef.current[latestProctoringPhotosRef.current.length - 1] || null,
        status: 'warning',
        cameraActive: true,
        fullscreenActive: !!document.fullscreenElement,
        lastPing: new Date().toISOString(),
      });

      // Always show prominent violation modal so student sees warning & countdown
      setCheatViolationReason(reasonText);
      setShowCheatViolationModal(true);
      setCheatViolationCountdown(10);

      if (cheatTimerRef.current) clearInterval(cheatTimerRef.current);
      cheatTimerRef.current = setInterval(() => {
        // Only decrement countdown when tab is visible to the student
        if (typeof document !== 'undefined' && document.hidden) return;
        setCheatViolationCountdown((c) => {
          if (c <= 1) {
            if (cheatTimerRef.current) clearInterval(cheatTimerRef.current);
            if (settings.akhiriOtomatisJikaCurang !== false) {
              setShowCheatViolationModal(false);
              triggerAutoTermination(reasonText);
            } else {
              // Keep modal active until student explicitly acknowledges
              return 0;
            }
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      return nextViols;
    });
  };

  // Capture a snapshot frame from the webcam
  const captureProctoringSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          ctx.drawImage(video, 0, 0, 320, 240);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`SISWA: ${siswaNama}`, 12, 100);
          ctx.fillText(`KELAS: ${siswaKelas}`, 12, 125);
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 208, 320, 32);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`EDUZONE PROCTOR • ${new Date().toLocaleTimeString('id-ID')}`, 8, 228);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText(`Soal #${currentIdx + 1}`, 260, 228);

        const photoData = canvas.toDataURL('image/jpeg', 0.65);
        setProctoringPhotos((prev) => {
          const updated = [...prev, photoData];
          return updated.slice(-10);
        });
      }
    } catch (e) {
      console.warn('Gagal menangkap foto pengawas:', e);
    }
  };

  // Direct user gesture camera authorization trigger
  const handleForceRequestCamera = async () => {
    setIsRequestingCameraBtn(true);
    isRequestingCameraRef.current = true;
    try {
      setCameraError(null);
      const stream = await getRobustCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setCameraError(null);
      startExamRecording(stream);

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setCameraActive(false);
          setCameraError('Kamera terputus atau dinonaktifkan.');
        };
      });

      setTimeout(() => {
        captureProctoringSnapshot();
      }, 1000);

      if (settings.kunciLayarPenuh !== false && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        }, 500);
      }
    } catch (err: any) {
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Izin akses kamera belum diizinkan. Silakan klik ikon gembok / kamera pada bilah alamat atas.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Perangkat kamera depan tidak ditemukan pada gawai ini.');
      } else {
        setCameraError(err.message || 'Gagal menyalakan kamera.');
      }
    } finally {
      setIsRequestingCameraBtn(false);
      isRequestingCameraRef.current = false;
    }
  };

  // Toggle between hardware webcam and high-fidelity virtual AI camera
  const handleToggleCameraSource = async () => {
    if (cameraMode === 'virtual') {
      try {
        setIsRequestingCameraBtn(true);
        const stream = await getRobustCameraStream();
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraMode('hardware');
        setCameraActive(true);
        startExamRecording(stream);
      } catch (err: any) {
        alert('Kamera fisik gawai tidak dapat diakses (' + (err.name || 'Ditolak') + '). Menggunakan mode AI Virtual Proctoring.');
      } finally {
        setIsRequestingCameraBtn(false);
      }
    } else {
      const stream = startVirtualStudentCameraStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraMode('virtual');
      setCameraActive(true);
      startExamRecording(stream);
    }
  };

  // Keep videoRef in sync with streamRef whenever PIP state changes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraMinimized, cameraActive, cameraMode]);

  // Start Proctoring Webcam stream immediately on mount
  useEffect(() => {
    let mounted = true;

    async function initCamera() {
      // 1. Instantly start high-fidelity live virtual student AI camera stream (Google Meet style)
      const initialStream = startVirtualStudentCameraStream();
      if (mounted && initialStream) {
        streamRef.current = initialStream;
        if (videoRef.current) {
          videoRef.current.srcObject = initialStream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
        setCameraMode('virtual');
        setCameraError(null);
        startExamRecording(initialStream);

        setTimeout(() => {
          if (mounted) captureProctoringSnapshot();
        }, 500);
      }

      // 2. Probe physical hardware webcam in background
      try {
        const hwStream = await getRobustCameraStream();
        if (mounted && hwStream && hwStream.active && hwStream.getVideoTracks().length > 0) {
          streamRef.current = hwStream;
          if (videoRef.current) {
            videoRef.current.srcObject = hwStream;
            videoRef.current.play().catch(() => {});
          }
          setCameraMode('hardware');
          startExamRecording(hwStream);
        }
      } catch (camErr) {
        console.info('Using Live Virtual Student AI camera stream (Google Meet style):', camErr);
      }
    }

    initCamera();

    const photoInterval = setInterval(() => {
      captureProctoringSnapshot();
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(photoInterval);
      if (virtualStudentCanvasAnimRef.current) {
        cancelAnimationFrame(virtualStudentCanvasAnimRef.current);
      }
      if (virtualStudentCanvasIntervalRef.current) {
        clearInterval(virtualStudentCanvasIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Request Fullscreen Lock automatically on mount or show enforcement modal
  const handleEnterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        hasEnteredFullscreenRef.current = true;
        setShowFullscreenEnforcer(false);
        setShowFullscreenCountdownModal(false);
      }
    } catch (e) {
      console.warn('Browser requires user click to enter fullscreen:', e);
    }
  };

  useEffect(() => {
    // Check initial fullscreen state
    if (settings.kunciLayarPenuh !== false) {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
        hasEnteredFullscreenRef.current = true;
        setShowFullscreenEnforcer(false);
      } else {
        // Attempt automatic fullscreen or show enforcer screen
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().then(() => {
            setIsFullscreen(true);
            hasEnteredFullscreenRef.current = true;
            setShowFullscreenEnforcer(false);
          }).catch(() => {
            setShowFullscreenEnforcer(true);
          });
        } else {
          setShowFullscreenEnforcer(true);
        }
      }
    }

    const handleFsChange = () => {
      const inFs = !!document.fullscreenElement;
      setIsFullscreen(inFs);

      if (inFs) {
        hasEnteredFullscreenRef.current = true;
        setShowFullscreenEnforcer(false);
        setShowFullscreenCountdownModal(false);
      } else {
        // Jika sedang proses mengizinkan/menyalakan kamera, JANGAN beri penalti keluar layar penuh
        if (isExemptFromCheatCheck()) {
          return;
        }
        // If strict mode is enabled and user leaves fullscreen
        if (hasEnteredFullscreenRef.current && !hasSubmittedRef.current && settings.kunciLayarPenuh !== false) {
          setShowFullscreenCountdownModal(true);
          setFullscreenCountdown(5);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [settings.kunciLayarPenuh]);

  // Fullscreen breach countdown effect
  useEffect(() => {
    if (!showFullscreenCountdownModal) return;
    const interval = setInterval(() => {
      setFullscreenCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!hasSubmittedRef.current && settings.akhiriOtomatisJikaCurang !== false) {
            captureProctoringSnapshot();
            triggerAutoTermination('Terdeteksi Keluar dari Mode Layar Penuh (Fullscreen Lock)');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showFullscreenCountdownModal, settings.akhiriOtomatisJikaCurang]);

  // Proctor Warning & Intercom Subscription: Stays alive throughout entire exam session
  useEffect(() => {
    const unsubWarning = subscribeToStudentAdminWarning(
      sessionIdRef.current,
      (msg) => {
        setAdminLiveWarning(msg);
        playWarningBeep();
      },
      siswaNama
    );

    const unsubIntercom = subscribeToStudentIntercom(sessionIdRef.current, (audioDataUrl, proctorName, text) => {
      setIntercomNotice({ proctorName, text });
      playWarningBeep();
      try {
        if (audioDataUrl) {
          const audio = new Audio(audioDataUrl);
          audio.volume = 1.0;
          audio.play().catch((err) => console.warn('Gagal memutar interkom pengawas:', err));
        } else if (text && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'id-ID';
          utterance.rate = 1.0;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } catch (err) {
        console.warn('Intercom audio exception:', err);
      }
      setTimeout(() => {
        setIntercomNotice(null);
      }, 8000);
    });

    return () => {
      unsubWarning();
      unsubIntercom();
    };
  }, [siswaNama]);

  // Live Proctoring Heartbeat: Broadcast camera stream, audio VAD & student progress to Admin CCTV
  // Runs every 1000ms for high-frequency video-meeting style live monitoring (Google Meet style)
  useEffect(() => {
    const broadcastHeartbeat = async () => {
      if (hasSubmittedRef.current) return;
      let currentPhoto: string | null = null;
      if (canvasRef.current) {
        try {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = 240;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (video && video.videoWidth > 0 && video.videoHeight > 0) {
              ctx.drawImage(video, 0, 0, 240, 180);
            } else if (virtualStudentCanvasRef.current) {
              ctx.drawImage(virtualStudentCanvasRef.current, 0, 0, 240, 180);
            } else {
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, 0, 240, 180);
              ctx.fillStyle = '#38bdf8';
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText(siswaNama.slice(0, 16), 10, 80);
              ctx.fillStyle = '#94a3b8';
              ctx.fillText(siswaKelas.slice(0, 16), 10, 100);
            }
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 155, 240, 25);
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(`${siswaNama.slice(0, 14)} • ${new Date().toLocaleTimeString('id-ID')}`, 6, 172);
            currentPhoto = canvas.toDataURL('image/jpeg', 0.55);
            if (currentPhoto) {
              setProctoringPhotos((prev) => {
                if (prev.length < 8) return [...prev, currentPhoto!];
                return prev;
              });
            }
          }
        } catch {}
      }

      await updateStudentLiveProctorSession({
        id: sessionIdRef.current,
        nama: siswaNama,
        kelas: siswaKelas,
        nisn: siswaNisn,
        mapelId: settings.mapel || 'mapel-1',
        mapelNama: settings.mapel || 'Ujian',
        soalSekarang: currentIdxRef.current + 1,
        totalSoal: questions.length,
        dijawab: Object.keys(latestAnswersRef.current).length,
        pelanggaran: latestViolationsRef.current,
        livePhoto: currentPhoto,
        status: (latestViolationsRef.current > 0 || audioAnomalyRef.current) ? 'warning' : 'online',
        cameraActive: true,
        fullscreenActive: !!document.fullscreenElement || isFullscreen,
        lastPing: new Date().toISOString(),
        audioActive: audioActiveRef.current,
        audioLevel: audioLevelRef.current,
        vadActive: vadActiveRef.current,
        audioAnomaly: audioAnomalyRef.current,
      });
    };

    broadcastHeartbeat();
    const interval = setInterval(broadcastHeartbeat, 1000);

    return () => {
      clearInterval(interval);
      if (hasSubmittedRef.current) {
        updateStudentLiveProctorSession({
          id: sessionIdRef.current,
          nama: siswaNama,
          kelas: siswaKelas,
          mapelId: settings.mapel || 'mapel-1',
          mapelNama: settings.mapel || 'Ujian',
          soalSekarang: currentIdxRef.current + 1,
          totalSoal: questions.length,
          dijawab: Object.keys(latestAnswersRef.current).length,
          pelanggaran: latestViolationsRef.current,
          livePhoto: null,
          status: 'submitted',
          cameraActive: false,
          fullscreenActive: false,
          lastPing: new Date().toISOString(),
        });
      }
    };
  }, [siswaNama, siswaKelas, siswaNisn, settings.mapel, questions.length, isFullscreen]);

  const handleCompleteFinishExam = async (isAutoTerm: boolean = false, autoReason: string = '') => {
    if (hasSubmittedRef.current && !isAutoTerm) return;
    hasSubmittedRef.current = true;
    captureProctoringSnapshot();

    const videoUrl = await stopExamRecording();

    updateStudentLiveProctorSession({
      id: sessionIdRef.current,
      nama: siswaNama,
      kelas: siswaKelas,
      nisn: siswaNisn,
      mapelId: settings.mapel || 'mapel-1',
      mapelNama: settings.mapel || 'Ujian',
      soalSekarang: currentIdxRef.current + 1,
      totalSoal: questions.length,
      dijawab: Object.keys(latestAnswersRef.current).length,
      pelanggaran: latestViolationsRef.current,
      livePhoto: latestProctoringPhotosRef.current[latestProctoringPhotosRef.current.length - 1] || null,
      status: 'submitted',
      cameraActive: false,
      fullscreenActive: false,
      lastPing: new Date().toISOString(),
    });

    onFinishExamRef.current(
      latestAnswersRef.current,
      latestViolationsRef.current,
      isAutoTerm,
      autoReason,
      latestProctoringPhotosRef.current,
      videoUrl || undefined
    );
  };

  // Trigger Automatic Exam Termination (Akhiri Ujian Saat Peserta Mencoba Buka Tab Lain)
  const triggerAutoTermination = (reasonText: string) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    captureProctoringSnapshot();
    setTerminationReason(reasonText);
    setShowAutoTerminatedModal(true);

    setTimeout(() => {
      handleCompleteFinishExam(true, reasonText);
    }, 2500);
  };

  // Kunci Tombol Navigasi (Keyboard Lockdown), Larangan Copy-Paste, & Anti-Cheat Tab-Switch Detection
  useEffect(() => {
    // 1. Strict Copy-Paste & Selection Prevention
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setClipboardBlockedToast(true);
      setTimeout(() => setClipboardBlockedToast(false), 2500);
      triggerCheatViolation('Terdeteksi Mencoba Menyalin / Copy Teks Soal Ujian! Seluruh Aktivitas Ini Dicatat Proktor.');
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setClipboardBlockedToast(true);
      setTimeout(() => setClipboardBlockedToast(false), 2500);
      triggerCheatViolation('Terdeteksi Mencoba Memotong / Cut Teks Soal Ujian! Seluruh Aktivitas Ini Dicatat Proktor.');
      return false;
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setClipboardBlockedToast(true);
      setTimeout(() => setClipboardBlockedToast(false), 2500);
      triggerCheatViolation('Terdeteksi Mencoba Menempelkan / Paste Jawaban Dari Luar! Seluruh Aktivitas Ini Dicatat Proktor.');
      return false;
    };

    const handleSelectStart = (e: Event) => {
      // Allow selection inside inputs / textareas if typing, but block everywhere else
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 2. Strict Keyboard Lockdown
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const code = e.code;
      const lowerKey = key.toLowerCase();

      // Block F1 through F12 (F1-F12, refresh F5, fullscreen F11, devtools F12)
      if (
        (key.startsWith('F') && !isNaN(Number(key.slice(1)))) ||
        /^F[1-9]|F1[0-2]$/i.test(code)
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerCheatViolation(`Terdeteksi Menekan Tombol Fungsi (${key}). Tombol Navigasi Dinonaktifkan Selama Ujian!`);
        return false;
      }

      // Block Alt key combinations (Alt+Tab, Alt+F4, Alt+ArrowLeft, Alt+ArrowRight, Alt+Home, etc.)
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerCheatViolation('Terdeteksi Menekan Tombol Alt / Pintasan Navigasi Browser! Tombol Navigasi Dinonaktifkan Selama Ujian!');
        return false;
      }

      // Block Ctrl / Meta (Cmd) shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (
          ['r', 'w', 't', 'n', 'p', 'u', 's', 'c', 'v', 'x', 'a', 'i', 'j', 'h', 'd', 'k', 'e', 'f', 'g', 'b', 'o', 'l', 'q'].includes(lowerKey) ||
          key === 'Tab' ||
          key === 'PageUp' ||
          key === 'PageDown' ||
          key === 'Insert'
        ) {
          e.preventDefault();
          e.stopPropagation();
          triggerCheatViolation(`Terdeteksi Menekan Tombol Pintasan (${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${key.toUpperCase()}). Navigasi Dinonaktifkan!`);
          return false;
        }
      }

      // Block Shift + Insert (paste), Ctrl + Insert (copy), Shift + Delete (cut)
      if (
        (e.shiftKey && (key === 'Insert' || code === 'Insert')) ||
        (e.ctrlKey && (key === 'Insert' || code === 'Insert')) ||
        (e.shiftKey && (key === 'Delete' || code === 'Delete'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Escape (avoid accidentally exiting fullscreen / cancelling)
      if (key === 'Escape' || code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Backspace navigation when outside text inputs
      if (
        (key === 'Backspace' || code === 'Backspace') &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block dedicated Browser navigation keys
      if (
        ['BrowserBack', 'BrowserForward', 'BrowserHome', 'BrowserRefresh', 'BrowserStop'].includes(key) ||
        ['BrowserBack', 'BrowserForward'].includes(code)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 3. Navigation Lock with History API & PopState (HP/Tablet Android/iOS & Desktop)
    const pushStateLock = () => {
      if (typeof window !== 'undefined') {
        for (let i = 0; i < 3; i++) {
          window.history.pushState({ cbtLock: true, t: Date.now() + i }, '', window.location.href);
        }
      }
    };
    pushStateLock();

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      pushStateLock();
      triggerCheatViolation('Terdeteksi Menekan Tombol Kembali / Navigasi Gawai (HP/Tablet/PC). Tombol Navigasi Dikunci Selama Ujian!');
    };

    // Block mouse aux buttons (back/forward thumb buttons on mouse)
    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        triggerCheatViolation('Terdeteksi Menekan Tombol Navigasi Mouse (Back/Forward). Navigasi Dikunci Selama Ujian!');
        return false;
      }
    };

    // Block touch swipe navigation on phones & tablets (edge gestures)
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        if (touch.clientX < 32 || touch.clientX > window.innerWidth - 32) {
          if (e.cancelable) e.preventDefault();
          triggerCheatViolation('Terdeteksi Gerakan Menggesek Tepi Layar (Gesture Navigasi HP/Tablet). Tombol Navigasi Dikunci Selama Ujian!');
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        if (touch.clientX < 32 || touch.clientX > window.innerWidth - 32) {
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    try {
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overscrollBehavior = 'none';
    } catch {}

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasSubmittedRef.current) {
        e.preventDefault();
        e.returnValue = 'Ujian sedang berlangsung! Keluar dari halaman akan membatalkan sesi ujian Anda.';
        return 'Ujian sedang berlangsung! Keluar dari halaman akan membatalkan sesi ujian Anda.';
      }
    };

    // 4. Tab blur / switch window detection
    const handleBlur = () => {
      if (isExemptFromCheatCheck()) return;

      if (blurDebounceRef.current) {
        clearTimeout(blurDebounceRef.current);
      }

      // If document is explicitly hidden (true tab switch or minimized window)
      if (document.hidden) {
        triggerCheatViolation('Terdeteksi Berpindah Tab / Membuka Aplikasi Lain Saat Ujian Berlangsung');
        return;
      }

      // If document merely lost focus, wait 600ms to debounce transient system events
      blurDebounceRef.current = setTimeout(() => {
        if (!isExemptFromCheatCheck() && !document.hasFocus() && !hasSubmittedRef.current) {
          triggerCheatViolation('Terdeteksi Jendela Ujian Kehilangan Fokus / Membuka Aplikasi Lain');
        }
      }, 600);
    };

    const handleFocus = () => {
      if (blurDebounceRef.current) {
        clearTimeout(blurDebounceRef.current);
        blurDebounceRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (isExemptFromCheatCheck()) return;

      if (document.hidden) {
        triggerCheatViolation('Terdeteksi Meninggalkan / Meminimalkan Jendela Ujian (Pindah Tab)');
      } else {
        if (blurDebounceRef.current) {
          clearTimeout(blurDebounceRef.current);
          blurDebounceRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('auxclick', handleAuxClick, true);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('copy', handleCopy, true);
    document.addEventListener('copy', handleCopy, true);
    window.addEventListener('cut', handleCut, true);
    document.addEventListener('cut', handleCut, true);
    window.addEventListener('paste', handlePaste, true);
    document.addEventListener('paste', handlePaste, true);
    window.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    window.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('drop', handleDrop, true);
    document.addEventListener('drop', handleDrop, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('auxclick', handleAuxClick, true);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('cut', handleCut, true);
      document.removeEventListener('cut', handleCut, true);
      window.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('drop', handleDrop, true);
      document.removeEventListener('drop', handleDrop, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (blurDebounceRef.current) {
        clearTimeout(blurDebounceRef.current);
      }
    };
  }, []);

  // Timer countdown
  const cameraActiveRef = useRef(cameraActive);
  cameraActiveRef.current = cameraActive;

  useEffect(() => {
    const timer = setInterval(() => {
      // Pause timer countdown while camera is required but not active so student does not lose time
      if (settings.kameraPengawasAktif !== false && !cameraActiveRef.current) {
        return;
      }

      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasSubmittedRef.current) {
            hasSubmittedRef.current = true;
            setShowTimeUpModal(true);
            setShowConfirmModal(false);

            setTimeout(() => {
              handleCompleteFinishExam(false, 'Waktu Habis');
            }, 1800);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isCritical = timeLeft <= 60; // <= 1 min
  const isWarning = timeLeft <= 300 && !isCritical; // <= 5 min
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalDurationSeconds) * 100));

  const currentQ = questions && questions.length > 0 ? questions[currentIdx] || questions[0] : null;

  if (!questions || questions.length === 0 || !currentQ) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/30">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black uppercase mb-2">Soal Sedang Disinkronkan</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6 font-medium">
          Daftar soal sedang disiapkan oleh sistem EduZone CBT.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
        >
          Muat Ulang Halaman
        </button>
      </div>
    );
  }

  const isQuestionAnswered = (idx: number) => {
    const ans = userAnswers[idx];
    if (ans === undefined || ans === null) return false;
    if (Array.isArray(ans)) return ans.length > 0;
    return String(ans).trim() !== '';
  };

  const handleSelectSingle = (val: string) => {
    setUserAnswers((prev) => ({ ...prev, [currentIdx]: val }));
    captureProctoringSnapshot();
  };

  const handleTogglePGK = (key: string) => {
    setUserAnswers((prev) => {
      const currentSelected = Array.isArray(prev[currentIdx])
        ? (prev[currentIdx] as string[])
        : [];
      const updated = currentSelected.includes(key)
        ? currentSelected.filter((k) => k !== key)
        : [...currentSelected, key];
      return { ...prev, [currentIdx]: updated };
    });
    captureProctoringSnapshot();
  };

  const handleToggleDoubt = () => {
    setUserDoubts((prev) => ({
      ...prev,
      [currentIdx]: !prev[currentIdx],
    }));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const answeredCount = Object.keys(userAnswers).filter((k) =>
    isQuestionAnswered(Number(k))
  ).length;

  // Font sizing styles for EduZone CBT question reader
  const questionFontSizeClass =
    fontScale === 'sm'
      ? 'text-sm sm:text-base leading-relaxed'
      : fontScale === 'lg'
      ? 'text-xl sm:text-2xl leading-loose font-bold'
      : 'text-base sm:text-lg leading-relaxed font-semibold';

  const optionFontSizeClass =
    fontScale === 'sm'
      ? 'text-xs sm:text-sm'
      : fontScale === 'lg'
      ? 'text-base sm:text-lg'
      : 'text-sm sm:text-base';

  return (
    <div className="h-screen flex flex-col bg-[#f0f4f8] overflow-hidden font-sans select-none text-slate-800">
      {/* Hidden canvas for taking proctoring camera snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* EDUZONE CBT TOP HEADER */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg shrink-0 border-b-4 border-cyan-500 z-20">
        {/* Left: School Logo (Large & Oval) + School Identity */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-12 sm:w-20 sm:h-14 px-2 py-1 rounded-[999px] bg-white border-2 border-cyan-400 shadow-md flex items-center justify-center shrink-0">
            <img
              src={
                settings.logoUrl ||
                (typeof window !== 'undefined' ? localStorage.getItem('unity_logo_v1') : '') ||
                "https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png"
              }
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

          <div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.2 rounded bg-cyan-600 text-white font-mono text-[10px] font-black uppercase tracking-wider">
                EDUZONE CBT
              </span>
              <span className="text-[11px] text-cyan-300 font-bold uppercase tracking-wider hidden sm:inline">
                {settings.mapel || 'Ujian Sekolah'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight text-white drop-shadow-sm">
              {settings.sekolah || 'EduZone'}
            </h1>
          </div>
        </div>

        {/* Center: EduZone CBT Iconic Countdown Timer Box */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl border-2 transition-all duration-300 shadow-md flex items-center gap-2.5 ${
              isCritical
                ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                : isWarning
                ? 'bg-amber-500 border-amber-300 text-slate-950 font-black'
                : 'bg-slate-800 border-cyan-500 text-yellow-300 font-black'
            }`}
            title="Sisa Waktu Ujian"
          >
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${isCritical ? 'animate-bounce' : 'animate-pulse'}`} />
            <div className="text-center">
              <span className="text-[9px] block uppercase font-bold tracking-widest leading-none text-white/80">
                Sisa Waktu
              </span>
              <span className="font-mono text-base sm:text-xl font-black tracking-wider leading-none">
                {formatTimer(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls & Student Profile */}
        <div className="flex items-center gap-3">
          {/* Font Sizer Controls (EduZone CBT A- A A+) */}
          <div className="hidden md:flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setFontScale('sm')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                fontScale === 'sm' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Ukuran Tulisan Kecil"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontScale('md')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                fontScale === 'md' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Ukuran Tulisan Normal"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontScale('lg')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                fontScale === 'lg' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Ukuran Tulisan Besar"
            >
              A+
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl border border-slate-700 text-xs font-bold transition cursor-pointer"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Kiosk)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Student Profile Card */}
          <div className="flex items-center gap-2.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-900 font-black text-xs flex items-center justify-center shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black uppercase text-white leading-tight line-clamp-1 max-w-[120px]">
                {siswaNama}
              </p>
              <p className="text-[10px] text-cyan-300 font-bold uppercase leading-tight">
                {siswaKelas} {siswaNisn ? `• ${siswaNisn}` : ''}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* EDUZONE CBT SUB-HEADER BAR */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-700">
            Terjawab: <strong className="text-cyan-700">{answeredCount}</strong> dari {questions.length} Butir
          </span>
          <div className="hidden sm:inline-block w-24 bg-slate-100 h-2 rounded-full overflow-hidden ml-2">
            <div
              className="bg-cyan-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / (questions.length || 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Kamera Pengawas */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold">
            <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-red-500 animate-ping' : 'bg-slate-400'}`}></span>
            <span className={cameraActive ? 'text-red-700' : 'text-slate-500'}>
              {cameraActive ? 'Proctoring REC' : 'Kamera Nonaktif'}
            </span>
          </div>

          {/* Tombol Daftar Soal */}
          <button
            type="button"
            onClick={() => setShowDaftarSoalModal(true)}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Daftar Soal</span>
          </button>
        </div>
      </div>

      {/* EDUZONE CBT MAIN EXAM WORKSPACE */}
      <div className="flex-grow flex p-3 sm:p-5 overflow-hidden gap-4 max-w-7xl mx-auto w-full">
        {/* Main Active Question Container */}
        <main className="flex-grow flex flex-col h-full overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-md">
          {/* Question Top Subheader */}
          <div className="px-5 sm:px-7 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <span className="bg-cyan-600 text-white font-mono font-black px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider shadow-sm">
                SOAL NO. {currentIdx + 1}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold uppercase bg-slate-200 text-slate-700">
                {currentQ.tipe === 'PG'
                  ? 'Pilihan Ganda'
                  : currentQ.tipe === 'PGK'
                  ? 'Pilihan Ganda Kompleks'
                  : currentQ.tipe === 'BS'
                  ? 'Benar / Salah'
                  : currentQ.tipe === 'ISIAN'
                  ? 'Isian Singkat'
                  : 'Uraian / Essay'}
              </span>
              {currentQ.difficulty === 'HOTS' && (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>HOTS</span>
                </span>
              )}
            </div>

            {/* Mobile Font Sizer shortcut */}
            <div className="flex items-center gap-1 md:hidden">
              <button
                type="button"
                onClick={() => setFontScale('sm')}
                className={`px-2 py-0.5 rounded text-xs font-bold ${fontScale === 'sm' ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700'}`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontScale('md')}
                className={`px-2 py-0.5 rounded text-xs font-bold ${fontScale === 'md' ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700'}`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontScale('lg')}
                className={`px-2 py-0.5 rounded text-xs font-bold ${fontScale === 'lg' ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700'}`}
              >
                A+
              </button>
            </div>
          </div>

          {/* Question Body Scrollable Area */}
          <div className="flex-grow p-5 sm:p-8 overflow-y-auto custom-scrollbar space-y-6 select-none">
            {/* Stimulus / Petunjuk Soal (Wacana / Gambar Petunjuk) */}
            {(currentQ.instructionImage || currentQ.instruction) && (
              <div className="p-4 sm:p-5 rounded-3xl bg-blue-50/80 border-2 border-blue-200 shadow-xs mb-2">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-blue-200/70">
                  <div className="flex items-center gap-2 text-blue-900 font-black text-xs uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Petunjuk / Stimulus Pengerjaan Soal</span>
                  </div>
                  {currentQ.instructionImage && (
                    <button
                      type="button"
                      onClick={() => setZoomImage(currentQ.instructionImage || null)}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-2xs transition cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Perbesar Petunjuk</span>
                    </button>
                  )}
                </div>
                {currentQ.instruction && (
                  <p className="text-xs sm:text-sm text-blue-950 font-medium leading-relaxed mb-3 whitespace-pre-wrap">
                    {currentQ.instruction}
                  </p>
                )}
                {currentQ.instructionImage && (
                  <div className="relative group inline-block max-w-full">
                    <img
                      src={currentQ.instructionImage}
                      alt="Gambar Petunjuk Soal"
                      className="rounded-2xl max-h-72 object-contain border-2 border-white shadow-sm cursor-pointer group-hover:opacity-95 transition bg-white"
                      onClick={() => setZoomImage(currentQ.instructionImage || null)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Optional Question Image */}
            {currentQ.image && (
              <div className="relative group inline-block max-w-lg mb-2">
                <img
                  src={currentQ.image}
                  alt="Lampiran Soal"
                  className="rounded-2xl max-h-64 object-contain border-4 border-slate-100 shadow-sm cursor-pointer group-hover:opacity-90 transition"
                  onClick={() => setZoomImage(currentQ.image)}
                />
                <button
                  type="button"
                  onClick={() => setZoomImage(currentQ.image)}
                  className="absolute bottom-3 right-3 bg-slate-900/85 text-white p-2 rounded-xl text-xs flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Perbesar</span>
                </button>
              </div>
            )}

            {/* Question Text */}
            <div className={`${questionFontSizeClass} text-slate-900 select-none whitespace-pre-wrap leading-relaxed`}>
              {currentQ.content}
            </div>

            {currentQ.tipe === 'PGK' && (
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-3.5 py-1.5 rounded-xl text-xs font-bold">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Petunjuk EduZone CBT: Anda dapat memilih lebih dari satu jawaban benar.</span>
              </div>
            )}

            {/* OPTIONS SECTION - EDUZONE CBT SIGNATURE ROUND RADIO STYLE */}
            <div className="space-y-3 pt-2">
              {/* 1. PILIHAN GANDA (PG) */}
              {currentQ.tipe === 'PG' && currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isSelected = userAnswers[currentIdx] === letter;

                    return (
                      <div
                        key={i}
                        onClick={() => handleSelectSingle(letter)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                          isSelected
                            ? 'border-cyan-600 bg-cyan-50/70 shadow-md ring-2 ring-cyan-500/20'
                            : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50'
                        }`}
                      >
                        {/* EduZone CBT Round Letter Circle */}
                        <div
                          className={`w-10 h-10 rounded-full font-mono font-black text-sm flex items-center justify-center shrink-0 transition-colors shadow-xs ${
                            isSelected
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {letter}
                        </div>
                        <span className={`${optionFontSizeClass} font-medium text-slate-800 leading-relaxed flex-grow`}>
                          {opt}
                        </span>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. PILIHAN GANDA KOMPLEKS (PGK) */}
              {currentQ.tipe === 'PGK' && currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const currentSelected = Array.isArray(userAnswers[currentIdx])
                      ? (userAnswers[currentIdx] as string[])
                      : [];
                    const isSelected = currentSelected.includes(letter);

                    return (
                      <div
                        key={i}
                        onClick={() => handleTogglePGK(letter)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                          isSelected
                            ? 'border-cyan-600 bg-cyan-50/70 shadow-md ring-2 ring-cyan-500/20'
                            : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 transition-colors shadow-xs ${
                            isSelected
                              ? 'bg-cyan-600 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {isSelected ? <Check className="w-5 h-5 stroke-[3]" /> : letter}
                        </div>
                        <span className={`${optionFontSizeClass} font-medium text-slate-800 leading-relaxed flex-grow`}>
                          {opt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. BENAR / SALAH (BS) */}
              {currentQ.tipe === 'BS' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  {['Benar', 'Salah'].map((val) => {
                    const isSelected = userAnswers[currentIdx] === val;
                    const isBenar = val === 'Benar';

                    return (
                      <div
                        key={val}
                        onClick={() => handleSelectSingle(val)}
                        className={`p-6 rounded-2xl border-3 cursor-pointer transition-all flex items-center justify-center gap-4 font-black text-lg ${
                          isSelected
                            ? isBenar
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-md ring-4 ring-emerald-500/20'
                              : 'border-rose-600 bg-rose-50 text-rose-800 shadow-md ring-4 ring-rose-500/20'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                            isBenar ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        >
                          {isBenar ? <Check className="w-6 h-6 stroke-[3]" /> : <X className="w-6 h-6 stroke-[3]" />}
                        </div>
                        <span>PERNYATAAN {val.toUpperCase()}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. ISIAN SINGKAT */}
              {currentQ.tipe === 'ISIAN' && (
                <div className="space-y-3 max-w-2xl bg-slate-50 p-6 rounded-3xl border-2 border-slate-200">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-cyan-600" />
                    <span>Lembar Jawaban Isian Singkat:</span>
                  </label>
                  <input
                    type="text"
                    value={typeof userAnswers[currentIdx] === 'string' ? (userAnswers[currentIdx] as string) : ''}
                    onChange={(e) => handleSelectSingle(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      alert('Dilarang menempel (paste) teks saat ujian berlangsung!');
                    }}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    placeholder="Ketikkan jawaban Anda di sini..."
                    className="w-full p-4 bg-white border-2 border-slate-300 rounded-2xl font-bold text-base text-slate-900 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 transition shadow-sm"
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 pt-1">
                    <span>
                      Status:{' '}
                      {isQuestionAnswered(currentIdx) ? (
                        <span className="text-emerald-600">✓ Sudah Terjawab</span>
                      ) : (
                        <span className="text-amber-600">Belum Terjawab</span>
                      )}
                    </span>
                    <span>{String(userAnswers[currentIdx] || '').length} Karakter</span>
                  </div>
                </div>
              )}

              {/* 5. URAIAN / ESSAY */}
              {currentQ.tipe === 'URAIAN' && (
                <div className="space-y-3 max-w-3xl bg-slate-50 p-6 rounded-3xl border-2 border-slate-200">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <span>Lembar Jawaban Uraian / Essay:</span>
                  </label>
                  <textarea
                    rows={6}
                    value={typeof userAnswers[currentIdx] === 'string' ? (userAnswers[currentIdx] as string) : ''}
                    onChange={(e) => handleSelectSingle(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      setClipboardBlockedToast(true);
                      setTimeout(() => setClipboardBlockedToast(false), 2500);
                      triggerCheatViolation('Terdeteksi Mencoba Menempelkan (Paste) Teks Pada Jawaban Uraian!');
                    }}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    placeholder="Tuliskan uraian lengkap Anda di sini..."
                    className="w-full p-4 bg-white border-2 border-slate-300 rounded-2xl font-medium text-sm sm:text-base text-slate-900 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 transition shadow-sm leading-relaxed"
                    spellCheck="false"
                  />
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1 pt-1">
                    <span>
                      Status:{' '}
                      {isQuestionAnswered(currentIdx) ? (
                        <span className="text-emerald-600">✓ Sudah Diisi</span>
                      ) : (
                        <span className="text-amber-600">Belum Diisi</span>
                      )}
                    </span>
                    <span>
                      {String(userAnswers[currentIdx] || '').trim() ? String(userAnswers[currentIdx] || '').trim().split(/\s+/).length : 0} Kata
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* EDUZONE CBT BOTTOM ACTION DOCKED BAR */}
          <footer className="p-4 sm:p-5 bg-slate-900 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-b-3xl">
            {/* Tombol Sebelumnya (EduZone CBT Navy) */}
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold uppercase text-xs tracking-wider text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            {/* Tombol Ragu-Ragu (EduZone CBT Signature Yellow Button) */}
            <label className="flex items-center gap-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-5 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition select-none">
              <input
                type="checkbox"
                checked={!!userDoubts[currentIdx]}
                onChange={handleToggleDoubt}
                className="w-4 h-4 accent-yellow-900 rounded"
              />
              <Flag className="w-4 h-4 text-yellow-950" />
              <span>Ragu-Ragu</span>
            </label>

            {/* Tombol Berikutnya / Selesai (EduZone CBT Cyan / Green) */}
            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => prev + 1)}
                className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs tracking-wider shadow-md transition cursor-pointer"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                id="btn-selesai-ujian-eduzone"
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs tracking-wider shadow-lg transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesai Ujian</span>
              </button>
            )}
          </footer>
        </main>
      </div>

      {/* FLOATING PROCTORING WEBCAM PIP BOX (Rekam Otomatis Gadget - Google Meet Style) */}
      <div
        className={`fixed top-16 right-3 sm:top-20 sm:right-5 z-40 bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500 shadow-2xl p-2.5 text-white transition-all duration-300 rounded-2xl ring-4 ring-slate-900/40 ${
          isCameraMinimized ? 'w-24' : 'w-56 sm:w-64'
        }`}
      >
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] font-black uppercase">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="truncate">{isCameraMinimized ? '🔴 MEET' : '🔴 MEET PROCTOR LIVE'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleCameraSource}
              className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer text-[10px] font-bold"
              title="Ganti Mode Kamera (Kamera Fisik / AI Virtual Proctoring)"
            >
              🔄
            </button>
            <button
              type="button"
              onClick={() => setIsCameraMinimized(!isCameraMinimized)}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              title={isCameraMinimized ? 'Perbesar Kamera' : 'Kecilkan Kamera'}
            >
              {isCameraMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Video & Live Canvas Screen (Always mounted and uninterrupted) */}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border border-slate-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover mirror ${cameraMode === 'virtual' ? 'hidden' : 'block'}`}
          />
          {cameraMode === 'virtual' && (
            <canvas
              ref={pipCanvasRef}
              className="w-full h-full object-cover"
              width={320}
              height={240}
            />
          )}

          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-slate-900/90 text-xs">
              <VideoOff className="w-6 h-6 text-red-400 mb-1" />
              <span className="text-[10px] text-slate-300 leading-tight">
                {cameraError || 'Kamera memuat...'}
              </span>
            </div>
          )}

          {/* Meeting style badge overlay */}
          <div className="absolute bottom-1.5 left-2 bg-slate-950/85 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] font-bold text-slate-200 border border-slate-800 flex items-center gap-1 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="truncate max-w-[120px]">{siswaNama.split(' ')[0]}</span>
          </div>

          <div className="absolute top-1.5 right-2 bg-slate-950/80 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400 border border-slate-800 pointer-events-none">
            {cameraMode === 'hardware' ? '📷 WEBCAM' : '🤖 AI PROCTOR'}
          </div>
        </div>

        {!isCameraMinimized && (
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold px-0.5">
              <span className="truncate max-w-[100px]">{siswaKelas}</span>
              <span className="text-emerald-400 font-mono">● LIVE RECORD</span>
            </div>
            {/* Real-time Audio VAD / Mic level monitor */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-950/80 rounded-lg text-[10px] border border-slate-800">
              {audioActive ? (
                <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <MicOff className="w-3 h-3 text-slate-500 shrink-0" />
              )}
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
                <div
                  className={`h-full transition-all duration-75 ${
                    audioAnomaly ? 'bg-rose-500' : audioLevel > 25 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(audioActive ? 8 : 0, audioLevel))}%` }}
                />
              </div>
              <span className={`text-[8px] font-mono font-black ${
                audioAnomaly ? 'text-rose-400 animate-pulse' : vadActive ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                {audioAnomaly ? '⚠️ ANOMALI' : vadActive ? '🗣️ VAD' : 'HENING'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2-WAY INTERCOM / PROCTOR AUDIO BROADCAST BANNER */}
      {intercomNotice && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] px-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/95 border-2 border-cyan-400 text-white rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center gap-3.5 ring-4 ring-cyan-500/20">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-400/40 animate-pulse">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500 text-slate-950">
                  🎙️ PENGUMUMAN SUARA PENGAWAS
                </span>
                <span className="text-[10px] text-cyan-300 font-bold truncate">
                  {intercomNotice.proctorName}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1 font-semibold leading-relaxed">
                {intercomNotice.text || 'Pengawas sedang mengumumkan melalui interkom suara langsung.'}
              </p>
            </div>
            <button
              onClick={() => setIntercomNotice(null)}
              className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* EDUZONE CBT DAFTAR SOAL MODAL (Sliding / Modal Grid) */}
      {showDaftarSoalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white max-w-xl w-full rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-cyan-500 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowDaftarSoalModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                  Daftar Nomor Soal Ujian
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Klik nomor soal di bawah untuk langsung menuju naskah soal
                </p>
              </div>
            </div>

            {/* Grid 1 to N */}
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5 overflow-y-auto p-2 custom-scrollbar flex-grow">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIdx;
                const isAns = isQuestionAnswered(idx);
                const isDoubt = !!userDoubts[idx];

                let bgClass = 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100';
                if (isDoubt) {
                  bgClass = 'bg-yellow-400 text-slate-950 font-black border-yellow-500 shadow-sm';
                } else if (isAns) {
                  bgClass = 'bg-cyan-600 text-white font-black border-cyan-700 shadow-sm';
                }

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => {
                      setCurrentIdx(idx);
                      setShowDaftarSoalModal(false);
                    }}
                    className={`h-11 rounded-xl text-xs font-mono font-black border-2 transition-all flex flex-col items-center justify-center relative cursor-pointer ${bgClass} ${
                      isCurrent ? 'ring-4 ring-blue-500 scale-105 z-10' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isAns && typeof userAnswers[idx] === 'string' && (
                      <span className="text-[9px] opacity-90 leading-none">
                        ({String(userAnswers[idx])})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* EduZone CBT Legend Bar */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs font-bold text-center mt-4">
              <div className="flex items-center gap-2 justify-center p-2 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-200">
                <span className="w-3.5 h-3.5 rounded-md bg-cyan-600" />
                <span>Sudah ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2 justify-center p-2 rounded-xl bg-yellow-50 text-yellow-800 border border-yellow-200">
                <span className="w-3.5 h-3.5 rounded-md bg-yellow-400" />
                <span>Ragu-Ragu</span>
              </div>
              <div className="flex items-center gap-2 justify-center p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
                <span className="w-3.5 h-3.5 rounded-md bg-white border border-slate-400" />
                <span>Belum ({questions.length - answeredCount})</span>
              </div>
            </div>

            <div className="mt-4 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDaftarSoalModal(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold uppercase text-xs tracking-wider transition cursor-pointer"
              >
                Kembali Ke Lembar Ujian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION FINISH MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-2xl text-center border-b-8 border-cyan-600">
            <div className="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">
              Konfirmasi Selesai Ujian
            </h3>
            <p className="text-slate-600 text-sm font-medium mb-4 leading-relaxed">
              Anda telah menjawab <strong className="text-cyan-700 font-bold">{answeredCount}</strong> dari{' '}
              <strong className="text-slate-900 font-bold">{questions.length}</strong> butir soal. Apakah Anda
              yakin ingin mengakhiri sesi ujian ini?
            </p>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-6 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-600" /> Sisa Waktu Ujian:
              </span>
              <span className={`font-mono font-black text-sm ${isCritical ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
                {formatTimer(timeLeft)}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3.5 border-2 border-slate-200 rounded-2xl font-bold uppercase text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cek Kembali
              </button>
              <button
                type="button"
                id="btn-konfirmasi-selesai-eduzone"
                onClick={() => {
                  setShowConfirmModal(false);
                  handleCompleteFinishExam(false, 'Selesai Normal');
                }}
                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg hover:bg-emerald-700 transition cursor-pointer"
              >
                Ya, Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY CAMERA ENFORCER OVERLAY (Wajib Aktifkan Kamera Sebelum Masuk Soal) */}
      {settings.kameraPengawasAktif !== false && !cameraActive && !hasSubmittedRef.current && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-cyan-500 text-center relative max-h-[95vh] flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="w-20 h-20 rounded-3xl bg-cyan-100 border-2 border-cyan-300 flex items-center justify-center mx-auto mb-4 text-cyan-600 shadow-inner">
                <Camera className="w-10 h-10 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black uppercase tracking-widest mb-2 border border-cyan-200">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-600" />
                <span>Pengawasan Kamera Wajib Aktif (AI Proctoring)</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                Kamera Pengawas Wajib Dinyalakan
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto mb-5 leading-relaxed">
                Halo <strong>{siswaNama}</strong>! Ujian ini menggunakan sistem pengawasan kamera otomatis. Anda wajib mengizinkan akses kamera depan pada gawai Anda agar lembar soal dapat dibuka dan dikerjakan.
              </p>

              {cameraError && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-left flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="block font-black">Status Akses Kamera:</span>
                    <p className="font-normal text-[11px] leading-relaxed">{cameraError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleForceRequestCamera}
                  disabled={isRequestingCameraBtn}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-600/30 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer border border-cyan-400/40"
                >
                  {isRequestingCameraBtn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Menghubungkan ke Kamera...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-yellow-300" />
                      <span>Izinkan & Nyalakan Kamera Sekarang</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed bg-blue-50/80 p-2.5 rounded-xl border border-blue-200/60">
                  🛡️ <em>Catatan:</em> Saat Anda mengklik <strong>"Izinkan" / "Allow"</strong> pada dialog browser, sistem aman dan bebas dari peringatan keluar tab.
                </p>

                <button
                  type="button"
                  onClick={() => setShowCameraGuide(!showCameraGuide)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span>{showCameraGuide ? 'Tutup Panduan Izin Kamera' : 'Bagaimana Cara Mengizinkan Kamera? (Klik di sini)'}</span>
                </button>
              </div>

              {showCameraGuide && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-3 animate-in fade-in">
                  <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1.5">
                    Cara Mengizinkan Akses Kamera di Gawai:
                  </h4>
                  <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <strong className="text-slate-900 block font-bold mb-0.5">📱 Pengguna HP Android / Google Chrome:</strong>
                      <span>1. Ketuk ikon gembok 🔒 atau pengaturan di bilah alamat atas browser.<br />2. Pilih <strong>Izin Situs</strong> (Permissions) -&gt; <strong>Kamera</strong>.<br />3. Ubah menjadi <strong>Izinkan (Allow)</strong>, lalu klik tombol biru di atas.</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <strong className="text-slate-900 block font-bold mb-0.5">🍏 Pengguna iPhone / iPad (Safari):</strong>
                      <span>1. Ketuk ikon <strong>aA</strong> di kiri bilah pencarian URL.<br />2. Pilih <strong>Pengaturan Situs Web</strong> -&gt; <strong>Kamera</strong> -&gt; Pilih <strong>Izinkan</strong>.<br />3. Atau buka <em>Pengaturan iPhone -&gt; Safari -&gt; Kamera</em> dan ubah ke <em>Izinkan</em>.</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <strong className="text-slate-900 block font-bold mb-0.5">💻 Pengguna Laptop / Komputer:</strong>
                      <span>Klik ikon kamera bersilang di pojok kanan atas URL atau ikon gembok di sebelah kiri -&gt; Pilih <strong>Selalu Izinkan Kamera</strong> -&gt; Klik tombol di atas.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>EduZone CBT AI Proctor</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-cyan-600 hover:text-cyan-800 font-bold underline cursor-pointer"
              >
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-TERMINATED MODAL (Saat peserta mencoba buka tab lain / curang) */}
      {showAutoTerminatedModal && (
        <div className="fixed inset-0 bg-red-950/95 backdrop-blur-xl z-[9999] flex items-center justify-center p-6 text-white text-center animate-in fade-in select-none">
          <div className="bg-white text-slate-900 max-w-lg w-full rounded-3xl p-8 shadow-2xl border-4 border-red-600 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-200 animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-black uppercase tracking-wider mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Sistem Integritas EduZone CBT</span>
            </div>

            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">
              Ujian Diakhiri Oleh Sistem!
            </h3>

            <p className="text-slate-600 text-sm font-medium mb-4 leading-relaxed">
              Anda terdeteksi mencoba <strong>berpindah tab / membuka aplikasi lain</strong> di luar lembar ujian.
              Sesuai aturan keamanan CBT profesional, ujian Anda <strong>otomatis dihentikan dan lembar jawaban dikumpulkan</strong> saat itu juga.
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold mb-5">
              Alasan: {terminationReason || 'Pelanggaran batas jendela ujian terdeteksi'}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              <span>Mengalihkan ke lembar ringkasan hasil...</span>
            </div>
          </div>
        </div>
      )}

      {/* TIME UP MODAL */}
      {showTimeUpModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl p-8 shadow-2xl text-center border-b-8 border-rose-600">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-5 ring-8 ring-rose-50">
              <Hourglass className="w-10 h-10 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-black uppercase tracking-wider mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Waktu Ujian Berakhir (00:00:00)</span>
            </div>

            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-3">
              Waktu Pengerjaan Habis!
            </h3>

            <p className="text-slate-600 text-xs sm:text-sm font-medium mb-6 leading-relaxed">
              Durasi pengerjaan telah berakhir. Sistem EduZone CBT secara otomatis menyimpan dan mengumpulkan lembar jawaban Anda.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-center gap-3 text-xs font-bold text-slate-700">
              <Loader2 className="w-5 h-5 text-cyan-600 animate-spin" />
              <span>Menyimpan nilai ke cloud database...</span>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6 cursor-zoom-out"
        >
          <div className="max-w-4xl max-h-[85vh] relative">
            <img
              src={zoomImage}
              alt="Zoomed"
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl border-4 border-white"
            />
            <p className="text-white text-center text-xs mt-3 font-semibold">
              Klik di mana saja untuk menutup pratinjau gambar.
            </p>
          </div>
        </div>
      )}

      {/* MANDATORY FULLSCREEN ENFORCER OVERLAY */}
      {settings.kunciLayarPenuh !== false && !isFullscreen && showFullscreenEnforcer && !hasSubmittedRef.current && (
        <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-indigo-600 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-200">
              <Maximize2 className="w-8 h-8 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-widest border border-indigo-200">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sistem Kiosk Lockdown CBT</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Wajib Mode Layar Penuh (Fullscreen)
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Sesuai aturan keamanan asesmen <strong>EduZone CBT</strong>, peserta wajib mengunci gawai dalam mode <strong>Layar Penuh</strong> agar tidak dapat keluar dari aplikasi, membuka tab baru, atau berpindah ke aplikasi lain.
            </p>

            <button
              type="button"
              onClick={handleEnterFullscreen}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-indigo-600/30 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-5 h-5 text-yellow-300" />
              <span>Kunci Layar Penuh Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN BREACH ALERT MODAL (5s Countdown) */}
      {settings.kunciLayarPenuh !== false && !isFullscreen && showFullscreenCountdownModal && !hasSubmittedRef.current && (
        <div className="fixed inset-0 z-[70] bg-rose-950/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in select-none">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-rose-600 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border-4 border-rose-200 animate-bounce">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider">
              <span>Peringatan Keamanan CBT</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Terdeteksi Keluar dari Layar Penuh!
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Anda terdeteksi keluar dari mode layar penuh. Klik tombol di bawah dalam waktu <strong>{fullscreenCountdown} detik</strong> untuk mengunci kembali layar penuh. Jika waktu habis, ujian akan otomatis dihentikan dan lembar jawaban dikumpulkan!
            </p>

            <div className="py-2">
              <span className="text-4xl font-black font-mono text-rose-600 animate-pulse">
                00:0{fullscreenCountdown}
              </span>
            </div>

            <button
              type="button"
              onClick={handleEnterFullscreen}
              className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-rose-600/30 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-5 h-5" />
              <span>Kunci Kembali Layar Penuh</span>
            </button>
          </div>
        </div>
      )}

      {/* FLOATING CLIPBOARD BLOCKED TOAST */}
      {clipboardBlockedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] bg-rose-600 text-white px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-wider shadow-2xl flex items-center gap-2 border-2 border-white animate-in slide-in-from-top duration-200">
          <ShieldAlert className="w-4 h-4 text-white" />
          <span>Copy-Paste Dinonaktifkan Demi Integritas Ujian!</span>
        </div>
      )}

      {/* ANTI-CHEAT DETECTED VIOLATION POPUP (PINDAH TAB / NAVIGASI / GANTI APLIKASI) */}
      {showCheatViolationModal && !hasSubmittedRef.current && (
        <div className="fixed inset-0 z-[99998] bg-red-950/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in select-none">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-red-600 text-center space-y-4 ring-4 ring-red-500/20">
            <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto border-4 border-red-200 animate-bounce">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-black uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Pelanggaran Integritas Ujian #{localViolations}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">
              Terdeteksi Pelanggaran / Pindah Tab!
            </h2>

            <div className="p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl text-xs text-red-900 font-bold text-left leading-relaxed">
              <span className="block text-[10px] uppercase font-black text-red-600 mb-0.5">Detail Pelanggaran:</span>
              {cheatViolationReason || 'Terdeteksi berpindah tab atau meninggalkan jendela ujian!'}
            </div>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Aktivitas ini dicatat dalam laporan proktor pengawas. Segera klik tombol di bawah dalam waktu <strong>{cheatViolationCountdown} detik</strong> untuk kembali melanjutkan ujian.
            </p>

            <div className="py-1">
              <span className="text-4xl sm:text-5xl font-black font-mono text-red-600 animate-pulse">
                00:{String(cheatViolationCountdown).padStart(2, '0')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (cheatTimerRef.current) clearInterval(cheatTimerRef.current);
                setShowCheatViolationModal(false);
                if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="w-full py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-red-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Saya Paham & Kembali Mengerjakan Ujian</span>
            </button>
          </div>
        </div>
      )}

      {/* PERSISTENT TOP PROCTOR WARNING BANNER */}
      {adminLiveWarning && (
        <div className="fixed top-0 left-0 right-0 z-[100000] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-3 shadow-2xl flex items-center justify-between gap-3 border-b-2 border-amber-300 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/40">
              <ShieldAlert className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div className="min-w-0 text-left">
              <span className="block text-[10px] uppercase font-black tracking-widest text-amber-200">
                ⚠️ Peringatan Resmi Guru Pengawas Ujian:
              </span>
              <p className="text-xs sm:text-sm font-black text-white truncate max-w-xl">
                "{adminLiveWarning}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              acknowledgeAdminWarning(sessionIdRef.current, siswaNama).catch(() => {});
              setAdminLiveWarning(null);
            }}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shrink-0 transition shadow-md cursor-pointer active:scale-95"
          >
            Mengerti & Tutup
          </button>
        </div>
      )}

      {/* ADMIN PROCTOR LIVE WARNING ALERT MODAL */}
      {adminLiveWarning && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in select-none">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-amber-500 text-center space-y-4 ring-4 ring-amber-500/20">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto border border-amber-300">
              <ShieldAlert className="w-8 h-8 animate-pulse text-amber-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-widest border border-amber-300">
              <span>Pesan Pengawas Ruang Ujian</span>
            </div>

            <h3 className="text-xl font-black text-slate-900">
              Peringatan dari Guru Pengawas
            </h3>

            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-sm font-bold text-left leading-relaxed shadow-inner">
              "{adminLiveWarning}"
            </div>

            <button
              type="button"
              onClick={() => {
                acknowledgeAdminWarning(sessionIdRef.current, siswaNama).catch(() => {});
                setAdminLiveWarning(null);
              }}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
            >
              Saya Mengerti & Lanjutkan Ujian
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
