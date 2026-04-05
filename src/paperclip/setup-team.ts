import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEAM_DIR = join(__dirname, "../../team");

export interface AgentConfig {
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  model: string;
  provider: string;
  budget: { monthly: number; currency: string };
  heartbeat: { enabled: boolean; interval: string };
  tools: string[];
  tags: string[];
}

export interface CompanyConfig {
  name: string;
  description: string;
  settings: Record<string, unknown>;
}

export interface WorkflowConfig {
  name: string;
  description: string;
  steps: { agent: string; task: string; dependsOn?: string[] }[];
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function loadCompany(): CompanyConfig {
  return loadJson<CompanyConfig>(join(TEAM_DIR, "company.json"));
}

export function loadAgents(): AgentConfig[] {
  const agentsDir = join(TEAM_DIR, "agents");
  const files = readdirSync(agentsDir).filter((f) => f.endsWith(".json"));
  return files.map((f) => loadJson<AgentConfig>(join(agentsDir, f)));
}

export function loadWorkflows(): WorkflowConfig[] {
  const workflowsDir = join(TEAM_DIR, "workflows");
  const files = readdirSync(workflowsDir).filter((f) => f.endsWith(".json"));
  return files.map((f) => loadJson<WorkflowConfig>(join(workflowsDir, f)));
}

async function paperclipApi<T>(
  endpoint: string,
  method: string = "GET",
  body?: unknown
): Promise<T> {
  const url = `${config.paperclip.url}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Paperclip API error (${response.status}): ${text}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function setupTeam(): Promise<void> {
  console.log("Setting up AI Website Development Team on Paperclip...\n");

  if (!config.paperclip.url) {
    console.error(
      "Error: PAPERCLIP_URL is required. Set it in .env after deploying."
    );
    process.exit(1);
  }

  // Load configs
  const company = loadCompany();
  const agents = loadAgents();
  const workflows = loadWorkflows();

  // Create company
  console.log(`Creating company: ${company.name}`);
  await paperclipApi("/api/companies", "POST", company);
  console.log("  Company created.\n");

  // Register agents
  console.log(`Registering ${agents.length} agents:`);
  for (const agent of agents) {
    console.log(`  -> ${agent.name} (${agent.role})`);
    await paperclipApi("/api/agents", "POST", agent);
  }
  console.log("");

  // Register workflows
  console.log(`Registering ${workflows.length} workflows:`);
  for (const workflow of workflows) {
    console.log(`  -> ${workflow.name}`);
    await paperclipApi("/api/workflows", "POST", workflow);
  }

  console.log("\n=== Team Setup Complete ===");
  console.log(`  Company:   ${company.name}`);
  console.log(`  Agents:    ${agents.length}`);
  console.log(`  Workflows: ${workflows.length}`);
  console.log(`  Dashboard: ${config.paperclip.url}`);
}

export function listTeam(): void {
  console.log("AI Website Development Team\n");

  const company = loadCompany();
  console.log(`Company: ${company.name}`);
  console.log(`${company.description}\n`);

  const agents = loadAgents();
  console.log(`Agents (${agents.length}):`);
  for (const agent of agents) {
    console.log(`  ${agent.name}`);
    console.log(`    Role:     ${agent.role}`);
    console.log(`    Model:    ${agent.provider}/${agent.model}`);
    console.log(`    Budget:   $${agent.budget.monthly}/mo`);
    console.log(`    Tags:     ${agent.tags.join(", ")}`);
    console.log("");
  }

  const workflows = loadWorkflows();
  console.log(`Workflows (${workflows.length}):`);
  for (const wf of workflows) {
    console.log(`  ${wf.name}: ${wf.description}`);
  }
}
