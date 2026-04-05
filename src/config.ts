import "dotenv/config";

export const config = {
  hostinger: {
    apiKey: process.env.HOSTINGER_API_KEY || "",
    baseUrl: "https://developers.hostinger.com/api/vps/v1",
    vpsId: process.env.VPS_ID || "",
  },
  paperclip: {
    url: process.env.PAPERCLIP_URL || "",
    port: 3100,
  },
  ai: {
    openaiKey: process.env.OPENAI_API_KEY || "",
    anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  },
} as const;

export function requireApiKey(): string {
  if (!config.hostinger.apiKey) {
    console.error(
      "Error: HOSTINGER_API_KEY is required. Set it in .env or as an environment variable."
    );
    process.exit(1);
  }
  return config.hostinger.apiKey;
}
