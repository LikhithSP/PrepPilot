# PrepPilot — AI Interview Assistant

<p align="center">
  <img src="preview%201.png" alt="PrepPilot Dashboard Overview" />
  <img src="preview%202.png" alt="PrepPilot Live Mock Interview Room" />
</p>

An ultra-fast, intelligent mock interview and voice assessment platform designed to simulate authentic engineering rounds. It conducts deep resume parsing, hosts interactive voice interviews with real-time speech-to-text, provides hints upon hesitation, and compiles comprehensive hiring committee evaluation dossiers — powered by Groq LPU high-speed inference.

![React](https://img.shields.io/badge/React-19.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-~6.0-blue)
![Vite](https://img.shields.io/badge/Vite-8.1-646cff)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![Groq](https://img.shields.io/badge/Groq-Llama%203.3%2070B-orange)
![Supabase](https://img.shields.io/badge/Supabase-Client-green)

---

## ✨ Key Features

### 1. 🎙️ Phone-Call Style Voice Interview Room
- **Continuous Duplex Experience**: The interviewer and candidate communicate naturally as if in a live phone call.
- **Automatic Microphone Activation**: The candidate's microphone automatically activates upon entering the call and immediately turns back on when the AI finishes speaking.
- **Natural Silence & Hesitation Cadence**: A calibrated 2.4s pause threshold lets candidates collect their thoughts without premature interruptions, with gentle hints provided if stuck for >14s.
- **Real-Time Speech Normalization & Domain Dictionary**: Resolves common phonetic mistranscriptions for tech terms:
  - `rock` / `grok` $\rightarrow$ **`Groq`**
  - `rag us` / `ragas` $\rightarrow$ **`RAGAS`**, `rag` $\rightarrow$ **`RAG`**
  - `quadrant` $\rightarrow$ **`Qdrant`**
  - `pine cone` $\rightarrow$ **`Pinecone`**
  - `lang chain` $\rightarrow$ **`LangChain`**, `lang graph` $\rightarrow$ **`LangGraph`**
  - `fast api` $\rightarrow$ **`FastAPI`**, `next js` $\rightarrow$ **`Next.js`**, `react js` $\rightarrow$ **`React`**
  - `super base` $\rightarrow$ **`Supabase`**, `post gres` $\rightarrow$ **`PostgreSQL`**
  - `k8s` $\rightarrow$ **`Kubernetes`**, `ast` $\rightarrow$ **`AST`**, `dsa` $\rightarrow$ **`DSA`**, etc.
- **Animated Interviewer Avatar**: Lifelike person avatar with natural eye-blinking and subtle mouth-speaking animations during spoken questions.

### 2. 📄 Deep Resume Intelligence & Critique
- **Granular Parsing**: AST and structural resume extraction of verified skills, target roles, project architectures, past employment achievements, and honors.
- **Hiring Committee Flaw Screener**: Pinpoints resume anti-patterns (e.g. missing quantifiable impact metrics, passive phrasing, dense skill lists) with actionable before-and-after elevation tips.

### 3. 🎯 Specialized Interview Assessment Rounds
- **Technical Round**: In-depth probing on DSA, system architecture scalability, runtime complexity, and tech stack internals.
- **Managerial Round**: Evaluates technical trade-offs, engineering leadership, project ownership, and resolving cross-functional friction.
- **HR & Cultural Round**: Behavioral STAR methodology, company values alignment, and career vision.
- **Group Discussion (GD) Round**: Continuous 5-minute uninterrupted spoken delivery on contemporary topics covering Introduction, For, Against, and Conclusion.

### 4. 📊 Comprehensive Hiring Dossiers
- **Dynamic 4-Criteria Scorecards**: Granular performance breakdown tailored to the specific round type.
- **Executive Summary Memo**: Lead hiring committee review memo outlining overall hire recommendation, strengths, and areas for improvement.
- **Question-by-Question Benchmark**: Full audit of candidate transcript responses scored against model benchmark answers.
- **Export to Dossier / TXT**: Downloadable hiring dossiers for offline review.

### 5. 🎨 Modern UI & Floating Capsule Navigation
- **Floating Capsule Navbar**: Soft rounded pill navigation bar with active item pill highlights (`#f2f3f3` light background, `#282d35` dark background).
- **Dark & Light Mode Themes**: Tailored HSL surfaces with seamless transitions and local storage persistence.
- **Interactive Illustration Hero**: High-resolution hero banner with clean non-boxed PNG illustration and quick launch triggers.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 19.2 + TypeScript 6 |
| **Bundler & Dev Server** | Vite 8 |
| **Styling & Design System** | Tailwind CSS v4 + Material 3 Tokens |
| **Inference Engine** | Groq LPU (`llama-3.3-70b-versatile`) |
| **Voice & Speech** | Web Speech API (`webkitSpeechRecognition` + `speechSynthesis`) |
| **Database & Cache** | Supabase JS Client + LocalStorage fallback |
| **Icons** | Lucide React |
| **PDF Extraction** | Client-side PDF.js worker |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 18
- **npm** >= 9
- A free **Groq API Key** ([Get one at console.groq.com](https://console.groq.com/keys))

### Installation

```bash
# Clone the repository
git clone https://github.com/LikhithSP/AI-Interview-Preparation-Assistant.git
cd AI-Interview-Preparation-Assistant

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts local dev server at `http://localhost:5173` |
| `npm run build` | Runs TypeScript compilation (`tsc -b`) and Vite production bundle |
| `npm run lint` | Runs linter |
| `npm run preview` | Previews production build locally |

---

## ⚙️ Configuration & Environment Variables

The app functions completely offline with `localStorage` and requires only your Groq API key:

### Groq API Key Setup
1. Enter your key in the in-app **Settings modal** (top right gear icon), OR
2. Create a `.env` file in the project root:

```env
VITE_GROQ_API_KEY=gsk_your_groq_api_key_here
```

### Supabase Backend (Optional)
If you wish to synchronize records to cloud Supabase rather than local storage:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📁 Project Architecture

```
src/
├── assets/
│   └── interview-illustration.png   # Hero banner illustration
├── components/
│   ├── App.tsx                      # Top bar, theme switch, view router
│   ├── Dashboard.tsx                # Capsule navbar, hero, resume critique, dossier history
│   ├── MockInterview.tsx            # Full-duplex voice call, animated avatar, STT normalizer
│   ├── InterviewSetupModal.tsx      # 3-step round configuration & resume ingestion
│   ├── Evaluation.tsx               # Hiring committee scorecard, feedback memo, model answers
│   └── SettingsModal.tsx            # API key & preferences modal
├── services/
│   ├── groq.ts                      # Groq LPU prompts (resume parser, conversational turn, reports)
│   └── supabase.ts                  # Hybrid Supabase / LocalStorage database provider
├── utils/
│   └── pdfParser.ts                 # Dynamic PDF text parser
├── index.css                        # Design tokens, Google Sans typography, avatar keyframes
└── main.tsx                         # React entry point
```

---

## 🌐 Browser Compatibility

- **Chrome / Microsoft Edge (Recommended)**: Optimal support for full-duplex SpeechRecognition and Synthesis.
- **Safari / Firefox**: Fallback manual typing and native audio synthesis supported.

---

## 📄 License

Distributed under the MIT License.
