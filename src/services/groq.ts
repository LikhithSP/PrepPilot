import type {
  Profile,
  InterviewQuestion,
  InterviewStyle,
  DepthLevel,
  ProjectItem,
  FocusAreaItem,
  ConversationTurn,
  ExperienceItem,
  AchievementItem,
  RoundCriteriaScore,
  ResumeMistakeItem,
} from './supabase';

export const getGroqApiKey = (): string => {
  const localKey = localStorage.getItem('groq_api_key');
  if (localKey) return localKey;
  return (import.meta.env.VITE_GROQ_API_KEY as string) || '';
};

export const setGroqApiKey = (key: string): void => {
  if (key.trim()) {
    localStorage.setItem('groq_api_key', key.trim());
  } else {
    localStorage.removeItem('groq_api_key');
  }
};

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const GROQ_PRIMARY_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'groq/compound',
  'groq/compound-mini',
];

// Helper to call Groq Cloud OpenAI-compatible Chat Completions with model fallback
async function callGroqChat(
  messages: GroqMessage[],
  jsonMode: boolean = false,
  preferredModel?: string
): Promise<string> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('Groq API Key is missing. Please enter your Groq API key in Settings.');
  }

  const modelsToTry = preferredModel
    ? [preferredModel, ...GROQ_PRIMARY_MODELS.filter((m) => m !== preferredModel)]
    : GROQ_PRIMARY_MODELS;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const payload: any = {
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
      };

      if (jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errJson = await response.json();
          errorDetail = errJson?.error?.message || response.statusText;
        } catch {
          errorDetail = response.statusText;
        }
        throw new Error(`Groq API Error (${response.status}) on ${model}: ${errorDetail}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '';
      if (reply) return reply;
    } catch (err: any) {
      console.warn(`Attempt with Groq model ${model} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to get response from Groq models.');
}

export interface GeneratedQuestionItem {
  question: string;
  depthLevel: DepthLevel;
  category?: 'dsa' | 'project' | 'tech_stack' | 'architecture' | 'behavioral';
}

