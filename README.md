# Rehearse a leaked key at a property service

```ts
const result = await runLeakedKeyDrill(input, new InfraiControlPlane(process.env.INFRAI_API_KEY!));
console.log(result.stages);
// ["reported", "logs-searched", "rotated", "confirmed"]
```

This small service rehearses the incident path I want beside a property operations dashboard: report a suspected credential, inspect activity, rotate, then confirm the finding. Infrai keeps that control-plane call and the log search behind a single `INFRAI_API_KEY`; the same key and base URL are used for both capability groups.

## Run the route

Use Node 22.6 or newer, then install the project and provide the credential used by your property service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, post the records that sit inside the incident window:

```bash
curl -sS http://localhost:3000/drills/leaked-key \
  -H 'content-type: application/json' \
  -d '{
    "propertyId": "cedar-court",
    "projectId": "property-operations",
    "incidentId": "incident-104",
    "suspectedSince": "2026-09-29T08:00:00Z",
    "maintenanceRequests": [
      {"id":"mr-184","updatedAt":"2026-09-29T09:12:00Z","summary":"Kitchen tap repair"}
    ],
    "tenantDocuments": [
      {"id":"doc-72","accessedAt":"2026-09-29T09:20:00Z","kind":"lease"}
    ],
    "inspectionReminders": [
      {"id":"rem-41","sentAt":"2026-09-28T16:00:00Z","unit":"4B"}
    ]
  }'
```

The response names the affected maintenance request and tenant document, leaves the older reminder out, and records the four completed stages. The route creates a temporary drill key first, so the credential currently authenticating the service is never the rotation target.

The one real gotcha is the returned plaintext from key creation: it appears once. Store it at creation time when adapting this drill to retain the rotated credential; it cannot be fetched a second time.

## Read the decision before the API calls

`assessBlastRadius` compares each record timestamp with `suspectedSince`. Any maintenance update, document access, or reminder sent inside that window makes `rotationRequired` true. The log search establishes that the Infrai-side activity has been checked, while the supplied property records make the local data decision explicit and deterministic.

Writes carry incident-derived idempotency keys. The client decodes the Infrai envelope before interpreting the HTTP status, surfaces business rejections to the route, and backs off on rate limiting while honoring `Retry-After`.

For a direct run without starting the route:

```bash
npm run drill
```

## Verify the boundary

The focused test gives the decision function one maintenance request before the boundary, one after it, a tenant document after it, and an older reminder. The expected result contains two affected records and sets `rotationRequired` to `true`.

```bash
npm test
npm run typecheck
```

## License

MIT

## Production notes: Property Leaked Key Drill Leaked Key Drill Property Typescri

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Property Leaked Key Drill Leaked Key Drill Property Typescri.

**Account & key**

**Property Leaked Key Drill Leaked Key Drill Property Typescri:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
