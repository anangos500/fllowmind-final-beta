
import { TaskStatus } from './types';

export const STATUS_STYLES: { [key in TaskStatus]: { bg: string; text: string; dot: string } } = {
  [TaskStatus.ToDo]: { 
    bg: 'bg-slate-100 dark:bg-slate-700', 
    text: 'text-slate-600 dark:text-slate-300', 
    dot: 'bg-slate-400 dark:bg-slate-500' 
  },
  [TaskStatus.InProgress]: { 
    bg: 'bg-blue-100 dark:bg-blue-900/50', 
    text: 'text-blue-600 dark:text-blue-400', 
    dot: 'bg-blue-400' 
  },
  [TaskStatus.Done]: { 
    bg: 'bg-green-100 dark:bg-green-900/50', 
    text: 'text-green-600 dark:text-green-400', 
    dot: 'bg-green-500' 
  },
};
