import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Coffee, Target, Settings, X,
  Timer, Clock, Volume2, VolumeX, Check, Bell, Maximize2,
  Minimize2, Eye, EyeOff, Moon, Sun, Brain, Flame
} from 'lucide-react';
import clsx from 'clsx';

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
}

type SessionType = 'focus' | 'shortBreak' | 'longBreak';

interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  showNotifications: boolean;
}

const defaultSettings: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  showNotifications: true,
};

// Load settings
const loadSettings = (): PomodoroSettings => {
  try {
    const saved = localStorage.getItem('pomodoro-settings');
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch (e) {}
  return defaultSettings;
};

// Save settings
const saveSettings = (settings: PomodoroSettings) => {
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
};

// Load stats
const loadStats = (): { totalFocusSessions: number; totalFocusMinutes: number; todaySessions: number; streak: number; lastSessionDate: string | null } => {
  try {
    const saved = localStorage.getItem('pomodoro-stats');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { totalFocusSessions: 0, totalFocusMinutes: 0, todaySessions: 0, streak: 0, lastSessionDate: null };
};

// Save stats
const saveStats = (stats: ReturnType<typeof loadStats>) => {
  localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
};

export const FocusMode: React.FC<FocusModeProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900">
      <FocusModeContent onClose={onClose} />
    </div>
  );
};

const FocusModeContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>('focus');
  const [timeLeft, setTimeLeft] = useState(settings.focusMinutes * 60);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [stats, setStats] = useState(loadStats);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideUI, setHideUI] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...');
  }, []);
  
  // Save settings when changed
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);
  
  // Define handleSessionComplete before using it in useEffect
  const handleSessionComplete = useCallback(() => {
    setIsRunning(false);
    
    // Play sound
    if (settings.soundEnabled) {
      try {
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQAAAAA=';
        audio.play().catch(() => {});
      } catch (e) {}
    }
    
    // Show notification
    if (settings.showNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(
          sessionType === 'focus' ? '🎉 Focus session complete!' : '☕ Break is over!',
          { body: sessionType === 'focus' ? 'Time for a break!' : 'Ready to focus again?' }
        );
      }
    }
    
    if (sessionType === 'focus') {
      const newCompleted = completedSessions + 1;
      setCompletedSessions(newCompleted);
      
      // Update stats
      const today = new Date().toDateString();
      const newStats = { ...stats };
      newStats.totalFocusSessions += 1;
      newStats.totalFocusMinutes += settings.focusMinutes;
      
      if (stats.lastSessionDate === today) {
        newStats.todaySessions += 1;
      } else {
        // Check streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (stats.lastSessionDate === yesterday.toDateString()) {
          newStats.streak += 1;
        } else {
          newStats.streak = 1;
        }
        newStats.todaySessions = 1;
      }
      newStats.lastSessionDate = today;
      setStats(newStats);
      saveStats(newStats);
      
      // Determine next session
      if (newCompleted % settings.sessionsUntilLongBreak === 0) {
        setSessionType('longBreak');
        setTimeLeft(settings.longBreakMinutes * 60);
        if (settings.autoStartBreaks) setIsRunning(true);
      } else {
        setSessionType('shortBreak');
        setTimeLeft(settings.shortBreakMinutes * 60);
        if (settings.autoStartBreaks) setIsRunning(true);
      }
    } else {
      setSessionType('focus');
      setTimeLeft(settings.focusMinutes * 60);
      if (settings.autoStartFocus) setIsRunning(true);
    }
  }, [sessionType, completedSessions, settings, stats]);
  
  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);
  
  // Handle session complete when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      handleSessionComplete();
    }
  }, [timeLeft, isRunning, handleSessionComplete]);
  
  // Update document title
  useEffect(() => {
    if (isRunning) {
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      document.title = `${mins}:${secs.toString().padStart(2, '0')} - ${sessionType === 'focus' ? 'Focus' : 'Break'}`;
    } else {
      document.title = 'Notebook - Focus Mode';
    }
    
    return () => {
      document.title = 'Notebook';
    };
  }, [isRunning, timeLeft, sessionType]);
  
  const handleStart = () => {
    if (settings.showNotifications && 'Notification' in window) {
      Notification.requestPermission();
    }
    setIsRunning(true);
  };
  
  const handlePause = () => setIsRunning(false);
  
  const handleReset = () => {
    setIsRunning(false);
    switch (sessionType) {
      case 'focus':
        setTimeLeft(settings.focusMinutes * 60);
        break;
      case 'shortBreak':
        setTimeLeft(settings.shortBreakMinutes * 60);
        break;
      case 'longBreak':
        setTimeLeft(settings.longBreakMinutes * 60);
        break;
    }
  };
  
  const handleSkip = () => {
    handleSessionComplete();
  };
  
  const switchSession = (type: SessionType) => {
    setIsRunning(false);
    setSessionType(type);
    switch (type) {
      case 'focus':
        setTimeLeft(settings.focusMinutes * 60);
        break;
      case 'shortBreak':
        setTimeLeft(settings.shortBreakMinutes * 60);
        break;
      case 'longBreak':
        setTimeLeft(settings.longBreakMinutes * 60);
        break;
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getProgress = () => {
    const total = sessionType === 'focus' 
      ? settings.focusMinutes * 60 
      : sessionType === 'shortBreak' 
        ? settings.shortBreakMinutes * 60 
        : settings.longBreakMinutes * 60;
    return ((total - timeLeft) / total) * 100;
  };
  
  if (!isOpen) return null;
  
  const sessionColors = {
    focus: 'from-red-500 to-orange-500',
    shortBreak: 'from-green-500 to-emerald-500',
    longBreak: 'from-blue-500 to-indigo-500',
  };

  return (
    <div 
      className={clsx(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-500",
        sessionType === 'focus' 
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : sessionType === 'shortBreak'
            ? "bg-gradient-to-br from-green-900 via-emerald-900 to-green-900"
            : "bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-900"
      )}
      onMouseMove={() => hideUI && setHideUI(false)}
    >
      {/* Close button */}
      {!hideUI && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={24} />
        </button>
      )}
      
      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-4 left-4 p-4 bg-white/10 backdrop-blur-lg rounded-xl text-white max-w-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Settings</h3>
            <button onClick={() => setShowSettings(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-white/70 mb-1">Focus (minutes)</label>
              <input
                type="number"
                value={settings.focusMinutes}
                onChange={e => setSettings(s => ({ ...s, focusMinutes: Number(e.target.value) }))}
                className="w-full px-2 py-1 rounded bg-white/10 border border-white/20"
                min={1}
                max={120}
              />
            </div>
            <div>
              <label className="block text-white/70 mb-1">Short Break (minutes)</label>
              <input
                type="number"
                value={settings.shortBreakMinutes}
                onChange={e => setSettings(s => ({ ...s, shortBreakMinutes: Number(e.target.value) }))}
                className="w-full px-2 py-1 rounded bg-white/10 border border-white/20"
                min={1}
                max={30}
              />
            </div>
            <div>
              <label className="block text-white/70 mb-1">Long Break (minutes)</label>
              <input
                type="number"
                value={settings.longBreakMinutes}
                onChange={e => setSettings(s => ({ ...s, longBreakMinutes: Number(e.target.value) }))}
                className="w-full px-2 py-1 rounded bg-white/10 border border-white/20"
                min={1}
                max={60}
              />
            </div>
            <div>
              <label className="block text-white/70 mb-1">Sessions until long break</label>
              <input
                type="number"
                value={settings.sessionsUntilLongBreak}
                onChange={e => setSettings(s => ({ ...s, sessionsUntilLongBreak: Number(e.target.value) }))}
                className="w-full px-2 py-1 rounded bg-white/10 border border-white/20"
                min={1}
                max={10}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoStartBreaks}
                onChange={e => setSettings(s => ({ ...s, autoStartBreaks: e.target.checked }))}
                className="rounded"
              />
              <span>Auto-start breaks</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoStartFocus}
                onChange={e => setSettings(s => ({ ...s, autoStartFocus: e.target.checked }))}
                className="rounded"
              />
              <span>Auto-start focus</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={e => setSettings(s => ({ ...s, soundEnabled: e.target.checked }))}
                className="rounded"
              />
              <span>Sound notifications</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className={clsx("text-center text-white transition-opacity duration-300", hideUI && "opacity-30")}>
        {/* Session type selector */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { type: 'focus' as const, icon: Target, label: 'Focus' },
            { type: 'shortBreak' as const, icon: Coffee, label: 'Short Break' },
            { type: 'longBreak' as const, icon: Moon, label: 'Long Break' },
          ].map(item => (
            <button
              key={item.type}
              onClick={() => switchSession(item.type)}
              className={clsx(
                "px-4 py-2 rounded-lg flex items-center gap-2 transition-colors",
                sessionType === item.type
                  ? "bg-white/20 font-semibold"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
        
        {/* Timer display */}
        <div className="relative mb-8">
          {/* Progress ring */}
          <svg className="w-64 h-64 mx-auto transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - getProgress() / 100)}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={sessionType === 'focus' ? '#ef4444' : sessionType === 'shortBreak' ? '#22c55e' : '#3b82f6'} />
                <stop offset="100%" stopColor={sessionType === 'focus' ? '#f97316' : sessionType === 'shortBreak' ? '#10b981' : '#6366f1'} />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Time */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl font-light tracking-tight">{formatTime(timeLeft)}</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={handleReset}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Reset"
          >
            <RotateCcw size={24} />
          </button>
          
          <button
            onClick={isRunning ? handlePause : handleStart}
            className={clsx(
              "p-6 rounded-full transition-colors",
              `bg-gradient-to-r ${sessionColors[sessionType]} hover:opacity-90`
            )}
          >
            {isRunning ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
          </button>
          
          <button
            onClick={handleSkip}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Skip"
          >
            <Check size={24} />
          </button>
        </div>
        
        {/* Session progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
            <div
              key={i}
              className={clsx(
                "w-3 h-3 rounded-full transition-colors",
                i < completedSessions % settings.sessionsUntilLongBreak
                  ? "bg-white"
                  : "bg-white/20"
              )}
            />
          ))}
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-center gap-6 text-sm text-white/70">
          <div className="flex items-center gap-1">
            <Brain size={16} />
            <span>{stats.todaySessions} today</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame size={16} />
            <span>{stats.streak} day streak</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{Math.round(stats.totalFocusMinutes / 60)}h total</span>
          </div>
        </div>
      </div>
      
      {/* Bottom controls */}
      {!hideUI && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            title="Settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => setHideUI(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            title="Hide UI"
          >
            <EyeOff size={18} />
          </button>
          <button
            onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            title="Toggle Sound"
          >
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      )}
    </div>
  );
};
