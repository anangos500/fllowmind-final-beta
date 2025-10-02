
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusTimer } from '../contexts/FocusTimerContext';
import ClockIcon from './icons/ClockIcon';
import StopCircleIcon from './icons/StopCircleIcon';
import MaximizeIcon from './icons/MaximizeIcon';

const FloatingFocusWidget: React.FC = () => {
  const { task, timeLeft, stopFocusSession, maximize } = useFocusTimer();
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    const totalSeconds = Math.floor(time / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (widgetRef.current) {
        setIsDragging(true);
        const rect = widgetRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !widgetRef.current) return;

    const widgetRect = widgetRef.current.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;

    // Constrain X to be within the viewport
    newX = Math.max(0, Math.min(newX, screenWidth - widgetRect.width));

    // Constrain Y to be within the viewport
    newY = Math.max(0, Math.min(newY, screenHeight - widgetRect.height));

    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);


  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);


  if (!task) return null;

  return (
    <div
      ref={widgetRef}
      style={{ left: `${position.x}px`, top: `${position.y}px`, touchAction: 'none' }}
      className={`fixed z-50 bg-slate-800 text-white rounded-xl shadow-2xl flex items-center p-3 transition-all duration-300 ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'}`}
    >
        <div 
            className="flex-shrink-0"
            onMouseDown={handleMouseDown}
        >
            <ClockIcon className="w-6 h-6 text-slate-400 mr-3" />
        </div>

      <div className="flex-grow mr-4 select-none" onMouseDown={handleMouseDown}>
        <p className="text-sm font-semibold truncate max-w-[120px]">{task.title}</p>
        <p className="font-mono text-lg font-bold">{formatTime(timeLeft)}</p>
      </div>

      <div className="flex items-center space-x-1">
        <button onClick={stopFocusSession} title="Hentikan Sesi" className="p-2 rounded-full hover:bg-slate-700 transition-colors text-slate-300 hover:text-red-400">
          <StopCircleIcon className="w-6 h-6" />
        </button>
        <button onClick={maximize} title="Maksimalkan" className="p-2 rounded-full hover:bg-slate-700 transition-colors text-slate-300 hover:text-white">
          <MaximizeIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default FloatingFocusWidget;
