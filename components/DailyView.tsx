import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task, TaskStatus, Recurrence } from '../types';
import StarIcon from './icons/StarIcon';
import ClockIcon from './icons/ClockIcon';
import ArrowRightCircleIcon from './icons/ArrowRightCircleIcon';
import RepeatIcon from './icons/RepeatIcon';
import TrashIcon from './icons/TrashIcon';
import SmartAddTask from './SmartAddTask';
import BulkMoveModal from './BulkMoveModal';
import { useFocusTimer } from '../contexts/FocusTimerContext';
import PlayIcon from './icons/PlayIcon';
import ConfirmationModal from './ConfirmationModal';
import PlusCircleIcon from './icons/PlusCircleIcon';
import EnterIcon from './icons/EnterIcon';

interface DailyViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateTask: (task: Task) => Promise<void>;
  onBulkUpdateTasks: (tasks: Task[]) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'userId'>) => void;
  onOpenManualAdd: (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => void;
}

type SortOption = 'deadline' | 'priority';
type FilterOption = 'all' | 'important' | 'done';

const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-3 sm:px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}>
        {label}
    </button>
);

const formatDuration = (ms: number) => {
    if (ms < 0) return '0m';
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
        return `${hours}j ${minutes}m`;
    }
    return `${minutes}m`;
}

const AddTimePopover: React.FC<{
    task: Task;
    onClose: () => void;
    onExtendTime: (task: Task, minutes: number) => void;
}> = ({ task, onClose, onExtendTime }) => {
    const [manualMinutes, setManualMinutes] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const minutes = parseInt(manualMinutes, 10);
        if (!isNaN(minutes) && minutes > 0) {
            onExtendTime(task, minutes);
            onClose();
        }
    };

    return (
        <div
            ref={popoverRef}
            onClick={e => e.stopPropagation()}
            className="absolute z-20 right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2"
        >
            <div className="flex flex-col space-y-1">
                {[5, 10, 15].map(minutes => (
                    <button
                        key={minutes}
                        onClick={() => onExtendTime(task, minutes)}
                        className="w-full text-left px-3 py-1.5 text-sm rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
                    >
                        + {minutes} menit
                    </button>
                ))}
                <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                <form onSubmit={handleManualSubmit} className="flex items-center space-x-2 p-1">
                    <input
                        type="number"
                        value={manualMinutes}
                        onChange={e => setManualMinutes(e.target.value)}
                        placeholder="Manual"
                        className="w-full px-2 py-1 text-sm bg-slate-100 dark:bg-slate-700 rounded-md border-slate-300 dark:border-slate-500 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button type="submit" className="text-blue-600 dark:text-blue-400 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600">
                        <EnterIcon className="w-4 h-4"/>
                    </button>
                </form>
            </div>
        </div>
    );
};


