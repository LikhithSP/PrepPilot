import { createClient } from '@supabase/supabase-js';

export interface ProjectItem {
  name: string;
  technologies: string[];
  description: string;
  potentialQuestions: string[];
}

export interface FocusAreaItem {
  topic: string;
  category: 'DSA' | 'Tech Stack' | 'Architecture' | 'Project Gaps' | 'Communication';
  reason: string;
  recommendedPrep: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  duration?: string;
  description: string;
  keyContributions: string[];
}

export interface AchievementItem {
  title: string;
  description: string;
}

export interface ResumeMistakeItem {
  issue: string;
  impact: string;
  suggestion: string;
  category: 'formatting' | 'impact_metrics' | 'content' | 'technical_depth';
}

export interface Profile {
  id: string;
  name: string;
  resume_text: string;
  skills: string[];
  target_role: string;
  experience_level: string;
  focus_areas: string[];
  detailed_focus_areas?: FocusAreaItem[];
  extracted_projects?: ProjectItem[];
  extracted_experience?: ExperienceItem[];
  extracted_achievements?: AchievementItem[];
  resume_mistakes?: ResumeMistakeItem[];
  resume_tips?: string[];
  created_at: string;
}

export type InterviewStyle = 'technical' | 'managerial' | 'hr' | 'gd';
export type InterviewMode = 'conversational' | 'structured';
export type DepthLevel = 'low' | 'medium' | 'high';

export interface ConversationTurn {
  id: string;
  speaker: 'ai' | 'candidate';
  text: string;
  category?: 'greeting' | 'question' | 'hint' | 'encouragement' | 'transition' | 'answer';
  timestamp: string;
}

export interface RoundCriteriaScore {
  name: string;
  score: number;
  description: string;
}

export interface Interview {
  id: string;
  profile_id: string;
  role: string;
  experience_level: string;
  interview_style?: InterviewStyle;
  interview_mode?: InterviewMode;
  duration_minutes?: number;
  status: 'in_progress' | 'completed';
  overall_score: number | null;
  technical_score?: number | null;
  communication_score?: number | null;
  problem_solving_score?: number | null;
  round_criteria?: RoundCriteriaScore[];
  passed?: boolean | null;
  general_feedback: string | null;
  conversation_turns?: ConversationTurn[];
  created_at: string;
}

