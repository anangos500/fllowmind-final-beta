import React, { useState } from 'react';
import { Task, TaskStatus, Recurrence } from '../types';
import XIcon from './icons/XIcon';
import StarIcon from './icons/StarIcon';

interface AddTaskModalProps {
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'userId'>) => void;
  tasks: Task[];
  initialData?: Omit<Task, 'id' | 'createdAt' | 'userId'> | null;
}

// Helper to convert ISO string to 'YYYY-MM-DDTHH:mm' format for datetime-local input
const toLocalDatetimeString = (isoString?: string): string => {
    const date = isoString ? new Date(isoString) : new Date();
    // Adjust for timezone offset to display correctly in the user's local time
    const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjustedDate.toISOString().substring(0, 16);
};


const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAddTask, tasks, initialData }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  
  const defaultStartTime = toLocalDatetimeString();
  const defaultEndTime = toLocalDatetimeString(new Date(Date.now() + 3600000).toISOString()); // +1 hour

  const [startTime, setStartTime] = useState(initialData ? toLocalDatetimeString(initialData.startTime) : defaultStartTime);
  const [endTime, setEndTime] = useState(initialData ? toLocalDatetimeString(initialData.endTime) : defaultEndTime);
  const [dailyStartTime, setDailyStartTime] = useState('09:00');
  const [dailyEndTime, setDailyEndTime] = useState('10:00');

  const [isImportant, setIsImportant] = useState(initialData?.isImportant || false);
  const [recurrence, setRecurrence] = useState<Recurrence>(initialData?.recurrence || Recurrence.None);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300); // Animation duration
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    
    let finalStartTime: string;
    let finalEndTime: string;

    if (recurrence === Recurrence.Daily) {
        const today = new Date();
        const [startHours, startMinutes] = dailyStartTime.split(':');
        today.setHours(parseInt(startHours, 10), parseInt(startMinutes, 10), 0, 0);
        finalStartTime = today.toISOString();
        
        const endToday = new Date();
        const [endHours, endMinutes] = dailyEndTime.split(':');
        endToday.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10), 0, 0);
        
        if (endToday < today) {
            endToday.setDate(endToday.getDate() + 1);
        }
        finalEndTime = endToday.toISOString();
    } else {
        finalStartTime = new Date(startTime).toISOString();
        finalEndTime = new Date(endTime).toISOString();
    }

    const newStartTime = new Date(finalStartTime);
    const newEndTime = new Date(finalEndTime);
    
    if (newEndTime <= newStartTime) {
        setError("Waktu selesai harus setelah waktu mulai.");
        return;
    }

    const tasksOnSameDay = tasks.filter(t => {
      const taskDate = new Date(t.startTime);
      return taskDate.getFullYear() === newStartTime.getFullYear() &&
             taskDate.getMonth() === newStartTime.getMonth() &&
             taskDate.getDate() === newStartTime.getDate();
    });

    const hasOverlap = tasksOnSameDay.some(t => {
      const existingStartTime = new Date(t.startTime);
      const existingEndTime = new Date(t.endTime);
      // Check for overlap: (StartA < EndB) and (StartB < EndA)
      return (newStartTime < existingEndTime) && (existingStartTime < newEndTime);
    });

    if (hasOverlap) {
        setError("Jadwal pada waktu yang dipilih sudah terisi oleh tugas lain.");
        return;
    }

    onAddTask({
      title: title.trim(),
      startTime: finalStartTime,
      endTime: finalEndTime,
      status: TaskStatus.ToDo,
      checklist: [],
      notes: '',
      isImportant,
      recurrence,
    });
    handleClose();
  };
  
  const RecurrenceButton: React.FC<{
    label: string;
    value: Recurrence;
    currentValue: Recurrence;
    onClick: (value: Recurrence) => void;
    disabled?: boolean;
  }> = ({ label, value, currentValue, onClick, disabled }) => (
    <button
      type="button"
      onClick={() => onClick(value)}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        currentValue === value
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
      } ${disabled ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  );


  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-50 p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <form onSubmit={handleSubmit} className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md transition-all duration-300 ease-out overflow-hidden ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <header className="p-5 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Tugas Baru</h2>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6 space-y-5">
          {error && (
            <div className="p-3 mb-4 text-sm text-center text-red-800 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-300" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-slate-800 dark:text-slate-300 mb-2">
              Judul Tugas
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Buat presentasi untuk meeting"
              className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 dark:placeholder-slate-400 text-slate-800 dark:text-slate-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-300 mb-2">
              Jadwal
            </label>
            {recurrence === Recurrence.Daily ? (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="daily-start-time" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Waktu Mulai</label>
                        <input
                            id="daily-start-time"
                            type="time"
                            value={dailyStartTime}
                            onChange={(e) => setDailyStartTime(e.target.value)}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="daily-end-time" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Waktu Selesai</label>
                        <input
                            id="daily-end-time"
                            type="time"
                            value={dailyEndTime}
                            onChange={(e) => setDailyEndTime(e.target.value)}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                            required
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="start-time" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Waktu Mulai</label>
                        <input
                            id="start-time"
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="end-time" className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Waktu Selesai</label>
                        <input
                            id="end-time"
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                            required
                        />
                    </div>
                </div>
            )}
          </div>
           <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-300 mb-2">
              Ulangi Tugas
            </label>
            <div className="flex space-x-2">
                <RecurrenceButton label="Tidak Berulang" value={Recurrence.None} currentValue={recurrence} onClick={setRecurrence} />
                <RecurrenceButton label="Setiap Hari" value={Recurrence.Daily} currentValue={recurrence} onClick={setRecurrence} />
            </div>
          </div>
          <div>
            <label className="flex items-center cursor-pointer mt-2 p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">
                <input 
                    type="checkbox" 
                    checked={isImportant} 
                    onChange={e => setIsImportant(e.target.checked)}
                    className="h-5 w-5 rounded text-amber-500 focus:ring-amber-400 border-slate-400 dark:bg-slate-600 dark:border-slate-500"
                />
                <StarIcon filled={isImportant} className={`w-5 h-5 ml-3 ${isImportant ? 'text-amber-500' : 'text-slate-500'}`} />
                <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">Tandai sebagai tugas penting</span>
            </label>
          </div>
        </main>
        <footer className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400"
            disabled={!title.trim()}
          >
            Tambah Tugas
          </button>
        </footer>
      </form>
    </div>
  );
};

export default AddTaskModal;