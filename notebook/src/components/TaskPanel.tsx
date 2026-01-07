import React, { useState, useMemo, useCallback } from 'react';
import { 
  Plus, CheckCircle2, Circle, Clock, Calendar, Tag, 
  ChevronRight, ChevronDown, AlertCircle, Flag, Play, 
  Square, MoreHorizontal, Trash2, Edit2, Link, Timer,
  ListTodo, Filter, SortAsc, Search, Sparkles, Archive
} from 'lucide-react';
import { useTaskStore, Task, TaskPriority, TaskStatus, TaskCategory } from '../store/taskStore';
import clsx from 'clsx';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

const PRIORITY_BG: Record<TaskPriority, string> = {
  low: 'bg-gray-100 dark:bg-gray-800',
  medium: 'bg-blue-50 dark:bg-blue-900/20',
  high: 'bg-orange-50 dark:bg-orange-900/20',
  urgent: 'bg-red-50 dark:bg-red-900/20',
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle size={18} className="text-gray-400" />,
  'in-progress': <Clock size={18} className="text-blue-500" />,
  done: <CheckCircle2 size={18} className="text-green-500" />,
  archived: <Archive size={18} className="text-gray-400" />,
};

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  communication: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  development: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  admin: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  personal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

interface TaskItemProps {
  task: Task;
  depth?: number;
  onEdit: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, depth = 0, onEdit }) => {
  const { 
    completeTask, setTaskStatus, deleteTask, startTimer, stopTimer, 
    activeTimers, getSubtasks, canStartTask 
  } = useTaskStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const subtasks = getSubtasks(task.id);
  const hasSubtasks = subtasks.length > 0;
  const isTimerRunning = !!activeTimers[task.id];
  const canStart = canStartTask(task.id);
  const isBlocked = !canStart && task.status === 'todo';
  
  const completedSubtasks = subtasks.filter(s => s.status === 'done').length;
  
  const handleStatusClick = () => {
    if (task.status === 'done') {
      setTaskStatus(task.id, 'todo');
    } else {
      completeTask(task.id);
    }
  };
  
  const handleTimerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTimerRunning) {
      stopTimer(task.id);
    } else {
      startTimer(task.id);
    }
  };
  
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  
  return (
    <div className={clsx("group", depth > 0 && "ml-6 border-l border-gray-200 dark:border-gray-700 pl-3")}>
      <div 
        className={clsx(
          "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50",
          isBlocked && "opacity-60",
          task.status === 'done' && "opacity-70"
        )}
      >
        {/* Expand/Collapse for subtasks */}
        <div className="w-5 flex-shrink-0">
          {hasSubtasks && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
        
        {/* Status checkbox */}
        <button 
          onClick={handleStatusClick}
          className="flex-shrink-0 hover:scale-110 transition-transform"
          disabled={isBlocked}
        >
          {STATUS_ICONS[task.status]}
        </button>
        
        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx(
              "text-sm font-medium truncate",
              task.status === 'done' && "line-through text-gray-500"
            )}>
              {task.title}
            </span>
            
            {isBlocked && (
              <span className="text-xs text-amber-500 flex items-center gap-1">
                <Link size={10} /> Blocked
              </span>
            )}
          </div>
          
          {/* Meta info */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {/* Priority flag */}
            <Flag size={12} className={PRIORITY_COLORS[task.priority]} />
            
            {/* Category badge */}
            <span className={clsx("text-xs px-1.5 py-0.5 rounded", CATEGORY_COLORS[task.category])}>
              {task.category}
            </span>
            
            {/* Due date */}
            {task.dueDate && (
              <span className={clsx(
                "text-xs flex items-center gap-1",
                isOverdue ? "text-red-500" : "text-gray-500"
              )}>
                <Calendar size={10} />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            
            {/* Time estimate vs actual */}
            {(task.estimatedTime || task.actualTime) && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Timer size={10} />
                {task.actualTime ? formatTime(task.actualTime) : '0m'}
                {task.estimatedTime && ` / ${formatTime(task.estimatedTime)}`}
              </span>
            )}
            
            {/* Tags */}
            {task.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
            
            {/* Subtask progress */}
            {hasSubtasks && (
              <span className="text-xs text-gray-500">
                {completedSubtasks}/{subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Timer button */}
          {task.status !== 'done' && (
            <button
              onClick={handleTimerToggle}
              className={clsx(
                "p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
                isTimerRunning && "text-red-500 bg-red-50 dark:bg-red-900/20"
              )}
              title={isTimerRunning ? "Stop timer" : "Start timer"}
            >
              {isTimerRunning ? <Square size={14} /> : <Play size={14} />}
            </button>
          )}
          
          {/* Edit button */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Edit task"
          >
            <Edit2 size={14} />
          </button>
          
          {/* More menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <MoreHorizontal size={14} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => { setTaskStatus(task.id, 'archived'); setShowMenu(false); }}
                >
                  Archive
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => { deleteTask(task.id); setShowMenu(false); }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Subtasks */}
      {isExpanded && hasSubtasks && (
        <div className="mt-1">
          {subtasks.map(subtask => (
            <TaskItem key={subtask.id} task={subtask} depth={depth + 1} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
};

interface TaskEditorModalProps {
  task?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  parentTaskId?: string;
}

const TaskEditorModal: React.FC<TaskEditorModalProps> = ({ task, isOpen, onClose, parentTaskId }) => {
  const { addTask, updateTask, tasks } = useTaskStore();
  
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [category, setCategory] = useState<TaskCategory>(task?.category || 'other');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [dueTime, setDueTime] = useState(task?.dueTime || '');
  const [estimatedTime, setEstimatedTime] = useState(task?.estimatedTime?.toString() || '');
  const [tags, setTags] = useState(task?.tags.join(', ') || '');
  const [dependencies, setDependencies] = useState<string[]>(task?.dependencies || []);
  const [recurrence, setRecurrence] = useState(task?.recurrence || 'none');
  
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    const taskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
      status: task?.status || 'todo' as TaskStatus,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      estimatedTime: estimatedTime ? parseInt(estimatedTime) : undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      dependencies,
      recurrence,
      linkedNotes: task?.linkedNotes || [],
      parentTaskId,
    };
    
    if (task) {
      updateTask(task.id, taskData);
    } else {
      addTask(taskData as any);
    }
    
    onClose();
  };
  
  const availableDependencies = tasks.filter(t => 
    t.id !== task?.id && 
    t.status !== 'done' && 
    t.status !== 'archived' &&
    !t.parentTaskId
  );
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{task ? 'Edit Task' : 'New Task'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Add more details..."
            />
          </div>
          
          {/* Priority & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              >
                <option value="communication">Communication</option>
                <option value="development">Development</option>
                <option value="review">Review</option>
                <option value="admin">Admin</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              />
            </div>
          </div>
          
          {/* Time Estimate & Recurrence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Time Estimate (min)</label>
              <input
                type="number"
                value={estimatedTime}
                onChange={e => setEstimatedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
                placeholder="30"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recurrence</label>
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              placeholder="work, urgent, project-x"
            />
          </div>
          
          {/* Dependencies */}
          {availableDependencies.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Depends on</label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-2 space-y-1">
                {availableDependencies.map(dep => (
                  <label key={dep.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dependencies.includes(dep.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setDependencies([...dependencies, dep.id]);
                        } else {
                          setDependencies(dependencies.filter(d => d !== dep.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="truncate">{dep.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// AI Task Parser Modal
const AIParserModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { parseTasksFromText, addTask } = useTaskStore();
  const [text, setText] = useState('');
  const [parsedTasks, setParsedTasks] = useState<Partial<Task>[]>([]);
  
  if (!isOpen) return null;
  
  const handleParse = () => {
    const tasks = parseTasksFromText(text);
    setParsedTasks(tasks);
  };
  
  const handleCreateAll = () => {
    parsedTasks.forEach(task => {
      if (task.title) {
        addTask({
          title: task.title,
          priority: task.priority || 'medium',
          status: task.status || 'todo',
          category: task.category || 'other',
          estimatedTime: task.estimatedTime,
          tags: [],
          dependencies: [],
          linkedNotes: [],
          recurrence: 'none',
        });
      }
    });
    setText('');
    setParsedTasks([]);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <Sparkles size={18} className="text-purple-500" />
          <h2 className="text-lg font-semibold">AI Task Parser</h2>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Paste your text or notes</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent resize-none"
              rows={6}
              placeholder="- Buy groceries&#10;- [ ] Finish report by Friday&#10;- Call mom&#10;- Review PR #123"
            />
          </div>
          
          <button
            onClick={handleParse}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            Parse Tasks
          </button>
          
          {parsedTasks.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-sm font-medium mb-2">Found {parsedTasks.length} tasks:</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {parsedTasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <Flag size={12} className={PRIORITY_COLORS[task.priority || 'medium']} />
                    <span className="flex-1 truncate">{task.title}</span>
                    <span className="text-xs text-gray-500">{task.estimatedTime}m</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleCreateAll}
                className="w-full mt-3 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Create All Tasks
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Task Panel Component
export const TaskPanel: React.FC = () => {
  const { tasks, getOverdueTasks, getUpcomingTasks } = useTaskStore();
  
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue'>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'created'>('priority');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showAIParser, setShowAIParser] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => !t.parentTaskId); // Only top-level tasks
    
    // Apply filter
    switch (filter) {
      case 'today':
        result = result.filter(t => t.dueDate === today);
        break;
      case 'upcoming':
        result = getUpcomingTasks(7).filter(t => !t.parentTaskId);
        break;
      case 'overdue':
        result = getOverdueTasks().filter(t => !t.parentTaskId);
        break;
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    } else {
      // Hide archived by default
      result = result.filter(t => t.status !== 'archived');
    }
    
    // Apply search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    
    // Sort
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      if (sortBy === 'priority') {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return result;
  }, [tasks, filter, statusFilter, search, sortBy, today, getOverdueTasks, getUpcomingTasks]);
  
  const overdueCoun = getOverdueTasks().length;
  const todayCount = tasks.filter(t => t.dueDate === today && t.status !== 'done').length;
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListTodo size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold">Tasks</h2>
            {overdueCoun > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                {overdueCoun} overdue
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                // Export tasks as JSON
                const dataStr = JSON.stringify(tasks.filter(t => t.status !== 'archived'), null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
              title="Export Tasks"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => setShowAIParser(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-purple-500"
              title="AI Task Parser"
            >
              <Sparkles size={18} />
            </button>
            <button
              onClick={() => setShowNewTask(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-500"
              title="Add Task"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
            {(['all', 'today', 'upcoming', 'overdue'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  "px-3 py-1 text-xs capitalize",
                  filter === f ? "bg-blue-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                {f}
                {f === 'today' && todayCount > 0 && ` (${todayCount})`}
                {f === 'overdue' && overdueCoun > 0 && ` (${overdueCoun})`}
              </button>
            ))}
          </div>
          
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
          >
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
          </select>
          
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
          >
            <option value="priority">Sort by Priority</option>
            <option value="dueDate">Sort by Due Date</option>
            <option value="created">Sort by Created</option>
          </select>
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ListTodo size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks found</p>
            <button
              onClick={() => setShowNewTask(true)}
              className="mt-2 text-blue-500 text-sm hover:underline"
            >
              Create your first task
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onEdit={setEditingTask}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Modals */}
      <TaskEditorModal
        task={editingTask}
        isOpen={showNewTask || !!editingTask}
        onClose={() => { setShowNewTask(false); setEditingTask(null); }}
      />
      
      <AIParserModal
        isOpen={showAIParser}
        onClose={() => setShowAIParser(false)}
      />
    </div>
  );
};
