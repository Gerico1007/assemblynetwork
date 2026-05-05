/**
 * ♠️🌿🎸🧵 Service category inference
 *
 * Recursive rule order (Nyro lattice): explicit > name regex > port > protocol > unknown.
 * Used at scan time AND at custom-service creation time so the same service
 * always lands in the same bucket regardless of how it entered the dashboard.
 */

const CATEGORIES = {
  ssh: 'SSH',
  web: 'Web Portal',
  forest: 'Forest Recorder',
  agent: 'Agent Session',
  database: 'Database',
  dev: 'Dev Server',
  unknown: 'Unknown'
};

const SSH_PORTS = new Set([22, 8022]);
const FOREST_PORTS = new Set([8766, 8768, 8770]);
const DATABASE_PORTS = new Set([3306, 5432, 6379, 27017]);
const DEV_PORTS = new Set([3000, 5173, 8000, 8080, 8083, 8888, 9000]);

const AGENT_NAME_RE = /\b(hermes|claude|gemini|codex|agent|a2a)\b/i;

/**
 * Infer the category of a service from any subset of its attributes.
 * Inputs missing get treated as undefined; rules degrade gracefully.
 *
 * @param {object} s
 * @param {number|string} [s.port]
 * @param {string} [s.protocol]   "http"|"https"
 * @param {string} [s.name]
 * @param {string} [s.category]   if set, returned as-is (explicit override)
 * @returns {string} a key from CATEGORIES
 */
function inferCategory(s = {}) {
  if (s.category && CATEGORIES[s.category]) return s.category;

  const name = s.name || '';
  if (AGENT_NAME_RE.test(name)) return 'agent';

  const port = Number(s.port);
  if (Number.isFinite(port)) {
    if (SSH_PORTS.has(port)) return 'ssh';
    if (FOREST_PORTS.has(port)) return 'forest';
    if (DATABASE_PORTS.has(port)) return 'database';
    if (DEV_PORTS.has(port)) return 'dev';
  }

  if (s.protocol === 'http' || s.protocol === 'https') return 'web';

  return 'unknown';
}

module.exports = { CATEGORIES, inferCategory };
