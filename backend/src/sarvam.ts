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
        { 
          role: "system", 
          content: "You must return ONLY valid JSON. Absolutely NO reasoning, thoughts, or step-by-step thinking processes. Immediately start your response with '{'. If you include any thoughts or reasoning, it will break the API." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 4096,
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

  const fallbackResult = generateSmartFallback(newChunkText, transcript);

  if (raw === undefined || raw === null) {
    console.error("Sarvam reasoning returned no parseable content:", JSON.stringify(data, null, 2));
    return fallbackResult;
  }

  let parsed: Partial<Reasoning>;
  try {
    const content = typeof raw === "string" ? raw : JSON.stringify(raw);
    parsed = extractJSON(content) as Partial<Reasoning>;
  } catch (err) {
    console.error("Sarvam reasoning returned non-JSON content or failed to parse:", raw, err);
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

function extractJSON(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in response");
  }
  const jsonStr = text.substring(start, end + 1);
  return JSON.parse(jsonStr);
}

function generateSmartFallback(
  newChunkText: string | undefined,
  transcript: TranscriptTurn[]
): {
  newTurns: TranscriptTurn[];
  facts: GraphFact[];
  suggestions: CoachSuggestion[];
  summary: string;
  flashcards: Array<{ front: string; back: string }>;
} {
  const fullText = (transcript.map((t) => t.text).join(" ") + " " + (newChunkText || "")).toLowerCase();
  
  const suggestions: CoachSuggestion[] = [];
  const facts: GraphFact[] = [];
  
  if (fullText.includes("traffic") || fullText.includes("car") || fullText.includes("drive") || fullText.includes("road")) {
    suggestions.push({
      id: randomUUID(),
      title: "Relate to transit",
      detail: "Acknowledge the travel hassle and transition to something comfortable like drinks or weekend plans.",
      intent: "pivot"
    });
    facts.push({ subject: "Her", relation: "Dislikes", object: "traffic", confidence: 0.9 });
  }
  
  if (fullText.includes("drink") || fullText.includes("cocktail") || fullText.includes("margarita") || fullText.includes("gin") || fullText.includes("beer") || fullText.includes("wine") || fullText.includes("order")) {
    suggestions.push({
      id: randomUUID(),
      title: "Sip and share",
      detail: "Ask what her go-to drink is, or share a fun story about your favorite local bar.",
      intent: "follow_up"
    });
    facts.push({ subject: "Her", relation: "Likes", object: "cocktails", confidence: 0.85 });
  }
  
  if (fullText.includes("travel") || fullText.includes("trip") || fullText.includes("visit") || fullText.includes("japan") || fullText.includes("europe") || fullText.includes("vacation")) {
    suggestions.push({
      id: randomUUID(),
      title: "Explore travel stories",
      detail: "Ask what her favorite memory from that trip was. Travel is one of the best connection topics.",
      intent: "follow_up"
    });
    facts.push({ subject: "Her", relation: "Likes", object: "traveling", confidence: 0.92 });
  }
  
  if (fullText.includes("music") || fullText.includes("concert") || fullText.includes("band") || fullText.includes("song") || fullText.includes("listen")) {
    suggestions.push({
      id: randomUUID(),
      title: "Tune in",
      detail: "Ask about the last live concert she went to or what she listens to when she wants to relax.",
      intent: "follow_up"
    });
    facts.push({ subject: "Her", relation: "Likes", object: "live music", confidence: 0.88 });
  }
  
  if (fullText.includes("family") || fullText.includes("brother") || fullText.includes("sister") || fullText.includes("mom") || fullText.includes("dad") || fullText.includes("parents")) {
    suggestions.push({
      id: randomUUID(),
      title: "Family background",
      detail: "Ask if she visits family often. Show genuine care and curiosity about her upbringing.",
      intent: "follow_up"
    });
  }
  
  if (suggestions.length === 0) {
    const defaults = [
      {
        id: randomUUID(),
        title: "Ask open questions",
        detail: "Ask open-ended questions (starting with 'How' or 'What') instead of yes/no ones to let her open up.",
        intent: "follow_up" as const
      },
      {
        id: randomUUID(),
        title: "Mirror her language",
        detail: "Mirror one key word from her last sentence to show you are listening carefully.",
        intent: "empathy" as const
      },
      {
        id: randomUUID(),
        title: "Find common ground",
        detail: "Bridge a fact she shared into a future plan or recommendation.",
        intent: "pivot" as const
      }
    ];
    suggestions.push(defaults[transcript.length % defaults.length]);
  }
  
  const finalNewTurns: TranscriptTurn[] = [];
  if (newChunkText) {
    let speaker: "user" | "date" = "date";
    const lowerChunk = newChunkText.toLowerCase();
    if (lowerChunk.startsWith("hey") || lowerChunk.startsWith("hi") || lowerChunk.includes("you look") || lowerChunk.includes("i'm")) {
      speaker = "user";
    }
    finalNewTurns.push({
      id: randomUUID(),
      speaker,
      text: newChunkText,
      timestamp: new Date().toISOString()
    });
  }
  
  return {
    newTurns: finalNewTurns,
    facts,
    suggestions,
    summary: "Conversation in progress.",
    flashcards: []
  };
}
