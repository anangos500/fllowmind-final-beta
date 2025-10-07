import { createContext, useContext, useState, useEffect, useRef, useCallback, PropsWithChildren, FC } from 'react';
import { Task, TaskStatus, Profile } from '../types';

type PomodoroState = 'focus' | 'short_break' | 'long_break';
type VisibilityState = 'hidden' | 'full' | 'minimized';

const POMODORO_TIMES = {
    focus: 25 * 60 * 1000,
    short_break: 5 * 60 * 1000,
    long_break: 15 * 60 * 1000
};

const DEFAULT_ALARM_URL = 'https://www.dropbox.com/scl/fi/4weoragikbg2q96agaxdc/Bedside-Clock-Alarm.mp3?rlkey=nmbi5zgqtl7xconrb729k9csz&dl=1';

interface FocusTimerContextValue {
    task: Task | null;
    timeLeft: number;
    isActive: boolean;
    cycles: number;
    pomodoroState: PomodoroState;
    visibility: VisibilityState;
    startFocusSession: (task: Task) => void;
    stopFocusSession: () => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    minimize: () => void;
    maximize: () => void;
    startSequentialSession: (tasks: Task[]) => void;
}

const FocusTimerContext = createContext<FocusTimerContextValue | undefined>(undefined);

interface FocusTimerProviderProps {
    profile: Profile | null;
}

