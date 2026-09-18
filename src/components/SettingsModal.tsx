import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getGroqApiKey, setGroqApiKey } from '../services/groq';
import { isSupabaseConfigured } from '../services/supabase';
import { X, Shield, Check, AlertCircle, Sun, Moon, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [groqKey, setGroqKey] = useState(getGroqApiKey());
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGroqApiKey(groqKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-google">
      <div className="google-card w-full max-w-md shadow-xl animate-scale-up overflow-hidden bg-theme-surface">
        {/* Google Dialog Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-theme-surface-alt/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-google-blue">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-theme-primary">Google Workspace Settings</h3>
              <p className="text-xs text-theme-tertiary">Configure API connection and theme</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-tertiary hover:text-theme-primary hover:bg-theme-surface-hover rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialog Form Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-theme-tertiary block">
              Theme Display
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'btn-google-primary'
                    : 'btn-google-outlined'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'btn-google-primary'
                    : 'btn-google-outlined'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Groq Engine Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-theme-tertiary flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-google-blue" />
                <span>Groq API Key (Inference Engine)</span>
              </label>
              <span className="text-[10px] font-medium text-google-green bg-green-50 dark:bg-green-950/50 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                LPU Connected
              </span>
            </div>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full p-2.5 bg-theme-surface border border-theme rounded-xl text-xs font-mono text-theme-primary focus:outline-none focus:border-google-blue"
            />
            <p className="text-[11px] text-theme-tertiary">
              Powers voice turns, question generation, and candidate evaluations.
            </p>
          </div>

          {/* Storage status */}
          <div className="p-3.5 rounded-xl bg-theme-surface-alt/70 border border-theme space-y-1">
            <span className="text-[10px] font-medium text-theme-tertiary uppercase block">
              Workspace Database
            </span>
            {isSupabaseConfigured ? (
              <div className="flex items-center gap-2 text-google-green text-xs font-medium">
                <Check className="w-4 h-4" />
                <span>Supabase Cloud Synchronized</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-theme-secondary text-xs">
                <AlertCircle className="w-4 h-4 text-google-yellow" />
                <span>Local Session Cache Active</span>
              </div>
            )}
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme">
            <button
              type="button"
              onClick={onClose}
              className="btn-google-outlined text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saved}
              className="btn-google-primary text-xs py-2 px-5"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
