import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { 
  encryptContent, 
  decryptContent, 
  isEncryptedContent, 
  parseEncryptedContent,
  serializeEncryptedData,
  checkPasswordStrength,
  PasswordStrength 
} from '../lib/encryption';
import clsx from 'clsx';

interface EncryptedNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'encrypt' | 'decrypt';
  content: string;
  onResult: (result: string, wasEncrypted: boolean) => void;
}

export const EncryptedNoteModal: React.FC<EncryptedNoteModalProps> = ({
  isOpen,
  onClose,
  mode,
  content,
  onResult,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState<PasswordStrength | null>(null);
  
  useEffect(() => {
    if (mode === 'encrypt' && password) {
      setStrength(checkPasswordStrength(password));
    } else {
      setStrength(null);
    }
  }, [password, mode]);
  
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (mode === 'encrypt') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      
      setLoading(true);
      try {
        const encrypted = await encryptContent(content, password);
        const serialized = serializeEncryptedData(encrypted);
        onResult(serialized, true);
        onClose();
      } catch (e) {
        setError('Encryption failed. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Decrypt mode
      const encryptedData = parseEncryptedContent(content);
      if (!encryptedData) {
        setError('Content is not properly encrypted');
        return;
      }
      
      setLoading(true);
      try {
        const decrypted = await decryptContent(encryptedData, password);
        onResult(decrypted, false);
        onClose();
      } catch (e) {
        setError('Decryption failed. Wrong password?');
      } finally {
        setLoading(false);
      }
    }
  };
  
  if (!isOpen) return null;
  
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-500'];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {mode === 'encrypt' ? (
              <>
                <Lock size={20} className="text-amber-500" />
                <h2 className="text-lg font-semibold">Encrypt Note</h2>
              </>
            ) : (
              <>
                <Unlock size={20} className="text-green-500" />
                <h2 className="text-lg font-semibold">Unlock Note</h2>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {mode === 'encrypt' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <ShieldCheck size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400">AES-256-GCM Encryption</p>
                  <p className="text-amber-600 dark:text-amber-500 mt-1">
                    Your note will be encrypted locally. Remember your password - it cannot be recovered if lost.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500"
                placeholder={mode === 'encrypt' ? 'Choose a strong password' : 'Enter password'}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          {/* Password Strength (encrypt only) */}
          {mode === 'encrypt' && strength && (
            <div>
              <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={clsx(
                      "h-1 flex-1 rounded-full transition-colors",
                      i <= strength.score ? strengthColors[strength.score] : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs">
                <span className={clsx(
                  strength.score <= 1 ? 'text-red-500' :
                  strength.score === 2 ? 'text-yellow-500' : 'text-green-500'
                )}>
                  {strength.label}
                </span>
              </div>
              {strength.suggestions.length > 0 && (
                <ul className="mt-2 text-xs text-gray-500 space-y-1">
                  {strength.suggestions.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {/* Confirm Password (encrypt only) */}
          {mode === 'encrypt' && (
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm your password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password || (mode === 'encrypt' && !confirmPassword)}
              className={clsx(
                "px-4 py-2 text-sm text-white rounded-lg flex items-center gap-2",
                mode === 'encrypt' 
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-green-500 hover:bg-green-600",
                (loading || !password) && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Processing...
                </>
              ) : mode === 'encrypt' ? (
                <>
                  <Lock size={16} />
                  Encrypt
                </>
              ) : (
                <>
                  <Unlock size={16} />
                  Decrypt
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Auto-lock manager for encrypted notes
interface AutoLockProviderProps {
  children: React.ReactNode;
  inactivityTimeout?: number; // in milliseconds
}

export const AutoLockProvider: React.FC<AutoLockProviderProps> = ({ 
  children, 
  inactivityTimeout = 5 * 60 * 1000 // 5 minutes default
}) => {
  const [lockedNotes, setLockedNotes] = useState<Set<string>>(new Set());
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  // Track user activity
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());
    
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));
    
    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, []);
  
  // Auto-lock check
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > inactivityTimeout) {
        // Dispatch event to lock all encrypted notes
        window.dispatchEvent(new CustomEvent('auto-lock-notes'));
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [lastActivity, inactivityTimeout]);
  
  return <>{children}</>;
};

// Encrypted note indicator badge
export const EncryptedBadge: React.FC<{ isLocked?: boolean }> = ({ isLocked = true }) => {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded",
      isLocked 
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    )}>
      {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
      {isLocked ? 'Encrypted' : 'Unlocked'}
    </span>
  );
};
