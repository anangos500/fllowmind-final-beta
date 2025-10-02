import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Task, TaskStatus, Recurrence } from '../types';
import SparklesIcon from './icons/SparklesIcon';
import MicIcon from './icons/MicIcon';
import LoaderIcon from './icons/LoaderIcon';
import ConfirmationModal from './ConfirmationModal';
import AiConflictResolutionModal from './AiConflictResolutionModal';

// FIX: Add TypeScript definitions for the Web Speech API to resolve compilation errors.
// These interfaces describe the properties and methods used for voice command recognition,
// as they are not standard in all TypeScript DOM libraries.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SmartAddTaskProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'userId'>) => void;
  tasks: Task[];
  onOpenManualAdd: (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => void;
}

const findAvailableSlots = (taskDurationMs: number, targetDate: Date, existingTasksOnDay: Task[]) => {
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    const isToday = targetDate.toDateString() === new Date().toDateString();
    const searchStartBoundary = isToday ? new Date().getTime() : dayStart.getTime();
    let busyPeriods = [
        { start: dayStart.getTime(), end: searchStartBoundary },
        ...existingTasksOnDay.map(t => ({
            start: new Date(t.startTime).getTime(),
            end: new Date(t.endTime).getTime(),
        }))
    ];
    busyPeriods.sort((a, b) => a.start - b.start);
    const mergedBusyPeriods: { start: number; end: number }[] = [];
    if (busyPeriods.length > 0) {
        let currentMerge = { ...busyPeriods[0] };
        for (let i = 1; i < busyPeriods.length; i++) {
            const nextPeriod = busyPeriods[i];
            if (nextPeriod.start <= currentMerge.end) {
                currentMerge.end = Math.max(currentMerge.end, nextPeriod.end);
            } else {
                mergedBusyPeriods.push(currentMerge);
                currentMerge = { ...nextPeriod };
            }
        }
        mergedBusyPeriods.push(currentMerge);
    }
    const suggestions: { startTime: string; endTime: string }[] = [];
    let lastBusyEnd = mergedBusyPeriods.length > 0 ? mergedBusyPeriods[0].end : searchStartBoundary;
    const finalBusyBlocks = [...mergedBusyPeriods, { start: dayEnd.getTime() + 1, end: dayEnd.getTime() + 1 }];
    for (const period of finalBusyBlocks) {
        const gapStart = lastBusyEnd;
        const gapEnd = period.start;
        const gapDuration = gapEnd - gapStart;
        if (gapDuration >= taskDurationMs) {
            suggestions.push({
                startTime: new Date(gapStart).toISOString(),
                endTime: new Date(gapStart + taskDurationMs).toISOString(),
            });
        }
        lastBusyEnd = Math.max(lastBusyEnd, period.end);
    }
    return suggestions;
};

