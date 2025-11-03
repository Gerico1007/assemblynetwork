# ♠️🌿🎸🧵 Enhancement Plan: HTTP Path Discovery

**Issue:** [#1](https://github.com/Gerico1007/assemblynetwork/issues/1)
**Branch:** `1-http-path-discovery`
**Created:** 2025-11-02
**Status:** 🟡 In Progress

---

## 🎯 Enhancement Summary

Extend AssemblyNetwork from **port-only detection** to **HTTP path discovery**, enabling the scanner to find not just open ports but also specific web endpoints, hidden directories, and service paths.

### Current Limitation
```
✅ Detects: 192.168.7.241:8000 (HTTP Server)
❌ Missing: http://192.168.7.241:8000/index.html
❌ Missing: http://192.168.7.241:8000/.assemblylook/index.html
❌ Missing: http://100.65.128.84:8000/* (Tailscale subnet)
```

### Enhanced Capability
```
✅ Detects: 192.168.7.241:8000 (HTTP Server)
✅ Discovers: /index.html (200 OK)
✅ Discovers: /.assemblylook/index.html (200 OK)
✅ Discovers: /api (200 OK)
✅ Discovers: /admin (403 Forbidden)
✅ Supports: Tailscale VPN subnet (100.64.0.0/10)
```

---

## 🏗️ Architecture Changes

### ♠️ Nyro - New Structural Components

#### 1. **New Module: `path-discovery.js`**
```javascript
// HTTP path enumeration and discovery
- probePaths(host, port, pathList)
- discoverCommonPaths(host, port)
- checkPathAvailability(url)
- extractLinks(html)
```

#### 2. **Enhanced: `scanner.js`**
```javascript
// Integration hooks
- scanNetworkWithPaths(subnet, options)
- enrichServiceWithPaths(service)
```

#### 3. **Enhanced: `server.js`**
```javascript
// New API endpoints
- GET /api/paths/:host/:port
- POST /api/probe-path
```

#### 4. **Enhanced: `activity-logger.js`**
```javascript
// New event types
- path_discovered
- path_lost
- path_check
```

---

## 🌿 Aureon - Implementation Flow

### Phase 1: Core Path Discovery Module (Day 1)

**File:** `path-discovery.js`

```javascript
const DEFAULT_PATHS = [
  '/',
  '/index.html',
  '/index.htm',
  '/api',
  '/api/status',
  '/health',
  '/admin',
  '/dashboard',
  '/docs',
  '/swagger',
  '/.env',
  '/.git/config'
];

async function probePaths(host, port, customPaths = []) {
  // HTTP GET requests to each path
  // Return: { path, statusCode, contentType, size }
}
```

**Features:**
- Default common path list
- Custom path injection
- HTTP status code detection
- Content-Type identification
- Response time tracking
- Timeout handling (2s per path)

---

### Phase 2: Scanner Integration (Day 1)

**File:** `scanner.js`

**Modifications:**
1. Add optional path discovery after port scan
2. New function: `enrichServiceWithPaths(service)`
3. Configuration flag: `ENABLE_PATH_DISCOVERY=true`

**Example Flow:**
```javascript
// After discovering open port 8000
const service = {
  host: '192.168.7.241',
  port: '8000',
  service: 'HTTP Server',
  status: 'online'
};

// Enrich with paths
service.paths = await discoverPaths(service.host, service.port);
// Result:
// paths: [
//   { path: '/', status: 200, contentType: 'text/html' },
//   { path: '/api', status: 200, contentType: 'application/json' },
//   { path: '/admin', status: 403, contentType: 'text/html' }
// ]
```

---

### Phase 3: API Enhancement (Day 2)

**File:** `server.js`

**New Endpoints:**

```javascript
// Get discovered paths for a service
GET /api/paths/:host/:port
Response: {
  success: true,
  host: "192.168.7.241",
  port: "8000",
  paths: [
    { path: "/", status: 200, lastChecked: "2025-11-02T..." },
    { path: "/api", status: 200, lastChecked: "2025-11-02T..." }
  ]
}

// Probe specific path manually
POST /api/probe-path
Body: { host, port, path }
Response: { success: true, available: true, statusCode: 200 }
```

---

### Phase 4: Dashboard UI Update (Day 2)

**File:** `public/app.js` & `public/index.html`

**UI Enhancements:**

1. **Service Card Expansion:**
```html
<div class="service-card">
  <h3>192.168.7.241:8000 - HTTP Server</h3>
  <div class="paths-list">
    <span class="path-badge status-200">/ (200 OK)</span>
    <span class="path-badge status-200">/api (200 OK)</span>
    <span class="path-badge status-403">/admin (403)</span>
  </div>
</div>
```

2. **Manual Path Probe Form:**
```html
<form id="probe-path-form">
  <input type="text" placeholder="Host (e.g., 192.168.7.241)">
  <input type="text" placeholder="Port (e.g., 8000)">
  <input type="text" placeholder="Path (e.g., /api/status)">
  <button>Probe Path</button>
</form>
```

3. **Path Status Colors:**
- 🟢 Green (200-299): Success
- 🟡 Yellow (300-399): Redirect
- 🔴 Red (400-499): Client Error
- ⚫ Black (500-599): Server Error

---

### Phase 5: Multi-Subnet Support (Day 3)

**File:** `.env`

**New Configuration:**
```bash
# Multiple subnets (comma-separated)
DEFAULT_SUBNETS=192.168.7.0/24,100.64.0.0/16

# Tailscale auto-detection
ENABLE_TAILSCALE_SCAN=true

# Path discovery settings
ENABLE_PATH_DISCOVERY=true
CUSTOM_PATHS=/api,/health,/status,/.assemblylook/index.html
PATH_DISCOVERY_TIMEOUT=2000
MAX_PATHS_PER_SERVICE=20
```

---

## 🎸 JamAI - Testing & Validation

### Unit Tests

```javascript
// test/path-discovery.test.js
describe('Path Discovery', () => {
  it('should discover common paths on HTTP server');
  it('should handle 404 responses gracefully');
  it('should timeout after 2 seconds');
  it('should parse HTML for additional links');
});
```

### Integration Tests

```javascript
// test/scanner.integration.test.js
describe('Scanner with Path Discovery', () => {
  it('should enrich services with discovered paths');
  it('should log path_discovered events to Redis');
  it('should handle services without HTTP');
});
```

### Manual Test Scenarios

1. **Local Network Test:**
   - Scan 192.168.7.0/24
   - Verify paths discovered on known services
   - Check Redis activity log

2. **Tailscale Test:**
   - Scan 100.64.0.0/16
   - Verify VPN services detected
   - Confirm path discovery on Tailscale hosts

3. **Custom Path Test:**
   - Add `/.assemblylook/index.html` to CUSTOM_PATHS
   - Verify custom paths are probed
   - Check dashboard display

---

## 🧵 Synth - Affected Files

| File | Change Type | Description |
|------|-------------|-------------|
| `path-discovery.js` | **NEW** | HTTP path enumeration module |
| `scanner.js` | **MODIFY** | Add path discovery integration |
| `server.js` | **MODIFY** | New API endpoints for paths |
| `activity-logger.js` | **MODIFY** | New event types for path discovery |
| `public/app.js` | **MODIFY** | UI updates for path display |
| `public/index.html` | **MODIFY** | Add path probe form |
| `public/styles.css` | **MODIFY** | Path badge styling |
| `.env.example` | **MODIFY** | New configuration options |
| `package.json` | **MODIFY** | Add axios for HTTP requests |
| `README.md` | **MODIFY** | Document new features |

---

## 📊 Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1 | 2-3 hours | Create `path-discovery.js` module |
| Phase 2 | 1-2 hours | Integrate into `scanner.js` |
| Phase 3 | 1-2 hours | Add API endpoints in `server.js` |
| Phase 4 | 2-3 hours | Update dashboard UI |
| Phase 5 | 1 hour | Add multi-subnet support |
| Testing | 2 hours | Unit + integration tests |
| Documentation | 1 hour | Update README and examples |

**Total Estimated Time:** 10-14 hours

---

## ✅ Merge Criteria

Before merging this enhancement:

- [x] Issue #1 created and linked
- [x] Branch `1-http-path-discovery` created
- [ ] `path-discovery.js` module implemented and tested
- [ ] Scanner integration complete
- [ ] API endpoints functional
- [ ] Dashboard UI updated
- [ ] Multi-subnet support working
- [ ] Redis activity logging for path events
- [ ] All tests passing
- [ ] README.md updated with new features
- [ ] Manual testing completed on local network
- [ ] Manual testing completed on Tailscale network
- [ ] Pull Request created and reviewed
- [ ] No breaking changes to existing functionality

---

## 🎯 Success Metrics

**Before Enhancement:**
```
Discovered: 5 services (port-only)
Visibility: Limited to port numbers
```

**After Enhancement:**
```
Discovered: 5 services + 23 HTTP paths
Visibility: Full endpoint mapping
Example:
  - 192.168.7.241:8000 → /, /index.html, /api, /.assemblylook/index.html
  - 100.65.128.84:8000 → /, /index.html
```

---

## 🌟 Future Enhancements (Out of Scope)

- WebSocket endpoint discovery
- GraphQL introspection
- API schema extraction (OpenAPI/Swagger)
- Subdomain enumeration
- SSL/TLS certificate analysis
- Authentication detection
- Recursive path crawling

---

**"From ports to paths—let the lattice see the full network structure!"** ♠️🌿🎸🧵
