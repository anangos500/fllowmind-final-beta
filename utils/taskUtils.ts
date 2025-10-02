
import { Task, Recurrence, TaskStatus } from '../types';

export const getTasksForDay = (date: Date, allTasks: Task[]): Task[] => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Find actual tasks that exist on this day
  const existingTasks = allTasks.filter(task => {
    const taskDate = new Date(task.startTime);
    return taskDate >= startOfDay && taskDate <= endOfDay;
  });

  // 2. Project recurring tasks onto this day
  const recurringProjections: Task[] = [];
  
  // Find all unique recurring task templates
  const recurringTemplates = allTasks.filter(t => t.recurrence !== Recurrence.None);
  const uniqueTemplateIds = new Set(recurringTemplates.map(t => t.recurringTemplateId || t.id));

  uniqueTemplateIds.forEach(templateId => {
    // For each unique recurring task, find its latest instance
    const allInstances = allTasks.filter(t => t.id === templateId || t.recurringTemplateId === templateId);
    if (allInstances.length === 0) return;

    const latestInstance = allInstances.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
    
    const latestInstanceDate = new Date(latestInstance.startTime);
    latestInstanceDate.setHours(0, 0, 0, 0);

    // Project if the target date is after the latest instance's date
    if (latestInstance.recurrence === Recurrence.Daily && startOfDay > latestInstanceDate) {
      const templateStartDate = new Date(latestInstance.startTime);
      const templateEndDate = new Date(latestInstance.endTime);
      
      const projectedStartTime = new Date(date);
      projectedStartTime.setHours(templateStartDate.getHours(), templateStartDate.getMinutes(), templateStartDate.getSeconds());
      
      const projectedEndTime = new Date(date);
      projectedEndTime.setHours(templateEndDate.getHours(), templateEndDate.getMinutes(), templateEndDate.getSeconds());

      if (projectedEndTime <= projectedStartTime) {
        projectedEndTime.setDate(projectedEndTime.getDate() + 1);
      }

      // Check if a real task already exists at the projected time
      const projectionExists = existingTasks.some(t => 
        t.title === latestInstance.title && 
        new Date(t.startTime).getTime() === projectedStartTime.getTime()
      );
      
      if (!projectionExists) {
        recurringProjections.push({
          ...latestInstance,
          id: `${latestInstance.id}-projected-${date.toISOString()}`,
          startTime: projectedStartTime.toISOString(),
          endTime: projectedEndTime.toISOString(),
          status: TaskStatus.ToDo, // Projections are always ToDo
          checklist: latestInstance.checklist.map(item => ({...item, completed: false })), // Reset checklist
        });
      }
    }
  });

  const combined = [...existingTasks, ...recurringProjections];
  const uniqueTasks = Array.from(new Map(combined.map(task => [task.id, task])).values());

  return uniqueTasks.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
};
