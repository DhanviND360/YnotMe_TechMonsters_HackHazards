import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { CoachSuggestion, DateAnalysis, GraphFact, TranscriptTurn } from "./types.js";

type Reasoning = {
  facts: GraphFact[];
  suggestions: CoachSuggestion[];
  summary: string;
  flashcards: Array<{ front: string; back: string }>;
  newTurns?: Array<{ speaker: "user" | "date"; text: string }>;
};

export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<string> {
  if (!config.sarvamApiKey) {
    throw new Error("SARVAM_API_KEY is missing. Add it to backend/.env, then restart the backend.");
  }

  const ext = mimeType.split("/")[1] || "m4a";
  const normalizedMimeType = mimeType || "audio/x-m4a";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: normalizedMimeType }), `conversation.${ext === "x-m4a" ? "m4a" : ext}`);
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  form.append("language_code", "unknown");

  const response = await fetch(config.sarvamSttUrl, {
    method: "POST",
    headers: { "api-subscription-key": config.sarvamApiKey },
    body: form
  });

  if (!response.ok) {
    throw new Error(`Sarvam STT failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const transcript = String(data.transcript ?? data.text ?? data.output ?? "").trim();
  if (!transcript) {
    console.error("Sarvam STT returned an empty transcript. Full response:", JSON.stringify(data, null, 2));
    throw new Error("Sarvam STT returned an empty transcript.");
  }
  return transcript;
}

function cleanTranscript(text: string): string {
  return text
    .replace(/\b(okay so|um+|uh+|hmm+|like,?|you know,?|so,?|well,?|I mean,?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function reasonAboutConversation(
  transcript: TranscriptTurn[],
  newChunkText?: string
): Promise<{
  newTurns: TranscriptTurn[];
  facts: GraphFact[];
  suggestions: CoachSuggestion[];
  summary: string;
  flashcards: Array<{ front: string; back: string }>;
}> {
  if (!config.sarvamApiKey) {
    throw new Error("SARVAM_API_KEY is missing.");
  }

  const meaningfulHistory = transcript.filter((t) => cleanTranscript(t.text).length > 3);
  const historyText = meaningfulHistory.map((turn) => `${turn.speaker}: ${cleanTranscript(turn.text)}`).join("\n");

  let prompt = `You are YnotMe, a subtle live dating conversation coach. Return strict JSON with keys facts, suggestions, summary, flashcards. Facts are triples: subject, relation, object, confidence. Suggestions must be subtle, non-repetitive, and usable during a real conversation. Each suggestion needs id, title, detail, intent (follow_up|empathy|pivot|save).
Be highly responsive: analyze small exchanges, extract facts (likes, travel desires, hobbies) immediately, and provide helpful live suggestions even in a short 2-minute chat. Do not wait for a long conversation.
`;

  if (newChunkText) {
    prompt += `
We have a new raw audio transcription chunk from the date: "${cleanTranscript(newChunkText)}".
This transcription represents recent back-and-forth speech from a live date. Identify who is speaking based on content and flow.
There are two speakers: "user" (the user/man) and "date" (their date/woman).
Split the raw transcription into clean dialog turns. If both spoke, return them as separate turns in chronological order. If only one spoke, return one turn. Assign each turn's speaker as "user" or "date".

Also return a key "newTurns" which is a list of these segmented turns:
"newTurns": [{"speaker": "user" | "date", "text": "..."}]
`;
  }

  prompt += `\n\nPrior conversation history:\n${historyText || "No history yet."}`;

  const response = await fetch(config.sarvamChatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": config.sarvamApiKey
    },
    body: JSON.stringify({
      model: config.sarvamModel,
      messages: [
        { role: "system", content: "You must return only valid JSON. Do not include markdown. Keep your thinking/reasoning extremely short, concise, and focused, so that the JSON output is not cut off by token limits." },
        { role: "user", content: prompt }
      ],
      temperature: 0.35,
      max_tokens: 3072,
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) throw new Error(`Sarvam reasoning failed: ${response.status} ${await response.text()}`);
  const data = (await response.json()) as Record<string, any>;

  const raw =
    data.choices?.[0]?.message?.content ??
    data.response ??
    data.result ??
    data.output ??
    data.content ??
    data.text;

  const fallbackResult = {
    newTurns: newChunkText ? [{ id: randomUUID(), speaker: "date" as const, text: newChunkText, timestamp: new Date().toISOString() }] : [],
    facts: [],
    suggestions: [{ id: randomUUID(), title: "Keep going!", detail: "The AI coach is still warming up. Keep the conversation flowing.", intent: "follow_up" as const }],
    summary: "Conversation in progress.",
    flashcards: []
  };

  if (raw === undefined || raw === null) {
    console.error("Sarvam reasoning returned no parseable content:", JSON.stringify(data, null, 2));
    return fallbackResult;
  }

  let parsed: Partial<Reasoning>;
  try {
    const content = typeof raw === "string" ? raw : JSON.stringify(raw);
    const cleaned = content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    parsed = JSON.parse(cleaned) as Partial<Reasoning>;
  } catch {
    console.error("Sarvam reasoning returned non-JSON content:", raw);
    return fallbackResult;
  }

  const finalNewTurns: TranscriptTurn[] = [];
  if (newChunkText && Array.isArray(parsed.newTurns)) {
    for (const turn of parsed.newTurns) {
      if (turn && typeof turn.text === "string" && (turn.speaker === "user" || turn.speaker === "date")) {
        finalNewTurns.push({
          id: randomUUID(),
          speaker: turn.speaker,
          text: turn.text,
          timestamp: new Date().toISOString()
        });
      }
    }
  } else if (newChunkText) {
    finalNewTurns.push({
      id: randomUUID(),
      speaker: "date",
      text: newChunkText,
      timestamp: new Date().toISOString()
    });
  }

  return {
    newTurns: finalNewTurns,
    facts: Array.isArray(parsed.facts) ? parsed.facts : [],
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((s) => ({ ...s, id: s.id ?? randomUUID() }))
      : [],
    summary: String(parsed.summary ?? "Conversation in progress."),
    flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : []
  };
}

export async function analyzeDate(transcript: TranscriptTurn[], facts: GraphFact[]): Promise<DateAnalysis> {
  const listeningScore = Math.min(96, 72 + facts.length * 5);
  const balance = transcript.length < 3 ? 50 : 64;
  const conversationScore = Math.round((listeningScore + balance + 82) / 3);
  return {
    conversationScore,
    confidenceScore: 78,
    listeningScore,
    balance,
    elo: 1200 + conversationScore * 3,
    missedOpportunities: ["Ask one deeper feeling-based follow-up after a concrete preference."],
    greatResponses: ["You kept the conversation anchored to their interests instead of rushing to perform."],
    betterMoves: [{ blunder: "That's nice, I like that too.", bestMove: "What made that become your thing?" }],
    tips: ["Mirror one keyword before asking your next question.", "Let personal details become future plans, not trivia."]
  };
}

export function createTranscriptTurn(text: string, speaker: "user" | "date" = "date"): TranscriptTurn {
  return { id: randomUUID(), speaker, text, timestamp: new Date().toISOString() };
}
