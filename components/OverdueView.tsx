import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import ClockIcon from './icons/ClockIcon';
import StarIcon from './icons/StarIcon';
import TrashIcon from './icons/TrashIcon';
import ArrowRightCircleIcon from './icons/ArrowRightCircleIcon';
import BulkMoveModal from './BulkMoveModal';
import ConfirmationModal from './ConfirmationModal';

interface OverdueViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateTask: (task: Task) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onBulkDeleteTask: (taskIds: string[]) => Promise<void>;
}

const OverdueView: React.FC<OverdueViewProps> = ({ tasks, onSelectTask, onUpdateTask, onDeleteTask, onBulkDeleteTask }) => {
  const [moveModalState, setMoveModalState] = useState<{ tasks: Task[] } | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [tasksToDeleteBulk, setTasksToDeleteBulk] = useState<Task[] | null>(null);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue = tasks.filter(task => {
    const taskEndTime = new Date(task.endTime);
    return taskEndTime < startOfToday && task.status !== TaskStatus.Done;
  });

  // FIX: Menggunakan `as Record<string, Task[]>` pada nilai awal untuk memberikan tipe yang benar
  // pada akumulator, yang akan menyelesaikan beberapa kesalahan TypeScript hilir.
  const grouped = overdue.reduce((acc, task) => {
    const date = new Date(task.startTime).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Task[]>);


  const sortedDates = Object.keys(grouped).sort((a, b) => {
      // Since the keys are full date strings, we need to parse them back to compare
      // A bit inefficient but reliable for sorting
      const dateA = grouped[a][0] ? new Date(grouped[a][0].startTime) : new Date(0);
      const dateB = grouped[b][0] ? new Date(grouped[b][0].startTime) : new Date(0);
      return dateB.getTime() - dateA.getTime();
  });

  const handleUpdateTasks = (tasksToUpdate: Task[], newDate: Date) => {
    const updates = tasksToUpdate.map(task => {
        const duration = new Date(task.endTime).getTime() - new Date(task.startTime).getTime();
        const originalStartTime = new Date(task.startTime);
        
        const newStartTime = new Date(
            newDate.getFullYear(),
            newDate.getMonth(),
            newDate.getDate(),
            originalStartTime.getHours(),
            originalStartTime.getMinutes(),
            originalStartTime.getSeconds()
        );
        
        const newEndTime = new Date(newStartTime.getTime() + duration);

        return onUpdateTask({ ...task, startTime: newStartTime.toISOString(), endTime: newEndTime.toISOString() });
    });

    Promise.all(updates).then(() => {
        setMoveModalState(null);
    }).catch(error => {
        console.error("Failed to move tasks:", error);
        alert("Terjadi kesalahan saat memindahkan tugas.");
    });
  };

  const handleDeleteRequest = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
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

  const handleBulkDeleteRequest = (tasksInGroup: Task[]) => {
    setTasksToDeleteBulk(tasksInGroup);
  };

  const handleConfirmBulkDelete = async () => {
      if (tasksToDeleteBulk) {
          try {
              const ids = tasksToDeleteBulk.map(t => t.id);
              await onBulkDeleteTask(ids);
          } catch (error) {
              alert('Gagal menghapus beberapa tugas.');
          } finally {
              setTasksToDeleteBulk(null);
          }
      }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Tugas Terlewat</h1>
        <p className="text-slate-500 dark:text-slate-300 mt-1">Tugas dari hari-hari sebelumnya yang belum selesai.</p>
      </header>

      {overdue.length > 0 && (
          <div className="mb-6 flex justify-end">
              <button
                  onClick={() => setMoveModalState({ tasks: overdue })}
                  data-tour-id="overdue-move-button"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                  Pindahkan Semua ({overdue.length})
              </button>
          </div>
      )}

      <div className="space-y-8">
        {sortedDates.length > 0 ? sortedDates.map(date => (
          <div key={date}>
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">{date}</h2>
                <button
                  onClick={() => handleBulkDeleteRequest(grouped[date])}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                >
                  Hapus Semua
                </button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-2 sm:p-4 space-y-2">
              {grouped[date].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(task => (
                <div 
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors group"
                >
                    <div className="flex items-center flex-1 min-w-0">
                        {task.isImportant && <StarIcon filled className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" />}
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 pl-4 text-slate-500 dark:text-slate-300 flex-shrink-0">
                        {task.tags && task.tags.length > 0 && (
                            <div className="hidden sm:flex flex-wrap gap-x-2 gap-y-1">
                                {task.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center text-sm font-semibold">
                            <ClockIcon className="w-4 h-4 mr-1.5" />
                            <span>{`${new Date(task.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g,':')} - ${new Date(task.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g,':')}`}</span>
                        </div>
                         <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setMoveModalState({ tasks: [task] });
                            }}
                            title="Pindahkan tugas"
                            className="transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                            <ArrowRightCircleIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => handleDeleteRequest(e, task.id)}
                            title="Hapus tugas"
                            className="transition-colors text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
              ))}
            </div>
          </div>
        )) : (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Tidak ada tugas yang terlewat!</h2>
            <p className="text-slate-500 dark:text-slate-300 mt-2">Kerja bagus! Semua tugas Anda sudah diperbarui.</p>
          </div>
        )}
      </div>

      {moveModalState && (
        <BulkMoveModal 
            tasks={moveModalState.tasks}
            onClose={() => setMoveModalState(null)}
            onUpdate={handleUpdateTasks}
            context="overdue"
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
      {tasksToDeleteBulk && (
        <ConfirmationModal
            title={`Hapus ${tasksToDeleteBulk.length} Tugas`}
            message={`Apakah Anda yakin ingin menghapus ${tasksToDeleteBulk.length} tugas ini? Tindakan ini tidak dapat diurungkan.`}
            confirmText="Ya, Hapus Semua"
            onConfirm={handleConfirmBulkDelete}
            onCancel={() => setTasksToDeleteBulk(null)}
            isDestructive={true}
        />
      )}
    </div>
  );
};

export default OverdueView;
