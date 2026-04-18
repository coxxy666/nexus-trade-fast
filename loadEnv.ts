import { parse } from "https://deno.land/std/dotenv/mod.ts";

const originalEnvKeys = new Set(Object.keys(Deno.env.toObject()));

function loadEnvFile(path: string): boolean {
  try {
    const raw = Deno.readTextFileSync(path);
    const parsed = parse(raw);
    for (const [key, value] of Object.entries(parsed)) {
      if (originalEnvKeys.has(key)) continue;
      Deno.env.set(key, value);
    }
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    console.error(`[env] Failed to load ${path}:`, error);
    return false;
  }
}

const loadedFiles = [".env", ".env.local"].filter((path) => loadEnvFile(path));
if (loadedFiles.length) {
  console.log(`[env] Loaded ${loadedFiles.join(", ")}`);
}
