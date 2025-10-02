import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import ClockIcon from './icons/ClockIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArrowRightCircleIcon from './icons/ArrowRightCircleIcon';
import MoveTaskModal from './MoveTaskModal';
import TrashIcon from './icons/TrashIcon';
import { getTasksForDay } from '../utils/taskUtils';
import ConfirmationModal from './ConfirmationModal';

interface WeeklyViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

const WeeklyView: React.FC<WeeklyViewProps> = ({ tasks, onSelectTask, onUpdateTask, onDeleteTask }) => {
  const today = new Date();
  const [taskToMove, setTaskToMove] = useState<Task | null>(null);
  const [movedTaskId, setMovedTaskId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const weekDays: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const day = new Date();
    day.setDate(today.getDate() + i);
    weekDays.push(day);
  }
  
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const allWeekTasks = weekDays.flatMap(day => getTasksForDay(day, tasks));
  const completedTasks = allWeekTasks.filter(t => t.status === TaskStatus.Done).length;
  const progress = allWeekTasks.length > 0 ? (completedTasks / allWeekTasks.length) * 100 : 0;

  const handleConfirmMove = async (updatedTask: Task) => {
    if (!taskToMove) return;

    try {
      await onUpdateTask(updatedTask);
      setMovedTaskId(updatedTask.id);
      setTimeout(() => setMovedTaskId(null), 2500);
    } catch (error) {
        console.error("Failed to move task:", error);
        alert("Gagal memindahkan tugas. Perubahan mungkin tidak disimpan.");
    } finally {
        setTaskToMove(null);
    }
  };

  const handleDeleteRequest = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (taskId.includes('-projected-')) {
         alert("Anda tidak dapat menghapus proyeksi. Hapus tugas aslinya.");
         return;
    }
    setTaskToDelete(taskId);
  };
  
  const handleConfirmDelete = async () => {
    if (taskToDelete) {
        try {
            await onDeleteTask(taskToDelete);
        } catch (error) {
            alert('Gagal menghapus tugas.');
        } finally {
            setTaskToDelete(null);
        }
    }
  };


  return (
    <div className="p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Tinjauan 7 Hari</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Progress mingguan dan ringkasan tugas.</p>
      </header>
      
      <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Progress Mingguan</h3>
        <div className="flex items-center">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="ml-4 font-bold text-slate-800 dark:text-slate-200">{Math.round(progress)}%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {weekDays.map(day => {
          const dayTasks = getTasksForDay(day, tasks);
          const isToday = day.toDateString() === today.toDateString();
          const isPast = day.getTime() < startOfToday.getTime();
          
          const summary = {
            done: dayTasks.filter(t => t.status === TaskStatus.Done && !t.id.includes('-projected-')).length,
            pending: dayTasks.filter(t => t.status !== TaskStatus.Done || t.id.includes('-projected-')).length,
          };

          return (
            <div key={day.toISOString()} className={`rounded-xl p-4 flex flex-col ${isToday ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500 dark:border-blue-700' : 'bg-white dark:bg-slate-800 shadow-sm'}`}>
              <div className={`text-center mb-4 ${isToday ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                <p className="text-sm">{day.toLocaleDateString('id-ID', { weekday: 'short' })}</p>
                <p className="text-2xl">{day.getDate()}</p>
              </div>
              <div className="space-y-2 flex-grow">
                {dayTasks.length > 0 ? dayTasks.map(task => {
                  const isOverdue = isPast && task.status !== TaskStatus.Done;
                  const wasJustMoved = movedTaskId === task.id;
                  const isProjected = task.id.includes('-projected-');
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => !isProjected && onSelectTask(task)} 
                      className={`p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 group flex items-center justify-between ${wasJustMoved ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/50' : 'bg-slate-50 dark:bg-slate-800/50'} ${isProjected ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center truncate">
                        <p className={`text-sm font-medium text-slate-700 dark:text-slate-300 truncate ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {task.title}
                        </p>
                         {wasJustMoved && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-bold text-green-700 bg-green-200 dark:bg-green-800 dark:text-green-200 rounded-full flex-shrink-0">
                                Dipindahkan
                            </span>
                        )}
                      </div>
                      
                      <div className="flex items-center ml-1 flex-shrink-0">
                          {isOverdue && !wasJustMoved && !isProjected && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTaskToMove(task);
                                }}
                                title="Pindahkan tugas"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                <ArrowRightCircleIcon className="w-5 h-5" />
                            </button>
                          )}
                          {!isProjected && (
                            <button
                                onClick={(e) => handleDeleteRequest(e, task.id)}
                                title="Hapus tugas"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-1"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                      </div>
                    </div>
                  );
                }) : <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-4">Tidak ada tugas</p>}
              </div>
              <div className="mt-4 pt-2 border-t dark:border-slate-700 flex justify-around text-xs">
                <span title="Selesai" className="flex items-center text-green-600 dark:text-green-400"><CheckCircleIcon className="w-3 h-3 mr-1"/>{summary.done}</span>
                <span title="Tertunda" className="flex items-center text-slate-500 dark:text-slate-400"><ClockIcon className="w-3 h-3 mr-1"/>{summary.pending}</span>
              </div>
            </div>
          );
        })}
      </div>

      {taskToMove && (
        <MoveTaskModal
          task={taskToMove}
          onClose={() => setTaskToMove(null)}
          onUpdateTask={handleConfirmMove}
        />
      )}
      {taskToDelete && (
        <ConfirmationModal
            title="Hapus Tugas"
            message="Apakah Anda yakin ingin menghapus tugas ini? Tindakan ini tidak dapat diurungkan."
            confirmText="Ya, Hapus"
            onConfirm={handleConfirmDelete}
            onCancel={() => setTaskToDelete(null)}
            isDestructive={true}
        />
      )}
    </div>
  );
};

export default WeeklyView;