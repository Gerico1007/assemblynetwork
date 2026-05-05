# E1 — Paste-a-Link smoke test (#4)

Boot: `PORT=9090 node server.js`

```
$ curl /api/services/custom
{"success":true,"count":0,"services":[]}

$ curl -X POST -d '{"url":"https://eury.ferret-harmonic.ts.net:8770/","name":"Conductor"}' /api/services/custom
{"success":true,"service":{"id":"…","name":"Conductor","protocol":"https","host":"eury.ferret-harmonic.ts.net","port":8770,"device":"eury","path":"/","category":null,"source":"user","createdAt":"2026-05-05T…","lastSeen":null}}

$ curl /api/services/custom
{"success":true,"count":1,"services":[…]}

$ curl -X POST -d '{"url":"not a url"}' /api/services/custom
HTTP 400 → {"success":false,"error":"invalid URL"}

$ curl -X DELETE /api/services/custom/<id>
HTTP 200 → {"success":true}
```

Disk artefact at `data/custom-services.json` survives restarts.
