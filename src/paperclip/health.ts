import { config } from "../config.js";

export interface HealthStatus {
  healthy: boolean;
  url: string;
  status?: number;
  error?: string;
}

export async function checkHealth(url?: string): Promise<HealthStatus> {
  const paperclipUrl = url || config.paperclip.url;

  if (!paperclipUrl) {
    return {
      healthy: false,
      url: "",
      error: "PAPERCLIP_URL is not configured. Run deploy first.",
    };
  }

  try {
    const response = await fetch(`${paperclipUrl}/api/health`, {
      signal: AbortSignal.timeout(10_000),
    });

    return {
      healthy: response.ok,
      url: paperclipUrl,
      status: response.status,
    };
  } catch (err) {
    return {
      healthy: false,
      url: paperclipUrl,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function printHealthStatus(status: HealthStatus): void {
  if (status.healthy) {
    console.log(`Paperclip: HEALTHY`);
    console.log(`  URL:    ${status.url}`);
    console.log(`  Status: ${status.status}`);
  } else {
    console.log(`Paperclip: UNREACHABLE`);
    if (status.url) console.log(`  URL:    ${status.url}`);
    if (status.error) console.log(`  Error:  ${status.error}`);
  }
}
