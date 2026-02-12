import React, { useMemo, useState } from 'react';
import { 
  BarChart3, Clock, CheckCircle2, TrendingUp, Activity,
  Calendar, Target, Award, Zap, Coffee, Brain, Sun, Moon,
  ChevronLeft, ChevronRight, PieChart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useTaskStore, TaskCategory, DailyInsight } from '../store/taskStore';
import clsx from 'clsx';

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  communication: '#8b5cf6',
  development: '#3b82f6',
  review: '#eab308',
  admin: '#6b7280',
  personal: '#22c55e',
  other: '#94a3b8',
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  communication: 'Communication',
  development: 'Development',
  review: 'Review',
  admin: 'Admin',
  personal: 'Personal',
  other: 'Other',
};

// Simple bar component for charts
const Bar: React.FC<{ value: number; max: number; color: string; label?: string }> = ({ value, max, color, label }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500 w-8">{label}</span>}
      <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">{value}m</span>
    </div>
  );
};

// Stat card component
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subvalue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}> = ({ icon, label, value, subvalue, trend, color = 'text-blue-500' }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <div className={color}>{icon}</div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {subvalue && (
          <span className="text-sm text-gray-500 mb-1">{subvalue}</span>
        )}
        {trend && (
          <span className={clsx(
            "text-sm mb-1 flex items-center",
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'
          )}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : trend === 'down' ? <ArrowDownRight size={14} /> : null}
          </span>
        )}
      </div>
    </div>
  );
};

