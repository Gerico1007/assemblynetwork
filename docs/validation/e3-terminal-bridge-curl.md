# E3 / E4 / E5 — Terminal bridge smoke test (#6 #7 #8)

## Unit: buildTtydArgs

Inputs go through a pure builder; all flags are array elements (never shell strings).

```
profile {readonly, single-use, tailscale0:7681}
→ ['-i','tailscale0','-p','7681','-c','mia:TESTPW','-m','1','-o','bash']

profile {interactive, persistent, tailscale0:7683}
→ ['-i','tailscale0','-p','7683','-c','mia:TESTPW','-m','1','--writable','bash']
```

## Unit: validateCwd safety

| Input | Outcome |
|---|---|
| `/home/gmusic/workspace/assemblynetwork` | ✓ resolves under approved root |
| `/etc` | ✗ rejected — not under any approved root |
| `/home/gmusic; rm -rf /` | ✗ rejected — shell metacharacters |
| `/home/gmusic/this-does-not-exist-blah` | ✗ rejected — does not exist |

## End-to-end: spawn / status / stop on a real ttyd

`POST /api/terminal/start/assemblynetwork` →

```
status:  running
pid:     <int>
port:    7683
url:     http://eury.ferret-harmonic.ts.net:7683/
password: <16 hex chars, persisted to data/terminal-runtime.json>
```

Verified `ss -tlnp`:

```
LISTEN ... 100.88.23.103:7683 ... users:(("ttyd",pid=...,fd=12))
```

**Bind-interface contract holds:** ttyd is listening on `100.88.23.103` (the
tailscale0 address) ONLY — never on `0.0.0.0`. This is the load-bearing safety
line for every persistent profile.

## Lifecycle paths

| Action | Result |
|---|---|
| `POST start/assemblynetwork` (already running) | idempotent — same pid returned |
| `POST restart/assemblynetwork` | new pid, status running |
| `POST rotate/assemblynetwork` | new password, child re-spawned |
| `POST stop/assemblynetwork` | port 7683 freed within 1s |
| Server `SIGINT` | terminals.shutdownAll() force-kills children, no orphans |

## Conflict-resolution case: port already taken

When the configured port for a profile is already held by another process
(observed: pre-existing `ttyd` from a manual `nyro:hello123` start), our spawn
succeeds momentarily then the child exits with bind error 98 ("Address already
in use") and the profile transitions `running → crashed`. The dashboard surfaces
this state correctly. Resolution: stop the conflicting process or change the
profile port.