const DailyView: React.FC<DailyViewProps> = ({ tasks, onSelectTask, onUpdateTask, onBulkUpdateTasks, onDeleteTask, onAddTask, onOpenManualAdd }) => {
  const today = new Date();
  
  const [sortOption, setSortOption] = useState<SortOption>('deadline');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [tasksToMove, setTasksToMove] = useState<Task[] | null>(null);
  const { startSequentialSession } = useFocusTimer();
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [addTimeTaskId, setAddTimeTaskId] = useState<string | null>(null);

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const todayTasks = tasks.filter(task => {
      const taskStartTime = new Date(task.startTime);
      return (
          taskStartTime.getFullYear() === todayYear &&
          taskStartTime.getMonth() === todayMonth &&
          taskStartTime.getDate() === todayDate
      );
  });

  const sortedAndFilteredTasks = useMemo(() => {
    let processedTasks = [...todayTasks];

    switch (filterOption) {
      case 'important':
        processedTasks = processedTasks.filter(task => task.isImportant);
        break;
      case 'done':
        processedTasks = processedTasks.filter(task => task.status === TaskStatus.Done);
        break;
      case 'all':
      default:
        break;
    }

    processedTasks.sort((a, b) => {
        const startTimeA = new Date(a.startTime).getTime();
        const startTimeB = new Date(b.startTime).getTime();
        
        if (a.status === TaskStatus.Done && b.status !== TaskStatus.Done) return 1;
        if (a.status !== TaskStatus.Done && b.status === TaskStatus.Done) return -1;
        
        if (sortOption === 'priority') {
            if (a.isImportant && !b.isImportant) return -1;
            if (!a.isImportant && b.isImportant) return 1;
        }
      
        return startTimeA - startTimeB;
    });

    return processedTasks;
  }, [todayTasks, sortOption, filterOption]);
  
  const pendingTasks = useMemo(() => {
    return sortedAndFilteredTasks.filter(t => t.status !== TaskStatus.Done);
  }, [sortedAndFilteredTasks]);

  const handleStatusChange = (task: Task, isCompleted: boolean) => {
    const newStatus = isCompleted ? TaskStatus.Done : TaskStatus.ToDo;
    onUpdateTask({ ...task, status: newStatus });
  };
  
  const handleUpdateTasks = async (tasksToUpdate: Task[], newDate: Date) => {
    if (!tasksToUpdate.length) return;
    
    try {
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

        await Promise.all(updates);
        
        setTasksToMove(null);
    } catch (error) {
        console.error("Gagal memindahkan tugas:", error);
        alert("Terjadi kesalahan saat memindahkan tugas.");
    }
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
  
  const handleStartFocusSession = () => {
    if (pendingTasks.length > 0) {
        startSequentialSession(pendingTasks);
    } else {
        alert("Tidak ada tugas yang dijadwalkan untuk memulai sesi fokus.");
    }
  }

  const handleExtendTime = async (task: Task, minutesToAdd: number) => {
    const now = new Date();
    const newStartTime = now;
    const newEndTime = new Date(newStartTime.getTime() + minutesToAdd * 60000);

    const updatedOverdueTask: Task = {
      ...task,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
      status: TaskStatus.InProgress,
    };
    
    const shiftDelta = newEndTime.getTime() - new Date(task.endTime).getTime();

    if (shiftDelta <= 0) {
        await onUpdateTask(updatedOverdueTask);
        setAddTimeTaskId(null);
        return;
    }
    
    const subsequentTasks = sortedAndFilteredTasks.filter(
      t => new Date(t.startTime).getTime() >= new Date(task.endTime).getTime() && t.id !== task.id
    );

    const subsequentUpdates = subsequentTasks.map(subsequentTask => {
      const newSubsequentStartTime = new Date(new Date(subsequentTask.startTime).getTime() + shiftDelta);
      const newSubsequentEndTime = new Date(new Date(subsequentTask.endTime).getTime() + shiftDelta);
      return {
        ...subsequentTask,
        startTime: newSubsequentStartTime.toISOString(),
        endTime: newSubsequentEndTime.toISOString(),
      };
    });

    try {
        await onBulkUpdateTasks([updatedOverdueTask, ...subsequentUpdates]);
    } catch (error) {
        console.error("Gagal memperpanjang waktu dan menggeser tugas:", error);
        alert("Gagal memperpanjang waktu tugas. Silakan coba lagi.");
    } finally {
        setAddTimeTaskId(null);
    }
  };


  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-200">Hari Ini</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </header>
      
      <SmartAddTask onAddTask={onAddTask} tasks={tasks} onOpenManualAdd={onOpenManualAdd} />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600 dark:text-slate-300 mr-2 text-sm sm:text-base">Filter:</span>
            <FilterButton label="Semua" isActive={filterOption === 'all'} onClick={() => setFilterOption('all')} />
            <FilterButton label="Penting" isActive={filterOption === 'important'} onClick={() => setFilterOption('important')} />
            <FilterButton label="Selesai" isActive={filterOption === 'done'} onClick={() => setFilterOption('done')} />
        </div>
        <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300 mr-2 text-sm sm:text-base">Urutkan:</span>
            <FilterButton label="Waktu" isActive={sortOption === 'deadline'} onClick={() => setSortOption('deadline')} />
            <FilterButton label="Prioritas" isActive={sortOption === 'priority'} onClick={() => setSortOption('priority')} />
        </div>
         <button
            onClick={handleStartFocusSession}
            disabled={pendingTasks.length === 0}
            className="flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
            <PlayIcon className="w-4 h-4 mr-2"/>
            Mulai Sesi Fokus
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm" data-tour-id="task-list">
        <div className="p-2 sm:p-4">
          {sortedAndFilteredTasks.length > 0 ? (
            sortedAndFilteredTasks.map((task, index) => {
                const checklistProgress = task.checklist.length > 0 ? `${task.checklist.filter(i => i.completed).length}/${task.checklist.length}` : null;
                const nextTask = sortedAndFilteredTasks[index + 1];
                let timeToNext: number | null = null;
                if (nextTask && task.status !== TaskStatus.Done) {
                    timeToNext = new Date(nextTask.startTime).getTime() - new Date(task.endTime).getTime();
                }
                const isOverdue = new Date(task.endTime).getTime() < new Date().getTime() && task.status !== TaskStatus.Done;

                return (
                  <div key={task.id}>
                    <div
                        onClick={() => onSelectTask(task)}
                        className="p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all duration-200 group"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-3 sm:gap-x-4">
                            {/* Left Side: Checkbox, Title, Tags, Recurrence */}
                            <div className="flex items-center flex-1 min-w-0">
                                <input
                                    type="checkbox"
                                    aria-label={`Tandai "${task.title}" sebagai selesai`}
                                    checked={task.status === TaskStatus.Done}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleStatusChange(task, e.target.checked)}
                                    className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-600 border-2 border-solid border-slate-300 dark:border-slate-500 accent-blue-600 focus:ring-blue-500 mr-4 flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center">
                                        <span className={`font-medium text-base transition-colors duration-300 truncate ${task.status === TaskStatus.Done ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {task.title}
                                        </span>
                                        {task.recurrence === Recurrence.Daily && <RepeatIcon className="w-4 h-4 ml-2 text-slate-400 dark:text-slate-500 flex-shrink-0" title="Tugas Harian"/>}
                                    </div>
                                    {task.tags && task.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1.5">
                                            {task.tags.map(tag => (
                                                <span key={tag} className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right Side: Metadata and Actions */}
                            <div className="pl-9 sm:pl-0 flex items-center justify-between sm:justify-end sm:gap-4 flex-shrink-0">
                                {/* Metadata Group (Checklist & Time) */}
                                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                    {checklistProgress && (
                                        <span className="text-sm font-medium hidden md:inline">{checklistProgress}</span>
                                    )}
                                    <div className="flex items-center text-sm font-semibold">
                                        {isOverdue ? (
                                            <span className="font-bold text-red-500 dark:text-red-400">Overdue</span>
                                        ) : (
                                            <>
                                                <ClockIcon className="w-4 h-4 mr-1.5" />
                                                <span>
                                                    {new Date(task.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g,':')} - {new Date(task.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g,':')}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons Group */}
                                <div className="flex items-center gap-1 sm:gap-2 text-slate-400">
                                    {isOverdue && (
                                        <div className="relative flex-shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setAddTimeTaskId(addTimeTaskId === task.id ? null : task.id); }}
                                                title="Tambah Waktu"
                                                className="inline-flex w-7 h-7 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                            >
                                                <PlusCircleIcon className="w-5 h-5" />
                                            </button>
                                            {addTimeTaskId === task.id && (
                                                <AddTimePopover task={task} onClose={() => setAddTimeTaskId(null)} onExtendTime={handleExtendTime} />
                                            )}
                                        </div>
                                    )}
                                    {task.isImportant && <StarIcon filled className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                                    {task.status !== TaskStatus.Done && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setTasksToMove([task]); }}
                                            title="Pindahkan tugas"
                                            className="sm:opacity-0 group-hover:sm:opacity-100 transition-opacity hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0"
                                        >
                                            <ArrowRightCircleIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => handleDeleteRequest(e, task.id)}
                                        title="Hapus tugas"
                                        className="sm:opacity-0 group-hover:sm:opacity-100 transition-opacity text-red-500 hover:text-red-700 dark:hover:text-red-400 flex-shrink-0"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {timeToNext !== null && timeToNext > 0 && nextTask && (
                        <div className="pl-5 h-8 flex items-center">
                            <div className="border-l-2 border-dashed border-slate-300 dark:border-slate-600 h-full w-px ml-[9px]"></div>
                            <div className="ml-5 text-xs font-semibold text-slate-400 dark:text-slate-500 truncate">
                                &#9662; {formatDuration(timeToNext)} - menuju {nextTask.title}
                            </div>
                        </div>
                    )}
                  </div>
                )
            })
          ) : (
            <div className="text-center py-10">
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Tidak ada tugas yang cocok!</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Coba ubah filter atau tambahkan tugas baru.</p>
            </div>
          )}
        </div>
      </div>
      {tasksToMove && (
        <BulkMoveModal 
            tasks={tasksToMove}
            onClose={() => setTasksToMove(null)}
            onUpdate={handleUpdateTasks}
            context="daily"
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

export default DailyView;