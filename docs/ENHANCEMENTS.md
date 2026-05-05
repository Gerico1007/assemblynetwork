# AssemblyNetwork Enhancement Set — Service Lifecycle & Terminal Bridges

**Milestone:** [Service Lifecycle & Terminal Bridges](https://github.com/Gerico1007/assemblynetwork/milestone/1)

The five enhancements were built as one connected suite over the night of
2026-05-04. Each one is its own GitHub issue and its own feature branch, but
they layer cleanly: E1 introduces persistent custom services, E2 categorises
both scan and custom records, E3+E4+E5 build the terminal bridge on top of
the categorised model.

| # | Issue | Branch | What it does |
|---|---|---|---|
| E1 | [#4](https://github.com/Gerico1007/assemblynetwork/issues/4) | `feature/e1-paste-link` | Paste a URL → parsed → saved → card; survives restart |
| E2 | [#5](https://github.com/Gerico1007/assemblynetwork/issues/5) | `feature/e2-categories` | `inferCategory()` + filter chips |
| E3 | [#6](https://github.com/Gerico1007/assemblynetwork/issues/6) | `feature/e3-terminal-bridge` | ttyd bridge with readonly + interactive modes |
| E4 | [#7](https://github.com/Gerico1007/assemblynetwork/issues/7) | (same branch) | Per-profile ports + cwd, validated against approved roots |
| E5 | [#8](https://github.com/Gerico1007/assemblynetwork/issues/8) | (same branch) | Persistent vs single-use lifecycle, password rotation |

Integration branch: `integration/all-enhancements` carries all four commits in
linear order.

## Source-of-truth ranking for services

```
user (paste-a-link)  >  configured (terminal profile)  >  scan (auto-discovered)
```

A user-added record for `(device, port)` overrides the scan record for the same
slot. This is enforced both server-side (services-store dedupes by
`device + port`) and client-side (`loadServers()` filters scan rows whose key
matches an existing user row).

## Recursive category rule (♠️ Nyro lattice)

```
explicit category        →  return as-is
agent name regex match   →  agent
port table (ssh|forest|database|dev) →  bucket
http/https protocol      →  web
otherwise                →  unknown
```

This rule is implemented exactly once in `categories.js` and reused by:
- `services-store.addService()` when storing pasted URLs
- `scanner.scanNetwork()` for LAN nmap results
- `scanner.scanTailscalePorts()` per port via `portCategories`
- `public/index.html` `portCategory()` as a UI-side mirror for early labelling

## Mental models

```
Readonly terminal     = watch the room
Interactive terminal  = enter the room and touch the instruments

Single-use terminal   = downbeat, resolves on disconnect
Persistent terminal   = sustained pedal tone, lives until stopped manually

Service card → profile → folder → command → ttyd port → browser terminal
```
