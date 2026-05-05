# ♠️🌿🎸🧵 AssemblyNetwork

**Network Activity Tracking & Service Discovery Dashboard**

A Trinity-powered network monitoring solution that discovers services across your local network and logs all activity with precision timestamps.

## 🎯 Features

- **🔍 Network Scanning**: LAN (nmap) and Tailscale-aware service discovery, in parallel
- **🔗 Paste-a-Link**: Paste any service URL — the dashboard parses it and saves a card that survives restarts (`#4`)
- **🏷️ Service Categories**: SSH / Web / Forest / Agent / Database / Dev / Unknown — auto-inferred from port + name + protocol, filterable by chip (`#5`)
- **🖥️ Terminal Bridges**: ttyd profiles per service. Readonly (watch the room) vs Interactive (touch the instruments). Single-use vs Persistent. Bound to `tailscale0` only (`#6 #7 #8`)
- **📊 Activity Logging**: Every event with ISO 8601 timestamps, optionally backed by Upstash Redis
- **🎨 Assembly Dashboard**: Dark-themed UI with color-coded status indicators
- **📱 Responsive Design**: Works on desktop and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14.0.0
- nmap (network scanning tool)
- Upstash Redis account (optional, for activity logging)

### Installation

```bash
# Clone or navigate to the repository
cd ~/assemblynetwork

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your Upstash Redis credentials

# Start the server
npm start
```

The dashboard will be available at: **http://localhost:9000**

## 📡 API Endpoints

### Discovery & status
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | GET | Trigger LAN nmap scan |
| `/api/services` | GET | Get discovered LAN services |
| `/api/tailscale/nodes` | GET | List tailnet devices |
| `/api/tailscale/scan` | GET | Probe tailnet peers for open ports (returns `portCategories` per node) |
| `/api/activity` | GET | Get activity log |
| `/api/check` | POST | Check specific host:port |
| `/api/status` | GET | Server status |

### Custom services (`#4`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services/custom` | GET | List user-pasted services |
| `/api/services/custom` | POST | Add a service from a URL — body: `{url, name?, category?}` |
| `/api/services/custom/:id` | DELETE | Remove a custom service |

### Terminal bridges (`#6 #7 #8`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/terminal/services` | GET | List bridge profiles + runtime status |
| `/api/terminal/status/:id` | GET | Status for a single profile |
| `/api/terminal/start/:id` | POST | Spawn ttyd from a profile |
| `/api/terminal/stop/:id` | POST | SIGTERM (escalates to SIGKILL after 3s) |
| `/api/terminal/restart/:id` | POST | Stop + start |
| `/api/terminal/rotate/:id` | POST | Generate a new password and restart |

### Examples

```bash
# Scan network
curl http://localhost:9000/api/scan

# Paste a service URL — saves persistently, infers category
curl -X POST http://localhost:9000/api/services/custom \
  -H "Content-Type: application/json" \
  -d '{"url":"https://eury.ferret-harmonic.ts.net:8770/","name":"Conductor"}'

# Start a terminal bridge (must be defined in data/terminal-services.json)
curl -X POST http://localhost:9000/api/terminal/start/assemblynetwork

# Check who is listening
ss -tlnp | grep ttyd
# expect: LISTEN ... 100.88.23.103:7683 ... users:(("ttyd",...))   # tailscale0 only
```

## 🏗️ Architecture

### ♠️ Nyro - Structural Framework

```
assemblynetwork/
├── server.js               # Express server (port 9000)
├── scanner.js              # nmap LAN + tailnet probe
├── categories.js           # inferCategory() — single source of truth
├── services-store.js       # Persistent custom-service store (#4)
├── terminal-services.js    # ttyd bridge launcher (#6 #7 #8)
├── activity-logger.js      # Upstash Redis integration
├── data/
│   ├── terminal-services.json   # Terminal launch profiles (committed)
│   ├── terminal-runtime.json    # Generated passwords (gitignored)
│   └── custom-services.json     # User-pasted services (gitignored)
├── docs/
│   ├── ENHANCEMENTS.md
│   ├── TERMINAL-BRIDGE.md
│   ├── SECURITY.md
│   ├── enhancements/2026-05-04-overnight-plan.md
│   └── validation/              # Smoke-test transcripts
└── public/index.html
```

### 🌿 Aureon - Service Flow

