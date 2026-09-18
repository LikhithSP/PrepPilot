import React, { useState } from 'react';
import { getGroqApiKey, setGroqApiKey } from '../services/groq';
import { getGeminiApiKey, setGeminiApiKey } from '../services/gemini';
import { isSupabaseConfigured } from '../services/supabase';
import { X, Shield, Check, AlertCircle, Sun, Moon, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [groqKey, setGroqKey] = useState(getGroqApiKey());
  const [geminiKey, setGeminiKey] = useState(getGeminiApiKey());
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGroqApiKey(groqKey);
    setGeminiApiKey(geminiKey);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-theme-surface rounded-2xl shadow-2xl border border-theme animate-scale-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-theme-surface-alt/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-theme-primary-light rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-theme-primary-color" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-theme-primary">AI & System Settings</h3>
              <p className="text-xs text-theme-tertiary">Configure LLM keys and preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-tertiary hover:text-theme-primary hover:bg-theme-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Theme Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-theme-secondary">
              Appearance
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  theme === 'light'
                    ? 'bg-theme-primary-light border-theme-primary text-theme-primary-color font-medium'
                    : 'bg-theme-surface border-theme text-theme-secondary hover:border-theme-hover'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-sm">Light</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-theme-primary-light border-theme-primary text-theme-primary-color font-medium'
                    : 'bg-theme-surface border-theme text-theme-secondary hover:border-theme-hover'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span className="text-sm">Dark</span>
              </button>
            </div>
          </div>

          {/* Groq API Key (Primary) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-theme-secondary">
                Groq API Key (Recommended / Primary)
              </label>
              <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Ultra Fast
              </span>
            </div>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="input-field"
            />
            <p className="text-[11px] text-theme-tertiary">
              Powers voice mock questions, live conversational turns, and deep smart evaluations.
            </p>
          </div>

          {/* Gemini API Key (Fallback) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-theme-secondary">
              Gemini API Key (Optional Fallback)
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="input-field"
            />
          </div>

          {/* Supabase Status */}
          <div className="p-3.5 rounded-xl bg-theme-surface-alt border border-theme space-y-1.5">
            <span className="block text-[11px] font-bold text-theme-tertiary uppercase tracking-wider">
              Data Storage Engine
            </span>
            {isSupabaseConfigured ? (
              <div className="flex items-center gap-2 text-theme-success text-xs font-medium">
                <Check className="w-4 h-4" />
                <span>Supabase Cloud Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-theme-secondary text-xs">
                <AlertCircle className="w-4 h-4 text-theme-warning" />
                <span>Local Session Database Active (Zero setup required)</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-theme">
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
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
