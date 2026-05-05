# E2 — Service categories smoke test (#5)

## Inference unit cases

```
{"port":22}                              → ssh
{"port":8022}                            → ssh
{"port":8770}                            → forest
{"port":5432}                            → database
{"port":8888}                            → dev
{"protocol":"http","port":80}            → web
{"port":9010,"name":"Hermes Agent"}      → agent
{"port":99999}                           → unknown
```

## End-to-end paste-link → category

| URL | Expected | Actual |
|---|---|---|
| `https://eury.ferret-harmonic.ts.net:8770/` | forest | ✅ forest |
| `http://larix.ferret-harmonic.ts.net:8022/` | ssh    | ✅ ssh |
| `http://eury.ferret-harmonic.ts.net:9010/` (named "Hermes Agent") | agent | ✅ agent |
| `http://eury.ferret-harmonic.ts.net:5173/` | dev | ✅ dev |

The `category` field appears on every record returned by `GET /api/services/custom`, and the dashboard filter chips bucket cards correctly. The agent rule (name regex) takes precedence over the port rule, so an HTTP service on a generic port like 9010 still lands in Agents when the user names it accordingly.
