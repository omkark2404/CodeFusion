require("dotenv").config();
const axios = require("axios");

// ── Supported languages ───────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = ["javascript", "python", "java", "cpp", "c"];

// ── Piston (cloud fallback) ───────────────────────────────────────────────────
const PISTON_URL = "https://emkc.org/api/v2/piston/execute";
const PISTON_LANGS = {
  javascript: { language: "javascript", version: "*" },
  python: { language: "python", version: "*" },
  java: { language: "java", version: "*" },
  cpp: { language: "c++", version: "*" },
  c: { language: "c", version: "*" },
};

// ── Judge0 (self-hosted Docker fallback) ──────────────────────────────────────
const JUDGE0_URL = process.env.JUDGE0_URL || "http://localhost:2358";
const JUDGE0_LANG_IDS = { javascript: 93, python: 71, java: 62, cpp: 54, c: 50 };

// ── Wandbox (cloud fallback) ──────────────────────────────────────────────────
const WANDBOX_URL = "https://wandbox.org/api/compile.json";
const WANDBOX_LANGS = {
  javascript: "nodejs-20.17.0",
  python: "cpython-3.12.7",
  java: "openjdk-jdk-22+36",
  cpp: "gcc-13.2.0",
  c: "gcc-13.2.0-c",
};

// ── Codex (last resort) ───────────────────────────────────────────────────────
const CODEX_URL = "https://api.codex.jaagrav.in";
const CODEX_LANGS = { javascript: "js", python: "py", java: "java", cpp: "cpp", c: "c" };

// ── Infrastructure error patterns ─────────────────────────────────────────────
const INFRA_PATTERNS = [
  "OCI runtime error", "crun: clone", "Resource temporarily unavailable",
  "container_linux", "operation not permitted",
];
const isInfraError = (t = "") =>
  INFRA_PATTERNS.some((p) => t.toLowerCase().includes(p.toLowerCase()));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const rateLimits = new Map();
const MAX_RUNS_PER_MINUTE = 10;

function checkRateLimit(roomId) {
  const now = Date.now();
  if (!rateLimits.has(roomId)) {
    rateLimits.set(roomId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  const lim = rateLimits.get(roomId);
  if (now > lim.resetAt) { rateLimits.set(roomId, { count: 1, resetAt: now + 60_000 }); return true; }
  if (lim.count >= MAX_RUNS_PER_MINUTE) return false;
  lim.count++;
  return true;
}

function clearRateLimit(roomId) {
  rateLimits.delete(roomId);
}

// ── Provider 1: Judge0 (self-hosted Docker) ───────────────────────────────────
async function runViaJudge0(sourceCode, language, stdin = "") {
  const language_id = JUDGE0_LANG_IDS[language];
  const submitRes = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
    { source_code: sourceCode, language_id, stdin },
    { headers: { "Content-Type": "application/json" }, timeout: 8_000 }
  );
  const token = submitRes.data.token;
  if (!token) throw new Error("Judge0: no token returned");

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      { timeout: 5_000 }
    );
    const d = res.data;
    const statusId = d.status?.id;
    if (statusId <= 2) continue;

    const compile_output = d.compile_output || "";
    const stderr = d.stderr || "";

    if (isInfraError(compile_output) || isInfraError(stderr))
      throw new Error(`Judge0 infra error: ${compile_output || stderr}`);

    let status = "Accepted";
    if (statusId === 6)      status = "Compilation Error";
    else if (statusId !== 3) status = "Runtime Error";

    return { stdout: d.stdout || "", stderr, compile_output, status };
  }
  throw new Error("Judge0: timed out");
}

