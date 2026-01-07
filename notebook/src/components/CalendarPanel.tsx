import React, { useState, useMemo, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Clock, 
  CalendarDays, CalendarRange, Calendar as CalendarIcon
} from 'lucide-react';
import { useTaskStore, Task } from '../store/taskStore';
import clsx from 'clsx';

type CalendarView = 'month' | 'week' | 'day';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  tasks: Task[];
  onClick: () => void;
  onTaskClick: (task: Task) => void;
  onDropTask: (taskId: string, date: string) => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ 
  date, isCurrentMonth, isToday, isSelected, tasks, onClick, onTaskClick, onDropTask 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => setIsDragOver(false);
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDropTask(taskId, date.toISOString().split('T')[0]);
    }
  };
  
  const visibleTasks = tasks.slice(0, 3);
  const moreCount = tasks.length - 3;
  
  return (
    <div
      className={clsx(
        "min-h-[100px] p-1 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors",
        !isCurrentMonth && "bg-gray-50 dark:bg-gray-900/50 opacity-50",
        isSelected && "bg-blue-50 dark:bg-blue-900/20",
        isDragOver && "bg-blue-100 dark:bg-blue-900/40",
        "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      )}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={clsx(
        "w-7 h-7 rounded-full flex items-center justify-center text-sm mb-1",
        isToday && "bg-blue-500 text-white font-bold",
        !isToday && isSelected && "bg-gray-200 dark:bg-gray-700"
      )}>
        {date.getDate()}
      </div>
      
      <div className="space-y-0.5">
        {visibleTasks.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
            onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
            className={clsx(
              "px-1.5 py-0.5 text-xs rounded truncate cursor-grab active:cursor-grabbing",
              "text-white",
              PRIORITY_COLORS[task.priority]
            )}
            title={task.title}
          >
            {task.title}
          </div>
        ))}
        {moreCount > 0 && (
          <div className="text-xs text-gray-500 px-1">+{moreCount} more</div>
        )}
      </div>
    </div>
  );
};

