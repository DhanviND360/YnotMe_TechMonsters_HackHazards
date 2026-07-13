import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 8080),
  appOrigin: process.env.APP_ORIGIN ?? "*",
  sarvamApiKey: process.env.SARVAM_API_KEY ?? "",
  sarvamSttUrl: process.env.SARVAM_STT_URL ?? "https://api.sarvam.ai/speech-to-text",
  sarvamChatUrl: process.env.SARVAM_CHAT_URL ?? "https://api.sarvam.ai/v1/chat/completions",
  sarvamModel: process.env.SARVAM_MODEL ?? "sarvam-30b",
  neo4jUri: process.env.NEO4J_URI ?? "",
  neo4jUsername: process.env.NEO4J_USERNAME ?? "neo4j",
  neo4jPassword: process.env.NEO4J_PASSWORD ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "ynotme-sessions"
};
