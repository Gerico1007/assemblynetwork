# Server Launch Profiles — Working Document

**Status:** WORKING DOCUMENT — Jerry to fill in `?` fields, then ping me to re-read.
**Branch:** `fix/terminal-config-and-ui-polish` (or split into its own branch when ready)
**Goal:** every server card on the dashboard has a **Launch** button; clicking it spawns the configured command (locally on Eury, or via SSH to a tailnet device) so a service can be started from anywhere even if it's currently down.

---

## How to fill this in

For each service below, answer these three when you can:

```
PORT       :
PROTOCOL   :   http | https
CWD        :   absolute path on the host that runs the service
COMMAND    :   the exact start command, e.g. "npm start" or "python app.py"
```

Mark `?` for anything you don't know yet. I won't touch this file — when you're ready, just say "look again" and I'll read it back, generate `data/server-profiles.json`, and start the implementation.

For SSH-launched services on Termux/Android nodes, also note:

```
SSH HOST   :   larix.ferret-harmonic.ts.net (etc.)
SSH PORT   :   8022 for Termux, 22 for Linux
SSH KEY OK :   yes | no | unsure   (can `ssh -p 8022 host "echo ok"` run without a password prompt?)
```

---

## Tailnet nodes (reference)

| Node | Role | Tailscale IP | Platform | SSH default |
|------|------|--------------|----------|-------------|
| Eury | Master orchestrator / Linux hub | 100.88.23.103 | Linux | port 22 |
| Iriko | iPhone controller | 100.74.76.22 | iOS | (no sshd) |
| Ginkgo | iPad Pro visual hub | 100.78.108.48 | iOS | (no sshd) |
| Larix | Android capture unit (Termux) | 100.124.130.110 | Android | port 8022 |
| Ilex | Android capture unit (Termux) | 100.119.147.78 | Android | port 8022 |
| Tilia | Samsung Android capture (Termux) | 100.101.211.92 | Android | port 8022 |

---

## Eury services — local launch

### `assemblynetwork` — AssemblyNetwork Dashboard
- **PORT:** 9000
- **PROTOCOL:** http
- **CWD:** `/home/gmusic/workspace/assemblynetwork`
- **COMMAND:** `npm start`
- **NOTES:** this app itself. Status card; launch from inside itself is a no-op when running.

### `assemblylook` — AssemblyLook Sessions
- **PORT:** ?       *(README says 8000 via `ASSEMBLYLOOK_PORT` env)*
- **PROTOCOL:** http
- **CWD:** `/home/gmusic/workspace/assemblylook`
- **COMMAND:** ?    *(README says `bash ~/.shortcuts/assemblylook-daily.sh` but the script is missing — milestone L1 will fix)*
- **NOTES:** depends on AssemblyLook L1+L5 landing first. Maybe `python -m assemblylook.cli` for now?

### `assembly-voice` — Assembly Voice
- **PORT:** 4444   *(matches the card in your screenshot — confirm)*
- **PROTOCOL:** ?  *(http or https?)*
- **CWD:** `/home/gmusic/workspace/assembly-voice`
- **COMMAND:** `npm start`   *(your example)*
- **NOTES:**

### `naas` — NaaS
- **PORT:** ?
- **PROTOCOL:** ?
- **CWD:** `/home/gmusic/workspace/naas`
- **COMMAND:** ?
- **NOTES:** found in `~/.claude/projects/-home-gmusic-workspace-naas` — what is this project, what does it serve?

### `echothreads` — EchoThreads
- **PORT:** ?
- **PROTOCOL:** ?
- **CWD:** `/home/gmusic/workspace/EchoThreads`
- **COMMAND:** ?
- **NOTES:**

### `forest-eury` — Forest Conductor (eury)
- **PORT:** 8770   *(from your earlier paste-link `https://eury…:8770/`)*
- **PROTOCOL:** https
- **CWD:** ?
- **COMMAND:** ?
- **NOTES:** the "Conductor" card you pasted — what folder/script starts it?

### `gradio` — Gradio
- **PORT:** 8083   *(per scanner KNOWN_PORTS for eury)*
- **PROTOCOL:** http
- **CWD:** ?
- **COMMAND:** ?
- **NOTES:** which gradio app?

### `jupyter` — Jupyter
- **PORT:** 8888
- **PROTOCOL:** http
- **CWD:** ?
- **COMMAND:** ?    *(`jupyter lab`? `jupyter notebook`? a venv to activate first?)*
- **NOTES:**

### `websocket-eury` — WebSocket service
- **PORT:** 8765
- **PROTOCOL:** http
- **CWD:** ?
- **COMMAND:** ?
- **NOTES:** what's running on 8765?

### `assemblylook-eury-10070` — AssemblyLook on 10070?
- **PORT:** 10070
- **PROTOCOL:** http
- **CWD:** ?
- **COMMAND:** ?
- **NOTES:** scanner KNOWN_PORTS lists 10070 as "AssemblyLook Dashboard" on eury. Is this still active or is the AssemblyLook port now 8000? Pick one.

