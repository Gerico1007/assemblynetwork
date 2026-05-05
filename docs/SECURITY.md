# Security Notes — AssemblyNetwork Dashboard

The dashboard's threat model assumes:

1. The host (Eury) and every Tailscale peer in `ferret-harmonic.ts.net` are
   trusted devices owned by Jerry ⚡.
2. The public internet is **not** trusted.
3. Anyone with shell access on Eury already controls the dashboard, so we
   defend the **network boundary**, not host-local privilege.

Concrete consequences below.

## Terminal bridge — load-bearing controls

| Control | Where | Why |
|---|---|---|
| `-i tailscale0` is injected unconditionally | `buildTtydArgs()` in `terminal-services.js` | ttyd never binds to `0.0.0.0`; only Tailscale peers can reach it |
| Basic auth `-c user:password` always set | same | even on a private network, every hop is authenticated |
| Approved-roots whitelist for `cwd` | `validateCwd()` | configuration alone cannot start a shell rooted in `/etc` or `/var` |
| Shell-metachar reject for `cwd` | `validateCwd()` | belt-and-braces against config-injection |
| `spawn(cmd, args, {cwd})` (array, not string) | `startProcess()` | no shell, no interpolation, no surprise globbing |
| `--writable` only when interactive | argv builder | readonly is the safe default |
| `-m 1` (one client per session) | profile default | sensitive sessions don't multiplex unknowns |
| Passwords gitignored (`data/terminal-runtime.json`) | `.gitignore` | no accidental commits of generated secrets |

## Verification

The integration smoke test confirms the bind:

```
$ ss -tlnp | grep ttyd
LISTEN 0 128 100.88.23.103:7683 0.0.0.0:* users:(("ttyd",pid=...,fd=12))
              ^^^^^^^^^^^^^^^^
              tailscale0 (Eury)
```

**Never** `0.0.0.0:7683`. If you ever see that, stop the process immediately
and check `bindInterface` in the affected profile.

## What the UI cannot do

- Submit raw shell commands
- Edit `cwd` to an arbitrary path
- Disable `tailscale0` binding
- Disable Basic Auth
- Push to public network interfaces

The UI is restricted to: select a profile, toggle mode, toggle lifecycle,
start/stop/restart/rotate-password.

## Persistent terminals — operator's responsibility

A persistent profile means: **the bridge stays running until you stop it from
the dashboard**. Treat it the way you'd treat a `tmux` session left attached on
a server: visible, named, and turned off when you walk away. The dashboard puts
a "persistent" badge on these cards so they don't disappear into the noise.

## Activity logging

All add/remove/start/stop/rotate events emit an activity record with the
relevant id, pid, mode, and lifecycle. If `UPSTASH_REDIS_REST_TOKEN` is set,
those records persist; otherwise they are silently dropped (the dashboard still
works, it just has no historical activity feed).

## What to check on a new device

When deploying this dashboard on a new node:

1. Confirm `tailscale0` is up: `ip -4 addr show tailscale0`
2. Confirm `ttyd` is installed: `ttyd --version`
3. Edit `data/terminal-services.json` so `host` matches that device's tailnet
   DNS name (e.g. `larix.ferret-harmonic.ts.net`).
4. Edit the approved-roots list in `terminal-services.js` if your home/work
   layout differs from `/home/gmusic/...`.
5. Set `TTYD_PASSWORD` in `.env` if you want a known password instead of the
   auto-generated one.
