import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { HostingerClient } from "./client.js";
import { VpsManager } from "./vps.js";
import { FirewallManager } from "./firewall.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PostInstallScript {
  id: number;
  name: string;
  body: string;
}

export class Deployer {
  private client: HostingerClient;
  private vps: VpsManager;
  private firewall: FirewallManager;

  constructor(client: HostingerClient) {
    this.client = client;
    this.vps = new VpsManager(client);
    this.firewall = new FirewallManager(client);
  }

  private loadInstallScript(): string {
    const scriptPath = join(__dirname, "../scripts/vps-install.sh");
    return readFileSync(scriptPath, "utf-8");
  }

  async createPostInstallScript(): Promise<PostInstallScript> {
    console.log("Creating post-install script on Hostinger...");
    const body = this.loadInstallScript();

    const script = await this.client.post<PostInstallScript>(
      "/post-install-scripts",
      {
        name: "paperclip-ai-setup",
        body,
      }
    );

    console.log(`Post-install script created (ID: ${script.id})`);
    return script;
  }

  async listPostInstallScripts(): Promise<PostInstallScript[]> {
    return this.client.get<PostInstallScript[]>("/post-install-scripts");
  }

  async deploy(vpsId: number | string): Promise<void> {
    console.log(`\nDeploying Paperclip AI to VPS ${vpsId}...\n`);

    // Step 1: Verify VPS exists and is running
    console.log("[1/4] Verifying VPS status...");
    const vm = await this.vps.get(vpsId);
    this.vps.printStatus(vm);

    if (vm.state !== "running") {
      console.log("\nVPS is not running. Starting...");
      await this.vps.start(vpsId);
      console.log("VPS start command sent. Waiting for it to come online...");
      await this.waitForState(vpsId, "running");
    }

    // Step 2: Configure firewall
    console.log("\n[2/4] Configuring firewall...");
    await this.firewall.configurePaperclipRules(vpsId);

    // Step 3: Create and attach post-install script
    console.log("\n[3/4] Creating deployment script...");
    const script = await this.createPostInstallScript();

    // Step 4: Trigger VPS setup with the script
    console.log("\n[4/4] Triggering VPS setup with Paperclip install script...");
    await this.client.post(`/virtual-machines/${vpsId}/recreate`, {
      post_install_script_id: script.id,
    });

    const ip = this.vps.getIpAddress(vm);
    console.log("\n=== Deployment Initiated ===");
    console.log(`The VPS is being rebuilt with Paperclip AI.`);
    console.log(`This process takes 5-15 minutes.`);
    console.log(`\nOnce complete, access Paperclip at:`);
    console.log(`  Direct:  http://${ip}:3100`);
    console.log(`  Nginx:   http://${ip}`);
    console.log(`\nMonitor progress:`);
    console.log(`  SSH:     ssh root@${ip} 'tail -f /post_install.log'`);
    console.log(`  Status:  npx tsx src/index.ts status`);
  }

  private async waitForState(
    vpsId: number | string,
    targetState: string,
    maxAttempts = 30
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 10_000));
      const vm = await this.vps.get(vpsId);
      if (vm.state === targetState) {
        console.log(`VPS is now ${targetState}.`);
        return;
      }
      console.log(`  Waiting... (state: ${vm.state})`);
    }
    throw new Error(`VPS did not reach state "${targetState}" in time.`);
  }
}
