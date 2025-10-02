

import React, { useMemo } from 'react';
import { Task, TaskStatus } from '../types';
import { STATUS_STYLES } from '../constants';
import ClockIcon from './icons/ClockIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import StarIcon from './icons/StarIcon';
import { useTimer } from '../hooks/useTimer';

interface TaskItemProps {
  task: Task;
  onSelect: () => void;
  onStatusChange: (status: TaskStatus) => void;
}

const CountdownTimer: React.FC<{ startTime: string, endTime: string, status: TaskStatus }> = ({ startTime, endTime, status }) => {
  const now = new Date().getTime();
  const start = useMemo(() => new Date(startTime).getTime(), [startTime]);
  const end = useMemo(() => new Date(endTime).getTime(), [endTime]);

  const { formattedTime: endsInFormatted } = useTimer({ endTime: end });
  const { formattedTime: startsInFormatted } = useTimer({ endTime: start });
  
  const isOverdue = now > end;

  if (status === TaskStatus.Done) {
    return <span className="text-green-500 dark:text-green-400 font-medium">Completed</span>;
  }

  if (isOverdue) {
    return <span className="text-red-500 dark:text-red-400 font-medium">Overdue</span>;
  }
  
  if (now < start) {
     return (
      <span className="text-slate-500 dark:text-slate-400 font-medium">
        Starts in {startsInFormatted.days > 0 && `${startsInFormatted.days}d `}
        {startsInFormatted.hours > 0 && `${startsInFormatted.hours}h `}
        {`${startsInFormatted.minutes}m ${startsInFormatted.seconds}s`}
      </span>
    );
  }

  return (
    <span className="text-blue-500 dark:text-blue-400 font-medium">
      Ends in {endsInFormatted.days > 0 && `${endsInFormatted.days}d `}
      {endsInFormatted.hours > 0 && `${endsInFormatted.hours}h `}
      {`${endsInFormatted.minutes}m ${endsInFormatted.seconds}s`}
    </span>
  );
};


const TaskItem: React.FC<TaskItemProps> = ({ task, onSelect, onStatusChange }) => {
  const statusStyle = STATUS_STYLES[task.status];
  const checklistProgress = task.checklist.length > 0
    ? (task.checklist.filter(item => item.completed).length / task.checklist.length) * 100
    : 0;

  return (
    <div 
      className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer border ${task.isImportant ? 'border-amber-400 dark:border-amber-600' : 'border-slate-100 dark:border-slate-700'}`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center">
            {task.isImportant && <StarIcon filled className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0"/>}
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-2">{task.title}</h3>
        </div>
        <div className={`flex items-center px-3 py-1 rounded-full text-sm font-semibold ${statusStyle.bg} ${statusStyle.text} flex-shrink-0`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${statusStyle.dot}`}></span>
            {task.status}
        </div>
      </div>

      <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-4">
        <ClockIcon className="w-4 h-4 mr-2" />
        <CountdownTimer startTime={task.startTime} endTime={task.endTime} status={task.status} />
      </div>

      {task.checklist.length > 0 && (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Checklist</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{Math.round(checklistProgress)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div 
                    className="bg-blue-500 h-1.5 rounded-full" 
                    style={{ width: `${checklistProgress}%` }}
                ></div>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="text-sm text-slate-400 dark:text-slate-500">
          {new Date(task.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
        </div>
        {task.status !== TaskStatus.Done && (
            <button 
                onClick={(e) => { e.stopPropagation(); onStatusChange(TaskStatus.Done); }}
                className="flex items-center px-4 py-2 text-sm font-semibold text-green-600 bg-green-100 rounded-lg hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/80 transition-colors"
            >
                <CheckCircleIcon className="w-4 h-4 mr-2"/>
                Selesaikan
            </button>
        )}
      </div>
    </div>
  );
};

export default TaskItem;