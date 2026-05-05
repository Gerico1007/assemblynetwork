/**
 * ♠️🌿🎸🧵 ttyd Terminal Bridge Manager
 *
 * Spawns ttyd from declared launch profiles. Tracks runtime state
 * (pid, status, startedAt, password) in-memory; persists generated
 * passwords to disk so they survive a dashboard restart.
 *
 * Safety contract (E3/E4/E5):
 *   - bind interface defaults to 'tailscale0'; never falls back to 0.0.0.0
 *   - cwd MUST be under one of APPROVED_ROOTS and pass shell-metachar check
 *   - --writable only when terminalMode === 'interactive'
 *   - --once only when lifecycle === 'single-use'
 *   - basic-auth username from profile, password generated or provided
 *   - args passed to spawn() as an array — never via shell interpolation
 *
 * Source-of-truth: data/terminal-services.json (config, committable)
 *                  data/terminal-runtime.json (passwords, gitignored)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const PROFILES_PATH = path.join(DATA_DIR, 'terminal-services.json');
const RUNTIME_PATH = path.join(DATA_DIR, 'terminal-runtime.json');

const APPROVED_ROOTS = [
  '/home/gmusic',
  '/home/gmusic/workspace',
  '/home/gmusic/salix/repos',
  '/home/gmusic/.hermes',
  '/tmp/an-test'  // tests only
];

const SHELL_METACHARS_RE = /[`$;&|<>(){}\\"'\n\r]/;

// Runtime registry: id → { pid, status, startedAt, password, port }
const runtime = new Map();

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readRuntimeFile() {
  if (!fs.existsSync(RUNTIME_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(RUNTIME_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeRuntimeFile(obj) {
  ensureDir();
  const tmp = RUNTIME_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, RUNTIME_PATH);
}

/** Persist passwords only — pids never survive across restarts. */
function persistPasswords() {
  const out = {};
  for (const [id, rt] of runtime.entries()) {
    if (rt.password) out[id] = { password: rt.password };
  }
  writeRuntimeFile(out);
}

function loadProfiles() {
  ensureDir();
  if (!fs.existsSync(PROFILES_PATH)) {
    return { profiles: [], approvedRoots: APPROVED_ROOTS };
  }
  try {
    const raw = fs.readFileSync(PROFILES_PATH, 'utf8');
    const j = JSON.parse(raw);
    return {
      profiles: Array.isArray(j.terminalServices) ? j.terminalServices : [],
      approvedRoots: APPROVED_ROOTS
    };
  } catch (e) {
    console.warn(`[terminal-services] config read failed: ${e.message}`);
    return { profiles: [], approvedRoots: APPROVED_ROOTS };
  }
}

function findProfile(id) {
  return loadProfiles().profiles.find(p => p.id === id) || null;
}

/**
 * Validate a cwd against the approved-roots whitelist and a shell-metachar
 * blocklist. Returns the resolved absolute path or throws.
 */
function validateCwd(rawCwd) {
  if (typeof rawCwd !== 'string' || !rawCwd) {
    throw new Error('cwd is required');
  }
  if (SHELL_METACHARS_RE.test(rawCwd)) {
    throw new Error('cwd contains shell metacharacters');
  }
  const resolved = path.resolve(rawCwd);
  const ok = APPROVED_ROOTS.some(root => {
    const r = path.resolve(root);
    return resolved === r || resolved.startsWith(r + path.sep);
  });
  if (!ok) {
    throw new Error(`cwd not under any approved root: ${resolved}`);
  }
  let stat;
  try { stat = fs.statSync(resolved); }
  catch { throw new Error(`cwd does not exist: ${resolved}`); }
  if (!stat.isDirectory()) throw new Error(`cwd is not a directory: ${resolved}`);
  return resolved;
}

function isPidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; }
  catch { return false; }
}

function generatePassword() {
  return crypto.randomBytes(8).toString('hex'); // 16 hex chars
}