1. **Discovery**: Network scanner uses nmap to find active hosts and open ports
2. **Logging**: Each event is logged to Upstash Redis with ISO 8601 timestamps
3. **Display**: Dashboard presents services with color-coded status indicators
4. **Memory**: Activity timeline preserves the network's heartbeat

### 🎸 JamAI - Service Signatures

The scanner recognizes common services by port:

- **80, 443, 8000, 8080, 8888, 9000**: HTTP Servers
- **3000**: Node.js/Next.js
- **5173**: Vite Dev Server
- **8083**: Gradio/Custom
- **8765**: WebSocket
- **10001, 10002**: A2A Agents
- **6379**: Redis
- **3306**: MySQL
- **5432**: PostgreSQL
- **27017**: MongoDB

### 🧵 Synth - Integration Points

Links to existing dashboards:
- Port 8000: HTTP Server
- Port 8080: HTTP Proxy
- Port 8083: Gradio Host Agent
- Port 8888: Agent Logs (Trinity Castle)

## 🔧 Configuration

### Environment Variables

```bash
# Server
PORT=9000
NODE_ENV=development

# Upstash Redis (for activity logging)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Network
DEFAULT_SUBNET=192.168.7.0/24

# Custom Ports (optional)
CUSTOM_PORTS=10070,10071,12345
```

### Network Scanning

The scanner defaults to `192.168.7.0/24` but can be customized:

```bash
# Scan custom subnet
curl http://localhost:9000/api/scan?subnet=10.0.0.0/24

# Scan with custom ports
curl "http://localhost:9000/api/scan?ports=10070,12345,8888"

# Combine subnet and custom ports
curl "http://localhost:9000/api/scan?subnet=192.168.7.0/24&ports=10070,10071"
```

### Custom Port Scanning

**Method 1: Via Dashboard UI**
1. Open dashboard at http://localhost:9000
2. Enter custom ports in the "Custom Ports" field (e.g., `10070,12345`)
3. Click "Scan Network"

**Method 2: Via Environment Variable**
```bash
# Add to .env file
CUSTOM_PORTS=10070,10071,12345

# Restart server
npm start
```

**Method 3: Via API Query Parameter**
```bash
curl "http://localhost:9000/api/scan?ports=10070,12345"
```

**Default Ports Scanned**:
21, 22, 80, 443, 3000, 3306, 5000, 5173, 5432, 6379, 8000, 8080, 8083, 8765, 8888, 9000, 9999, 10001, 10002, **10070**, 27017

## 📊 Activity Event Model

Each logged event contains:

```javascript
{
  id: "uuid-v4",
  timestamp: "2025-11-01T12:34:56.789Z",  // ISO 8601
  eventType: "service_discovered",
  host: "192.168.7.241",
  port: "8000",
  service: "HTTP Server",
  status: "online",
  metadata: {
    scanTime: "2025-11-01T12:34:56.789Z"
  }
}
```

### Event Types

- `scan_started`: Network scan initiated
- `scan_completed`: Scan finished successfully
- `scan_error`: Scan failed
- `service_discovered`: New service found
- `service_lost`: Service no longer reachable
- `port_check`: Manual port check
- `server_started`: Dashboard server started
- `server_stopped`: Dashboard server stopped

## 🎨 Trinity Branding

The dashboard features Trinity-themed design:

- **♠️ Nyro Blue** (#4a90e2): Structure and framework
- **🌿 Aureon Green** (#50c878): Success and online status
- **🎸 JamAI Orange** (#ff8c42): Discovery and highlights
- **🧵 Synth Purple** (#9b59b6): Integration and synthesis

## 📝 Development

### Scripts

```bash
# Start server
npm start

# Run scanner directly (CLI mode)
npm run scan

# Development mode (with auto-restart)
npm run dev
```

### Adding Custom Service Signatures

Edit `scanner.js` and add to `SERVICE_SIGNATURES`:

```javascript
const SERVICE_SIGNATURES = {
  // ... existing signatures
  '4200': 'Angular Dev Server',
  '8545': 'Ethereum RPC'
};
```

## 🤝 Contributing

Created by **gerico1007** (gerico@jgwill.com)

Part of the Trinity ecosystem:
- ♠️ **Nyro**: The Ritual Scribe
- 🌿 **Aureon**: The Mirror Weaver
- 🎸 **JamAI**: The Glyph Harmonizer
- 🧵 **Synth**: Terminal Orchestrator

## 📜 License

MIT License

---

**"Every log is a memory crystal—let the garden remember every echo!"** 🌿

*Built with ⚡ in Termux*
