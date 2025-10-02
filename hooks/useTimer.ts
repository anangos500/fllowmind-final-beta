
import { useState, useEffect, useRef, useCallback } from 'react';

interface TimerOptions {
  endTime?: number; // For countdown
  totalTime?: number; // For pomodoro
  onEnd?: () => void;
}

export const useTimer = ({ endTime, totalTime, onEnd }: TimerOptions) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const calculateTimeLeft = useCallback(() => {
    if (endTime) {
      const difference = endTime - +new Date();
      return difference > 0 ? difference : 0;
    }
    return timeLeft > 0 ? timeLeft - 1000 : 0;
  }, [endTime, timeLeft]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);
        if (newTimeLeft === 0) {
          if (onEnd) onEnd();
          setIsActive(false);
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, onEnd, calculateTimeLeft]);

  useEffect(() => {
    if (endTime) {
        setTimeLeft(calculateTimeLeft());
        setIsActive(true);
    }
    if (totalTime) {
        setTimeLeft(totalTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime, totalTime]);

  const start = () => setIsActive(true);
  const pause = () => setIsActive(false);
  const reset = (newTime?: number) => {
    setIsActive(false);
    setTimeLeft(newTime || totalTime || 0);
  };

  const formatTime = (time: number) => {
    const totalSeconds = Math.floor(time / 1000);
    if (totalSeconds < 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  };

  return { timeLeft, isActive, start, pause, reset, formattedTime: formatTime(timeLeft) };
};
