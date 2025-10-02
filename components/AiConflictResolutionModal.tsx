import React, { useState } from 'react';
import XIcon from './icons/XIcon';
import ClockIcon from './icons/ClockIcon';

interface AiConflictResolutionModalProps {
  taskTitle: string;
  suggestedSlots: { startTime: string; endTime: string }[];
  onClose: () => void;
  onSelectSlot: (slot: { startTime: string; endTime: string }) => void;
  onManualAdd: () => void;
}

const AiConflictResolutionModal: React.FC<AiConflictResolutionModalProps> = ({ taskTitle, suggestedSlots, onClose, onSelectSlot, onManualAdd }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300);
  };
  
  const formatSlot = (startTimeIso: string, endTimeIso: string) => {
    const start = new Date(startTimeIso);
    const end = new Date(endTimeIso);
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isToday = start.getDate() === today.getDate() &&
                    start.getMonth() === today.getMonth() &&
                    start.getFullYear() === today.getFullYear();
    
    const isTomorrow = start.getDate() === tomorrow.getDate() &&
                       start.getMonth() === tomorrow.getMonth() &&
                       start.getFullYear() === tomorrow.getFullYear();

    const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' };
    const startTime = start.toLocaleTimeString('id-ID', timeFormat);
    const endTime = end.toLocaleTimeString('id-ID', timeFormat);
    
    let datePrefix = '';
    if (isTomorrow) {
        datePrefix = 'Besok, ';
    } else if (!isToday) {
        const dateFormat: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
        datePrefix = `${start.toLocaleDateString('id-ID', dateFormat)}, `;
    }

    return `${datePrefix}${startTime.replace(/\./g,':')} - ${endTime.replace(/\./g,':')}`;
  };

  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-50 p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md transition-all duration-300 ease-out overflow-hidden ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <header className="p-5 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Konflik Jadwal Ditemukan</h2>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6">
          <p className="text-slate-600 dark:text-slate-300 mb-2">
            Waktu yang disarankan untuk <span className="font-semibold text-slate-800 dark:text-slate-100">"{taskTitle}"</span> bentrok atau sudah lewat.
          </p>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Pilih salah satu slot waktu kosong berikut:
          </p>
          <div className="space-y-3">
            {suggestedSlots.map((slot, index) => (
              <button
                key={index}
                onClick={() => onSelectSlot(slot)}
                className="w-full text-left p-4 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center"
              >
                <ClockIcon className="w-5 h-5 mr-3 text-blue-500"/>
                {formatSlot(slot.startTime, slot.endTime)}
              </button>
            ))}
          </div>
        </main>
        <footer className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end items-center space-x-3">
          <button
            onClick={onManualAdd}
            className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
          >
            Pilih Manual
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
          >
            Batalkan Tugas
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AiConflictResolutionModal;