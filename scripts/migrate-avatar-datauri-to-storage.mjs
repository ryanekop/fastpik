#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AVATAR_BUCKET = "profile-avatars";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env. Required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseDataUri(input) {
  const value = (input || "").trim();
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), base64: match[2] };
}

function extFromMimeType(mimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

async function run() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .not("avatar_url", "is", null)
    .like("avatar_url", "data:image/%");

  if (error) {
    console.error("Failed to fetch profiles:", error.message);
    process.exit(1);
  }

  const rows = profiles || [];
  console.log(`Found ${rows.length} profile(s) with Data URI avatar.`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const parsed = parseDataUri(row.avatar_url);

    if (!parsed) {
      skipped += 1;
      console.log(`[${i + 1}/${rows.length}] skip ${row.id} (invalid data uri)`);
      continue;
    }

    try {
      const buffer = Buffer.from(parsed.base64, "base64");
      const ext = extFromMimeType(parsed.mimeType);
      const path = `${row.id}/avatar-backfill-${Date.now()}-${i + 1}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, buffer, {
          contentType: parsed.mimeType,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (updateError) throw new Error(updateError.message);

      success += 1;
      console.log(`[${i + 1}/${rows.length}] ok ${row.id}`);
    } catch (err) {
      failed += 1;
      console.error(`[${i + 1}/${rows.length}] fail ${row.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("");
  console.log("Backfill selesai.");
  console.log(`Success: ${success}`);
  console.log(`Failed : ${failed}`);
  console.log(`Skipped: ${skipped}`);

  if (failed > 0) process.exitCode = 1;
}

run();
