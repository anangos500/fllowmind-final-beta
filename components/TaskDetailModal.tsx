import React, { useState, useEffect } from 'react';
import { Task, ChecklistItem, TaskStatus, Recurrence } from '../types';
import XIcon from './icons/XIcon';
import ClockIcon from './icons/ClockIcon';
import { STATUS_STYLES } from '../constants';
import PlusIcon from './icons/PlusIcon';
import StarIcon from './icons/StarIcon';
import RepeatIcon from './icons/RepeatIcon';
import SparklesIcon from './icons/SparklesIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';
import TagIcon from './icons/TagIcon';


interface TaskDetailModalProps {
  task: Task;
  tasks: Task[];
  onClose: () => void;
  onUpdate: (task: Task) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onStartFocus: (task: Task) => void;
}

// FIX: Fungsi pembantu ini dengan andal mengonversi string ISO (UTC) menjadi string
// 'YYYY-MM-DDTHH:mm' yang sesuai dengan zona waktu lokal pengguna,
// memperbaiki bug tampilan pada input datetime-local.
const toLocalDatetimeString = (isoString: string): string => {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, tasks, onUpdate, onDelete, onStartFocus, onClose }) => {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  const [showAiChecklistRetry, setShowAiChecklistRetry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditedTask(task);
    setShowDeleteConfirm(false);
    setIsAnimatingOut(false);
  }, [task]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 300); // Corresponds to animation duration
  };

  const handleInputChange = <K extends keyof Task,>(
    field: K,
    value: Task[K]
  ) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
  };
  
  const handleChecklistChange = (itemId: string, completed: boolean) => {
    const updatedChecklist = editedTask.checklist.map(item =>
      item.id === itemId ? { ...item, completed } : item
    );
    handleInputChange('checklist', updatedChecklist);
  };
  
  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim() === '') return;
    const newItem: ChecklistItem = {
      id: new Date().toISOString(),
      text: newChecklistItem.trim(),
      completed: false
    };
    handleInputChange('checklist', [...editedTask.checklist, newItem]);
    setNewChecklistItem('');
  };

  const handleChecklistTextChange = (itemId: string, newText: string) => {
    const updatedChecklist = editedTask.checklist.map(item =>
      item.id === itemId ? { ...item, text: newText.trim() } : item
    );
    handleInputChange('checklist', updatedChecklist);
    setEditingItemId(null);
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    const updatedChecklist = editedTask.checklist.filter(item => item.id !== itemId);
    handleInputChange('checklist', updatedChecklist);
  };

  const handleAiChecklist = async () => {
    if (!editedTask.title.trim() || isAiProcessing) return;
    setIsAiProcessing(true);
    setShowAiChecklistRetry(false);
    try {
      const response = await fetch('/.netlify/functions/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents: `Berdasarkan judul tugas "${editedTask.title}", pecah menjadi daftar periksa singkat berisi langkah-langkah yang dapat ditindaklanuti. Hasilkan semua item daftar periksa HANYA dalam Bahasa Indonesia.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                checklist: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
              },
              required: ['checklist'],
            },
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error('AI service returned an error.');
      }

      const data = await response.json();
      const jsonString = data.text.trim();
      const result = JSON.parse(jsonString);

      if (result.checklist && Array.isArray(result.checklist)) {
        const newItems: ChecklistItem[] = result.checklist.map((text: string) => ({
          id: new Date().toISOString() + text,
          text,
          completed: false,
        }));
        setEditedTask(prev => ({ ...prev, checklist: [...prev.checklist, ...newItems] }));
      } else {
        throw new Error('Invalid response format from AI.');
      }

    } catch (error) {
      console.error("Error generating checklist with AI:", error);
      setShowAiChecklistRetry(true);
    } finally {
      setIsAiProcessing(false);
    }
  };
  
  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (newTag && !(editedTask.tags || []).includes(newTag)) {
        const newTags = [...(editedTask.tags || []), newTag];
        handleInputChange('tags', newTags);
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          handleAddTag();
      }
  };

  const handleRemoveTag = (tagToRemove: string) => {
      const newTags = (editedTask.tags || []).filter(tag => tag !== tagToRemove);
      handleInputChange('tags', newTags);
  };

  const handleSave = async () => {
    setError(null);
    const newStartTime = new Date(editedTask.startTime);
    const newEndTime = new Date(editedTask.endTime);

    if (newEndTime <= newStartTime) {
        setError("Waktu selesai harus setelah waktu mulai.");
        return;
    }
    
    const tasksOnSameDay = tasks.filter(t => {
        if (t.id === editedTask.id) return false;
        const taskDate = new Date(t.startTime);
        return taskDate.getFullYear() === newStartTime.getFullYear() &&
               taskDate.getMonth() === newStartTime.getMonth() &&
               taskDate.getDate() === newStartTime.getDate();
    });

    const hasOverlap = tasksOnSameDay.some(t => {
        const existingStartTime = new Date(t.startTime);
        const existingEndTime = new Date(t.endTime);
        return (newStartTime < existingEndTime) && (existingStartTime < newEndTime);
    });

    if (hasOverlap) {
        setError("Waktu tugas ini tumpang tindih dengan tugas lain yang sudah ada.");
        return;
    }
    
    setIsSaving(true);
    try {
        await onUpdate(editedTask);
        handleClose();
    } catch (error: any) {
        alert(error.message || 'Terjadi kesalahan saat menyimpan tugas.');
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleConfirmDelete = async () => {
    try {
        await onDelete(task.id);
        setShowDeleteConfirm(false);
        handleClose();
    } catch (error: any) {
        alert(error.message || 'Terjadi kesalahan saat menghapus tugas.');
        setShowDeleteConfirm(false);
    }
  };

  const getLocalTimeString = (isoString: string): string => {
    if (!isoString) return '09:00';
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', newTime: string) => {
    setError(null);
    const [hours, minutes] = newTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    if (field === 'startTime') {
        const oldStartTime = new Date(editedTask.startTime);
        const oldEndTime = new Date(editedTask.endTime);
        const duration = oldEndTime.getTime() - oldStartTime.getTime();

        const newStartTime = new Date(oldStartTime);
        newStartTime.setHours(hours, minutes);
        const newEndTime = new Date(newStartTime.getTime() + duration);

        setEditedTask(prev => ({
            ...prev,
            startTime: newStartTime.toISOString(),
            endTime: newEndTime.toISOString(),
        }));
    } else { // endTime
        const newEndTime = new Date(editedTask.endTime);
        newEndTime.setHours(hours, minutes);
        if (newEndTime.getTime() < new Date(editedTask.startTime).getTime()) {
            newEndTime.setDate(newEndTime.getDate() + 1);
        }
        setEditedTask(prev => ({ ...prev, endTime: newEndTime.toISOString() }));
    }
  };

  const handleDateTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setError(null);
    const newDate = new Date(value);
    if (isNaN(newDate.getTime())) return;

    if (field === 'startTime') {
        const oldStartTime = new Date(editedTask.startTime);
        const oldEndTime = new Date(editedTask.endTime);
        const duration = oldEndTime.getTime() - oldStartTime.getTime();
        
        const newEndTime = new Date(newDate.getTime() + duration);
        
        setEditedTask(prev => ({
            ...prev,
            startTime: newDate.toISOString(),
            endTime: newEndTime.toISOString(),
        }));
    } else { // endTime
        const currentStartTime = new Date(editedTask.startTime);
        if (newDate.getTime() < currentStartTime.getTime()) {
            return;
        }
        setEditedTask(prev => ({ ...prev, endTime: newDate.toISOString() }));
    }
};

  return (
    <div className={`fixed inset-0 bg-black flex justify-center items-center z-50 p-4 transition-opacity duration-300 ${isAnimatingOut ? 'bg-opacity-0' : 'bg-opacity-50'}`}>
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-all duration-300 ease-out overflow-hidden ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <header className="p-5 sm:p-6 border-b dark:border-slate-700 flex justify-between items-center">
            <div className="flex flex-wrap items-center gap-4">
                <select
                  value={editedTask.status}
                  onChange={(e) => handleInputChange('status', e.target.value as TaskStatus)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 focus:outline-none ${STATUS_STYLES[editedTask.status].bg} ${STATUS_STYLES[editedTask.status].text} border-transparent`}
                >
                  {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={editedTask.isImportant} 
                        onChange={e => handleInputChange('isImportant', e.target.checked)}
                        className="hidden"
                    />
                    <StarIcon filled={editedTask.isImportant} className={`w-6 h-6 transition-colors ${editedTask.isImportant ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-amber-400'}`} />
                    <span className={`ml-2 font-semibold ${editedTask.isImportant ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-200'}`}>Penting</span>
                </label>
            </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-200"><XIcon className="w-6 h-6"/></button>
        </header>
        
        <main className="p-5 sm:p-8 overflow-y-auto">
          <input
            type="text"
            value={editedTask.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200 w-full focus:outline-none mb-6 bg-transparent"
          />
          
          {error && (
            <div className="p-3 my-4 text-sm text-center text-red-800 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-300" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-6 mb-6">
            <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Jadwal</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {editedTask.recurrence === Recurrence.Daily ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-200 mb-1">Waktu Mulai</label>
                                <input 
                                    type="time" 
                                    value={getLocalTimeString(editedTask.startTime)} 
                                    onChange={e => handleTimeChange('startTime', e.target.value)}
                                    className="p-2 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-200 mb-1">Waktu Selesai</label>
                                <input 
                                    type="time" 
                                    value={getLocalTimeString(editedTask.endTime)} 
                                    onChange={e => handleTimeChange('endTime', e.target.value)}
                                    className="p-2 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-200 mb-1">Waktu Mulai</label>
                                <input 
                                    type="datetime-local" 
                                    value={toLocalDatetimeString(editedTask.startTime)} 
                                    onChange={e => handleDateTimeChange('startTime', e.target.value)}
                                    className="p-2 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-200 mb-1">Waktu Selesai</label>
                                <input 
                                    type="datetime-local" 
                                    value={toLocalDatetimeString(editedTask.endTime)} 
                                    onChange={e => handleDateTimeChange('endTime', e.target.value)}
                                    className="p-2 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
             <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Pengulangan</h4>
                <div className="flex items-center text-slate-600 dark:text-slate-300">
                    <RepeatIcon className="w-5 h-5 mr-3 flex-shrink-0"/>
                    <select
                        value={editedTask.recurrence}
                        onChange={(e) => handleInputChange('recurrence', e.target.value as Recurrence)}
                        className="p-2 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200"
                    >
                        <option value={Recurrence.None}>Tidak Berulang</option>
                        <option value={Recurrence.Daily}>Harian</option>
                    </select>
                </div>
            </div>
            <div>
                <h4 className="flex items-center font-semibold text-slate-700 dark:text-slate-200 mb-3">
                    <TagIcon className="w-5 h-5 mr-2" />
                    Tags
                </h4>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    {(editedTask.tags || []).map(tag => (
                        <div key={tag} className="flex items-center bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 text-sm font-semibold px-3 py-1 rounded-full">
                            <span>{tag}</span>
                            <button onClick={() => handleRemoveTag(tag)} className="ml-2 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-200 focus:outline-none" aria-label={`Hapus tag ${tag}`}>
                                <XIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
                <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={handleAddTag}
                    placeholder="Tambah tag & tekan enter..."
                    className="p-2 w-full rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
          </div>


          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-slate-700 dark:text-slate-200">Checklist</h4>
                <button
                    onClick={handleAiChecklist}
                    disabled={isAiProcessing || !editedTask.title.trim()}
                    className="flex items-center px-3 py-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="w-4 h-4 mr-2"/>
                    {isAiProcessing ? 'Memproses...' : 'Buat dengan AI'}
                </button>
            </div>
            <div className="space-y-2">
              {editedTask.checklist.map(item => (
                <div key={item.id} className="flex items-center group">
                  <input
                    type="checkbox"
                    id={item.id}
                    checked={item.completed}
                    onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                    className="h-5 w-5 rounded bg-slate-100 dark:bg-slate-600 border-2 border-solid border-slate-300 dark:border-slate-500 accent-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  {editingItemId === item.id ? (
                    <input
                      type="text"
                      value={editingItemText}
                      onChange={(e) => setEditingItemText(e.target.value)}
                      onBlur={() => handleChecklistTextChange(item.id, editingItemText)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleChecklistTextChange(item.id, editingItemText);
                        if (e.key === 'Escape') setEditingItemId(null);
                      }}
                      className="ml-3 flex-grow bg-transparent border-b-2 border-blue-500 focus:outline-none text-slate-700 dark:text-slate-200"
                      autoFocus
                    />
                  ) : (
                    <label
                      htmlFor={item.id}
                      onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }}
                      className={`ml-3 flex-grow text-slate-700 dark:text-slate-200 cursor-text ${item.completed ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}
                    >
                      {item.text}
                    </label>
                  )}
                  <button
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    className="ml-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Hapus item checklist"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center mt-3">
              <input 
                type="text" 
                value={newChecklistItem} 
                onChange={e => setNewChecklistItem(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklistItem(); }}
                placeholder="Tambah item baru..." 
                className="flex-grow p-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 dark:placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              <button 
                onClick={handleAddChecklistItem} 
                disabled={!newChecklistItem.trim()}
                aria-label="Tambah item checklist"
                className="p-3 ml-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <PlusIcon className="w-5 h-5"/>
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Catatan</h4>
            <textarea
              value={editedTask.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Tambahkan catatan..."
              className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            ></textarea>
          </div>
          {showAiChecklistRetry && (
            <ConfirmationModal
              title="Gagal Membuat Checklist"
              message="AI gagal membuat checklist. Apakah Anda ingin mencoba lagi?"
              confirmText="Coba Lagi"
              onConfirm={handleAiChecklist}
              onCancel={() => setShowAiChecklistRetry(false)}
              isDestructive={false}
            />
          )}
        </main>
        
        <footer className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-between items-center">
          <div>
              <button 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="text-sm font-semibold text-red-700 dark:text-red-500 hover:underline disabled:text-slate-400"
                  disabled={isSaving}
              >
                  Hapus Tugas
              </button>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
                onClick={() => onStartFocus(task)} 
                className="px-3 sm:px-5 py-2.5 text-sm font-semibold text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/80 transition-colors"
                disabled={isSaving}
            >
              Mulai Fokus
            </button>
            <button 
                onClick={handleSave} 
                className="px-4 sm:px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-slate-400"
                disabled={isSaving}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </footer>
        {showDeleteConfirm && (
          <ConfirmationModal
            title="Hapus Tugas"
            message="Apakah Anda yakin ingin menghapus tugas ini? Tindakan ini tidak dapat diurungkan."
            confirmText="Ya, Hapus"
            onConfirm={handleConfirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            isDestructive={true}
          />
        )}
      </div>
    </div>
  );
};

export default TaskDetailModal;