export interface InterviewQuestion {
  id: string;
  interview_id: string;
  question_text: string;
  depth_level?: DepthLevel;
  user_answer: string | null;
  score: number | null;
  strengths: string | null;
  weaknesses: string | null;
  better_answer: string | null;
  created_at: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase keys exist to determine client usage
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// LocalStorage Mock Database Implementation for seamless demo/fallback
class LocalStorageDB {
  private get(key: string): any[] {
    const data = localStorage.getItem(`interview_prep_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private set(key: string, data: any[]): void {
    localStorage.setItem(`interview_prep_${key}`, JSON.stringify(data));
  }

  // Profile operations
  async getProfile(): Promise<Profile | null> {
    const profiles = this.get('profiles');
    return profiles.length > 0 ? profiles[0] : null;
  }

  async saveProfile(profile: Omit<Profile, 'id' | 'created_at'>): Promise<Profile> {
    const existing = await this.getProfile();
    const newProfile: Profile = {
      id: existing?.id || crypto.randomUUID(),
      created_at: existing?.created_at || new Date().toISOString(),
      ...profile,
    };
    this.set('profiles', [newProfile]);
    return newProfile;
  }

  // Interview operations
  async getInterviews(): Promise<Interview[]> {
    return this.get('interviews').sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getInterview(id: string): Promise<Interview | null> {
    const interviews = this.get('interviews');
    return interviews.find((i) => i.id === id) || null;
  }

  async createInterview(interview: Omit<Interview, 'id' | 'created_at' | 'status' | 'overall_score' | 'general_feedback'>): Promise<Interview> {
    const newInterview: Interview = {
      id: crypto.randomUUID(),
      status: 'in_progress',
      overall_score: null,
      general_feedback: null,
      created_at: new Date().toISOString(),
      ...interview,
    };
    const interviews = this.get('interviews');
    interviews.push(newInterview);
    this.set('interviews', interviews);
    return newInterview;
  }

  async updateInterview(id: string, updates: Partial<Interview>): Promise<Interview> {
    const interviews = this.get('interviews');
    const index = interviews.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Interview not found');
    interviews[index] = { ...interviews[index], ...updates };
    this.set('interviews', interviews);
    return interviews[index];
  }

  // Interview Question operations
  async getInterviewQuestions(interviewId: string): Promise<InterviewQuestion[]> {
    const questions = this.get('interview_questions');
    return questions.filter((q) => q.interview_id === interviewId);
  }

  async addInterviewQuestions(questions: Omit<InterviewQuestion, 'id' | 'created_at'>[]): Promise<InterviewQuestion[]> {
    const allQuestions = this.get('interview_questions');
    const newQuestions = questions.map((q) => ({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...q,
    }));
    allQuestions.push(...newQuestions);
    this.set('interview_questions', allQuestions);
    return newQuestions;
  }

  async updateQuestionAnswer(questionId: string, answer: string, feedback: { score: number; strengths: string; weaknesses: string; better_answer: string }): Promise<InterviewQuestion> {
    const questions = this.get('interview_questions');
    const index = questions.findIndex((q) => q.id === questionId);
    if (index === -1) throw new Error('Question not found');
    questions[index] = {
      ...questions[index],
      user_answer: answer,
      ...feedback,
    };
    this.set('interview_questions', questions);
    return questions[index];
  }
}

const localDB = new LocalStorageDB();

// Unified API that routes to Supabase or LocalStorage Fallback
export const db = {
  getProfile: async (): Promise<Profile | null> => {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*').limit(1).maybeSingle();
      if (error) console.error('Supabase profile fetch error, using local fallback:', error);
      else return data;
    }
    return localDB.getProfile();
  },

  saveProfile: async (profile: Omit<Profile, 'id' | 'created_at'>): Promise<Profile> => {
    if (supabase) {
      // Find if profile already exists to update
      const existing = await db.getProfile();
      if (existing) {
        const { data, error } = await supabase
          .from('profiles')
          .update(profile)
          .eq('id', existing.id)
          .select()
          .single();
        if (!error && data) return data;
        console.error('Supabase profile update error, using local:', error);
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .insert([profile])
          .select()
          .single();
        if (!error && data) return data;
        console.error('Supabase profile insert error, using local:', error);
      }
    }
    return localDB.saveProfile(profile);
  },

  getInterviews: async (): Promise<Interview[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
      console.error('Supabase interviews fetch error, using local:', error);
    }
    return localDB.getInterviews();
  },

  getInterview: async (id: string): Promise<Interview | null> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) return data;
      console.error('Supabase interview fetch error, using local:', error);
    }
    return localDB.getInterview(id);
  },

  createInterview: async (interview: Omit<Interview, 'id' | 'created_at' | 'status' | 'overall_score' | 'general_feedback'>): Promise<Interview> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('interviews')
        .insert([{ ...interview, status: 'in_progress' }])
        .select()
        .single();
      if (!error && data) return data;
      console.error('Supabase interview creation error, using local:', error);
    }
    return localDB.createInterview(interview);
  },

  updateInterview: async (id: string, updates: Partial<Interview>): Promise<Interview> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('interviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
      console.error('Supabase interview update error, using local:', error);
    }
    return localDB.updateInterview(id, updates);
  },

  getInterviewQuestions: async (interviewId: string): Promise<InterviewQuestion[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: true });
      if (!error && data) return data;
      console.error('Supabase questions fetch error, using local:', error);
    }
    return localDB.getInterviewQuestions(interviewId);
  },

  addInterviewQuestions: async (questions: Omit<InterviewQuestion, 'id' | 'created_at'>[]): Promise<InterviewQuestion[]> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('interview_questions')
        .insert(questions)
        .select();
      if (!error && data) return data;
      console.error('Supabase questions insert error, using local:', error);
    }
    return localDB.addInterviewQuestions(questions);
  },

  updateQuestionAnswer: async (
    questionId: string,
    answer: string,
    feedback: { score: number; strengths: string; weaknesses: string; better_answer: string }
  ): Promise<InterviewQuestion> => {
    if (supabase) {
      const { data, error } = await supabase
        .from('interview_questions')
        .update({
          user_answer: answer,
          ...feedback,
        })
        .eq('id', questionId)
        .select()
        .single();
      if (!error && data) return data;
      console.error('Supabase question update error, using local:', error);
    }
    return localDB.updateQuestionAnswer(questionId, answer, feedback);
  },
};
