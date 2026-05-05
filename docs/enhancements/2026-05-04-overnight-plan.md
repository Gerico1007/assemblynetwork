# AssemblyNetwork Enhancement Report Notes

## Enhancement 1: Paste-a-Link Parser for Persistent Services

### Goal
Add a way in the dashboard to paste a visible service link, have the system parse it, and save it so the service appears again after the server restarts.

### User workflow
1. User copies a URL such as:
   - `http://larix.ferret-harmonic.ts.net:8768/`
   - `https://eury.ferret-harmonic.ts.net:8770/`
2. User pastes it into the dashboard.
3. Parser extracts:
   - protocol: `http` or `https`
   - host/device: `larix`, `tilia`, `ilex`, `eury`, etc.
   - full DNS host: for example `larix.ferret-harmonic.ts.net`
   - port: for example `8768`
   - optional path: for example `/api/status`
4. Dashboard creates or updates a service card in the correct space.
5. Saved service persists across server restarts.

### Why it matters
Current scanning discovers open ports, but does not reliably know whether a service should open with HTTP or HTTPS. A pasted URL gives the system direct protocol knowledge and lets the dashboard evolve as new services appear.

### Proposed storage model
Save user-added services in a persistent file, for example:

```json
{
  "services": [
    {
      "name": "Conductor",
      "device": "eury",
      "host": "eury.ferret-harmonic.ts.net",
      "protocol": "https",
      "port": 8770,
      "path": "/",
      "source": "user",
      "createdAt": "2026-05-04T00:00:00.000Z",
      "lastSeen": null
    }
  ]
}
```

### Backend idea
Add endpoints:

```text
POST /api/services/custom
GET  /api/services/custom
DELETE /api/services/custom/:id
```

### Parser behavior
Use the JavaScript `URL` parser instead of manual string splitting:

```js
const parsed = new URL(input);
const protocol = parsed.protocol.replace(':', '');
const host = parsed.hostname;
const port = parsed.port ? Number(parsed.port) : (protocol === 'https' ? 443 : 80);
const device = host.split('.')[0];
const path = parsed.pathname || '/';
```

### UI idea
Add a small "Paste link" input/button near the Scan button:

```text
[ paste service URL... ] [ Add ]
```

After adding, show the service immediately as a card and save it persistently.

### Open design question
Should pasted services be merged with discovered scan results when they match the same `device + port`, or should user-added services remain separate and override scanned services?

Recommended: user-added service metadata should override scan guesses for the same `device + port`.


## Enhancement 2: Service Type Filters and Agent Session Category

### Goal
Add richer filtering so the dashboard can separate different kinds of services instead of only showing everything as generic server cards.

### Desired filter categories
Possible high-level filters:

```text
All
Online
Offline
Tailscale
SSH
Web Portals
Forest / Recorder
Agents
Databases
Dev Servers
Unknown
```

### Immediate user need
The user wants to filter services by type, especially:

- SSH connections
- Web portals
- Agent sessions or agent UIs

### Examples
SSH services:

```text
ssh://eury:22
ssh://ilex:8022
ssh://larix:8022
ssh://tilia:8022
```

Web portals:

```text
http://eury.ferret-harmonic.ts.net:9000
http://eury.ferret-harmonic.ts.net:8000
https://eury.ferret-harmonic.ts.net:8770
```

Agent sessions / agent portals:

```text
Hermes
Claude
Gemini
Codex
A2A agents
custom terminal sessions
```

### Proposed data model addition
Add a `type` or `category` field to each service:

```json
{
  "name": "Hermes Agent",
  "device": "eury",
  "host": "eury.ferret-harmonic.ts.net",
  "protocol": "http",
  "port": 9010,
  "path": "/",
  "category": "agent",
  "source": "user"
}
```

Recommended categories:

```js
const SERVICE_CATEGORIES = {
  ssh: 'SSH',
  web: 'Web Portal',
  forest: 'Forest Recorder',
  agent: 'Agent Session',
  database: 'Database',
  dev: 'Dev Server',
  unknown: 'Unknown'
};
```

### Detection rules
The system can auto-classify using protocol, port, and service name:

```js
function inferCategory({ port, protocol, name }) {
  if ([22, 8022].includes(Number(port))) return 'ssh';
  if (['http', 'https'].includes(protocol)) return 'web';
  if ([8768, 8770].includes(Number(port))) return 'forest';
  if (/hermes|claude|gemini|codex|agent|a2a/i.test(name || '')) return 'agent';
  if ([3306, 5432, 6379, 27017].includes(Number(port))) return 'database';
  if ([3000, 5173, 8000, 8080, 8083, 8888, 9000].includes(Number(port))) return 'dev';
  return 'unknown';
}
```

### UI idea
Add filter chips or tabs:

```text
[All] [SSH] [Web] [Forest] [Agents] [Dev] [Unknown]
```

Each card should show category badges, for example:

```text
Hermes Agent (eury)
http://eury.ferret-harmonic.ts.net:9010/
[agent] [http] [eury] [:9010] [user]
```

### Agent exposure idea
The user ultimately wants to expose local/remote agent sessions such as Hermes, Claude, Gemini, or Codex through ports where possible.

Potential approaches:

1. Agent web UI if the tool provides one.
2. Terminal-over-web wrapper for CLI agents.
3. Local HTTP control bridge that exposes safe actions/status only.
4. Tailscale-only access for privacy and safety.

### Safety and access note
Agent sessions should not be exposed publicly by default. Recommended baseline:

- Bind to localhost or Tailscale IP only.
- Require authentication or a local secret token.
- Mark agent cards clearly as `agent`.
- Avoid exposing raw shell access unless intentionally gated.

### Open design question
Should an agent card open a web terminal/session directly, or should it open a safe status/control page first?

Recommended: safe status/control page first, with optional terminal access behind a deliberate action.


## Enhancement 3: ttyd Terminal Bridge Modes for Agent and Server Access

### Goal
Use `ttyd` as a browser-accessible terminal bridge for observing or interacting with servers, agent sessions, and command-line tools from the AssemblyNetwork dashboard.

### Core concept
ttyd can expose a terminal session through the browser. For the prototype, the dashboard should understand two distinct modes:

```text
Readonly terminal
Interactive terminal
```

Readonly mode is safer for observation, demos, logs, status screens, and agent output. Interactive mode allows keyboard input and should be treated as higher-risk access.

### Important ttyd behavior
- ttyd is read-only by default from the browser client perspective.
- Browser keyboard input is enabled only when ttyd is launched with `-W` or `--writable`.
- Basic Auth is configured at launch time with `-c username:password`.
- Changing the password means restarting ttyd with a new `-c` value.
- Password changes are startup configuration changes, not in-browser session settings.

### Example commands
Readonly viewer mode:

```bash
ttyd -i tailscale0 -p 7681 -c mia:VIEW_ONLY_PASSWORD -m 1 -o -O bash
```

Interactive writable mode:

```bash
ttyd -i tailscale0 -p 7681 -c mia:INTERACTIVE_PASSWORD -m 1 -o -O --writable bash
```

Rotate password:

```bash
pkill ttyd
ttyd -i tailscale0 -p 7681 -c mia:NEW_PASSWORD -m 1 -o -O --writable bash
```

### Dashboard service model
A ttyd service card should include fields like:

```json
{
  "name": "Hermes Terminal",
  "device": "eury",
  "host": "eury.ferret-harmonic.ts.net",
  "protocol": "http",
  "port": 7681,
  "category": "agent",
  "terminalMode": "readonly",
  "bridge": "ttyd",
  "auth": "basic",
  "bindInterface": "tailscale0",
  "source": "user"
}
```

### UI behavior
The dashboard should visually distinguish terminal modes:

```text
[Readonly terminal]
[Interactive terminal]
```

Recommended card actions:

```text
Open terminal
Recheck
Enable input
Rotate password
Restart bridge
```

### Recommended default
Default to readonly mode. Interactive mode should require an explicit action, confirmation, or separate password.

### Safety baseline
- Bind ttyd to `tailscale0` or another private interface only.
- Avoid exposing raw terminal access publicly.
- Use Basic Auth at minimum.
- Prefer one client with `-m 1` for sensitive sessions.
- Consider separate passwords for viewer mode and interactive mode.
- Clearly label writable sessions.

### Agent session use case
This creates a path to expose command-line agents such as:

```text
Hermes
Claude
Gemini
Codex
custom local agents
```

The dashboard can treat these as `category: agent` with `bridge: ttyd`, allowing the user to open a web terminal from a card while preserving the distinction between viewing and controlling.

### Prototype design note
A good mental model for the dashboard:

