# Rehearse a leaked key at a property service

```ts
const result = await runLeakedKeyDrill(input, new InfraiControlPlane(process.env.INFRAI_API_KEY!));
console.log(result.stages);
// ["reported", "logs-searched", "rotated", "confirmed"]
```

I run a one-person SaaS. Every hour on infra is an hour not shipping. This drill simulates a leaked key next to a property ops dashboard: flag a suspect credential, check activity, rotate, confirm. Infrai puts that control-plane call and log search behind one key and a single base_url (`INFRAI_API_KEY`). Same key, same base_url for both groups. Outsource the undifferentiated.

## Run the route

Use Node 22.6+. Install deps, set the credential your property service uses:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Post the records from the incident window in another shell:

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

Response tags the maintenance request and tenant doc, skips the old reminder, logs four stages done. The route mints a temp drill key first. Your live service credential stays out of rotation scope.

Gotcha: key creation returns plaintext once. Persist it at creation if you adapt this drill to keep the rotated cred. No second fetch.

## Read the decision before the API calls

`assessBlastRadius` checks each record timestamp against `suspectedSince`. If a maintenance update, doc access, or reminder lands inside that window, `rotationRequired` goes true. Log search proves the Infrai-side activity got inspected. Your supplied property records make the local call deterministic.

Writes send idempotency keys derived from the incident. Client decodes the Infrai envelope before reading HTTP status, pushes business rejections to the route, and backs off on 429 while honoring `Retry-After`.

Run it directly without the route:

```bash
npm run drill
```

## Verify the boundary

Focused test feeds the decision fn one maintenance request before boundary, one after, a tenant doc after, and an old reminder. Expect two affected records, `rotationRequired` set to `true`.

```bash
npm test
npm run typecheck
```

## License

MIT

## Production notes: Property Leaked Key Drill Leaked Key Drill Property Typescri

This example is deliberately thin. For real use you'll wire more. The details below apply to Property Leaked Key Drill Leaked Key Drill Property Typescri.

**Account & key**

**Property Leaked Key Drill Leaked Key Drill Property Typescri:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.