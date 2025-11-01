# ♠️🌿🎸🧵 AssemblyNetwork

**Network Activity Tracking & Service Discovery Dashboard**

A Trinity-powered network monitoring solution that discovers services across your local network and logs all activity with precision timestamps.

## 🎯 Features

- **🔍 Network Scanning**: Automatically discover active services on your local network (192.168.7.0/24)
- **📊 Activity Logging**: Track every network event with ISO 8601 timestamps
- **🎨 Trinity Dashboard**: Beautiful dark-themed UI with color-coded status indicators
- **💾 Redis Storage**: Persistent activity logs using Upstash Redis
- **🔗 Quick Links**: Easy navigation to all your existing services
- **📱 Responsive Design**: Works seamlessly on desktop and mobile

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

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | GET | Trigger network scan |
| `/api/services` | GET | Get discovered services |
| `/api/activity` | GET | Get activity log |
| `/api/check` | POST | Check specific host:port |
| `/api/status` | GET | Server status |

### Examples

```bash
# Scan network
curl http://localhost:9000/api/scan

# Get services
curl http://localhost:9000/api/services

# Get activity log (last 50 events)
curl http://localhost:9000/api/activity?limit=50

# Check specific port
curl -X POST http://localhost:9000/api/check \
  -H "Content-Type: application/json" \
  -d '{"host": "192.168.7.241", "port": 8000}'
```

## 🏗️ Architecture

### ♠️ Nyro - Structural Framework

```
assemblynetwork/
├── server.js           # Express server (port 9000)
├── scanner.js          # Network scanning module (nmap)
├── activity-logger.js  # Upstash Redis integration
├── package.json        # Dependencies
├── .env                # Configuration
└── public/             # Frontend dashboard
    ├── index.html      # Dashboard UI
    ├── styles.css      # Trinity-themed styling
    └── app.js          # Client-side JavaScript
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
```

### Network Scanning

The scanner defaults to `192.168.7.0/24` but can be customized:

```bash
# Scan custom subnet
curl http://localhost:9000/api/scan?subnet=10.0.0.0/24
```

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
