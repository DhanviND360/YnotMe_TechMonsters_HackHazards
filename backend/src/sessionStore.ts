import { randomUUID } from "node:crypto";
import { DateAnalysis, DateSession } from "./types.js";

const sessions = new Map<string, DateSession>();

export function createSession(userId: string) {
  const session: DateSession = {
    id: randomUUID(),
    userId,
    title: "Live date",
    status: "live",
    createdAt: new Date().toISOString(),
    summary: "Conversation in progress.",
    transcript: [],
    suggestions: [],
    facts: [],
    flashcards: []
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string) {
  return sessions.get(id);
}

export function listSessions(userId: string) {
  return [...sessions.values()]
    .filter((s) => s.userId === userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function saveSession(session: DateSession) {
  sessions.set(session.id, session);
  return session;
}

export function endSession(session: DateSession, analysis: DateAnalysis, summary: string) {
  session.status = "ended";
  session.analysis = analysis;
  session.summary = summary;
  session.title = summary.split(".")[0]?.trim().slice(0, 42) || "Completed date";
  sessions.set(session.id, session);
  return session;
}