```text
Readonly terminal = watch the room
Interactive terminal = enter the room and touch the instruments
```

This distinction should be present in service metadata, card labels, and control actions.


## Enhancement 4: Per-Service Terminal Ports and Launch Working Directory

### Goal
Allow each terminal-backed service to run on its own dedicated port, with an optional configured working directory (`pwd`) where the command/session should start.

### User intent
The user wants:

- a different port per service
- a way to specify the folder where the terminal should launch
- dashboard buttons/forms that start those terminal services from Eury
- access from any device on the Tailscale network using the right password

### Recommended model
Each terminal service should be declared as a controlled launch profile, not as arbitrary user-entered shell commands.

Example service profiles:

```json
{
  "terminalServices": [
    {
      "id": "hermes-main",
      "name": "Hermes Main Terminal",
      "device": "eury",
      "host": "eury.ferret-harmonic.ts.net",
      "protocol": "http",
      "port": 7681,
      "category": "agent",
      "bridge": "ttyd",
      "mode": "interactive",
      "cwd": "/home/gmusic/.hermes",
      "command": "bash",
      "authUser": "mia",
      "bindInterface": "tailscale0",
      "source": "configured"
    },
    {
      "id": "forest-dev",
      "name": "Forest Dev Terminal",
      "device": "eury",
      "host": "eury.ferret-harmonic.ts.net",
      "protocol": "http",
      "port": 7682,
      "category": "dev",
      "bridge": "ttyd",
      "mode": "interactive",
      "cwd": "/home/gmusic/salix/repos/gmtermux",
      "command": "bash",
      "authUser": "mia",
      "bindInterface": "tailscale0",
      "source": "configured"
    },
    {
      "id": "assemblynetwork",
      "name": "AssemblyNetwork Terminal",
      "device": "eury",
      "host": "eury.ferret-harmonic.ts.net",
      "protocol": "http",
      "port": 7683,
      "category": "dev",
      "bridge": "ttyd",
      "mode": "interactive",
      "cwd": "/home/gmusic/workspace/assemblynetwork",
      "command": "bash",
      "authUser": "mia",
      "bindInterface": "tailscale0",
      "source": "configured"
    }
  ]
}
```

### Launch command pattern
The backend should launch ttyd with an explicit working directory:

```bash
cd /home/gmusic/workspace/assemblynetwork && \
ttyd -i tailscale0 -p 7683 -c mia:PASSWORD -m 1 -o -O --writable bash
```

Or with a safer script wrapper:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /home/gmusic/workspace/assemblynetwork
exec ttyd -i tailscale0 -p 7683 -c "mia:${TTYD_PASSWORD}" -m 1 -o -O --writable bash
```

### Backend endpoint idea
Add controlled endpoints:

```text
GET  /api/terminal/services
POST /api/terminal/start/:id
POST /api/terminal/stop/:id
POST /api/terminal/restart/:id
GET  /api/terminal/status/:id
```

### UI idea
Each terminal service card can show:

```text
Hermes Main Terminal
Device: eury
Port: 7681
Folder: /home/gmusic/.hermes
Mode: Interactive