const SmartAddTask: React.FC<SmartAddTaskProps> = ({ onAddTask, tasks, onOpenManualAdd }) => {
  const [inputValue, setInputValue] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [conflictingTask, setConflictingTask] = useState<{ title: string; startTime: string; endTime: string } | null>(null);
  const [suggestedSlots, setSuggestedSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [isConflictModalOpen, setConflictModalOpen] = useState(false);

  // State for voice commands
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const autoSubmitTimerRef = useRef<number | null>(null);
  const isListeningRef = useRef(isListening);

  // Keep the ref in sync with the state to avoid stale closures in callbacks
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);


  const handleAiRequest = useCallback(async (command?: string) => {
    const textToSubmit = command || inputValue;
    if (!textToSubmit.trim()) return;

    setIsAiLoading(true);
    setShowRetryModal(false);
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    
    // Stop listening after a command is sent
    setIsListening(false);

    try {
      const currentDate = new Date().toISOString();
      const prompt = `Anda adalah asisten cerdas yang tugasnya mengubah permintaan bahasa alami menjadi satu atau beberapa tugas dalam format JSON.
- **Tanggal & Waktu Saat Ini (UTC):** ${currentDate}
- **Aturan Penting:**
  - Waktu yang dimasukkan pengguna (misalnya, "besok jam 3 sore") ada di zona waktu **WIB (UTC+7)**.
  - Anda HARUS mengonversi waktu pengguna dari WIB ke UTC.
  - Output \`startTime\` dan \`endTime\` HARUS dalam format string **ISO 8601 UTC** (diakhiri dengan 'Z').
- Jika tidak ada durasi atau waktu berakhir, asumsikan durasi 1 jam.
- Jika durasi eksplisit disebutkan (misalnya, "rapat selama 2 jam" atau "dari jam 2 sampai jam 4"), Anda HARUS menggunakan durasi tersebut untuk menghitung endTime.
- Jika tahun tidak disebutkan, asumsikan tahun ini berdasarkan tanggal saat ini.
- Selalu kembalikan array JSON, bahkan jika hanya ada satu tugas.
**Permintaan Pengguna untuk diproses:** "${textToSubmit}"`;

      const response = await fetch('/.netlify/functions/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash', contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, startTime: { type: 'STRING' }, endTime: { type: 'STRING' } }, required: ['title', 'startTime', 'endTime'] } }
          }
        })
      });
      if (!response.ok) throw new Error('AI service returned an error.');
      const data = await response.json();
      const parsedTasks = JSON.parse(data.text.trim());
      if (!Array.isArray(parsedTasks) || parsedTasks.length === 0) throw new Error('AI tidak mengembalikan tugas yang valid.');
      let hadConflict = false;
      const getTasksOnSameDay = (d: Date) => tasks.filter(t => new Date(t.startTime).toDateString() === d.toDateString());
      for (const p of parsedTasks) {
        if (!p.title || !p.startTime || !p.endTime) continue;
        const newStart = new Date(p.startTime), newEnd = new Date(p.endTime);
        let duration = newEnd.getTime() - newStart.getTime();
        if (isNaN(duration) || duration < 60000) duration = 3600000;
        const tasksOnDay = getTasksOnSameDay(newStart);
        const overlap = tasksOnDay.some(t => newStart < new Date(t.endTime) && new Date(t.startTime) < newEnd);
        const overdue = newEnd.getTime() < Date.now();
        if (overlap || overdue) {
          hadConflict = true;
          let slots: {startTime: string, endTime: string}[] = [];
          for (let i = 0; i < 5 && slots.length < 3; i++) {
            const searchDate = new Date(); searchDate.setHours(0,0,0,0); searchDate.setDate(searchDate.getDate() + i);
            slots.push(...findAvailableSlots(duration, searchDate, getTasksOnSameDay(searchDate)));
          }
          if (slots.length > 0) { setConflictingTask(p); setSuggestedSlots(slots.slice(0,3)); setConflictModalOpen(true); } 
          else { alert(`Jadwal untuk "${p.title}" bentrok, dan tidak ada slot kosong ditemukan.`); }
          break;
        } else {
          onAddTask({ title: p.title, startTime: newStart.toISOString(), endTime: new Date(newStart.getTime() + duration).toISOString(), status: TaskStatus.ToDo, checklist: [], notes: '', isImportant: false, recurrence: Recurrence.None });
        }
      }
      if (!hadConflict) setInputValue('');
    } catch (err) { console.error("Error with AI task creation:", err); setShowRetryModal(true); } 
    finally { setIsAiLoading(false); }
  }, [inputValue, onAddTask, tasks]);
  
  const handleAiRequestRef = useRef(handleAiRequest);
  useEffect(() => {
    handleAiRequestRef.current = handleAiRequest;
  }, [handleAiRequest]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setSpeechError("Speech recognition not supported in this browser.");
      return;
    }
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionAPI();
      
      // FIX: Set continuous to false for better reliability on mobile.
      // We will simulate continuous listening by restarting it in the `onend` event.
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInputValue(prev => (prev + ' ' + finalTranscript.trim()).trim());
          if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
          autoSubmitTimerRef.current = window.setTimeout(() => {
            setInputValue(currentVal => {
              if (currentVal.trim()) {
                handleAiRequestRef.current(currentVal.trim());
              }
              return currentVal;
            });
          }, 3000);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setSpeechError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        }
      };
      
      // FIX: Implement a restart loop in the onend handler to simulate continuous listening.
      // This is more robust on Android than `continuous: true`.
      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch(e) {
            console.error("Recognition restart failed", e);
            setIsListening(false);
          }
        }
      };
      recognitionRef.current = recognition;
    }

    return () => {
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
      if (recognitionRef.current) {
          recognitionRef.current.onend = null; // Prevent restart on unmount
          recognitionRef.current.stop();
      }
    };
  }, []);
  
  useEffect(() => {
    if (isListening) {
      try {
        setInputValue('');
        recognitionRef.current?.start();
      } catch (e) {
        console.warn("Could not start recognition:", e);
      }
    } else {
      recognitionRef.current?.stop();
    }
  }, [isListening]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          setIsListening(true);
          setSpeechError(null);
        })
        .catch(() => {
          setSpeechError("Microphone permission denied.");
        });
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (isAiLoading) return; handleAiRequest(); };
  const handleSlotSelection = (slot: { startTime: string; endTime: string }) => { if (conflictingTask) onAddTask({ title: conflictingTask.title, startTime: slot.startTime, endTime: slot.endTime, status: TaskStatus.ToDo, checklist: [], notes: '', isImportant: false, recurrence: Recurrence.None }); setConflictModalOpen(false); setConflictingTask(null); setSuggestedSlots([]); setInputValue(''); };
  const handleManualAdd = () => { if (conflictingTask) onOpenManualAdd({ title: conflictingTask.title, startTime: conflictingTask.startTime, endTime: conflictingTask.endTime, status: TaskStatus.ToDo, checklist: [], notes: '', isImportant: false, recurrence: Recurrence.None }); setConflictModalOpen(false); setConflictingTask(null); setSuggestedSlots([]); setInputValue(''); };

  let micButtonClass = 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400';
  if (isListening) {
    micButtonClass = 'text-red-500 animate-pulse';
  }

  const placeholderText = isListening ? 'Mendengarkan perintah Anda...' : 'Coba: Rapat besok jam 3 dan kirim laporan jam 5';
  
  const helperText = isAiLoading 
    ? 'AI Sedang membuat jadwal Anda...' 
    : isListening 
      ? 'Ucapkan perintah Anda, AI akan mengirim otomatis.' 
      : 'Tekan Enter atau aktifkan mic untuk membuat tugas.';

  return (
    <div className="mb-8" data-tour-id="smart-add-task">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <SparklesIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={isAiLoading}
            placeholder={placeholderText}
            className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-200 shadow-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {isAiLoading ? <LoaderIcon className="w-5 h-5 text-slate-400" /> : (
              <button type="button" onClick={toggleListening} className={`p-1 rounded-full transition-colors ${micButtonClass}`} aria-label="Gunakan perintah suara">
                <MicIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </form>
      {speechError && <p className="text-xs text-red-500 text-center mt-2">{speechError}</p>}
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
        {helperText}
      </p>
      {showRetryModal && <ConfirmationModal title="Terjadi Kegagalan" message="AI gagal memproses permintaan Anda. Apakah Anda ingin mencoba lagi?" confirmText="Coba Lagi" onConfirm={() => handleAiRequest()} onCancel={() => setShowRetryModal(false)} isDestructive={false} />}
      {isConflictModalOpen && conflictingTask && <AiConflictResolutionModal taskTitle={conflictingTask.title} suggestedSlots={suggestedSlots} onClose={() => { setConflictModalOpen(false); setConflictingTask(null); }} onSelectSlot={handleSlotSelection} onManualAdd={handleManualAdd} />}
    </div>
  );
};

export default SmartAddTask;
