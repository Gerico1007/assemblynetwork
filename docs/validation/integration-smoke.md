# Integration smoke — all enhancements together (#4 #5 #6 #7 #8)

Branch: `integration/all-enhancements` (merges of feature/e1, feature/e2, feature/e3 by linear chain).

## What was exercised

| Path | Outcome |
|---|---|
| `POST /api/services/custom` × 3 distinct URLs | ✓ 3 records created with correct inferred categories (forest/ssh/dev) |
| `GET /api/services/custom` | ✓ list returns 3 entries with `category` populated |
| `GET /api/terminal/services` | ✓ 4 default profiles surfaced (assemblynetwork, hermes, forest, claude) |
| `POST /api/terminal/start/assemblynetwork` | ✓ ttyd PID returned, status running |
| `ss -tlnp` while ttyd is running | ✓ binds to **100.88.23.103:7683** only (tailscale0) — never 0.0.0.0 |
| `POST /api/terminal/stop/assemblynetwork` | ✓ port 7683 freed within 1s |
| Server SIGINT | ✓ no orphan ttyd children from this run |

## Critical safety property reconfirmed

The terminal bridge binds to the Tailscale interface only. This is the
load-bearing contract for every persistent profile, and it holds.

```
LISTEN 0 128 100.88.23.103:7683 0.0.0.0:* users:(("ttyd",pid=...,fd=12))
                ^^^^^^^^^^^^^^^^
                tailscale0 IP
```