// Progress ring component
const ProgressRing: React.FC<{ progress: number; size?: number; strokeWidth?: number; color?: string }> = ({ 
  progress, size = 80, strokeWidth = 8, color = '#3b82f6' 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

// Work-life balance meter
const BalanceMeter: React.FC<{ score: number }> = ({ score }) => {
  const getMessage = () => {
    if (score >= 70) return { text: "Great balance! 🌟", color: 'text-green-500' };
    if (score >= 40) return { text: "Room for improvement", color: 'text-yellow-500' };
    return { text: "Consider more personal time", color: 'text-orange-500' };
  };
  
  const message = getMessage();
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Coffee size={18} className="text-amber-500" />
        <span className="text-sm font-medium">Work-Life Balance</span>
      </div>
      
      <div className="flex items-center gap-4">
        <ProgressRing 
          progress={score} 
          color={score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#f97316'}
        />
        <div>
          <p className={clsx("text-sm font-medium", message.color)}>{message.text}</p>
          <p className="text-xs text-gray-500 mt-1">
            {score >= 50 ? 'Personal' : 'Work'} activities are {score >= 50 ? 'prioritized' : 'dominant'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Activity heatmap (simplified)
const ActivityHeatmap: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const weeks = 12;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const cells: { date: string; value: number }[] = [];
  const today = new Date();
  
  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + (6 - d)));
      const dateStr = date.toISOString().split('T')[0];
      cells.push({ date: dateStr, value: data[dateStr] || 0 });
    }
  }
  
  const maxValue = Math.max(...Object.values(data), 1);
  
  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = value / maxValue;
    if (intensity > 0.75) return 'bg-green-500';
    if (intensity > 0.5) return 'bg-green-400';
    if (intensity > 0.25) return 'bg-green-300';
    return 'bg-green-200';
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={18} className="text-green-500" />
        <span className="text-sm font-medium">Activity Overview</span>
      </div>
      
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 text-xs text-gray-400 pr-1">
          {days.map((d, i) => <span key={`day-label-${i}`} className="h-3 leading-3">{d.charAt(0)}</span>)}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: weeks }).map((_, w) => (
            <div key={`week-${w}`} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, d) => {
                const cell = cells[w * 7 + d];
                return (
                  <div
                    key={`cell-${w}-${d}`}
                    className={clsx("w-3 h-3 rounded-sm", getColor(cell?.value || 0))}
                    title={`${cell?.date}: ${cell?.value || 0} tasks`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
          <div className="w-3 h-3 rounded-sm bg-green-200" />
          <div className="w-3 h-3 rounded-sm bg-green-300" />
          <div className="w-3 h-3 rounded-sm bg-green-400" />
          <div className="w-3 h-3 rounded-sm bg-green-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

// Main Insights Panel
export const InsightsPanel: React.FC = () => {
  const { tasks, insights } = useTaskStore();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate today's insight locally without updating store during render
  const todayInsight = useMemo(() => {
    const dayTasks = tasks.filter(t => t.status === 'done' && t.completedAt?.startsWith(today));
    
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
    
    const allDayTasks = tasks.filter(t => t.dueDate?.startsWith(today));
    const productivityScore = allDayTasks.length > 0 
      ? Math.round((dayTasks.length / allDayTasks.length) * 100)
      : 100;
    
    return {
      date: today,
      tasksCompleted: dayTasks.length,
      totalTimeSpent: totalTime,
      categoryBreakdown,
      productivityScore,
      summary: `Completed ${dayTasks.length} tasks, spent ${Math.round(totalTime / 60)}h focused.`,
    };
  }, [today, tasks]);
  
  // Calculate weekly retrospective locally
  const weeklyRetro = useMemo(() => {
    const todayDate = new Date();
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - todayDate.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    const weekTasks = tasks.filter(
      t => t.completedAt && t.completedAt >= weekStartStr && t.completedAt <= weekEndStr
    );
    
    const categoryTime: Record<TaskCategory, number> = {
      communication: 0, development: 0, review: 0, admin: 0, personal: 0, other: 0
    };
    
    let totalTime = 0;
    weekTasks.forEach(t => {
      const time = t.actualTime || 0;
      totalTime += time;
      categoryTime[t.category] += time;
    });
    
    const personalTime = categoryTime.personal;
    const workTime = totalTime - personalTime;
    const workLifeScore = totalTime > 0 ? Math.round((personalTime / totalTime) * 100) : 50;
    
    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      totalTasksCompleted: weekTasks.length,
      totalTimeSpent: totalTime,
      topCategories: Object.entries(categoryTime)
        .map(([cat, time]) => ({ category: cat as TaskCategory, time }))
        .sort((a, b) => b.time - a.time)
        .slice(0, 3),
      accomplishments: weekTasks.slice(0, 5).map(t => t.title),
      workLifeScore,
    };
  }, [tasks]);
  
  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const periodStart = new Date(now);
    
    switch (selectedPeriod) {
      case 'today':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
    }
    
    const periodStartStr = periodStart.toISOString();
    const periodTasks = tasks.filter(t => t.createdAt >= periodStartStr || (t.completedAt && t.completedAt >= periodStartStr));
    const completedTasks = periodTasks.filter(t => t.status === 'done');
    
    const totalTime = completedTasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);
    const estimatedTime = completedTasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
    
    const categoryTime: Record<TaskCategory, number> = {
      communication: 0,
      development: 0,
      review: 0,
      admin: 0,
      personal: 0,
      other: 0,
    };
    
    completedTasks.forEach(t => {
      categoryTime[t.category] += t.actualTime || 0;
    });
    
    // Completion rate
    const dueTasks = periodTasks.filter(t => t.dueDate && t.dueDate <= today);
    const completionRate = dueTasks.length > 0 
      ? Math.round((dueTasks.filter(t => t.status === 'done').length / dueTasks.length) * 100)
      : 100;
    
    // Estimation accuracy
    const estimationAccuracy = estimatedTime > 0 
      ? Math.round((1 - Math.abs(totalTime - estimatedTime) / estimatedTime) * 100)
      : 100;
    
    return {
      completedCount: completedTasks.length,
      totalTime,
      estimatedTime,
      categoryTime,
      completionRate,
      estimationAccuracy: Math.max(0, Math.min(100, estimationAccuracy)),
      avgTimePerTask: completedTasks.length > 0 ? Math.round(totalTime / completedTasks.length) : 0,
    };
  }, [tasks, selectedPeriod, today]);
  
  // Activity data for heatmap
  const activityData = useMemo(() => {
    const data: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.completedAt) {
        const date = t.completedAt.split('T')[0];
        data[date] = (data[date] || 0) + 1;
      }
    });
    return data;
  }, [tasks]);
  
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  
  const maxCategoryTime = Math.max(...Object.values(stats.categoryTime), 1);
  
  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 size={24} className="text-blue-500" />
          <h2 className="text-xl font-bold">Activity Insights</h2>
        </div>
        
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
          {(['today', 'week', 'month'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={clsx(
                "px-3 py-1.5 text-sm capitalize",
                selectedPeriod === period ? "bg-blue-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      
      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Tasks Completed"
          value={stats.completedCount}
          color="text-green-500"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Time Tracked"
          value={formatTime(stats.totalTime)}
          subvalue={`est. ${formatTime(stats.estimatedTime)}`}
          color="text-blue-500"
        />
        <StatCard
          icon={<Target size={18} />}
          label="Completion Rate"
          value={`${stats.completionRate}%`}
          trend={stats.completionRate >= 80 ? 'up' : stats.completionRate >= 50 ? 'neutral' : 'down'}
          color="text-purple-500"
        />
        <StatCard
          icon={<Zap size={18} />}
          label="Avg per Task"
          value={formatTime(stats.avgTimePerTask)}
          color="text-amber-500"
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-purple-500" />
            <span className="text-sm font-medium">Time by Category</span>
          </div>
          
          <div className="space-y-3">
            {(Object.keys(CATEGORY_COLORS) as TaskCategory[]).map(cat => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{CATEGORY_LABELS[cat]}</span>
                  <span className="text-gray-500">{formatTime(stats.categoryTime[cat])}</span>
                </div>
                <Bar value={stats.categoryTime[cat]} max={maxCategoryTime} color={CATEGORY_COLORS[cat]} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Work-Life Balance */}
        <BalanceMeter score={weeklyRetro.workLifeScore} />
      </div>
      
      {/* Activity Heatmap */}
      <div className="mb-6">
        <ActivityHeatmap data={activityData} />
      </div>
      
      {/* Daily Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sun size={18} className="text-yellow-500" />
          <span className="text-sm font-medium">Today's Summary</span>
        </div>
        <p className="text-gray-600 dark:text-gray-400">{todayInsight.summary}</p>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-green-500">
            <CheckCircle2 size={14} />
            <span>{todayInsight.tasksCompleted} completed</span>
          </div>
          <div className="flex items-center gap-1 text-blue-500">
            <Clock size={14} />
            <span>{formatTime(todayInsight.totalTimeSpent)} tracked</span>
          </div>
          <div className="flex items-center gap-1 text-purple-500">
            <Award size={14} />
            <span>{todayInsight.productivityScore}% productivity</span>
          </div>
        </div>
      </div>
      
      {/* Weekly Accomplishments */}
      {weeklyRetro.accomplishments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Award size={18} className="text-amber-500" />
            <span className="text-sm font-medium">This Week's Highlights</span>
          </div>
          <ul className="space-y-2">
            {weeklyRetro.accomplishments.slice(0, 5).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-500 mt-0.5">✓</span>
                <span className="text-gray-600 dark:text-gray-400">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Estimation Accuracy */}
      <div className="mt-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain size={18} className="text-blue-500" />
              <span className="text-sm font-medium">Estimation Accuracy</span>
            </div>
            <p className="text-xs text-gray-500">
              How well your time estimates match actual time spent
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-blue-500">{stats.estimationAccuracy}%</span>
            <p className="text-xs text-gray-500">
              {stats.estimationAccuracy >= 80 ? 'Excellent!' : stats.estimationAccuracy >= 60 ? 'Good' : 'Needs improvement'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
