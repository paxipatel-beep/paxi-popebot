#!/usr/bin/env npx tsx
import { Command } from "commander";
import { requireApiKey, config } from "./config.js";
import { HostingerClient } from "./hostinger/client.js";
import { VpsManager } from "./hostinger/vps.js";
import { Deployer } from "./hostinger/deploy.js";
import { checkHealth, printHealthStatus } from "./paperclip/health.js";
import { setupTeam, listTeam } from "./paperclip/setup-team.js";

const program = new Command();

program
  .name("paxi-popebot")
  .description(
    "Deploy Paperclip AI to Hostinger VPS and manage your AI website development team"
  )
  .version("1.0.0");

// --- deploy ---
program
  .command("deploy")
  .description("Deploy Paperclip AI to your Hostinger VPS")
  .option("-v, --vps-id <id>", "Target VPS ID (or set VPS_ID in .env)")
  .action(async (opts) => {
    const apiKey = requireApiKey();
    const client = new HostingerClient(apiKey);
    const deployer = new Deployer(client);
    const vps = new VpsManager(client);

    let vpsId = opts.vpsId || config.hostinger.vpsId;

    if (!vpsId) {
      console.log("No VPS ID specified. Listing available VPS instances...\n");
      const machines = await vps.list();

      if (machines.length === 0) {
        console.error("No VPS instances found on your Hostinger account.");
        process.exit(1);
      }

      for (const vm of machines) {
        console.log(`--- VPS ---`);
        vps.printStatus(vm);
        console.log("");
      }

      if (machines.length === 1) {
        vpsId = String(machines[0].id);
        console.log(`Auto-selecting the only VPS: ${vpsId}\n`);
      } else {
        console.error(
          "Multiple VPS found. Specify one with --vps-id <id> or VPS_ID in .env"
        );
        process.exit(1);
      }
    }

    await deployer.deploy(vpsId);
  });

// --- status ---
program
  .command("status")
  .description("Check VPS and Paperclip status")
  .option("-v, --vps-id <id>", "Target VPS ID")
  .action(async (opts) => {
    const apiKey = requireApiKey();
    const client = new HostingerClient(apiKey);
    const vpsManager = new VpsManager(client);

    const vpsId = opts.vpsId || config.hostinger.vpsId;

    // VPS status
    if (vpsId) {
      console.log("=== VPS Status ===");
      const vm = await vpsManager.get(vpsId);
      vpsManager.printStatus(vm);
      console.log("");

      // Auto-detect Paperclip URL from VPS IP
      const ip = vpsManager.getIpAddress(vm);
      const paperclipUrl = config.paperclip.url || `http://${ip}:3100`;

      console.log("=== Paperclip Status ===");
      const health = await checkHealth(paperclipUrl);
      printHealthStatus(health);
    } else {
      // Just check Paperclip if URL is configured
      if (config.paperclip.url) {
        console.log("=== Paperclip Status ===");
        const health = await checkHealth();
        printHealthStatus(health);
      } else {
        console.log(
          "Set VPS_ID or PAPERCLIP_URL in .env to check status."
        );
      }
    }
  });

// --- team ---
const teamCmd = program
  .command("team")
  .description("Manage the AI website development team");

teamCmd
  .command("setup")
  .description("Register all agents and workflows on your Paperclip instance")
  .action(async () => {
    await setupTeam();
  });

teamCmd
  .command("list")
  .description("List all configured agents and workflows")
  .action(() => {
    listTeam();
  });

// --- vps ---
const vpsCmd = program
  .command("vps")
  .description("Manage Hostinger VPS instances");

vpsCmd
  .command("list")
  .description("List all VPS instances")
  .action(async () => {
    const apiKey = requireApiKey();
    const client = new HostingerClient(apiKey);
    const vpsManager = new VpsManager(client);

    const machines = await vpsManager.list();
    if (machines.length === 0) {
      console.log("No VPS instances found.");
      return;
    }

    for (const vm of machines) {
      console.log("---");
      vpsManager.printStatus(vm);
      console.log("");
    }
  });

vpsCmd
  .command("restart")
  .description("Restart a VPS instance")
  .argument("<id>", "VPS ID")
  .action(async (id: string) => {
    const apiKey = requireApiKey();
    const client = new HostingerClient(apiKey);
    const vpsManager = new VpsManager(client);

    console.log(`Restarting VPS ${id}...`);
    await vpsManager.restart(id);
    console.log("Restart command sent.");
  });

program.parse();