// ── Provider 2: Piston ────────────────────────────────────────────────────────
async function runViaPiston(sourceCode, language, stdin = "") {
  const langConfig = PISTON_LANGS[language];
  const res = await axios.post(
    PISTON_URL,
    {
      language: langConfig.language,
      version: langConfig.version,
      files: [{ content: sourceCode }],
      stdin: stdin || "",
    },
    { headers: { "Content-Type": "application/json" }, timeout: 15_000 }
  );

  const data = res.data;
  if (data.message) {
    throw new Error(`Piston error: ${data.message}`);
  }

  const run = data.run || {};
  const compile = data.compile || {};
  
  let status = "Accepted";
  if (compile.code !== 0 && compile.code !== undefined) {
    status = "Compilation Error";
  } else if (run.code !== 0) {
    status = "Runtime Error";
  }

  return {
    stdout: run.stdout || "",
    stderr: run.stderr || "",
    compile_output: compile.output || "",
    status,
  };
}


// ── Provider 3: Wandbox ───────────────────────────────────────────────────────
async function runViaWandbox(sourceCode, language, stdin = "") {
  const compiler = WANDBOX_LANGS[language];
  const res = await axios.post(
    WANDBOX_URL,
    { compiler, code: sourceCode, stdin, save: false },
    { headers: { "Content-Type": "application/json" }, timeout: 25_000 }
  );

  const data = res.data || {};
  const compileMsg = data.compiler_message || data.compiler_error || "";
  const programErr = data.program_error || "";

  if (isInfraError(compileMsg) || isInfraError(programErr))
    throw new Error(`Wandbox infra error: ${compileMsg || programErr}`);

  let status = "Accepted";
  if (data.status !== "0") {
    status = compileMsg ? "Compilation Error" : "Runtime Error";
  }

  return {
    stdout: data.program_output || "",
    stderr: programErr,
    compile_output: compileMsg,
    status,
  };
}

// ── Provider 4: Codex ─────────────────────────────────────────────────────────
async function runViaCodex(sourceCode, language, stdin = "") {
  const lang = CODEX_LANGS[language];
  const body = new URLSearchParams();
  body.append("code", sourceCode);
  body.append("language", lang);
  body.append("input", stdin || "");

  const res = await axios.post(CODEX_URL, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 30_000,
  });

  const { output = "", error = "" } = res.data;
  return {
    stdout: output,
    stderr: error,
    compile_output: "",
    status: error ? "Runtime Error" : "Accepted",
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
async function handleRunCode(io, socket, { code, language, roomId, stdin = "", username = "" }) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return socket.emit("code:error", { message: `Unsupported language: ${language}` });
  }

  if (typeof code !== 'string' || code.length > 100000) {
    return socket.emit("code:error", { message: "Code payload too large." });
  }

  if (typeof stdin !== 'string' || stdin.length > 100000) {
    return socket.emit("code:error", { message: "Stdin payload too large." });
  }

  if (!checkRateLimit(roomId)) {
    return socket.emit("code:error", {
      message: "Rate limit reached: max 10 runs/minute per room. Please wait.",
    });
  }

  io.to(roomId).emit("code:running", { username, stdin });

  const providers = [
    { name: "Judge0",  fn: () => runViaJudge0(code, language, stdin)  },
    { name: "Piston",  fn: () => runViaPiston(code, language, stdin)  },
    { name: "Wandbox", fn: () => runViaWandbox(code, language, stdin) },
    { name: "Codex",   fn: () => runViaCodex(code, language, stdin)   },
  ];

  let lastErr;
  for (const { name, fn } of providers) {
    try {
      const result = await fn();
      console.log(`[CodeRunner] ${name} succeeded`);
      return io.to(roomId).emit("code:output", { ...result, time: null, memory: null });
    } catch (err) {
      lastErr = err;
      console.warn(`[CodeRunner] ${name} failed: ${err.message}`);
    }
  }

  console.error("[CodeRunner] All providers failed:", lastErr?.message);
  io.to(roomId).emit("code:error", { message: `Code execution failed: ${lastErr?.message}` });
}

module.exports = { handleRunCode, clearRateLimit };