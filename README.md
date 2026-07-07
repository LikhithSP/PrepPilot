# AI Interview Preparation Assistant

An intelligent mock interview platform that analyzes your resume, generates role-specific questions, evaluates your answers in real time, and delivers a detailed performance report — all powered by Google Gemini AI.

![React](https://img.shields.io/badge/React-19.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-~6.0-blue)
![Vite](https://img.shields.io/badge/Vite-8.1-646cff)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-Client-green)

---

## Features

- **Resume Parsing** — Upload a PDF or paste resume text. Gemini AI extracts skills, target role, experience level, and improvement areas.
- **Smart Question Generation** — Creates a balanced mix of:
  - Tool/technology-specific questions based on your actual skills
  - Technical and role-specific questions
  - HR/behavioral questions in an Indian interview context
- **Mock Interview Mode** — Answer questions via typing or speech (Web Speech API). Includes text-to-speech for questions.
- **AI Evaluation** — Each answer is scored and reviewed with strengths, weaknesses, and a recommended model answer.
- **Final Report** — Comprehensive breakdown with an overall score, interviewer summary, and actionable tips.
- **Dark / Light Mode** — Toggle between themes; preference is saved locally.
- **Local Persistence** — Works out of the box with browser `localStorage`. Optionally connect Supabase for backend persistence.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19.2 + TypeScript 6 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| AI Engine | Google Gemini (`gemini-2.5-flash`) |
| Database | Supabase JS Client (optional) |
| Icons | Lucide React |
| PDF Parsing | PDF.js (client-side) |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ai-interview-preparation-assistant

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview production build locally |

---

## Configuration

### Gemini API Key

The app requires a Gemini API key. Set it via:

1. Open **Settings** in the app and enter your key, OR
2. Create a `.env` file:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Supabase (Optional)

For backend persistence instead of `localStorage`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If these are not set, the app automatically falls back to `localStorage`.

> **Note:** `.env` is git-ignored. Never commit secrets to version control.

---

## Project Structure

```
src/
  components/
    App.tsx              # Root layout, routing, theme toggle
    Dashboard.tsx        # Resume upload, profile overview, interview setup
    MockInterview.tsx    # Live interview with question/answer flow
    Evaluation.tsx       # Final report with breakdown accordion
    SettingsModal.tsx    # API key, theme, and Supabase config
  services/
    gemini.ts            # Gemini AI prompts and response parsing
    supabase.ts          # Supabase client + localStorage fallback DB
  utils/
    pdfParser.ts         # Client-side PDF text extraction via PDF.js
  index.css             # Global theme, components, animations
  App.css               # Reset styles
```

---

## How It Works

1. **Upload Resume** — User uploads a PDF or pastes resume text.
2. **Parse Profile** — Gemini AI extracts skills, role, experience, and focus areas.
3. **Setup Interview** — User selects role, experience level, and number of questions.
4. **Generate Questions** — AI creates a balanced question set tailored to the resume.
5. **Take Interview** — User answers questions with text or speech.
6. **Evaluate Answers** — Each answer is scored instantly with constructive feedback.
7. **Final Report** — After the last question, a comprehensive report is generated.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | No* | Google Gemini API key. Can also be set in Settings. |
| `VITE_SUPABASE_URL` | No | Supabase project URL for backend persistence. |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anonymous/public anon key. |

*Required for AI features unless provided in Settings.

---

## Browser Support

- Chrome / Edge (recommended for speech recognition)
- Firefox
- Safari

Speech recognition relies on the Web Speech API and works best in Chromium-based browsers.

---

## Contributing

Contributions are welcome. Please follow these steps:

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make changes and run lint
npm run lint

# Run build to verify
npm run build

# Commit and push
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

---

## License

MIT

---

## Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) for powering the interview engine
- [Supabase](https://supabase.com/) for database and auth infrastructure
- [Lucide](https://lucide.dev/) for the icon set
- [Tailwind CSS](https://tailwindcss.com/) for the design system