// Week View Component
const WeekView: React.FC<{
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDropTask: (taskId: string, date: string) => void;
  onSelectDate: (date: Date) => void;
}> = ({ currentDate, tasks, onTaskClick, onDropTask, onSelectDate }) => {
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date().toISOString().split('T')[0];
  
  const getTasksForDateHour = (date: Date, hour: number) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => {
      if (t.dueDate !== dateStr) return false;
      if (!t.dueTime) return hour === 9; // Default to 9am
      const taskHour = parseInt(t.dueTime.split(':')[0]);
      return taskHour === hour;
    });
  };
  
  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="grid grid-cols-8 sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 border-r border-gray-200 dark:border-gray-700" />
        {weekDays.map((date, i) => {
          const dateStr = date.toISOString().split('T')[0];
          const isToday = dateStr === today;
          return (
            <div 
              key={i}
              className={clsx(
                "p-2 text-center border-r border-gray-200 dark:border-gray-700",
                isToday && "bg-blue-50 dark:bg-blue-900/20"
              )}
              onClick={() => onSelectDate(date)}
            >
              <div className="text-xs text-gray-500">{DAYS[date.getDay()]}</div>
              <div className={clsx(
                "text-lg font-semibold",
                isToday && "text-blue-500"
              )}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Time Grid */}
      <div>
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8 min-h-[60px]">
            <div className="p-1 text-xs text-gray-500 text-right pr-2 border-r border-gray-200 dark:border-gray-700">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {weekDays.map((date, i) => {
              const dayTasks = getTasksForDateHour(date, hour);
              const dateStr = date.toISOString().split('T')[0];
              
              return (
                <div
                  key={i}
                  className="border-r border-b border-gray-100 dark:border-gray-800 p-0.5"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData('taskId');
                    if (taskId) onDropTask(taskId, dateStr);
                  }}
                >
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                      onClick={() => onTaskClick(task)}
                      className={clsx(
                        "px-1 py-0.5 text-xs rounded truncate cursor-grab text-white mb-0.5",
                        PRIORITY_COLORS[task.priority]
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// Day View Component
const DayView: React.FC<{
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDropTask: (taskId: string, date: string) => void;
}> = ({ currentDate, tasks, onTaskClick, onDropTask }) => {
  const dateStr = currentDate.toISOString().split('T')[0];
  const dayTasks = tasks.filter(t => t.dueDate === dateStr);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getTasksForHour = (hour: number) => {
    return dayTasks.filter(t => {
      if (!t.dueTime) return hour === 9;
      return parseInt(t.dueTime.split(':')[0]) === hour;
    });
  };
  
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
        <h3 className="text-lg font-semibold">
          {DAYS[currentDate.getDay()]}, {MONTHS[currentDate.getMonth()]} {currentDate.getDate()}
        </h3>
        <p className="text-sm text-gray-500">{dayTasks.length} tasks scheduled</p>
      </div>
      
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {hours.map(hour => {
          const hourTasks = getTasksForHour(hour);
          return (
            <div 
              key={hour}
              className="flex min-h-[60px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('taskId');
                if (taskId) onDropTask(taskId, dateStr);
              }}
            >
              <div className="w-16 p-2 text-sm text-gray-500 text-right shrink-0">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 p-1 border-l border-gray-200 dark:border-gray-700">
                {hourTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                    onClick={() => onTaskClick(task)}
                    className={clsx(
                      "px-2 py-1 rounded mb-1 cursor-grab text-white",
                      PRIORITY_COLORS[task.priority]
                    )}
                  >
                    <div className="font-medium text-sm">{task.title}</div>
                    {task.estimatedTime && (
                      <div className="text-xs opacity-80 flex items-center gap-1">
                        <Clock size={10} />
                        {task.estimatedTime}m
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main Calendar Component
export const CalendarPanel: React.FC = () => {
  const { tasks, updateTask, completeTask } = useTaskStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>('month');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Month view data
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Date[] = [];
    
    // Add days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add days from next month to fill grid
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  }, [currentDate]);
  
  const getTasksForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate === dateStr && t.status !== 'archived');
  }, [tasks]);
  
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };
  
  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };
  
  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };
  
  const handleDropTask = (taskId: string, date: string) => {
    updateTask(taskId, { dueDate: date });
  };
  
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Today
            </button>
            
            <div className="flex border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
              <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
        
        {/* View Switcher */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden w-fit">
          {[
            { id: 'month', icon: CalendarDays, label: 'Month' },
            { id: 'week', icon: CalendarRange, label: 'Week' },
            { id: 'day', icon: CalendarIcon, label: 'Day' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id as CalendarView)}
              className={clsx(
                "px-3 py-1.5 text-sm flex items-center gap-1.5",
                view === id ? "bg-blue-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Calendar View */}
      {view === 'month' && (
        <div className="flex-1 overflow-auto">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
            {DAYS.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-r border-gray-200 dark:border-gray-700">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {monthDays.map((date, i) => {
              const dateStr = date.toISOString().split('T')[0];
              return (
                <CalendarDay
                  key={i}
                  date={date}
                  isCurrentMonth={date.getMonth() === currentDate.getMonth()}
                  isToday={dateStr === todayStr}
                  isSelected={selectedDate?.toISOString().split('T')[0] === dateStr}
                  tasks={getTasksForDate(date)}
                  onClick={() => setSelectedDate(date)}
                  onTaskClick={handleTaskClick}
                  onDropTask={handleDropTask}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onDropTask={handleDropTask}
          onSelectDate={setSelectedDate}
        />
      )}
      
      {view === 'day' && (
        <DayView
          currentDate={selectedDate || currentDate}
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onDropTask={handleDropTask}
        />
      )}
      
      {/* Task Quick View Modal */}
      {selectedTask && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setSelectedTask(null)}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-5 w-96 max-w-[90vw]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
              <div className={clsx(
                "px-2 py-1 text-xs rounded-full font-medium",
                selectedTask.priority === 'urgent' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                selectedTask.priority === 'high' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
                selectedTask.priority === 'medium' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                selectedTask.priority === 'low' && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
              )}>
                {selectedTask.priority}
              </div>
            </div>
            
            {selectedTask.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-wrap">{selectedTask.description}</p>
            )}
            
            <div className="space-y-2 mb-4">
              {selectedTask.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon size={16} className="text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(selectedTask.dueDate).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                    {selectedTask.dueTime && ` at ${selectedTask.dueTime}`}
                  </span>
                </div>
              )}
              
              {selectedTask.estimatedTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedTask.estimatedTime} minutes estimated
                  </span>
                </div>
              )}
              
              {selectedTask.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-400">Tags:</span>
                  {selectedTask.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  completeTask(selectedTask.id);
                  setSelectedTask(null);
                }}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600"
              >
                Mark Complete
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
