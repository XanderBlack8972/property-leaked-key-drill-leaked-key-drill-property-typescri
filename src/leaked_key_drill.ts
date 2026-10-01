import { z } from "zod";
import { InfraiControlPlane } from "./infrai_control_plane.ts";

const timestamp = z.string().datetime({ offset: true });

export const drillRequestSchema = z.object({
  propertyId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  incidentId: z.string().regex(/^[A-Za-z0-9_-]{3,80}$/),
  suspectedSince: timestamp,
  maintenanceRequests: z.array(z.object({
    id: z.string().min(1),
    updatedAt: timestamp,
    summary: z.string().min(1)
  })),
  tenantDocuments: z.array(z.object({
    id: z.string().min(1),
    accessedAt: timestamp,
    kind: z.enum(["lease", "identity", "income-proof"])
  })),
  inspectionReminders: z.array(z.object({
    id: z.string().min(1),
    sentAt: timestamp,
    unit: z.string().min(1)
  }))
});

export type DrillRequest = z.infer<typeof drillRequestSchema>;

export type BlastRadius = {
  maintenanceRequestIds: string[];
  tenantDocumentIds: string[];
  inspectionReminderIds: string[];
  totalRecords: number;
  rotationRequired: boolean;
};

export function assessBlastRadius(input: DrillRequest): BlastRadius {
  const boundary = Date.parse(input.suspectedSince);
  const maintenanceRequestIds = input.maintenanceRequests
    .filter((item) => Date.parse(item.updatedAt) >= boundary)
    .map((item) => item.id);
  const tenantDocumentIds = input.tenantDocuments
    .filter((item) => Date.parse(item.accessedAt) >= boundary)
    .map((item) => item.id);
  const inspectionReminderIds = input.inspectionReminders
    .filter((item) => Date.parse(item.sentAt) >= boundary)
    .map((item) => item.id);
  const totalRecords = maintenanceRequestIds.length + tenantDocumentIds.length + inspectionReminderIds.length;

  return {
    maintenanceRequestIds,
    tenantDocumentIds,
    inspectionReminderIds,
    totalRecords,
    rotationRequired: totalRecords > 0
  };
}

export async function runLeakedKeyDrill(input: DrillRequest, infrai: InfraiControlPlane) {
  const drillKey = await infrai.createDrillKey({
    project_id: input.projectId,
    name: `property-drill-${input.propertyId}`,
    scopes: ["logs:read"],
    idempotency_key: `${input.incidentId}-create`
  });
  await infrai.reportSuspectedCompromise(drillKey.key_id);

  const logs = await infrai.searchLogs();
  const blastRadius = assessBlastRadius(input);
  if (blastRadius.rotationRequired) {
    await infrai.rotateKey(drillKey.key_id, `${input.incidentId}-rotate`);
  }
  await infrai.confirmCompromise(drillKey.key_id);

  return {
    incidentId: input.incidentId,
    drillKeyId: drillKey.key_id,
    stages: ["reported", "logs-searched", blastRadius.rotationRequired ? "rotated" : "rotation-not-needed", "confirmed"],
    blastRadius,
    logSearchCompleted: logs !== undefined
  };
}
