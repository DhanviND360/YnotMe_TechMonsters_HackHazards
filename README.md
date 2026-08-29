<div align="center">

<br/>

# 🧠 YnotMe

### *Your invisible AI dating coach — live, in your ear, on every date.*

<br/>
https://drive.google.com/file/d/1IuJDe44cfJvxFMdLVakaItpdeEgQb5C_/view?usp=drivesdk
[![Built at HackHazards '26](https://img.shields.io/badge/HackHazards%20'26-Finalist-a855f7?style=for-the-badge&logo=rocket&logoColor=white)](https://hackhazards.dev)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-0ea5e9?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![Sarvam AI](https://img.shields.io/badge/Powered%20by-Sarvam%20AI-7c3aed?style=for-the-badge)](https://sarvam.ai)
[![Neo4j](https://img.shields.io/badge/Memory-Neo4j%20Graph-4ade80?style=for-the-badge&logo=neo4j&logoColor=white)](https://neo4j.com)

<br/>

> **"What if you had a brilliant friend whispering the perfect thing to say — in real time?"**

<br/>

---

</div>

## ✨ What is YnotMe?

YnotMe is a **real-time AI conversation coach** that silently listens to your date, transcribes the conversation live, and feeds you context-aware suggestions — all invisibly, through your phone.

No more awkward silences. No more missed moments. No more generic pick-up lines.

Just **the right thing to say, at the right moment.**

<br/>

---

## 🎯 The Problem We're Solving

Most people on dates are in their heads:

- *"Should I ask about her job again?"*
- *"Wait, didn't she mention something about Italy earlier?"*
- *"I just said something dumb — how do I recover?"*

Dating apps got you the date. **YnotMe helps you keep it.**

<br/>

---

## 🚀 How It Works

```
You on a date → YnotMe listens → AI coaches you → You shine ✨
```

Here's the full flow in detail:

### 1. 🎙️ Start a Live Session
Tap **Start Date** on the home screen. YnotMe creates a private session and begins listening through your phone's microphone — discreetly tucked away in your pocket or face-down on the table.

### 2. 🔊 Audio Capture (8-Second Rolling Chunks)
Every **~8 seconds**, YnotMe captures an audio chunk and sends it to the backend. This rolling-chunk approach keeps latency low and the coaching *live* — not retrospective.

### 3. 🧠 AI Transcription & Reasoning (Sarvam AI)
Each chunk goes through two AI steps:

| Step | Model | What it does |
|------|-------|--------------|
| **Speech-to-Text** | `Saaras v3` | Transcribes the raw audio, language-auto-detected |
| **Conversation Reasoning** | `Sarvam-30B` | Separates speakers, extracts facts, generates suggestions |

The AI identifies **who said what** — splitting "user" (you) from "date" (them) — even from a single mixed audio chunk.

### 4. 💡 Live Suggestions Appear
Instantly, a suggestion card appears at the bottom of your screen:

```
✨ Explore travel stories
   "Ask what her favorite memory from that trip was.
    Travel is one of the best connection topics."
```

Suggestions are typed by **intent**:
- `follow_up` — dig deeper into what she just said
- `empathy` — show you're genuinely listening  
- `pivot` — steer the conversation naturally
- `save` — recover from an awkward moment

### 5. 🗺️ Knowledge Graph Built in Real Time
Every fact the AI extracts — *"She likes botanical gins"*, *"She has family in Maine"* — is stored as a **knowledge graph** in Neo4j:

```
(Her) --[LIKES]--> (Botanical Gins)
(Her) --[HAS FAMILY IN]--> (Maine)
(Her) --[VISITED]--> (Distillery Tasting)
```

This builds a memory of the person that persists across time.

### 6. 📊 Post-Date Intelligence
After the date ends, YnotMe generates a full debrief:

- **Conversation Score** — overall quality rating
- **Memory Graph** — visual graph of everything you learned
- **Flashcards** — tap-to-flip memory cards to remember her details
- **Blunders vs Best Moves** — what you could've said better
- **Improvement Tips** — personalized coaching for next time

<br/>

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    YnotMe Mobile App                      │
│              (React Native + Expo SDK 54)                 │
│                                                           │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  Live Session│  │   Home Screen  │  │ Date Detail  │  │
│  │  Screen      │  │   + History    │  │ + Analysis   │  │
│  │              │  │                │  │              │  │
│  │ • Audio rec  │  │ • Session list │  │ • Scores     │  │
│  │ • Live coach │  │ • Demo mode    │  │ • Graph viz  │  │
│  │ • Transcript │  │ • Auth gate    │  │ • Flashcards │  │
│  └──────┬───────┘  └────────────────┘  └──────────────┘  │
│         │ HTTP/multipart (8s chunks)                       │
└─────────┼────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│                    Express Backend                        │
│                   (TypeScript / Node)                     │
│                                                           │
│  POST /api/sessions/:id/audio                            │
│       ↓                                                   │
│  [1] Sarvam STT → transcript text                        │
│  [2] Sarvam-30B → facts + suggestions + speaker split    │
│  [3] Return coaching data to app (< 2s)                  │
│  [4] Write facts to Neo4j (async, non-blocking)          │
│  [5] Persist session artifact to Supabase (on end)       │
└──────────────────────────────────────────────────────────┘
          │                    │                  │
          ▼                    ▼                  ▼
   ┌─────────────┐   ┌──────────────┐   ┌────────────────┐
   │  Sarvam AI  │   │    Neo4j     │   │   Supabase     │
   │  (STT + LLM)│   │ Knowledge    │   │ Auth + Storage │
   │             │   │   Graph      │   │                │
   └─────────────┘   └──────────────┘   └────────────────┘
```

<br/>

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mobile** | React Native + Expo SDK 54 | Cross-platform app (Android focus) |
| **Audio** | `expo-audio` | Microphone capture, streaming chunks |
| **Navigation** | React Navigation v6 | Stack + Tab navigation |
| **Animations** | `react-native-reanimated` + `Animated` | Waveform, pulse, transitions |
| **Backend** | Express + TypeScript | REST API, audio ingestion |
| **AI/STT** | Sarvam AI (Saaras v3) | Multilingual speech-to-text |
| **AI/LLM** | Sarvam-30B | Reasoning, fact extraction, suggestions |
| **Graph DB** | Neo4j | Persistent memory knowledge graph |
| **Auth + Storage** | Supabase | User auth, session artifact storage |
| **Build** | EAS Build | Cloud APK generation |

<br/>

---

## 📱 Screens

### 🏠 Home Screen
- Start a real or **demo** date session
- See your session history
- Quick stats at a glance

### 🎙️ Live Session Screen
- Animated waveform visualizer (active while listening)
- Live conversation transcript with speaker labels ("You" / "Her" / "AI")
- AI suggestion card pinned to the bottom — always visible
- **Key Moments** tab shows extracted facts in real time
- Session timer

### 📋 Date Detail Screen
Four tabs of post-date intelligence:

| Tab | Content |
|-----|---------|
| **Overview** | Summary + key takeaways |
| **Flashcards** | Memory Graph visualization + flip cards |
| **Transcript** | Full conversation replay |
| **Analysis** | Scores, blunders vs best moves, tips |

### 🔐 Auth Screen
- Supabase-powered sign in/sign up
- Secure JWT token flow

<br/>

---

## 🧬 The AI Brain

The heart of YnotMe is the `reasonAboutConversation` function in the backend. For every 8-second audio chunk, it:

1. **Cleans the transcript** — strips filler words (um, uh, like, you know)
2. **Identifies speakers** — figures out who said what from conversational flow
3. **Extracts facts** as semantic triples:
   ```json
   { "subject": "Her", "relation": "Likes", "object": "botanical gins", "confidence": 0.94 }
   ```
4. **Generates suggestions** with intent-aware coaching:
   ```json
   { "title": "Explore unique experiences", "detail": "Ask about the distillery tasting...", "intent": "follow_up" }
   ```
5. **Builds flashcards** — memory cues for things she shared
6. **Writes facts to Neo4j** — async, non-blocking, so the API response stays fast

<br/>

---

## ⚡ Getting Started

### Prerequisites
- Node.js 18+
- Expo Go app (for development) or Android device (for APK)
- API keys: Sarvam AI, Neo4j Aura, Supabase

### 1. Clone & Install

```bash
git clone https://github.com/DhanviND360/YnotMe_TechMonsters_HackHazards.git
cd hackhazards26_YnotMe_v2

# Install frontend deps
npm install

# Install backend deps
npm --prefix backend install
```

### 2. Configure Environment

Create `backend/.env`:
```env
PORT=8080
SARVAM_API_KEY=your_sarvam_key
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=ynotme-sessions
```

Create `.env` (root):
```env
# For local dev, auto-detected. For production:
EXPO_PUBLIC_API_BASE_URL=https://your-backend.onrender.com/api
```

### 3. Run in Development

```bash
# Terminal 1 — Start backend
npm run backend:dev

# Terminal 2 — Start Expo
npm start
```

Scan the QR code with Expo Go or press `a` to open on Android emulator.

### 4. Try Demo Mode

No backend? No problem. On the Home screen, tap **Try Demo** to see a simulated live session with pre-scripted conversation flow and AI suggestions — fully offline.

<br/>

---

## 📦 Build & Deploy

### Backend — Deploy to Render

1. Push to GitHub
2. New Web Service on [render.com](https://render.com)
3. Root Directory: `backend` | Build: `npm install && npm run build` | Start: `npm start`
4. Add all environment variables
5. Get your URL: `https://ynotme-backend-xxxx.onrender.com`

### APK — Build with EAS

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Download & share your APK from [expo.dev](https://expo.dev/accounts/dhanvi_n13/projects/ynotme/builds).

<br/>

---

## 🔒 Privacy

YnotMe processes audio **in 8-second chunks only** — no continuous recording is stored. Audio buffers are processed in memory and immediately discarded after transcription. Session transcripts are stored in Supabase under your user account and are private to you.

<br/>

---

## 🏆 Built for HackHazards '26

**Team TechMonsters** — built in 36 hours.

> *"Y not me?"* — because with the right coach, the answer is always: **you.**

<br/>

---

<div align="center">

Made with 💜 by TechMonsters | HackHazards '26

</div>
