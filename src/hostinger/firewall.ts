import { HostingerClient } from "./client.js";

export interface FirewallRule {
  id?: number;
  protocol: "TCP" | "UDP" | "ICMP";
  port: string;
  source: string;
  source_detail?: string;
}

export class FirewallManager {
  private client: HostingerClient;

  constructor(client: HostingerClient) {
    this.client = client;
  }

  async getRules(vpsId: number | string): Promise<FirewallRule[]> {
    return this.client.get<FirewallRule[]>(
      `/virtual-machines/${vpsId}/firewall`
    );
  }

  async activateFirewall(vpsId: number | string): Promise<void> {
    await this.client.post(`/virtual-machines/${vpsId}/firewall/activate`);
  }

  async syncRules(
    vpsId: number | string,
    rules: FirewallRule[]
  ): Promise<void> {
    await this.client.put(`/virtual-machines/${vpsId}/firewall`, { rules });
  }

  async configurePaperclipRules(vpsId: number | string): Promise<void> {
    console.log("Configuring firewall rules for Paperclip...");

    const rules: FirewallRule[] = [
      { protocol: "TCP", port: "22", source: "any" },
      { protocol: "TCP", port: "80", source: "any" },
      { protocol: "TCP", port: "443", source: "any" },
      { protocol: "TCP", port: "3100", source: "any" },
      { protocol: "ICMP", port: "any", source: "any" },
    ];

    await this.activateFirewall(vpsId);
    await this.syncRules(vpsId, rules);

    console.log("Firewall rules configured:");
    rules.forEach((r) => console.log(`  ${r.protocol} :${r.port} <- ${r.source}`));
  }
}
