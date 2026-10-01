import assert from "node:assert/strict";
import test from "node:test";
import { assessBlastRadius, drillRequestSchema } from "../src/leaked_key_drill.ts";

test("rotates when property records changed inside the suspected window", () => {
  const input = drillRequestSchema.parse({
    propertyId: "cedar-court",
    incidentId: "incident-104",
    suspectedSince: "2026-09-29T08:00:00Z",
    maintenanceRequests: [
      { id: "mr-before", updatedAt: "2026-09-29T07:59:59Z", summary: "Lift inspection" },
      { id: "mr-inside", updatedAt: "2026-09-29T08:30:00Z", summary: "Boiler repair" }
    ],
    tenantDocuments: [
      { id: "lease-inside", accessedAt: "2026-09-29T09:00:00Z", kind: "lease" }
    ],
    inspectionReminders: [
      { id: "rem-before", sentAt: "2026-09-28T12:00:00Z", unit: "2A" }
    ]
  });

  assert.deepEqual(assessBlastRadius(input), {
    maintenanceRequestIds: ["mr-inside"],
    tenantDocumentIds: ["lease-inside"],
    inspectionReminderIds: [],
    totalRecords: 2,
    rotationRequired: true
  });
});
