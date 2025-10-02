



import React, { useState, useEffect } from 'react';
import { useFocusTimer } from '../contexts/FocusTimerContext';
import XIcon from './icons/XIcon';
import MinimizeIcon from './icons/MinimizeIcon';

const FocusMode: React.FC = () => {
  const { 
    task, 
    timeLeft, 
    isActive, 
    pomodoroState, 
    cycles, 
    pauseTimer, 
    resumeTimer, 
    stopFocusSession,
    minimize 
  } = useFocusTimer();
  
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in on mount
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(stopFocusSession, 500); // Corresponds to animation duration
  };

  if (!task) return null;

  const formatTime = (time: number) => {
    const totalSeconds = Math.floor(time / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return { minutes, seconds };
  };

  const { minutes, seconds } = formatTime(timeLeft);

  const stateText: Record<typeof pomodoroState, string> = {
    focus: "Waktunya Fokus",
    short_break: "Istirahat Singkat",
    long_break: "Istirahat Panjang"
  };
  
  const stateColor: Record<typeof pomodoroState, string> = {
    focus: "bg-slate-800",
    short_break: "bg-teal-800",
    long_break: "bg-indigo-800"
  };

  return (
    <div className={`fixed inset-0 bg-opacity-95 backdrop-blur-sm flex flex-col justify-center items-center z-[60] text-white p-4 transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'} ${stateColor[pomodoroState]}`}>
      <div className="absolute top-6 right-6 flex items-center space-x-4">
        <button onClick={minimize} className="text-slate-300 hover:text-white transition-colors" title="Minimize">
            <MinimizeIcon className="w-7 h-7"/>
        </button>
        <button onClick={handleClose} className="text-slate-300 hover:text-white transition-colors" title="Tutup Sesi">
            <XIcon className="w-8 h-8"/>
        </button>
      </div>

      <div className="text-center">
        <p className="text-xl text-slate-200 mb-2">{stateText[pomodoroState]}</p>
        <h1 className="text-4xl font-bold mb-8 truncate max-w-2xl">{task.title}</h1>
        
        <div className="font-mono text-8xl md:text-9xl font-bold tracking-tighter mb-10">
          <span>{minutes}</span>
          <span className="animate-pulse mx-1">:</span>
          <span>{seconds}</span>
        </div>

        <div className="flex justify-center space-x-4">
          {isActive ? (
            <button onClick={pauseTimer} className="px-10 py-4 text-lg font-semibold bg-white text-slate-800 rounded-lg shadow-lg hover:bg-slate-200 transition-transform hover:scale-105">
              Pause
            </button>
          ) : (
            <button onClick={resumeTimer} className="px-10 py-4 text-lg font-semibold bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-transform hover:scale-105">
              Lanjutkan
            </button>
          )}
        </div>
        
        <div className="mt-12 text-slate-200">
            Siklus selesai: {cycles}
        </div>
      </div>
    </div>
  );
};

export default FocusMode;