### `eury-4444` — what is on 4444?
- **PORT:** 4444
- **PROTOCOL:** ?
- **CWD:** ?
- **COMMAND:** ?
- **NOTES:** scanner KNOWN_PORTS includes 4444 for eury. The card in your screenshot says `eury:4444` `https`. Is this the same as `assembly-voice` or a separate service? If same, delete this row.

### Add any other Eury service here ↓

---

## Remote services — SSH-launched on Termux/Android

Pattern: dashboard runs `ssh -p PORT host "cd CWD && COMMAND"`. Requires key-auth (no password prompt) and the device to be online with sshd running in Termux.

### `forest-larix` — Forest Capture (Larix)
- **PORT (service):** 8766
- **PROTOCOL:** http
- **SSH HOST:** larix.ferret-harmonic.ts.net
- **SSH PORT:** 8022
- **SSH KEY OK:** ?
- **CWD (on device):** ?
- **COMMAND (on device):** ?
- **NOTES:** what folder/script on Larix runs the Forest service?

### `forest-ilex` — Forest Capture (Ilex)
- **PORT (service):** 8768
- **PROTOCOL:** http
- **SSH HOST:** ilex.ferret-harmonic.ts.net
- **SSH PORT:** 8022
- **SSH KEY OK:** ?
- **CWD (on device):** ?
- **COMMAND (on device):** ?
- **NOTES:** Ilex also has 8766 per scanner — what's on each port?

### `forest-tilia` — Forest Capture (Tilia)
- **PORT (service):** 8768
- **PROTOCOL:** http
- **SSH HOST:** tilia.ferret-harmonic.ts.net
- **SSH PORT:** 8022
- **SSH KEY OK:** ?
- **CWD (on device):** ?
- **COMMAND (on device):** ?
- **NOTES:** Tilia also has 8766 — separate service?

### `tilia-relay-9090` — Tilia Relay
- **PORT (service):** 9090
- **PROTOCOL:** http
- **SSH HOST:** tilia.ferret-harmonic.ts.net
- **SSH PORT:** 8022
- **SSH KEY OK:** ?
- **CWD (on device):** ?
- **COMMAND (on device):** ?
- **NOTES:** scanner labels port 9090 "Tilia Relay" — confirm and supply launch info

### Add any other remote service here ↓

---

## Open meta-questions

1. **SSH key access from Eury → Termux nodes:** are passwordless logins working today? Test:
   ```bash
   ssh -p 8022 larix.ferret-harmonic.ts.net "echo ok"
   ssh -p 8022 ilex.ferret-harmonic.ts.net  "echo ok"
   ssh -p 8022 tilia.ferret-harmonic.ts.net "echo ok"
   ```
   If any prompts for a password, the dashboard cannot launch unattended on that device.

2. **Stop policy:** when the dashboard "stops" a launched local service, should it SIGTERM the process tree (kills all children — recommended for `npm` which spawns node), or just SIGTERM the parent? Same question for SSH-launched services (where the spawned ssh-stub may finish immediately).

3. **Health check:** TCP-connect to the port (fast, no protocol knowledge), or HTTP fetch with 200-OK expected? TCP is the safer default.

4. **Auto-launch on dashboard start:** should ANY profile auto-launch when AssemblyNetwork itself boots, or always require an explicit click? Default: explicit click (safer).

5. **Logs:** keep a small ring buffer (last 200 lines of stderr/stdout) per profile so the UI can show "why didn't it start?" inline?

---

## Schema reference (what gets generated from this doc)

When this doc is filled, it becomes `data/server-profiles.json`:

```json
{
  "serverProfiles": [
    {
      "id": "assembly-voice",
      "name": "Assembly Voice",
      "device": "eury",
      "host": "eury.ferret-harmonic.ts.net",
      "port": 4444,
      "protocol": "https",
      "category": "web",
      "launchTarget": "local",
      "cwd": "/home/gmusic/workspace/assembly-voice",
      "command": "npm",
      "args": ["start"],
      "stopSignal": "SIGTERM",
      "healthCheck": { "type": "tcp", "timeoutMs": 30000 }
    },
    {
      "id": "forest-larix",
      "name": "Forest Capture (Larix)",
      "device": "larix",
      "host": "larix.ferret-harmonic.ts.net",
      "port": 8766,
      "protocol": "http",
      "category": "forest",
      "launchTarget": "ssh",
      "sshHost": "larix.ferret-harmonic.ts.net",
      "sshPort": 8022,
      "sshUser": null,
      "cwd": "/data/data/com.termux/files/home/...",
      "command": "bash",
      "args": ["./run.sh"],
      "healthCheck": { "type": "tcp", "timeoutMs": 30000 }
    }
  ]
}
```

Same security boundary as terminal profiles: this file is the contract; the UI never accepts free-form commands.

---

**Ready when you are. Edit this file, then say "look again."**
