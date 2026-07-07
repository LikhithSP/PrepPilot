import React, { useState } from 'react';
import { getGeminiApiKey, setGeminiApiKey } from '../services/gemini';
import { isSupabaseConfigured } from '../services/supabase';
import { X, Shield, Check, AlertCircle, Sun, Moon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(apiKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-theme-surface rounded-xl shadow-xl border-theme animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-theme">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-theme-primary-light rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-theme-primary-color" />
            </div>
            <h3 className="text-lg font-semibold text-theme-primary">Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-tertiary hover:text-theme-primary hover:bg-theme-surface-hover rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Theme Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-secondary">
              Appearance
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                  theme === 'light'
                    ? 'bg-theme-primary-light border-theme-primary text-theme-primary-color'
                    : 'bg-theme-surface border-theme text-theme-secondary hover:border-theme-hover'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-sm font-medium">Light</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                  theme === 'dark'
                    ? 'bg-theme-primary-light border-theme-primary text-theme-primary-color'
                    : 'bg-theme-surface border-theme text-theme-secondary hover:border-theme-hover'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span className="text-sm font-medium">Dark</span>
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-secondary">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="input-field"
            />
            <p className="text-xs text-theme-tertiary">
              Your API key is stored locally in your browser and is never sent to any third-party servers.
            </p>
          </div>

          {/* Supabase Status */}
          <div className="p-4 rounded-lg bg-theme-surface-alt border-theme space-y-2">
            <span className="block text-xs font-semibold text-theme-tertiary uppercase tracking-wider">
              Supabase Status
            </span>
            {isSupabaseConfigured ? (
              <div className="flex items-center gap-2 text-theme-success text-sm">
                <Check className="w-4 h-4" />
                <span>Connected securely via Environment Variables</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-theme-warning text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Not Configured (Using Demo/Local Mode)</span>
                </div>
                <p className="text-xs text-theme-tertiary">
                  Data will be saved in browser localStorage. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable backend persistence.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-theme">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saved}
              className="btn-primary"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