export const groqService = {
  /**
   * Deep resume parser that extracts:
   * 1. Top skills & technologies
   * 2. Detailed project breakdowns (name, stack, architecture, potential questions)
   * 3. High-priority targeted focus areas & critical gaps (DSA, Tech Stack, Architecture, Project depth)
   */
  deepParseResume: async (
    resumeText: string
  ): Promise<{
    skills: string[];
    experienceLevel: string;
    targetRole: string;
    focusAreas: string[];
    detailedFocusAreas: FocusAreaItem[];
    extractedProjects: ProjectItem[];
    extractedExperience: ExperienceItem[];
    extractedAchievements: AchievementItem[];
    resumeMistakes: ResumeMistakeItem[];
    resumeTips: string[];
  }> => {
    const systemPrompt = `You are an elite Tech Hiring Committee Screener and Principal Staff Engineer at a tier-1 technology company (Google, Meta).
Perform a thorough, deep analysis of the provided resume text.

Scrutinize every line, project, past experience, and skill to extract:
1. Technical and domain skills (distinct technologies, languages, tools, databases).
2. Candidate Experience Level: strictly "Junior" (0-2y), "Mid-Level" (2-5y), "Senior" (5-8y), or "Lead" (8+y).
3. Target Role.
4. Extracted Projects: Every distinct project mentioned. For each:
   - "name": project title
   - "technologies": array of tech used
   - "description": summary of what it does
   - "potentialQuestions": 2 sharp architectural/probing interview questions an interviewer should ask.
5. Extracted Work Experience & Internships: Every past job/internship/role. For each:
   - "company": company / organization name
   - "role": job title
   - "duration": timeframe (e.g. 2023 - 2024)
   - "description": overview of responsibilities
   - "keyContributions": array of specific achievements, metrics, or technical systems built.
6. Extracted Achievements & Accolades: Honors, hackathons, academic awards, publications, certifications, or open-source impact. For each:
   - "title": achievement title
   - "description": brief summary of the accomplishment.
7. High-Priority Focus Areas & Technical Gaps:
   Provide 4 to 6 critical improvement areas. Categorize them into "DSA", "Tech Stack", "Architecture", "Project Gaps", or "Communication".
   Point out exact reasons why the candidate needs improvement in this area and concrete recommended prep.
8. Resume Critique & Mistakes Analysis:
   Analyze flaws, omissions, or anti-patterns in this resume that cause candidate rejections in top-tier tech screening:
   - "resumeMistakes": Array of objects:
     - "issue": clear identification of the mistake (e.g., "Missing quantifiable impact metrics in Project Alpha", "Overly dense skill list without context", "Passive bullet phrasing")
     - "impact": why this hurts the candidate in ATS or recruiter review
     - "suggestion": concrete before/after recommendation to fix it
     - "category": "formatting" | "impact_metrics" | "content" | "technical_depth"
   - "resumeTips": 3 to 5 high-leverage bullet tips to elevate this specific resume to Google hiring standards.

Return ONLY a JSON object matching this schema:
{
  "skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "Redis"],
  "experienceLevel": "Junior | Mid-Level | Senior | Lead",
  "targetRole": "Full Stack Engineer",
  "focusAreas": ["DSA: Binary Trees & Graph traversals", "System Architecture: Caching & Partitioning", "Project Deep Dive: Database indexing in Project X"],
  "detailedFocusAreas": [
    {
      "topic": "Data Structures & Algorithms (Trees, Graphs, DP)",
      "category": "DSA",
      "reason": "Resume mentions strong web dev but lacks evidence of algorithmic optimization or complexity analysis.",
      "recommendedPrep": "Practice medium graph BFS/DFS and dynamic programming patterns on LeetCode."
    }
  ],
  "extractedProjects": [
    {
      "name": "Project Alpha",
      "technologies": ["React", "Node.js", "MongoDB"],
      "description": "Real-time analytics dashboard",
      "potentialQuestions": [
        "How did you manage real-time WebSocket connection state across scaled server instances?",
        "Why did you choose MongoDB over a relational database, and how do you handle schema changes?"
      ]
    }
  ],
  "extractedExperience": [
    {
      "company": "Tech Corp",
      "role": "Software Engineering Intern",
      "duration": "June 2023 - Dec 2023",
      "description": "Engineered microservices and API gateways",
      "keyContributions": ["Reduced latency by 28%", "Implemented JWT auth pipeline"]
    }
  ],
  "extractedAchievements": [
    {
      "title": "Hackathon Winner - Smart India Hackathon",
      "description": "Ranked 1st among 500+ teams building an AI triage pipeline."
    }
  ],
  "resumeMistakes": [
    {
      "issue": "Lack of quantitative business metrics in project bullets",
      "impact": "Recruiters cannot gauge engineering scale or real-world user adoption.",
      "suggestion": "Rewrite bullets using the XYZ formula: 'Accomplished [X], as measured by [Y], by doing [Z]'.",
      "category": "impact_metrics"
    }
  ],
  "resumeTips": [
    "Highlight latency, throughput, or memory optimization numbers in your experience section.",
    "Add direct GitHub repository links for your core full stack projects."
  ]
}`;

    const raw = await callGroqChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Resume Content:\n${resumeText.slice(0, 8000)}` },
      ],
      true
    );

    try {
      const parsed = JSON.parse(raw);
      return {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experienceLevel: parsed.experienceLevel || 'Mid-Level',
        targetRole: parsed.targetRole || 'Software Engineer',
        focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas : [],
        detailedFocusAreas: Array.isArray(parsed.detailedFocusAreas) ? parsed.detailedFocusAreas : [],
        extractedProjects: Array.isArray(parsed.extractedProjects) ? parsed.extractedProjects : [],
        extractedExperience: Array.isArray(parsed.extractedExperience) ? parsed.extractedExperience : [],
        extractedAchievements: Array.isArray(parsed.extractedAchievements) ? parsed.extractedAchievements : [],
        resumeMistakes: Array.isArray(parsed.resumeMistakes) ? parsed.resumeMistakes : [],
        resumeTips: Array.isArray(parsed.resumeTips) ? parsed.resumeTips : [],
      };
    } catch (e) {
      console.error('Failed to parse deep resume JSON:', raw);
      throw new Error('Failed to analyze resume details. Please verify your resume text.');
    }
  },

  /**
   * Generates tailored interview questions with comprehensive syllabus coverage:
   * 1. Data Structures & Algorithms (DSA)
   * 2. Deep Dive into Candidate's Resume Projects
   * 3. Core Tech Stack Internals & Nuances
   * 4. Scalable Architecture & System Design
   */
  generateQuestions: async (
    profile: Profile,
    role: string,
    experienceLevel: string,
    style: InterviewStyle = 'technical',
    count: number = 5
  ): Promise<GeneratedQuestionItem[]> => {
    const projectsList = (profile.extracted_projects || [])
      .map((p) => `- Project: "${p.name}" (Tech: ${p.technologies.join(', ')}) - ${p.description}`)
      .join('\n');

    const experienceList = (profile.extracted_experience || [])
      .map((e) => `- Role at "${e.company}" as "${e.role}" (${e.duration || ''}): ${e.description}. Key contributions: ${e.keyContributions?.join('; ')}`)
      .join('\n');

    const achievementsList = (profile.extracted_achievements || [])
      .map((a) => `- Achievement: "${a.title}" - ${a.description}`)
      .join('\n');

    let roundGuidance = '';
    if (style === 'technical') {
      roundGuidance = `
CRITICAL TECHNICAL ROUND SYLLABUS:
You MUST cover the following pillars across the generated questions:
1. Past Work Experience & Engineering Impact: Probe their actual role/internship experiences from their resume (${experienceList || 'past technical roles'}). Ask about technical challenges faced in production, performance bottlenecks resolved, or team engineering standards.
2. Candidate Resume Projects Deep Dive: Pick a specific project (${projectsList || 'recent full stack projects'}) and drill down into architectural decisions, database choices, error handling, or API design.
3. Candidate Achievements & Technical Accolades: If candidate has notable achievements (${achievementsList || 'awards, hackathons, or standout metrics'}), ask how they tackled that challenge and what technical insight they gained.
4. DSA & Algorithmic Problem Solving: Ask practical coding logic, data structure design, time/space complexity (O(N), trees, graphs, caching, arrays/hashes).
5. Core Tech Stack In-Depth: Pick 2-3 specific technologies from their skills (${profile.skills.slice(0, 6).join(', ')}) and test deep internals (e.g., event loop, memory leaks, indexing, concurrency, DOM diffing).
6. System Architecture & Scalability: Design question or edge-case handling (e.g., rate limiting, caching strategies, horizontal scaling).
`;
    } else if (style === 'gd') {
      roundGuidance = `
GROUP DISCUSSION (GD) ROUND SYLLABUS:
Generate 1 single compelling, contemporary Group Discussion topic commonly asked in modern corporate campus & tech company hiring drives.
Topics can span:
- Artificial Intelligence & Automation: Threat to software jobs or booster of developer productivity?
- Remote Work vs Return to Office: Impact on company innovation and employee well-being.
- Data Privacy vs AI Innovation: Should generative models train on public user data without consent?
- Electric Vehicles & Sustainable Tech: Are green technologies genuinely sustainable today?
- Social Media Algorithms: Freedom of speech vs content moderation and societal polarization.
- Moonlighting in Tech: Ethical violation or legitimate employee freedom?

The question should be formatted clearly as:
"Group Discussion Topic: [Topic Title]. Your Task: In your 5-minute talk, deliver a structured presentation covering: (1) An engaging Introduction defining the core issue, (2) Arguments and examples FOR / supporting the topic, (3) Arguments and counter-examples AGAINST the topic, and (4) A balanced, forward-looking Conclusion."
`;
    } else if (style === 'managerial') {
      roundGuidance = `
MANAGERIAL ROUND SYLLABUS:
You MUST cover:
1. Work Experience & Leadership Impact: Deeply review the candidate's actual work experience (${experienceList || 'past teams and companies'}). Inquire how they handled scope creep, missed deadlines, cross-functional conflicts with designers or product managers, and code review mentoring.
2. Achievements, Recognition & Ownership: Reference candidate achievements (${achievementsList || 'major milestones'}) and ask what drove their success, how they collaborated, and what trade-offs were made.
3. Project Delivery & System Trade-offs: Pick their projects (${projectsList}) and ask how they balanced delivery speed vs technical debt.
`;
    } else {
      roundGuidance = `
HR & CULTURAL ROUND SYLLABUS:
Focus on company culture fit, career aspirations, workplace motivation, overcoming adversity in work experience, and behavioral STAR scenarios.
`;
    }

    const systemPrompt = `You are a Principal Hiring Leader at a top tech company conducting a mock hiring round for "${role}" (${experienceLevel} level).
Round Type: ${style.toUpperCase()} ROUND.

${roundGuidance}

Generate exactly ${count} realistic, conversational questions distributed across depth levels (low, medium, high).
Return ONLY a JSON object matching this schema:
{
  "questions": [
    {
      "question": "Question text here...",
      "depthLevel": "low" | "medium" | "high",
      "category": "dsa" | "project" | "tech_stack" | "architecture" | "behavioral"
    }
  ]
}`;

    const raw = await callGroqChat(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate ${count} ${style} questions for ${role} (${experienceLevel}).
Candidate skills: ${profile.skills.join(', ')}.
Candidate Experience:
${experienceList || 'None specified'}
Candidate Achievements:
${achievementsList || 'None specified'}
Candidate Projects:
${projectsList || 'None specified'}`,
        },
      ],
      true
    );

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.questions)) {
        return parsed.questions.map((q: any) => ({
          question: q.question || String(q),
          depthLevel: (['low', 'medium', 'high'].includes(q.depthLevel) ? q.depthLevel : 'medium') as DepthLevel,
          category: q.category || 'tech_stack',
        }));
      }
      return [];
    } catch (e) {
      console.error('Failed to parse question generation JSON:', raw);
      throw new Error('Failed to generate interview questions.');
    }
  },

  /**
   * Natural Conversational Turn Generator (Real Human Interviewer Experience):
   * Analyzes candidate's live speech or silence.
   * If candidate pauses/struggles -> says "Take your time, no rush! Consider..."
   * If candidate goes off-topic -> provides a gentle, encouraging hint to bring them back.
   * If candidate gives strong answer -> offers a natural 1-sentence acknowledgment and naturally probes deeper into DSA, project architecture, or trade-offs.
   */
  generateConversationalTurn: async (
    conversationHistory: ConversationTurn[],
    candidateSpokenText: string,
    interviewTopic: string,
    role: string,
    interviewStyle: InterviewStyle = 'technical',
    isCandidateHesitating: boolean = false
  ): Promise<{
    spokenResponse: string;
    category: 'encouragement' | 'hint' | 'question' | 'transition';
    suggestedHint?: string;
  }> => {
    const historyText = conversationHistory
      .slice(-6)
      .map((turn) => `${turn.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${turn.text}`)
      .join('\n');

    const systemPrompt = `You are a real, empathetic, yet highly technical Lead Interviewer at a tech company interviewing a candidate for a ${role} position (${interviewStyle} round).
You talk like an authentic human hiring manager—warm, professional, attentive, and natural.

CRITICAL BEHAVIOR GUIDELINES:
1. IF THE CANDIDATE IS HESITATING OR TOOK A PAUSE (isCandidateHesitating is true, or candidate said "uhm", "let me think"):
   - Reassure them naturally: "Take your time, no rush at all!" or "Feel free to talk through your thought process out loud."
   - Give them a small, friendly clue or starting point to get going.

2. IF THE CANDIDATE IS GOING OFF-TOPIC OR WANDERING:
   - Gently guide them back without embarrassing them: "That's an interesting background point! Bringing it back to the core question of how you'd structure [topic], what would your approach be?"

3. IF THE CANDIDATE GAVE AN ANSWER:
   - Acknowledge their point in 1 conversational sentence (e.g. "That makes sense regarding how you separated the services.").
   - Flow naturally into the next question or drill down deeper: "Now, if we scale that to 100,000 concurrent users, what bottlenecks do you foresee?" or "How would you implement the underlying algorithm for that?"

Keep spoken response concise (25-45 words max) so the candidate has room to speak. NEVER sound like a robotic checklist.

Return ONLY a JSON object:
{
  "spokenResponse": "Take your time! If it helps, think about how you'd store the node references in memory.",
  "category": "encouragement | hint | question | transition",
  "suggestedHint": "Optional short hint bullet"
}`;

    const promptMessage = `Recent conversation:
${historyText}

Current Candidate Statement: "${candidateSpokenText || '(Candidate paused or is thinking)'}"
isCandidateHesitating: ${isCandidateHesitating}
Current Topic: ${interviewTopic}

Respond naturally as the human interviewer:`;

    const raw = await callGroqChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptMessage },
      ],
      true,
      'openai/gpt-oss-120b'
    );

    try {
      const parsed = JSON.parse(raw);
      return {
        spokenResponse: parsed.spokenResponse || "Take your time, I'm listening. Walk me through your thoughts.",
        category: parsed.category || 'question',
        suggestedHint: parsed.suggestedHint,
      };
    } catch {
      return {
        spokenResponse: "Take your time, no rush! Whenever you're ready, tell me how you'd approach this.",
        category: 'encouragement',
      };
    }
  },

  /**
   * Evaluates individual candidate responses for a question.
   */
  evaluateAnswer: async (
    question: string,
    answer: string,
    role: string,
    style: InterviewStyle = 'technical',
    depthLevel: DepthLevel = 'medium'
  ): Promise<{
    score: number;
    strengths: string;
    weaknesses: string;
    betterAnswer: string;
  }> => {
    const systemPrompt = `You are a Principal Engineer and hiring committee lead assessing a candidate's answer for a ${role} position during a ${style} interview round (${depthLevel} depth level).

Evaluate on:
1. Technical depth and accuracy (DSA, code mechanics, architectural trade-offs).
2. Structure and clarity of spoken communication.
3. Practical problem-solving and handling edge cases.

Return ONLY a JSON object:
{
  "score": 85,
  "strengths": "Detailed breakdown of the time complexity O(N log N) and practical caching.",
  "weaknesses": "Did not address edge case of network timeouts or deadlock prevention.",
  "betterAnswer": "Exemplary 3-4 sentence response."
}`;

    const raw = await callGroqChat(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Question: "${question}"\nCandidate Answer: "${answer || 'No answer provided'}"`,
        },
      ],
      true
    );

    try {
      const parsed = JSON.parse(raw);
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 75)),
        strengths: parsed.strengths || 'Solid foundational understanding.',
        weaknesses: parsed.weaknesses || 'Could elaborate with deeper architectural trade-offs.',
        betterAnswer: parsed.betterAnswer || 'Recommended model response demonstrating mastery.',
      };
    } catch {
      return {
        score: 75,
        strengths: 'Communicated main points clearly.',
        weaknesses: 'Elaborate on edge cases and complexity analysis.',
        betterAnswer: 'Provide a structured STAR-method or complexity-focused explanation.',
      };
    }
  },

  /**
   * Final Comprehensive Hiring Committee Evaluation Report.
   */
  generateFinalReport: async (
    questions: InterviewQuestion[],
    conversationTurns: ConversationTurn[],
    role: string,
    experienceLevel: string,
    style: InterviewStyle = 'technical'
  ): Promise<{
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    roundCriteria: RoundCriteriaScore[];
    passed: boolean;
    generalFeedback: string;
  }> => {
    let transcript = '';

    if (conversationTurns && conversationTurns.length > 0) {
      transcript = conversationTurns
        .map((t) => `${t.speaker === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
        .join('\n');
    } else {
      transcript = questions
        .map(
          (q, idx) => `
Q${idx + 1} [${q.depth_level || 'medium'}]: ${q.question_text}
Candidate: ${q.user_answer || '(No answer)'}
Score: ${q.score ?? 70}/100
Feedback: ${q.strengths || ''} | ${q.weaknesses || ''}`
        )
        .join('\n');
    }

    let roundCriteriaInstructions = '';
    if (style === 'technical') {
      roundCriteriaInstructions = `
THIS IS A TECHNICAL ROUND EVALUATION ONLY:
Do NOT focus on general HR policies. Your entire evaluation must revolve strictly around TECHNICAL COMPETENCE for ${role}:
Produce 4 specific criteria scores (0-100):
1. "DSA & Algorithmic Problem Solving": Runtime complexity, code design, data structure selection.
2. "Core Tech Stack & Framework Internals": In-depth understanding of candidate's stated libraries/technologies.
3. "System Architecture & Scalability": Scalable patterns, caching, concurrency, database design.
4. "Resume Projects & Practical Experience": Depth of implementation in their past projects and work experience.
`;
    } else if (style === 'gd') {
      roundCriteriaInstructions = `
THIS IS A GROUP DISCUSSION (GD) ROUND EVALUATION ONLY:
The candidate was given a contemporary GD topic and asked to speak for 5 minutes covering:
(1) Introduction defining the problem,
(2) Points FOR the topic with concrete examples,
(3) Points AGAINST the topic with counter-arguments,
(4) A balanced Conclusion.

Evaluate purely based on COMMUNICATION, TOPIC KNOWLEDGE, CRITICAL THINKING, and 5-MINUTE STRUCTURED DELIVERY.
Produce 4 specific criteria scores (0-100):
1. "Communication & Spoken Articulation": Fluency, confidence, vocal clarity, tone, conciseness.
2. "Topic Knowledge & Depth of Content": Understanding of facts, contemporary issues, statistics, and real-world examples.
3. "Analytical Thinking & Bilateral Argumentation": Quality of points FOR and points AGAINST the topic, logical coherence.
4. "Structured 5-Minute Delivery & Conclusion": Completeness of Introduction, Body arguments, time utilization, and crisp Conclusion.
`;
    } else if (style === 'managerial') {
      roundCriteriaInstructions = `
THIS IS A MANAGERIAL ROUND EVALUATION ONLY:
Do NOT focus on coding syntax or syntax questions. Your entire evaluation must revolve strictly around MANAGERIAL & LEADERSHIP COMPETENCE:
Produce 4 specific criteria scores (0-100):
1. "Engineering Ownership & Accountability": Handling delivery, missed deadlines, scope creep.
2. "Cross-Functional Collaboration & Conflict": Resolving disagreements with product managers, QA, or peers.
3. "Technical Trade-offs & Architecture Decision Making": Balancing speed vs technical debt.
4. "Mentorship & Team Impact": Code reviews, elevating team standards, leadership.
`;
    } else {
      roundCriteriaInstructions = `
THIS IS AN HR & CULTURAL ROUND EVALUATION ONLY:
Do NOT focus on deep technical code architecture. Your entire evaluation must revolve strictly around HR & CULTURAL READINESS:
Produce 4 specific criteria scores (0-100):
1. "Cultural Fit & Company Values": Integrity, team spirit, workplace mindset.
2. "Communication Articulation & Professionalism": Clarity, structured expression, active listening.
3. "Career Vision & Motivation": Genuine interest in the company and role, ambition.
4. "Behavioral Adaptability & Stress Handling": STAR scenario responses, overcoming adversity.
`;
    }

    const systemPrompt = `You are the Lead Hiring Director evaluating a student's mock company interview for ${role} (${experienceLevel} level, ${style.toUpperCase()} ROUND).
${roundCriteriaInstructions}

IMPORTANT: The summary, feedback, strengths, and areas for improvement MUST ONLY discuss criteria relevant to this ${style} round.

Return ONLY a JSON object matching this schema:
{
  "overallScore": 84,
  "technicalScore": 86,
  "communicationScore": 80,
  "problemSolvingScore": 85,
  "roundCriteria": [
    {
      "name": "Criteria Name",
      "score": 85,
      "description": "Short 1-sentence assessment of their performance in this specific area."
    }
  ],
  "passed": true,
  "generalFeedback": "${style.toUpperCase()} Round Executive Summary:\\n...\\n\\nKey Strengths in this Round:\\n- ...\\n\\nCritical Areas for Improvement in this Round:\\n- ...\\n\\nTargeted Preparation Tips:\\n- ..."
}`;

    const raw = await callGroqChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Interview Transcript (${style} round):\n${transcript}` },
      ],
      true
    );

    try {
      const parsed = JSON.parse(raw);
      const overall = Math.min(100, Math.max(0, Number(parsed.overallScore) || 75));
      const tech = Math.min(100, Math.max(0, Number(parsed.technicalScore) || overall));
      const comm = Math.min(100, Math.max(0, Number(parsed.communicationScore) || overall));
      const prob = Math.min(100, Math.max(0, Number(parsed.problemSolvingScore) || overall));
      const passed = typeof parsed.passed === 'boolean' ? parsed.passed : overall >= 70;
      const criteria: RoundCriteriaScore[] = Array.isArray(parsed.roundCriteria)
        ? parsed.roundCriteria
        : [];

      return {
        overallScore: overall,
        technicalScore: tech,
        communicationScore: comm,
        problemSolvingScore: prob,
        roundCriteria: criteria,
        passed: passed,
        generalFeedback: parsed.generalFeedback || `${style} round evaluation completed.`,
      };
    } catch {
      return {
        overallScore: 78,
        technicalScore: 80,
        communicationScore: 76,
        problemSolvingScore: 78,
        roundCriteria: [
          { name: 'Core Round Competency', score: 78, description: 'Demonstrated solid understanding of round requirements.' },
          { name: 'Problem Solving & Clarity', score: 80, description: 'Addressed prompts directly with structured reasoning.' }
        ],
        passed: true,
        generalFeedback:
          `Candidate performed well in this ${style} round. Focus on deepening real-world trade-offs in future sessions.`,
      };
    }
  },
};