export const FocusTimerProvider: FC<PropsWithChildren<FocusTimerProviderProps>> = ({ children, profile }) => {
    const [task, setTask] = useState<Task | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [cycles, setCycles] = useState(0);
    const [pomodoroState, setPomodoroState] = useState<PomodoroState>('focus');
    const [visibility, setVisibility] = useState<VisibilityState>('hidden');
    const [focusQueue, setFocusQueue] = useState<Task[]>([]);
    const [isSequential, setIsSequential] = useState(false);
    const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
    const intervalRef = useRef<number | null>(null);
    const lastBadgedMinute = useRef<number | null>(null);

    // Effect to update browser tab title
    useEffect(() => {
        const originalTitle = "Flowmind";

        if (isActive && task && visibility !== 'hidden') {
            const totalSeconds = Math.floor(timeLeft / 1000);
            const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');
            document.title = `${minutes}:${seconds} - ${task.title}`;
        } else {
            document.title = originalTitle;
        }

        // Cleanup function to restore the title when the component unmounts
        return () => {
            document.title = originalTitle;
        };
    }, [isActive, task, timeLeft, visibility]);
    
    // Effect to update PWA app icon badge with remaining minutes
    useEffect(() => {
        if ('setAppBadge' in navigator) {
            if (isActive && task && timeLeft > 0) {
                const minutesRemaining = Math.ceil(timeLeft / 60000);
                
                // Only update the badge if the minute value has changed to avoid excessive calls
                if (minutesRemaining !== lastBadgedMinute.current) {
                    lastBadgedMinute.current = minutesRemaining;
                    navigator.setAppBadge(minutesRemaining).catch(error => {
                        console.error("Failed to set app badge:", error);
                    });
                }
            } else {
                // Clear the badge if the timer is inactive or has ended
                if (lastBadgedMinute.current !== null) {
                    lastBadgedMinute.current = null;
                    navigator.clearAppBadge().catch(error => {
                        console.error("Failed to clear app badge:", error);
                    });
                }
            }
        }
    }, [isActive, task, timeLeft]);


    const stopFocusSession = useCallback(() => {
        setIsActive(false);
        setTimerEndTime(null);
        setVisibility('hidden');
        setTask(null);
        setFocusQueue([]);
        setIsSequential(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        // Ensure app badge is cleared when session is explicitly stopped
        if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge().catch(error => console.error("Failed to clear app badge on stop:", error));
        }
        lastBadgedMinute.current = null;
    }, []);

    const handleTimerEnd = useCallback(() => {
        setIsActive(false);
        setTimerEndTime(null);
    
        let soundUrlToPlay: string | undefined;
        let shouldPlaySound = false;
        
        if (pomodoroState === 'focus') {
            shouldPlaySound = profile?.playFocusEndSound !== false;
            soundUrlToPlay = profile?.focusEndSound || DEFAULT_ALARM_URL;
        } else { // short or long break
            shouldPlaySound = profile?.playBreakEndSound !== false;
            soundUrlToPlay = profile?.breakEndSound || DEFAULT_ALARM_URL;
        }

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(
              pomodoroState === 'focus' ? 'Sesi Fokus Selesai!' : 'Waktu Istirahat Selesai!',
              { body: pomodoroState === 'focus' ? `Bagus! Waktunya istirahat sejenak dari "${task?.title}".` : 'Mari kembali fokus!', icon: '/icon.svg' }
            );
        }
    
        if (shouldPlaySound && soundUrlToPlay) {
            const audio = new Audio(soundUrlToPlay);
            audio.play().catch(error => {
                console.warn("Alarm sound playback was prevented by the browser:", error);
            });
        }
        
        // FIX: Defer subsequent state updates slightly. This gives mobile browsers a moment
        // to process the notification and audio playback before handling the React re-render,
        // preventing a race condition that can cause the UI to go blank.
        setTimeout(() => {
            if (isSequential) {
                if (pomodoroState === 'focus') {
                    if (focusQueue.length > 0) {
                        setPomodoroState('short_break');
                    } else {
                        new Notification('Sesi Fokus Selesai!', { body: `Kerja bagus! Anda telah menyelesaikan fokus pada "${task?.title}".`, icon: '/icon.svg' });
                        stopFocusSession();
                    }
                } else { // Break finished
                    let nextValidTask: Task | null = null;
                    let nextQueue = [...focusQueue];
                    while (nextQueue.length > 0 && !nextValidTask) {
                        const candidate = nextQueue.shift()!;
                        const candidateEndTime = new Date(candidate.endTime).getTime();
                        if (new Date().getTime() < candidateEndTime) {
                            nextValidTask = candidate;
                        }
                    }
    
                    if (nextValidTask) {
                        setTask(nextValidTask);
                        setFocusQueue(nextQueue);
                        setPomodoroState('focus');
                    } else {
                        new Notification('Sesi Fokus Berurutan Selesai!', { body: 'Kerja bagus! Semua tugas terjadwal telah diselesaikan.', icon: '/icon.svg' });
                        stopFocusSession();
                    }
                }
            } else { // Standard Pomodoro logic (less used now, but kept for potential future use)
                if (pomodoroState === 'focus') {
                    const newCycles = cycles + 1;
                    setCycles(newCycles);
                    setPomodoroState(newCycles % 4 === 0 ? 'long_break' : 'short_break');
                } else {
                    setPomodoroState('focus');
                }
            }
        }, 200);
    }, [isSequential, pomodoroState, focusQueue, stopFocusSession, task, cycles, profile]);

    // Real-time timer loop. Recalculates remaining time from a fixed end time to prevent drift.
    useEffect(() => {
        if (isActive && timerEndTime !== null) {
            if (intervalRef.current) clearInterval(intervalRef.current);

            const update = () => {
                const remaining = timerEndTime - Date.now();
                if (remaining <= 0) {
                    setTimeLeft(0);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                } else {
                    setTimeLeft(remaining);
                }
            };
            
            update(); // Update immediately when activated
            intervalRef.current = window.setInterval(update, 1000); // Then update every second
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, timerEndTime]);
    
    // Triggers the end of a timer period when time runs out.
    useEffect(() => {
        if (timeLeft <= 0 && isActive) {
            handleTimerEnd();
        }
    }, [timeLeft, isActive, handleTimerEnd]);
    
    // Starts a new timer period when the task or state changes.
    useEffect(() => {
        if (visibility === 'hidden' || !task || isActive) return;

        let newDuration: number;
        let newEndTime: number;

        if (isSequential) {
            if (pomodoroState === 'focus') {
                newEndTime = new Date(task.endTime).getTime();
                newDuration = newEndTime - Date.now();
            } else { // short_break
                newDuration = POMODORO_TIMES.short_break;
                newEndTime = Date.now() + newDuration;
            }
        } else { // Standard Pomodoro
            newDuration = POMODORO_TIMES[pomodoroState];
            newEndTime = Date.now() + newDuration;
        }

        if (newDuration > 0) {
            setTimeLeft(newDuration);
            setTimerEndTime(newEndTime);
            setIsActive(true);
             // Tampilkan notifikasi saat sesi dimulai
            if ('Notification' in window && Notification.permission === 'granted') {
                // FIX: Menambahkan penundaan singkat sebelum menampilkan notifikasi.
                // Ini mencegah masalah rendering (layar putih) pada beberapa browser seluler
                // (terutama Android) di mana pembuatan notifikasi dapat mengganggu
                // proses rendering UI layar penuh yang baru.
                setTimeout(() => {
                    const durationMinutes = Math.round(newDuration / 60000);
                    let title = 'Sesi Fokus Dimulai!';
                    let body = `Fokus pada: "${task.title}" selama ${durationMinutes} menit.`;
    
                    if (pomodoroState === 'short_break') {
                        title = 'Istirahat Dimulai!';
                        body = `Waktunya istirahat sejenak selama ${durationMinutes} menit.`;
                    } else if (pomodoroState === 'long_break') {
                        title = 'Istirahat Panjang Dimulai!';
                        body = `Nikmati istirahat Anda selama ${durationMinutes} menit.`;
                    }
                    
                    new Notification(title, {
                        body,
                        icon: '/icon.svg',
                        silent: true, // Tidak ada suara untuk notifikasi awal
                        tag: 'flowmind-focus-session' // Ganti notifikasi yang ada
                    });
                }, 200);
            }
        } else if (isSequential && pomodoroState === 'focus') {
            handleTimerEnd(); // Task is already over, move to the next state
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task, pomodoroState, visibility]);

    // Starts a single-task countdown.
    const startFocusSession = useCallback((newTask: Task) => {
        const now = new Date().getTime();
        const taskEndTime = new Date(newTask.endTime).getTime();
        
        if (taskEndTime <= now) {
            alert("Tugas ini sudah melewati batas waktu dan tidak bisa dimulai sesi fokus.");
            return;
        }

        stopFocusSession(); // Stop any existing session
        setTimeout(() => { // Use timeout to allow state to clear before setting new state
            setTask(newTask);
            setPomodoroState('focus');
            setFocusQueue([]);
            setIsSequential(true);
            setVisibility('full');
        }, 100);
    }, [stopFocusSession]);
    
    const startSequentialSession = useCallback((dailyTasks: Task[]) => {
        const now = new Date().getTime();

        const upcomingTasks = dailyTasks
            .filter(t => new Date(t.endTime).getTime() > now && t.status !== TaskStatus.Done)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        const currentTaskIndex = upcomingTasks.findIndex(t => new Date(t.startTime).getTime() <= now && new Date(t.endTime).getTime() > now);
        const nextUpcomingIndex = upcomingTasks.findIndex(t => new Date(t.startTime).getTime() > now);
        
        let startingIndex = -1;
        if (currentTaskIndex !== -1) {
            startingIndex = currentTaskIndex;
        } else if (nextUpcomingIndex !== -1) {
            startingIndex = nextUpcomingIndex;
        }

        if (startingIndex === -1) {
            alert("Tidak ada tugas aktif atau yang akan datang untuk memulai sesi fokus.");
            return;
        }

        const firstTask = upcomingTasks[startingIndex];
        const queue = upcomingTasks.slice(startingIndex + 1);

        stopFocusSession(); // Stop any existing session
        setTimeout(() => { // Use timeout to allow state to clear before setting new state
            setTask(firstTask);
            setPomodoroState('focus');
            setFocusQueue(queue);
            setIsSequential(true);
            setVisibility('full');
        }, 100);
    }, [stopFocusSession]);

    const pauseTimer = useCallback(() => {
        if (!isActive) return;
        setIsActive(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        const remaining = timerEndTime ? timerEndTime - Date.now() : timeLeft;
        setTimeLeft(remaining > 0 ? remaining : 0);
    }, [isActive, timerEndTime, timeLeft]);

    const resumeTimer = useCallback(() => {
        if (isActive || timeLeft <= 0) return;
        setTimerEndTime(Date.now() + timeLeft);
        setIsActive(true);
    }, [isActive, timeLeft]);

    const minimize = useCallback(() => {
        setVisibility('minimized');
    }, []);
    
    const maximize = useCallback(() => {
        setVisibility('full');
    }, []);
    
    const value = {
        task,
        timeLeft,
        isActive,
        cycles,
        pomodoroState,
        visibility,
        startFocusSession,
        stopFocusSession,
        pauseTimer,
        resumeTimer,
        minimize,
        maximize,
        startSequentialSession
    };
    
    return (
        <FocusTimerContext.Provider value={value}>
            {children}
        </FocusTimerContext.Provider>
    );
};

export const useFocusTimer = (): FocusTimerContextValue => {
  const context = useContext(FocusTimerContext);
  if (context === undefined) {
    throw new Error('useFocusTimer must be used within a FocusTimerProvider');
  }
  return context;
};
