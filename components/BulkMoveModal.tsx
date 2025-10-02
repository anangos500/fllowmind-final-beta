import React, { useState } from 'react';
import { Task } from '../types';
import XIcon from './icons/XIcon';

interface BulkMoveModalProps {
  tasks: Task[];
  onClose: () => void;
  onUpdate: (tasks: Task[], newDate: Date) => void;
  context?: 'daily' | 'overdue';
}

const BulkMoveModal: React.FC<BulkMoveModalProps> = ({ tasks, onClose, onUpdate, context = 'overdue' }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  
  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300);
  };

  // FIX: Menginisialisasi tanggal secara eksplisit dengan tahun, bulan, dan hari untuk menghindari
  // kesalahan satu hari (off-by-one errors) yang disebabkan oleh zona waktu saat mendekati tengah malam.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
  };
  
  const handleMove = (targetDate: Date) => {
      onUpdate(tasks, targetDate);
  }
  
  const descriptionText = context === 'overdue'
    ? 'Pilih tanggal tujuan baru untuk semua tugas yang terlewat ini.'
    : `Pilih tanggal tujuan baru untuk ${tasks.length > 1 ? 'tugas-tugas' : 'tugas'} ini.`;

  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-50 p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md transition-all duration-300 ease-out overflow-hidden ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <header className="p-5 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Pindahkan {tasks.length} Tugas
          </h2>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6">
          <p className="text-slate-600 dark:text-slate-200 mb-6 text-center">
            {descriptionText}
          </p>
          <div className="space-y-3">
            {context === 'overdue' && (
                <button onClick={() => handleMove(today)} className="w-full text-left p-4 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold text-slate-700 dark:text-slate-200 transition-colors">
                Pindahkan ke Hari Ini <span className="font-normal text-slate-500 dark:text-slate-300 text-sm ml-2">({formatDate(today)})</span>
                </button>
            )}
            <button onClick={() => handleMove(tomorrow)} className="w-full text-left p-4 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold text-slate-700 dark:text-slate-200 transition-colors">
              Pindahkan ke Besok <span className="font-normal text-slate-500 dark:text-slate-300 text-sm ml-2">({formatDate(tomorrow)})</span>
            </button>
            <button onClick={() => handleMove(dayAfter)} className="w-full text-left p-4 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold text-slate-700 dark:text-slate-200 transition-colors">
              Pindahkan ke Lusa <span className="font-normal text-slate-500 dark:text-slate-300 text-sm ml-2">({formatDate(dayAfter)})</span>
            </button>
          </div>
        </main>
        <footer className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end">
            <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
              >
                Batal
              </button>
        </footer>
      </div>
    </div>
  );
};

export default BulkMoveModal;
