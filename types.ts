export enum TaskStatus {
  ToDo = 'To Do',
  InProgress = 'In Progress',
  Done = 'Done',
}

export enum Recurrence {
  None = 'none',
  Daily = 'daily',
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Profile {
  id: string; // Corresponds to auth.users.id
  updated_at?: string;
  username?: string;
  hasCompletedOnboarding?: boolean;
  playFocusEndSound?: boolean;
  playBreakEndSound?: boolean;
  focusEndSound?: string;
  breakEndSound?: string;
}

export interface Task {
  id: string;
  userId?: string; // Changed from user_id to standardize on camelCase
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: TaskStatus;
  checklist: ChecklistItem[];
  notes: string;
  isImportant: boolean;
  recurrence: Recurrence;
  recurringTemplateId?: string;
  tags?: string[];
  createdAt: string;
}

export interface Journal {
  id: string;
  userId: string;
  journalDate: string; // YYYY-MM-DD
  title: string;
  notes: string;
  completedTasks: { title: string }[];
  pdfPath: string;
  createdAt: string;
}

export type View = 'daily' | 'overdue' | 'weekly' | 'monthly' | 'journal' | 'settings';