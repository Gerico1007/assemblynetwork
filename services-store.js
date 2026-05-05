/**
 * ♠️🌿🎸🧵 Custom Services Store
 *
 * Persistent JSON-file store for user-pasted service URLs.
 * Source-of-truth ranking: user > configured > scan.
 *
 * Schema (per record):
 *   {
 *     id, name, device, host, protocol, port, path,
 *     category?, source: "user", createdAt, lastSeen
 *   }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { inferCategory } = require('./categories');

const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'custom-services.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll() {
  ensureDir();
  if (!fs.existsSync(STORE_PATH)) return [];
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const j = JSON.parse(raw);
    return Array.isArray(j.services) ? j.services : [];
  } catch (e) {
    console.warn(`[services-store] read failed (${e.message}); starting empty`);
    return [];
  }
}

function writeAll(services) {
  ensureDir();
  const tmp = STORE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ services }, null, 2));
  fs.renameSync(tmp, STORE_PATH);
}

/**
 * Parse a pasted URL into a service descriptor.
 * Throws Error on invalid input.
 */
function parseServiceUrl(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('url is required');
  }
  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new Error('invalid URL');
  }
  const protocol = parsed.protocol.replace(':', '').toLowerCase();
  if (protocol !== 'http' && protocol !== 'https') {
    throw new Error(`unsupported protocol: ${protocol}`);
  }
  const host = parsed.hostname;
  if (!host) throw new Error('missing hostname');

  const port = parsed.port
    ? Number(parsed.port)
    : (protocol === 'https' ? 443 : 80);

  const device = host.split('.')[0];
  const path = parsed.pathname || '/';

  return { protocol, host, port, device, path };
}

/**
 * Add a custom service. Dedupes by device+port:
 *   - if a record with the same device+port exists, the new fields override it
 *   - otherwise a new record is inserted
 *
 * Returns the created/updated record.
 */
function addService({ url, name, category }) {
  const fields = parseServiceUrl(url);
  const services = readAll();
  const idx = services.findIndex(
    s => s.device === fields.device && Number(s.port) === Number(fields.port)
  );
  const now = new Date().toISOString();

  if (idx >= 0) {
    const merged = {
      ...services[idx],
      ...fields,
      name: name || services[idx].name || `${fields.device}:${fields.port}`,
      source: 'user',
      updatedAt: now
    };
    // Explicit category from request beats stored; otherwise re-infer from final shape.
    merged.category = category
      || services[idx].category
      || inferCategory({ port: merged.port, protocol: merged.protocol, name: merged.name });
    services[idx] = merged;
    writeAll(services);
    return merged;
  }

  const finalName = name || `${fields.device}:${fields.port}`;
  const record = {
    id: crypto.randomUUID(),
    name: finalName,
    ...fields,
    category: category || inferCategory({
      port: fields.port,
      protocol: fields.protocol,
      name: finalName
    }),
    source: 'user',
    createdAt: now,
    lastSeen: null
  };
  services.push(record);
  writeAll(services);
  return record;
}

function listServices() {
  return readAll();
}

function deleteService(id) {
  const services = readAll();
  const idx = services.findIndex(s => s.id === id);
  if (idx < 0) return false;
  services.splice(idx, 1);
  writeAll(services);
  return true;
}

module.exports = {
  parseServiceUrl,
  addService,
  listServices,
  deleteService,
  STORE_PATH
};
