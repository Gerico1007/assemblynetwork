# Terminal Bridge — ttyd profile launcher

**Issues:** [#6](https://github.com/Gerico1007/assemblynetwork/issues/6) · [#7](https://github.com/Gerico1007/assemblynetwork/issues/7) · [#8](https://github.com/Gerico1007/assemblynetwork/issues/8)
**Module:** `terminal-services.js`
**Profiles:** `data/terminal-services.json`
**Runtime:** `data/terminal-runtime.json` (gitignored — passwords)

## Why profiles, not commands

The dashboard never asks the user for a shell command. Every spawn happens from
a named profile in `data/terminal-services.json`. The UI may select a profile,
toggle its mode/lifecycle, and start/stop/restart/rotate it — nothing else. This
collapses an unbounded attack surface to a finite, auditable list.

## Profile schema

```jsonc
{
  "id": "assemblynetwork",                    // stable identifier
  "name": "AssemblyNetwork Dev Terminal",     // human label
  "device": "eury",                           // logical device name
  "host": "eury.ferret-harmonic.ts.net",      // URL host on the dashboard
  "protocol": "http",                         // "http" — ttyd doesn't do TLS itself
  "port": 7683,                               // stable per profile
  "category": "dev",                          // dashboard filter bucket
  "bridge": "ttyd",
  "terminalMode": "interactive",              // "readonly" | "interactive"
  "lifecycle": "persistent",                  // "single-use" | "persistent"
  "cwd": "/home/gmusic/workspace/assemblynetwork",
  "command": "bash",
  "authUser": "mia",
  "bindInterface": "tailscale0",              // NEVER 0.0.0.0
  "maxClients": 1
}
```

## Mode → ttyd flag mapping

| Field | Value | ttyd flag |
|---|---|---|
| `terminalMode` | `readonly` | (no flag — ttyd default is read-only) |
| `terminalMode` | `interactive` | `--writable` |
| `lifecycle` | `single-use` | `-o` |
| `lifecycle` | `persistent` | (no `-o`; ttyd stays alive) |
| `bindInterface` | always | `-i <iface>` |
| `authUser` + password | always | `-c user:password` |
| `maxClients` | always | `-m <n>` |

The argv builder is a pure function in `buildTtydArgs(profile, password)`.

## Password lifecycle

Resolution order on `start`:

1. Per-profile env: `TTYD_PASSWORD_<ID>` (e.g. `TTYD_PASSWORD_ASSEMBLYNETWORK`)
2. Shared env: `TTYD_PASSWORD`
3. Stored in `data/terminal-runtime.json` (from a previous spawn)
4. Generate fresh 16-hex-char password and persist

`POST /api/terminal/rotate/:id` regenerates the password and restarts the
process. The new password is included in the next `GET /api/terminal/status/:id`
response (the dashboard runs on the same host and over the tailnet, so direct
return is acceptable).

## Approved roots — the `cwd` whitelist

Any `cwd` that doesn't `path.resolve()` to a path under one of these roots is
rejected by `validateCwd()`:

```
/home/gmusic
/home/gmusic/workspace
/home/gmusic/salix/repos
/home/gmusic/.hermes
/tmp/an-test                  (reserved for tests)
```

The list lives in code (`terminal-services.js`), not in config — config edits
must not be able to escalate the trust boundary.

`validateCwd()` also rejects shell metacharacters (`` ` $ ; & | < > ( ) { } \ " ' ``
plus newlines) before the path even reaches the filesystem.

## Spawn safety

ttyd is started via `child_process.spawn('ttyd', argsArray, { cwd, env })`.

- Args are an **array** — no shell interpolation, no `exec()`.
- `cwd` is enforced via the spawn options object (the OS sets the working
  directory; the command line never sees it).
- `env` is a copy of `process.env` — no surprise shell features.

## Process bookkeeping

A single in-memory `Map<id, runtimeState>` tracks `pid`, `status`, `startedAt`,
`password`, and a small stderr ring buffer. **PIDs never persist to disk** —
restarts are fresh starts.

- `isPidAlive(pid)` calls `process.kill(pid, 0)` to verify status before
  reporting "running" — never trust a stale pid.
- `stop()` sends SIGTERM, schedules a SIGKILL escalation at 3 s.
- `child.on('exit', …)` marks the profile `stopped` (clean), `crashed`
  (non-zero), or `stopped` (signaled) and clears the pid.
- On dashboard SIGINT/SIGTERM, `shutdownAll()` force-kills every tracked child
  before exiting.

## Mental model

```
Card → Profile → cwd → command → ttyd:port → browser terminal
            ↑        ↑           ↑
        gated    pure-spawn   tailscale0 only
```