function resolvePassword(profile) {
  // Precedence: explicit env per-id > shared env > stored runtime > generate
  const idEnvKey = `TTYD_PASSWORD_${profile.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  if (process.env[idEnvKey]) return { password: process.env[idEnvKey], generated: false };
  if (process.env.TTYD_PASSWORD) return { password: process.env.TTYD_PASSWORD, generated: false };
  const stored = readRuntimeFile()[profile.id];
  if (stored && stored.password) return { password: stored.password, generated: false };
  return { password: generatePassword(), generated: true };
}

/**
 * Build the ttyd argv from a profile. Pure function — no side effects.
 */
function buildTtydArgs(profile, password) {
  const bind = profile.bindInterface || 'tailscale0';
  const port = profile.port;
  const user = profile.authUser || 'mia';
  const command = profile.command || 'bash';
  const maxClients = Number.isFinite(profile.maxClients) ? profile.maxClients : 1;

  const args = [
    '-i', bind,
    '-p', String(port),
    '-c', `${user}:${password}`,
    '-m', String(maxClients)
  ];
  if (profile.lifecycle === 'single-use') args.push('-o');
  if (profile.terminalMode === 'interactive') args.push('--writable');
  args.push(command);
  return args;
}

function startProcess(id) {
  const profile = findProfile(id);
  if (!profile) throw new Error(`unknown profile: ${id}`);

  const existing = runtime.get(id);
  if (existing && isPidAlive(existing.pid)) {
    return { ...publicState(id, profile, existing), alreadyRunning: true };
  }

  const cwd = validateCwd(profile.cwd);
  const { password, generated } = resolvePassword(profile);
  const args = buildTtydArgs(profile, password);

  const child = spawn('ttyd', args, {
    cwd,
    env: { ...process.env, PATH: process.env.PATH },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  const startedAt = new Date().toISOString();
  const rt = {
    pid: child.pid,
    status: 'running',
    startedAt,
    password,
    port: profile.port,
    args,
    exitCode: null
  };
  runtime.set(id, rt);
  if (generated) persistPasswords();

  child.on('exit', (code, signal) => {
    const cur = runtime.get(id);
    if (!cur || cur.pid !== child.pid) return; // already replaced
    cur.status = signal === 'SIGTERM' || signal === 'SIGKILL' ? 'stopped'
               : code === 0 ? 'stopped'
               : 'crashed';
    cur.exitCode = code;
    cur.exitedAt = new Date().toISOString();
    cur.pid = null;
  });

  // Stash a small ring buffer of stderr lines for debugging.
  const errBuf = [];
  child.stderr.on('data', d => {
    const lines = d.toString().split('\n').filter(Boolean);
    for (const l of lines) {
      errBuf.push(l);
      if (errBuf.length > 20) errBuf.shift();
    }
    rt.stderr = errBuf.slice();
  });
  child.stdout.on('data', () => { /* discard */ });

  return publicState(id, profile, rt);
}

function stopProcess(id, { force = false } = {}) {
  const rt = runtime.get(id);
  if (!rt || !rt.pid) return { id, status: rt ? rt.status : 'not-started' };

  const sig = force ? 'SIGKILL' : 'SIGTERM';
  try { process.kill(rt.pid, sig); } catch { /* already gone */ }

  if (!force) {
    setTimeout(() => {
      if (isPidAlive(rt.pid)) {
        try { process.kill(rt.pid, 'SIGKILL'); } catch { /* ignore */ }
      }
    }, 3000);
  }

  return { id, status: 'stopping' };
}

function restartProcess(id) {
  stopProcess(id);
  return new Promise(resolve => {
    setTimeout(() => {
      try { resolve(startProcess(id)); }
      catch (e) { resolve({ id, status: 'error', error: e.message }); }
    }, 500);
  });
}

function publicState(id, profile, rt) {
  const aliveNow = rt && isPidAlive(rt.pid);
  return {
    id,
    name: profile.name,
    device: profile.device,
    host: profile.host,
    port: profile.port,
    protocol: profile.protocol || 'http',
    category: profile.category || 'agent',
    bridge: 'ttyd',
    terminalMode: profile.terminalMode || 'readonly',
    lifecycle: profile.lifecycle || 'single-use',
    cwd: profile.cwd,
    bindInterface: profile.bindInterface || 'tailscale0',
    authUser: profile.authUser || 'mia',
    maxClients: profile.maxClients ?? 1,
    status: aliveNow ? 'running' : (rt ? rt.status : 'stopped'),
    pid: aliveNow ? rt.pid : null,
    startedAt: rt ? rt.startedAt : null,
    exitedAt: rt ? rt.exitedAt || null : null,
    exitCode: rt ? rt.exitCode : null,
    password: rt ? rt.password : null,
    url: `${profile.protocol || 'http'}://${profile.host || profile.device}:${profile.port}/`,
    source: 'configured'
  };
}

function statusFor(id) {
  const profile = findProfile(id);
  if (!profile) throw new Error(`unknown profile: ${id}`);
  return publicState(id, profile, runtime.get(id));
}

function listAll() {
  const { profiles } = loadProfiles();
  return profiles.map(p => publicState(p.id, p, runtime.get(p.id)));
}

function rotatePassword(id) {
  const rt = runtime.get(id);
  if (!rt) throw new Error('profile not running — start it first to rotate');
  const password = generatePassword();
  rt.password = password;
  persistPasswords();
  return restartProcess(id);
}

/**
 * Best-effort cleanup: kill all tracked children. Called on SIGTERM.
 */
function shutdownAll() {
  for (const id of runtime.keys()) {
    stopProcess(id, { force: true });
  }
}

module.exports = {
  loadProfiles,
  validateCwd,
  startProcess,
  stopProcess,
  restartProcess,
  rotatePassword,
  statusFor,
  listAll,
  shutdownAll,
  buildTtydArgs,   // exported for unit testing
  APPROVED_ROOTS
};
