export type RootStackParamList = {
  Auth: undefined;
  Tabs: undefined;
  LiveSession: { sessionId: string };
  DateDetail: { sessionId: string };
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
};

export type GraphFact = {
  subject: string;
  relation: string;
  object: string;
  confidence: number;
};

export type TranscriptTurn = {
  id: string;
  speaker: "user" | "date" | "coach";
  text: string;
  timestamp: string;
};

export type CoachSuggestion = {
  id: string;
  title: string;
  detail: string;
  intent: "follow_up" | "empathy" | "pivot" | "save";
};

export type DateAnalysis = {
  conversationScore: number;
  confidenceScore: number;
  listeningScore: number;
  balance: number;
  elo: number;
  missedOpportunities: string[];
  greatResponses: string[];
  betterMoves: Array<{ blunder: string; bestMove: string }>;
  tips: string[];
};

export type DateSession = {
  id: string;
  title: string;
  status: "live" | "ended";
  createdAt: string;
  summary: string;
  transcript: TranscriptTurn[];
  suggestions: CoachSuggestion[];
  facts: GraphFact[];
  flashcards: Array<{ front: string; back: string }>;
  analysis?: DateAnalysis;
};