[Start] [Open] [Stop] [Restart] [Rotate Password]
```

### Port strategy
Use a stable dedicated port per service:

```text
7681 → Hermes terminal
7682 → Forest dev terminal
7683 → AssemblyNetwork terminal
7684 → Claude terminal
7685 → Gemini terminal
7686 → Codex terminal
```

Stable ports are preferred over dynamic ports because they make cards, bookmarks, saved links, and troubleshooting easier.

### Important safety rule
The UI should let the user choose from configured launch profiles, not type arbitrary shell commands into a web form.

Allowed from UI:

```text
service id
mode readonly/interactive
password/token action
start/stop/restart
```

Avoid from UI:

```text
raw shell command
unvalidated folder path
public network bind
```

### Folder validation
If the UI allows editing `cwd`, backend should validate it:

- must exist
- must be a directory
- should be under approved roots such as `/home/gmusic`, `/home/gmusic/workspace`, `/home/gmusic/salix/repos`
- should reject paths with shell metacharacters

### Recommended implementation approach
1. Create a persistent `terminal-services.json` config.
2. Create start/stop/status backend endpoints.
3. Start ttyd from controlled profiles.
4. Save each terminal profile as a normal dashboard service card.
5. Use the existing filter system with `category: agent` or `category: dev`.

### Mental model
Each terminal-backed service is a named portal:

```text
card → profile → folder → command → ttyd port → browser terminal
```


## Enhancement 5: Persistent / Never-Ending Terminal Mode with Safety Controls

### Goal
Add an option for terminal services that stay running even after the browser disconnects, while keeping them safe, private, and manageable.

### User intent
The user wants a `never ending terminal` option, meaning:

- ttyd keeps running after the browser closes
- the terminal remains available from any authorized device on the Tailscale network
- the dashboard can still show status and allow stop/restart
- safety controls prevent uncontrolled remote shell exposure

### ttyd behavior to model
Avoid `--once` / `-o` for persistent terminals.

Do not use this for persistent mode:

```bash
ttyd -i tailscale0 -p 7681 -c nyro:password -m 1 -o --writable bash
```

Because `-o` means one client only, then exit after disconnect.

Persistent interactive example:

```bash
ttyd -i tailscale0 -p 7681 -c nyro:password -m 1 --writable bash
```

Persistent readonly example:

```bash
ttyd -i tailscale0 -p 7681 -c nyro:password -m 2 bash
```

### Proposed terminal modes
Add a `lifecycle` field:

```json
{
  "mode": "interactive",
  "lifecycle": "persistent"
}
```

Possible lifecycle values:

```text
single-use     → uses --once, exits after disconnect
persistent     → stays alive until stopped manually
scheduled      → starts/stops according to schedule
idle-timeout   → stops after no clients for a configured delay
```

### Recommended safe persistent profile
A persistent terminal should include:

```json
{
  "id": "assemblynetwork-persistent",
  "name": "AssemblyNetwork Persistent Terminal",
  "device": "eury",
  "host": "eury.ferret-harmonic.ts.net",
  "protocol": "http",
  "port": 7683,
  "category": "dev",
  "bridge": "ttyd",
  "mode": "interactive",
  "lifecycle": "persistent",
  "cwd": "/home/gmusic/workspace/assemblynetwork",
  "command": "bash",
  "authUser": "nyro",
  "bindInterface": "tailscale0",
  "maxClients": 1,
  "writable": true,
  "once": false,
  "source": "configured"
}
```

### Dashboard UI labels
Use clear mode labels:

```text
Readonly terminal
Interactive terminal
Single-use terminal
Persistent terminal
```

For persistent terminals, show a visible warning badge:

```text
Persistent: stays running until stopped
```

### UI actions
Persistent terminal cards should support:

```text
Start
Open
Stop
Restart
Rotate password
Show status
Show uptime
```

Optional:

```text
Lock input
Unlock input
Switch to readonly
Kill all clients
```

### Safety controls
Recommended baseline for never-ending terminals:

1. Bind only to Tailscale:

```bash
-i tailscale0
```

2. Require Basic Auth:

```bash
-c nyro:STRONG_PASSWORD
```

3. Limit clients:

```bash
-m 1
```

4. Do not use `--once` for persistent mode.

5. Do not expose to public interfaces.

6. Use predefined launch profiles instead of arbitrary shell commands from the UI.

7. Save PID or process metadata so the dashboard can stop/restart it safely.

8. Clearly show whether terminal input is writable.

### Backend process tracking
The backend should store runtime state for each terminal profile:

```json
{
  "id": "assemblynetwork-persistent",
  "pid": 12345,
  "status": "running",
  "startedAt": "2026-05-04T00:00:00.000Z",
  "port": 7683,
  "url": "http://eury.ferret-harmonic.ts.net:7683"
}
```

### Safer launch wrapper
Use a script or controlled spawn call. Example command pattern:

```bash
cd /home/gmusic/workspace/assemblynetwork && \
ttyd -i tailscale0 -p 7683 -c "nyro:${TTYD_PASSWORD}" -m 1 --writable bash
```

### Recommended implementation approach
1. Add `lifecycle` to terminal service profiles.
2. Map `single-use` to `--once`.
3. Map `persistent` to no `--once`.
4. Add PID tracking for started ttyd processes.
5. Add stop/restart/status endpoints.
6. Show persistent status clearly in the UI.
7. Default new terminals to readonly or single-use, but allow persistent as an advanced option.

### Mental model
Persistent terminal means:

```text
Launch once → keep bridge alive → reconnect later → stop manually from dashboard
```

It is useful for long-running dev sessions, agent supervision, and shared observation, but it must be visibly labeled and controlled.

