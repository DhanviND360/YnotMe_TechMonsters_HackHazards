import { config, isApiConfigured } from "./config";
import { CoachSuggestion, DateAnalysis, DateSession, GraphFact, TranscriptTurn } from "../types";

type ApiSessionResponse = {
  session: DateSession;
  transcript?: TranscriptTurn;
  newTurns?: TranscriptTurn[];
  suggestions?: CoachSuggestion[];
  facts?: GraphFact[];
};

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined)
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${config.apiBaseUrl}${path}`;
  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkError) {
    throw new Error(
      `Cannot reach backend at ${url}. ` +
      `Make sure EXPO_PUBLIC_API_BASE_URL is set to your machine's LAN IP or a cloud URL. ` +
      `Error: ${networkError instanceof Error ? networkError.message : String(networkError)}`
    );
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  configured: isApiConfigured,
  startSession(token?: string) {
    return request<ApiSessionResponse>("/sessions", { method: "POST", body: JSON.stringify({}) }, token);
  },
  uploadAudio(sessionId: string, audioUri: string, token?: string) {
    const extension = audioUri.split(".").pop() || "m4a";
    let mimeType = "audio/x-m4a";
    if (extension === "3gp" || extension === "3gpp" || extension === "gpp") {
      mimeType = "audio/3gpp";
    } else if (extension === "ogg") {
      mimeType = "audio/ogg";
    } else if (extension === "wav") {
      mimeType = "audio/wav";
    } else if (extension === "caf") {
      mimeType = "audio/x-caf";
    }

    const form = new FormData();
    form.append("audio", {
      uri: audioUri,
      name: `ynotme-${Date.now()}.${extension}`,
      type: mimeType
    } as unknown as string);
    return request<ApiSessionResponse>(`/sessions/${sessionId}/audio`, { method: "POST", body: form }, token);
  },
  endSession(sessionId: string, token?: string) {
    return request<{ session: DateSession; analysis: DateAnalysis }>(
      `/sessions/${sessionId}/end`,
      { method: "POST", body: JSON.stringify({}) },
      token
    );
  },
  listSessions(token?: string) {
    return request<{ sessions: DateSession[] }>("/sessions", {}, token);
  },
};
