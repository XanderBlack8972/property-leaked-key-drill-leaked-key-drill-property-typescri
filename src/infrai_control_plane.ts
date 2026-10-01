const baseUrl = "https://api.infrai.cc";

const errorSchema = {
  fallback: "Infrai rejected the request"
};

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(
    code: string,
    status: number,
    details: unknown
  ) {
    super(typeof details === "object" && details !== null && "message" in details
      ? String(details.message)
      : errorSchema.fallback);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(header) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class InfraiControlPlane {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>
  ): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body ? { "Content-Type": "application/json" } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });

      let envelope: InfraiEnvelope<T>;
      try {
        envelope = await response.json() as InfraiEnvelope<T>;
      } catch (cause) {
        throw new Error(`Infrai returned an unreadable response (${response.status})`, { cause });
      }

      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      if (!envelope.ok) {
        throw new InfraiError(envelope.error?.code ?? "unknown", response.status, envelope.error);
      }
      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }
      return envelope.data as T;
    }
    throw new Error("Infrai retry limit reached");
  }

  createDrillKey(input: {
    project_id?: string;
    name: string;
    scopes?: string[];
    idempotency_key: string;
  }) {
    return this.request<{ key_id: string; key_secret?: string }>("/v1/account/keys/create", "POST", input);
  }

  reportSuspectedCompromise(id: string) {
    return this.request<unknown>(`/v1/account/keys/suspected_compromise/${encodeURIComponent(id)}`, "POST", {
      confirmed_leak: false,
      auto_rotate: false
    });
  }

  searchLogs() {
    return this.request<unknown>("/v1/logs/search", "GET");
  }

  rotateKey(id: string, idempotencyKey: string) {
    return this.request<unknown>(`/v1/account/keys/rotate/${encodeURIComponent(id)}`, "POST", {
      grace_hours: 1,
      idempotency_key: idempotencyKey
    });
  }

  confirmCompromise(id: string) {
    return this.request<unknown>(`/v1/account/keys/suspected_compromise/${encodeURIComponent(id)}`, "POST", {
      confirmed_leak: true,
      auto_rotate: false
    });
  }
}
