

import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import XIcon from './icons/XIcon';
import ClockIcon from './icons/ClockIcon';

interface MoveTaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
}

const MoveTaskModal: React.FC<MoveTaskModalProps> = ({ task, onClose, onUpdateTask }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [view, setView] = useState<'initial' | 'confirm'>('initial');
  const [editedTask, setEditedTask] = useState<Task>(task);

  useEffect(() => {
    setEditedTask(task);
    setView('initial');
  }, [task]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300);
  };

  const handlePrepareMove = (dayOffset: 1 | 2) => {
    // FIX: Selalu mulai dari prop tugas asli yang tidak dimodifikasi untuk mencegah perubahan kumulatif.
    const baseStartTime = new Date(task.startTime);
    const baseEndTime = new Date(task.endTime);
    
    // Buat objek tanggal baru untuk modifikasi.
    const newStartTime = new Date(baseStartTime.valueOf());
    newStartTime.setDate(baseStartTime.getDate() + dayOffset);
    
    const newEndTime = new Date(baseEndTime.valueOf());
    newEndTime.setDate(baseEndTime.getDate() + dayOffset);

    // Perbarui state tugas sementara untuk layar konfirmasi.
    setEditedTask({ ...task, startTime: newStartTime.toISOString(), endTime: newEndTime.toISOString() });
    setView('confirm');
  };

  const handleConfirm = () => {
    onUpdateTask(editedTask);
    handleClose();
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
          const newStartTime = new Date(e.target.value);
          if (isNaN(newStartTime.getTime())) return;

          const duration = new Date(task.endTime).getTime() - new Date(task.startTime).getTime();
          const newEndTime = new Date(newStartTime.getTime() + duration);

          setEditedTask(prev => ({
            ...prev,
            startTime: newStartTime.toISOString(),
            endTime: newEndTime.toISOString()
          }));
      }
  }

  const getLocalDatetimeString = (isoString: string): string => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const handleBack = () => {
      // Buang perubahan apa pun dan reset state agar sesuai dengan prop tugas asli.
      setEditedTask(task);
      setView('initial');
  }

  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-50 p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md transition-all duration-300 ease-out overflow-hidden ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <header className="p-5 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {view === 'initial' ? 'Pindahkan Tugas Tertinggal' : 'Konfirmasi Tanggal Baru'}
          </h2>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        {view === 'initial' ? (
          <>
            <main className="p-6">
              <p className="text-slate-600 dark:text-slate-300 text-center">
                Pindahkan tugas <span className="font-semibold text-slate-800 dark:text-slate-100">"{task.title}"</span> ke tanggal lain?
              </p>
            </main>
            <footer className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handlePrepareMove(1)}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Geser 1 Hari
              </button>
              <button
                onClick={() => handlePrepareMove(2)}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Geser 2 Hari
              </button>
            </footer>
          </>
        ) : (
          <>
            <main className="p-6">
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Atur waktu mulai baru untuk tugas <span className="font-semibold text-slate-800 dark:text-slate-100">"{task.title}"</span>. Waktu selesai akan disesuaikan.
              </p>
              <div className="flex items-center text-slate-600 dark:text-slate-300">
                  <ClockIcon className="w-5 h-5 mr-3 flex-shrink-0"/>
                  <input 
                      type="datetime-local" 
                      value={getLocalDatetimeString(editedTask.startTime)} 
                      onChange={handleDateTimeChange}
                      className="p-2 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
              </div>
            </main>
            <footer className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end space-x-3">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Konfirmasi Pindah
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default MoveTaskModal;