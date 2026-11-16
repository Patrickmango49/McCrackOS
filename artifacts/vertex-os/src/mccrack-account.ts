import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://agcrweayleevlkgcmqpy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnY3J3ZWF5bGVldmxrZ2NtcXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MzI5ODcsImV4cCI6MjA4NzEwODk4N30.6ROZmRjDORSrfHP9yeZ_ofRHueHnq5K-C9c_jjxqBwQ";

// This is the same project and default auth storage key used by apps/messages/index.html.
// Supabase sessions are therefore shared between the OS and the Messages iframe.
export const mccrackAuth = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export interface McCrackCloudAccount {
  id: string;
  email: string;
  username: string;
  name: string;
  status: string;
  avatar: string;
  banner: string;
  bio: string;
}

export interface McCrackProfilePatch {
  username?: string;
  name?: string;
  status?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
}

async function uploadProfileImage(userId: string, value: string, filename: string): Promise<string> {
  if (!value) return "";
  if (!value.startsWith("data:")) return value;
  const blob = await (await fetch(value)).blob();
  const path = userId + "/" + filename;
  const { error } = await mccrackAuth.storage.from("mcchat-user-media").upload(path, blob, {
    upsert: true,
    contentType: blob.type || "image/jpeg",
  });
  if (error) throw error;
  return mccrackAuth.storage.from("mcchat-user-media").getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
}

export async function getMcCrackCloudAccount(): Promise<McCrackCloudAccount | null> {
  const { data: sessionData, error: sessionError } = await mccrackAuth.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) return null;
  const { data, error } = await mccrackAuth
    .from("profiles")
    .select("id,username,display_name,status,avatar_url,banner_url,bio")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    username: data?.username ?? String(metadata.username ?? ""),
    name: data?.display_name ?? String(metadata.display_name ?? metadata.username ?? user.email?.split("@")[0] ?? "McCrack User"),
    status: data?.status ?? "Available to chat",
    avatar: data?.avatar_url ?? "",
    banner: data?.banner_url ?? "",
    bio: data?.bio ?? "",
  };
}

export async function signUpMcCrackAccount(input: {
  email: string;
  password: string;
  username: string;
  name: string;
  avatar?: string;
}): Promise<{ account: McCrackCloudAccount | null; needsConfirmation: boolean }> {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (!/^[a-z0-9_-]{3,24}$/.test(username)) throw new Error("Username must be 3–24 letters, numbers, underscores or hyphens.");
  if (input.password.length < 8) throw new Error("Use a password with at least 8 characters.");
  const { data, error } = await mccrackAuth.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { username, display_name: input.name.trim() || username },
      emailRedirectTo: location.origin + location.pathname,
    },
  });
  if (error) throw error;
  if (!data.session || !data.user) return { account: null, needsConfirmation: true };
  const userId = data.user.id;
  const avatar = await uploadProfileImage(userId, input.avatar ?? "", "avatar.jpg");
  const row = {
    id: userId,
    username,
    display_name: (input.name.trim() || username).slice(0, 40),
    status: "Available to chat",
    avatar_url: avatar || null,
    banner_url: null,
    bio: "",
    updated_at: new Date().toISOString(),
  };
  const { error: profileError } = await mccrackAuth.from("profiles").upsert(row, { onConflict: "id" });
  if (profileError) throw profileError;
  return { account: await getMcCrackCloudAccount(), needsConfirmation: false };
}

export async function signInMcCrackAccount(email: string, password: string): Promise<McCrackCloudAccount> {
  const { error } = await mccrackAuth.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  const account = await getMcCrackCloudAccount();
  if (!account) throw new Error("Signed in, but your McCrack profile could not be loaded.");
  return account;
}

export async function updateMcCrackCloudProfile(patch: McCrackProfilePatch): Promise<McCrackCloudAccount | null> {
  const { data: sessionData } = await mccrackAuth.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.username !== undefined) row.username = patch.username.trim().toLowerCase();
  if (patch.name !== undefined) row.display_name = patch.name.trim().slice(0, 40);
  if (patch.status !== undefined) row.status = patch.status.trim().slice(0, 60);
  if (patch.bio !== undefined) row.bio = patch.bio.slice(0, 240);
  if (patch.avatar !== undefined) row.avatar_url = (await uploadProfileImage(user.id, patch.avatar, "avatar.jpg")) || null;
  if (patch.banner !== undefined) row.banner_url = (await uploadProfileImage(user.id, patch.banner, "banner.jpg")) || null;
  const { data: updated, error } = await mccrackAuth.from("profiles").update(row).eq("id", user.id).select("id").maybeSingle();
  if (error) throw error;
  if (!updated) {
    const username = String(patch.username ?? user.user_metadata?.username ?? user.email?.split("@")[0] ?? "user").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24) || "user";
    const displayName = String(patch.name ?? user.user_metadata?.display_name ?? username).slice(0, 40);
    const { error: insertError } = await mccrackAuth.from("profiles").insert({
      id: user.id,
      username,
      display_name: displayName,
      status: String(patch.status ?? "Available to chat"),
      avatar_url: typeof row.avatar_url === "string" ? row.avatar_url : null,
      banner_url: typeof row.banner_url === "string" ? row.banner_url : null,
      bio: String(patch.bio ?? ""),
      updated_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;
  }
  return getMcCrackCloudAccount();
}

export async function signOutMcCrackAccount(): Promise<void> {
  const { error } = await mccrackAuth.auth.signOut();
  if (error) throw error;
}
