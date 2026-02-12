import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Task Management Types
// ============================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'archived';
export type TaskCategory = 'communication' | 'development' | 'review' | 'admin' | 'personal' | 'other';
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  tags: string[];
  dueDate?: string; // ISO date string
  dueTime?: string; // HH:mm format
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes
  recurrence: RecurrencePattern;
  recurrenceCustomDays?: number; // for custom recurrence
  parentTaskId?: string; // for subtasks
  dependencies: string[]; // task IDs that must complete before this
  linkedNotes: string[]; // note file paths
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  timeEntries: TimeEntry[];
}

export interface TimeEntry {
  id: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
}

export interface DailyInsight {
  date: string;
  tasksCompleted: number;
  totalTimeSpent: number;
  categoryBreakdown: Record<TaskCategory, number>;
  productivityScore: number; // 0-100
  summary: string;
}

export interface WeeklyRetrospective {
  weekStart: string;
  weekEnd: string;
  totalTasksCompleted: number;
  totalTimeSpent: number;
  topCategories: { category: TaskCategory; time: number }[];
  accomplishments: string[];
  workLifeScore: number; // 0-100 balance score
}

// ============================================
// Task Store
// ============================================

interface TaskState {
  tasks: Task[];
  activeTimers: Record<string, string>; // taskId -> startTime
  insights: DailyInsight[];
  
  // Task CRUD
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'timeEntries'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  archiveTask: (id: string) => void;
  
  // Task status
  setTaskStatus: (id: string, status: TaskStatus) => void;
  completeTask: (id: string) => void;
  
  // Subtasks
  addSubtask: (parentId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'timeEntries' | 'parentTaskId'>) => string;
  getSubtasks: (parentId: string) => Task[];
  
  // Time tracking
  startTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => void;
  addManualTime: (taskId: string, minutes: number) => void;
  
  // Dependencies
  addDependency: (taskId: string, dependencyId: string) => void;
  removeDependency: (taskId: string, dependencyId: string) => void;
  canStartTask: (taskId: string) => boolean;
  
  // Queries
  getTasksByDate: (date: string) => Task[];
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByPriority: (priority: TaskPriority) => Task[];
  getTasksByCategory: (category: TaskCategory) => Task[];
  getOverdueTasks: () => Task[];
  getUpcomingTasks: (days: number) => Task[];
  
  // Insights
  generateDailyInsight: (date: string) => DailyInsight;
  generateWeeklyRetrospective: () => WeeklyRetrospective;
  
  // AI helpers
  parseTasksFromText: (text: string) => Partial<Task>[];
  suggestPriority: (title: string, description?: string) => TaskPriority;
  suggestCategory: (title: string, description?: string) => TaskCategory;
  estimateTime: (title: string, description?: string) => number;
}

