import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { DateSession } from "./types.js";

export const supabase =
  config.supabaseUrl && config.supabaseServiceRoleKey
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false } })
    : null;

export async function persistSessionArtifact(session: DateSession) {
  if (!supabase) return;
  const body = JSON.stringify(session, null, 2);
  await supabase.storage.from(config.supabaseBucket).upload(`${session.userId}/${session.id}.json`, body, {
    contentType: "application/json",
    upsert: true
  });
}

export async function resolveUserId(authHeader?: string) {
  if (!supabase || !authHeader?.startsWith("Bearer ")) return "demo-user";
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return "demo-user";
  return data.user.id;
}
