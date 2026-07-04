import React, { useState } from 'react';
import { getGeminiApiKey, setGeminiApiKey } from '../services/gemini';
import { isSupabaseConfigured } from '../services/supabase';
import { X, Shield, Check, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md overflow-hidden glass rounded-2xl shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xl font-bold text-slate-50">Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Gemini API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
            <p className="text-xs text-slate-400">
              Your API key is stored locally in your browser and is never sent to any third-party servers.
            </p>
          </div>

          {/* Supabase Status */}
          <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 space-y-2">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Supabase Status
            </span>
            {isSupabaseConfigured ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Check className="w-4 h-4" />
                <span>Connected securely via Environment Variables</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Not Configured (Using Demo/Local Mode)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Data will be saved in browser `localStorage`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable backend persistence.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saved}
              className="flex items-center justify-center gap-2 min-w-28 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-indigo-500/10 transition-all duration-200"
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