// Load from localStorage
const loadTasks = (): Task[] => {
  try {
    const saved = localStorage.getItem('notebook-tasks');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save to localStorage
const saveTasks = (tasks: Task[]) => {
  try {
    localStorage.setItem('notebook-tasks', JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
};

const loadInsights = (): DailyInsight[] => {
  try {
    const saved = localStorage.getItem('notebook-insights');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveInsights = (insights: DailyInsight[]) => {
  try {
    localStorage.setItem('notebook-insights', JSON.stringify(insights));
  } catch (e) {
    console.error('Failed to save insights', e);
  }
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: loadTasks(),
  activeTimers: {},
  insights: loadInsights(),

  addTask: (task) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
      timeEntries: [],
    };
    
    set((state) => {
      const tasks = [...state.tasks, newTask];
      saveTasks(tasks);
      return { tasks };
    });
    
    return id;
  },

  updateTask: (id, updates) => {
    set((state) => {
      const tasks = state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      saveTasks(tasks);
      return { tasks };
    });
  },

  deleteTask: (id) => {
    set((state) => {
      const tasks = state.tasks.filter((t) => t.id !== id && t.parentTaskId !== id);
      saveTasks(tasks);
      return { tasks };
    });
  },

  archiveTask: (id) => {
    get().setTaskStatus(id, 'archived');
  },

  setTaskStatus: (id, status) => {
    set((state) => {
      const tasks = state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              updatedAt: new Date().toISOString(),
              completedAt: status === 'done' ? new Date().toISOString() : t.completedAt,
            }
          : t
      );
      saveTasks(tasks);
      return { tasks };
    });
  },

  completeTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    
    // Stop any running timer
    if (get().activeTimers[id]) {
      get().stopTimer(id);
    }
    
    get().setTaskStatus(id, 'done');
    
    // Handle recurring tasks
    if (task.recurrence !== 'none' && task.dueDate) {
      const nextDueDate = calculateNextDueDate(task.dueDate, task.recurrence, task.recurrenceCustomDays);
      get().addTask({
        ...task,
        status: 'todo',
        dueDate: nextDueDate,
        completedAt: undefined,
        actualTime: undefined,
        dependencies: [],
      });
    }
  },

  addSubtask: (parentId, task) => {
    return get().addTask({ ...task, parentTaskId: parentId });
  },

  getSubtasks: (parentId) => {
    return get().tasks.filter((t) => t.parentTaskId === parentId);
  },

  startTimer: (taskId) => {
    const now = new Date().toISOString();
    set((state) => ({
      activeTimers: { ...state.activeTimers, [taskId]: now },
    }));
    
    // Also mark task as in-progress
    const task = get().tasks.find((t) => t.id === taskId);
    if (task && task.status === 'todo') {
      get().setTaskStatus(taskId, 'in-progress');
    }
  },

  stopTimer: (taskId) => {
    const startTime = get().activeTimers[taskId];
    if (!startTime) return;
    
    const endTime = new Date().toISOString();
    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
    
    const entry: TimeEntry = {
      id: uuidv4(),
      startTime,
      endTime,
      duration,
    };
    
    set((state) => {
      const tasks = state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              timeEntries: [...t.timeEntries, entry],
              actualTime: (t.actualTime || 0) + duration,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      
      const newTimers = { ...state.activeTimers };
      delete newTimers[taskId];
      
      saveTasks(tasks);
      return { tasks, activeTimers: newTimers };
    });
  },

  addManualTime: (taskId, minutes) => {
    const entry: TimeEntry = {
      id: uuidv4(),
      startTime: new Date().toISOString(),
      duration: minutes,
    };
    
    set((state) => {
      const tasks = state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              timeEntries: [...t.timeEntries, entry],
              actualTime: (t.actualTime || 0) + minutes,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      saveTasks(tasks);
      return { tasks };
    });
  },

  addDependency: (taskId, dependencyId) => {
    set((state) => {
      const tasks = state.tasks.map((t) =>
        t.id === taskId && !t.dependencies.includes(dependencyId)
          ? { ...t, dependencies: [...t.dependencies, dependencyId], updatedAt: new Date().toISOString() }
          : t
      );
      saveTasks(tasks);
      return { tasks };
    });
  },

  removeDependency: (taskId, dependencyId) => {
    set((state) => {
      const tasks = state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, dependencies: t.dependencies.filter((d) => d !== dependencyId), updatedAt: new Date().toISOString() }
          : t
      );
      saveTasks(tasks);
      return { tasks };
    });
  },

  canStartTask: (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return false;
    
    // Check all dependencies are complete
    return task.dependencies.every((depId) => {
      const dep = get().tasks.find((t) => t.id === depId);
      return dep && (dep.status === 'done' || dep.status === 'archived');
    });
  },

  getTasksByDate: (date) => {
    return get().tasks.filter((t) => t.dueDate?.startsWith(date));
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter((t) => t.status === status);
  },

  getTasksByPriority: (priority) => {
    return get().tasks.filter((t) => t.priority === priority);
  },

  getTasksByCategory: (category) => {
    return get().tasks.filter((t) => t.category === category);
  },

  getOverdueTasks: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().tasks.filter(
      (t) => t.dueDate && t.dueDate < today && t.status !== 'done' && t.status !== 'archived'
    );
  },

  getUpcomingTasks: (days) => {
    const today = new Date();
    const future = new Date(today);
    future.setDate(future.getDate() + days);
    const futureStr = future.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    return get().tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate >= todayStr &&
        t.dueDate <= futureStr &&
        t.status !== 'done' &&
        t.status !== 'archived'
    );
  },

  generateDailyInsight: (date) => {
    const tasks = get().tasks;
    const dayTasks = tasks.filter((t) => t.completedAt?.startsWith(date));
    
    const categoryBreakdown: Record<TaskCategory, number> = {
      communication: 0,
      development: 0,
      review: 0,
      admin: 0,
      personal: 0,
      other: 0,
    };
    
    let totalTime = 0;
    dayTasks.forEach((t) => {
      const time = t.actualTime || 0;
      totalTime += time;
      categoryBreakdown[t.category] += time;
    });
    
    // Simple productivity score based on completion
    const allDayTasks = tasks.filter((t) => t.dueDate?.startsWith(date));
    const productivityScore = allDayTasks.length > 0 
      ? Math.round((dayTasks.length / allDayTasks.length) * 100)
      : 100;
    
    const insight: DailyInsight = {
      date,
      tasksCompleted: dayTasks.length,
      totalTimeSpent: totalTime,
      categoryBreakdown,
      productivityScore,
      summary: generateDailySummary(dayTasks, totalTime, productivityScore),
    };
    
    // Save insight
    set((state) => {
      const insights = [...state.insights.filter((i) => i.date !== date), insight];
      saveInsights(insights);
      return { insights };
    });
    
    return insight;
  },

  generateWeeklyRetrospective: () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    const tasks = get().tasks.filter(
      (t) => t.completedAt && t.completedAt >= weekStartStr && t.completedAt <= weekEndStr
    );
    
    const categoryTimes: Record<TaskCategory, number> = {
      communication: 0,
      development: 0,
      review: 0,
      admin: 0,
      personal: 0,
      other: 0,
    };
    
    let totalTime = 0;
    tasks.forEach((t) => {
      const time = t.actualTime || 0;
      totalTime += time;
      categoryTimes[t.category] += time;
    });
    
    const topCategories = Object.entries(categoryTimes)
      .map(([category, time]) => ({ category: category as TaskCategory, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 3);
    
    // Work-life balance score (higher personal time = better balance)
    const personalTime = categoryTimes.personal;
    const workTime = totalTime - personalTime;
    const workLifeScore = totalTime > 0 ? Math.min(100, Math.round((personalTime / totalTime) * 200)) : 50;
    
    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      totalTasksCompleted: tasks.length,
      totalTimeSpent: totalTime,
      topCategories,
      accomplishments: tasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').map((t) => t.title),
      workLifeScore,
    };
  },

  parseTasksFromText: (text) => {
    const tasks: Partial<Task>[] = [];
    const lines = text.split('\n').filter((l) => l.trim());
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Check for checkbox format: - [ ] or - [x]
      const checkboxMatch = trimmed.match(/^[-*]\s*\[([ x])\]\s*(.+)/i);
      if (checkboxMatch) {
        const title = checkboxMatch[2].trim();
        tasks.push({
          title,
          priority: get().suggestPriority(title),
          category: get().suggestCategory(title),
          estimatedTime: get().estimateTime(title),
          status: checkboxMatch[1].toLowerCase() === 'x' ? 'done' : 'todo',
        });
        continue;
      }
      
      // Check for bullet point
      const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
      if (bulletMatch) {
        const title = bulletMatch[1].trim();
        tasks.push({
          title,
          priority: get().suggestPriority(title),
          category: get().suggestCategory(title),
          estimatedTime: get().estimateTime(title),
          status: 'todo',
        });
      }
    }
    
    return tasks;
  },

  suggestPriority: (title, description) => {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    if (text.includes('urgent') || text.includes('asap') || text.includes('critical') || text.includes('emergency')) {
      return 'urgent';
    }
    if (text.includes('important') || text.includes('priority') || text.includes('deadline')) {
      return 'high';
    }
    if (text.includes('when possible') || text.includes('nice to have') || text.includes('sometime')) {
      return 'low';
    }
    return 'medium';
  },

  suggestCategory: (title, description) => {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    if (text.includes('email') || text.includes('call') || text.includes('meeting') || text.includes('respond') || text.includes('message')) {
      return 'communication';
    }
    if (text.includes('code') || text.includes('build') || text.includes('implement') || text.includes('develop') || text.includes('fix bug')) {
      return 'development';
    }
    if (text.includes('review') || text.includes('feedback') || text.includes('check') || text.includes('approve')) {
      return 'review';
    }
    if (text.includes('organize') || text.includes('schedule') || text.includes('plan') || text.includes('expense') || text.includes('report')) {
      return 'admin';
    }
    if (text.includes('personal') || text.includes('exercise') || text.includes('family') || text.includes('hobby')) {
      return 'personal';
    }
    return 'other';
  },

  estimateTime: (title, description) => {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    // Look for explicit time mentions
    const hourMatch = text.match(/(\d+)\s*h(our)?s?/);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;
    
    const minMatch = text.match(/(\d+)\s*m(in(ute)?s?)?/);
    if (minMatch) return parseInt(minMatch[1]);
    
    // Heuristic based on keywords
    if (text.includes('quick') || text.includes('brief') || text.includes('small')) return 15;
    if (text.includes('long') || text.includes('extensive') || text.includes('deep')) return 120;
    if (text.includes('meeting')) return 60;
    if (text.includes('email') || text.includes('message')) return 10;
    if (text.includes('review') || text.includes('feedback')) return 30;
    if (text.includes('implement') || text.includes('build') || text.includes('develop')) return 90;
    
    return 30; // Default 30 minutes
  },
}));

// Helper functions
function calculateNextDueDate(currentDate: string, pattern: RecurrencePattern, customDays?: number): string {
  const date = new Date(currentDate);
  
  switch (pattern) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'custom':
      date.setDate(date.getDate() + (customDays || 1));
      break;
  }
  
  return date.toISOString().split('T')[0];
}

function generateDailySummary(tasks: Task[], totalTime: number, score: number): string {
  if (tasks.length === 0) {
    return "No tasks completed today. Take it easy or get started!";
  }
  
  const hours = Math.floor(totalTime / 60);
  const mins = totalTime % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`;
  
  let summary = `Completed ${tasks.length} task${tasks.length > 1 ? 's' : ''} in ${timeStr}. `;
  
  if (score >= 80) {
    summary += "Great productivity today! 🎉";
  } else if (score >= 50) {
    summary += "Good progress. Keep it up! 💪";
  } else {
    summary += "Every step counts. Tomorrow is a new day! 🌟";
  }
  
  return summary;
}
