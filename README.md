# paxi-popebot

Deploy [Paperclip AI](https://github.com/paperclipai/paperclip) to a Hostinger VPS and configure a full AI website development team.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your API keys
```

## Commands

```bash
# Deploy Paperclip AI to your VPS
npx tsx src/index.ts deploy

# Check VPS and Paperclip status
npx tsx src/index.ts status

# Set up the AI dev team on Paperclip
npx tsx src/index.ts team setup

# List configured agents and workflows
npx tsx src/index.ts team list

# List all VPS instances
npx tsx src/index.ts vps list
```

## AI Development Team

| Agent | Role |
|-------|------|
| ProjectManager | Plans, assigns tasks, tracks progress |
| FrontendDev | React/Next.js, responsive UI, accessibility |
| BackendDev | APIs, databases, auth, integrations |
| UIDesigner | Design systems, layouts, component specs |
| QATester | Automated testing, bug reporting, QA |
| DevOps | CI/CD, Docker, deployment, monitoring |

## Workflows

- **Build New Website** — Full end-to-end website build
- **Bug Fix** — Triage, fix, test, deploy
- **Production Deploy** — Pre-flight checks, deploy, verify

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HOSTINGER_API_KEY` | Hostinger API bearer token |
| `VPS_ID` | Target VPS ID (optional) |
| `PAPERCLIP_URL` | Paperclip instance URL |
| `OPENAI_API_KEY` | For OpenAI-powered agents |
| `ANTHROPIC_API_KEY` | For Claude-powered agents |
