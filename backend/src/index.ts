import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import { config } from "./config.js";
import { analyzeDate, createTranscriptTurn, reasonAboutConversation, transcribeAudio } from "./sarvam.js";
import { createSession, endSession, getSession, listSessions, saveSession } from "./sessionStore.js";
import { persistSessionArtifact, resolveUserId } from "./supabase.js";
import { writeFacts } from "./neo4j.js";
import type { GraphFact } from "./types.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

app.use(helmet());
app.use(cors({ origin: config.appOrigin === "*" ? true : config.appOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ynotme-backend" });
});

app.post("/api/sessions", async (req, res, next) => {
  try {
    const userId = await resolveUserId(req.header("authorization"));
    const session = createSession(userId);
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

app.get("/api/sessions", async (req, res, next) => {
  try {
    const userId = await resolveUserId(req.header("authorization"));
    res.json({ sessions: listSessions(userId) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/sessions/:id", async (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({ session });
});

app.post("/api/sessions/:id/audio", upload.single("audio"), async (req, res, next) => {
  try {
    const session = getSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!req.file) return res.status(400).json({ error: "Audio file is required" });

    const text = await transcribeAudio(req.file.buffer, req.file.mimetype);
    const reasoning = await reasonAboutConversation(session.transcript, text);

    if (reasoning.newTurns && reasoning.newTurns.length > 0) {
      session.transcript.push(...reasoning.newTurns);
    } else {
      const fallback = createTranscriptTurn(text, "date");
      session.transcript.push(fallback);
      reasoning.newTurns = [fallback];
    }

    session.facts = mergeFacts(session.facts, reasoning.facts);
    session.suggestions = reasoning.suggestions;
    session.summary = reasoning.summary;
    session.flashcards = reasoning.flashcards;

    saveSession(session);
    
    // Write facts to Neo4j in the background so slow DB queries do not block API response
    writeFacts(session, reasoning.facts).catch((error) => {
      console.error("[Neo4j Error] Failed to write facts asynchronously:", error);
    });

    res.json({
      session,
      newTurns: reasoning.newTurns,
      suggestions: session.suggestions,
      facts: reasoning.facts
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/sessions/:id/end", async (req, res, next) => {
  try {
    const session = getSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const reasoning = await reasonAboutConversation(session.transcript);
    const analysis = await analyzeDate(session.transcript, session.facts);
    session.facts = mergeFacts(session.facts, reasoning.facts);
    session.flashcards = reasoning.flashcards.length ? reasoning.flashcards : session.flashcards;
    const ended = endSession(session, analysis, reasoning.summary);

    // Save facts and artifacts in background to keep session-end endpoint fast and resilient
    writeFacts(ended, ended.facts).catch((error) => {
      console.error("[Neo4j Error] Failed to write facts during session end:", error);
    });
    persistSessionArtifact(ended).catch((error) => {
      console.error("[Supabase Error] Failed to persist session artifact:", error);
    });

    res.json({ session: ended, analysis });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  console.error("[ERROR]", message);
  res.status(500).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`YnotMe API listening on ${config.port}`);
});

function mergeFacts(existing: GraphFact[], incoming: GraphFact[]) {
  const map = new Map(existing.map((f) => [`${f.subject}:${f.relation}:${f.object}`, f]));
  for (const f of incoming) {
    map.set(`${f.subject}:${f.relation}:${f.object}`, f);
  }
  return [...map.values()];
}
