import { InfraiControlPlane } from "./infrai_control_plane.ts";
import { drillRequestSchema, runLeakedKeyDrill } from "./leaked_key_drill.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the drill");

const input = drillRequestSchema.parse({
  propertyId: "cedar-court",
  projectId: "property-operations",
  incidentId: "drill-2026-09-29",
  suspectedSince: "2026-09-29T08:00:00+08:00",
  maintenanceRequests: [
    { id: "mr-184", updatedAt: "2026-09-29T09:12:00+08:00", summary: "Kitchen tap repair" }
  ],
  tenantDocuments: [
    { id: "doc-72", accessedAt: "2026-09-29T09:20:00+08:00", kind: "lease" }
  ],
  inspectionReminders: [
    { id: "rem-41", sentAt: "2026-09-28T16:00:00+08:00", unit: "4B" }
  ]
});

console.log(JSON.stringify(await runLeakedKeyDrill(input, new InfraiControlPlane(apiKey)), null, 2));
