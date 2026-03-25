import { spawn } from "bun";
import * as fs from "fs";
import * as path from "path";

console.log("=======================================");
console.log("   Starting SEO Gen (Localhost)");
console.log("=======================================");

const envPath = path.join(import.meta.dir, "backend", ".env");

if (!fs.existsSync(envPath)) {
  console.log("\n=======================================");
  console.log("Backend .env file not found.");
  // Bun's global prompt is synchronous and works purely in JS (safe from AV heuristic flags)
  const key = prompt("Please enter your Gemini API Key: ");
  fs.writeFileSync(envPath, `GEMINI_API_KEY=${key || ''}\nLIST_TOKEN_USE=false\n`);
  console.log("✅ Created .env file in backend/");
  console.log("=======================================\n");
}

console.log("Starting Backend & Frontend services...\n");

// Spawn backend
const backend = spawn(["bun", "run", "index.ts"], {
  cwd: path.join(import.meta.dir, "backend"),
  stdout: "pipe",
  stderr: "pipe",
});

// Spawn frontend
const frontend = spawn(["bun", "run", "dev"], {
  cwd: path.join(import.meta.dir, "frontend"),
  stdout: "pipe",
  stderr: "pipe",
});

// Helper to prefix output from both services so they look clean in one window
async function prefixStream(stream: ReadableStream | null, prefix: string) {
  if (!stream) return;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.trim() !== '') {
            process.stdout.write(`${prefix} ${line}\n`);
        }
    }
  }
}

prefixStream(backend.stdout, "\x1b[34m[BACKEND]\x1b[0m");
prefixStream(backend.stderr, "\x1b[31m[BACKEND ERR]\x1b[0m");
prefixStream(frontend.stdout, "\x1b[32m[FRONTEND]\x1b[0m");
prefixStream(frontend.stderr, "\x1b[31m[FRONTEND ERR]\x1b[0m");

setTimeout(() => {
    console.log("\n=======================================");
    console.log("🚀 Services started! Opening browser...");
    console.log("=======================================\n");
    // Only safe command we run: opening a URL in the default browser. 
    // This rarely triggers AV when initiated from an existing node/bun process.
    spawn(["cmd", "/c", "start", "http://localhost:5173"]);
}, 2500);
