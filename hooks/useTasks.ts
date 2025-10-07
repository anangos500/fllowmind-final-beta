import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, Recurrence } from '../types';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

// Helper to convert object keys from snake_case (database) to camelCase (app)
const toCamelCase = (obj: Record<string, any>): Record<string, any> => {
  if (!obj) return obj;
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj;
};

// Helper to convert object keys from camelCase (app) to snake_case (database)
const toSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  if (!obj) return obj;
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = obj[key];
    }
  }
  return newObj;
};


export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetches all tasks from DB, converts them to camelCase, and updates state.
  // This is the single source of truth.
  const fetchTasks = useCallback(async () => {
    if (!user) {
        setTasks([]);
        setLoading(false);
        return;
    };
    try {
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      if (dbError) throw dbError;
      
      const camelCaseTasks = data.map(task => toCamelCase(task) as Task);
      setTasks(camelCaseTasks);
      
      // Kirim daftar tugas yang diperbarui ke Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'UPDATE_TASKS',
            payload: camelCaseTasks,
          });
      } else if ('serviceWorker' in navigator) {
          // Jika controller belum tersedia, tunggu hingga siap.
          navigator.serviceWorker.ready.then(registration => {
              registration.active?.postMessage({
                  type: 'UPDATE_TASKS',
                  payload: camelCaseTasks,
              });
          });
      }

    } catch (error: any) {
      console.error('Error fetching tasks:', error.message || error);
      setError('Gagal memuat tugas dari database. Pastikan koneksi internet Anda stabil dan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Adds a new task to the database and then re-fetches all tasks.
  const addTask = async (task: Omit<Task, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      // The task object is in camelCase, convert it to snake_case for the DB
      const snakeCaseTask = toSnakeCase(task);
      
      const { error } = await supabase.from('tasks').insert([
        // user_id is required by the DB, it's not in the task object type
        { ...snakeCaseTask, user_id: user.id }
      ]);
      
      if (error) throw error;
      await fetchTasks(); // Re-fetch to get the source of truth
    } catch (error: any)
    {
        console.error('Error adding task:', error.message || error);
    }
  };

  const updateTask = async (updatedTask: Task) => {
    if (!user) return;
  
    const originalTask = tasks.find(t => t.id === updatedTask.id);
  
    try {
      const { id, ...taskToUpdate } = updatedTask;
      const snakeCaseTask = toSnakeCase(taskToUpdate);
  
      const { error: updateError } = await supabase
        .from('tasks')
        .update(snakeCaseTask)
        .eq('id', id);
  
      if (updateError) throw updateError;
  
      const justCompletedRecurringTask =
        updatedTask.status === TaskStatus.Done &&
        originalTask?.status !== TaskStatus.Done &&
        updatedTask.recurrence !== Recurrence.None;
  
      if (justCompletedRecurringTask) {
        if (updatedTask.recurrence === Recurrence.Daily) {
            
            const templateId = updatedTask.recurringTemplateId || updatedTask.id;

            // Define the start and end of the next day for checking existence
            const nextDayStart = new Date(updatedTask.startTime);
            nextDayStart.setDate(nextDayStart.getDate() + 1);
            nextDayStart.setHours(0, 0, 0, 0);

            const nextDayEnd = new Date(nextDayStart);
            nextDayEnd.setHours(23, 59, 59, 999);

            // Check if an instance for the next day already exists for this recurring series
            const nextInstanceExists = tasks.some(task => {
                const belongsToSeries = task.recurringTemplateId === templateId || task.id === templateId;
                if (!belongsToSeries) return false;
        
                const taskStartTime = new Date(task.startTime);
                return taskStartTime >= nextDayStart && taskStartTime <= nextDayEnd;
            });
            
            // Only create the next instance if it doesn't already exist
            if (!nextInstanceExists) {
                const nextStartTime = new Date(updatedTask.startTime);
                nextStartTime.setDate(nextStartTime.getDate() + 1);
                const nextEndTime = new Date(updatedTask.endTime);
                nextEndTime.setDate(nextEndTime.getDate() + 1);
    
                const nextTaskInstance: Omit<Task, 'id' | 'userId' | 'createdAt'> = {
                  title: updatedTask.title,
                  startTime: nextStartTime.toISOString(),
                  endTime: nextEndTime.toISOString(),
                  status: TaskStatus.ToDo,
                  checklist: updatedTask.checklist.map(item => ({ ...item, completed: false })),
                  notes: updatedTask.notes,
                  isImportant: updatedTask.isImportant,
                  recurrence: updatedTask.recurrence,
                  recurringTemplateId: templateId, // Use the determined templateId
                  tags: updatedTask.tags, // Carry over tags to the next instance
                };
          
                const snakeCaseNextTask = toSnakeCase(nextTaskInstance);
          
                const { error: insertError } = await supabase.from('tasks').insert([
                  { ...snakeCaseNextTask, user_id: user.id }
                ]);
          
                if (insertError) throw insertError;
            }
        }
      }
  
      await fetchTasks();
  
    } catch (error: any) {
      console.error('Error updating task:', error.message || error);
      await fetchTasks();
      throw new Error('Gagal memperbarui tugas. Silakan coba lagi.');
    }
  };


  // Deletes a task and re-fetches.
  const deleteTask = async (taskId: string) => {
    if (!user) return;
    try {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) throw error;
        await fetchTasks(); // Re-fetch
    } catch (error: any) {
        console.error('Error deleting task:', error.message || error);
        // Re-throw the error so the UI layer can catch it and provide feedback.
        throw new Error('Gagal menghapus tugas. Silakan coba lagi.');
    }
  };
  
  const bulkDeleteTasks = async (taskIds: string[]) => {
    if (!user || taskIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds);

      if (error) throw error;
      await fetchTasks(); // Re-fetch
    } catch (error: any) {
      console.error('Error bulk deleting tasks:', error.message || error);
      throw new Error('Gagal menghapus beberapa tugas. Silakan coba lagi.');
    }
  };

  const bulkUpdateTasks = async (tasksToUpdate: Task[]) => {
    if (!user || tasksToUpdate.length === 0) return;
    try {
        const updatePromises = tasksToUpdate.map(task => {
            const { id, ...taskData } = task;
            const snakeCaseTask = toSnakeCase(taskData);
            return supabase.from('tasks').update(snakeCaseTask).eq('id', id);
        });
        
        const results = await Promise.all(updatePromises);
        
        const firstError = results.find(res => res.error);
        if (firstError) throw firstError.error;

        await fetchTasks();
    } catch (error: any) {
        console.error('Error bulk updating tasks:', error.message || error);
        throw new Error('Gagal memperbarui beberapa tugas secara massal.');
    }
  };

  const getTaskById = (taskId: string): Task | undefined => {
    return tasks.find(task => task.id === taskId);
  };

  return { tasks, addTask, updateTask, deleteTask, bulkDeleteTasks, bulkUpdateTasks, getTaskById, loading, error };
};
