## gstack (recommended)

This project uses [gstack](https://github.com/garrytan/gstack) for AI-assisted workflows.
Install it for the best experience:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

Skills like /qa, /ship, /review, /investigate, and /browse become available after install.
Use /browse for all web browsing. Use ~/.claude/skills/gstack/... for gstack file paths.

## Deploy Configuration (configured by /setup-deploy)
- Platform: Dokploy
- Production URL: https://triage.edustardynamics.cloud
- Deploy workflow: Dokploy GitHub deployment from the public-demo branch
- Deploy status command: Dokploy MCP application status
- Merge method: direct public-demo branch
- Project type: static web app
- Post-deploy health check: https://triage.edustardynamics.cloud

### Custom deploy hooks
- Pre-merge: npm test -- --no-cache && npm run build
- Deploy trigger: Dokploy MCP application.deploy
- Deploy status: poll Dokploy deployment and application status
- Health check: https://triage.edustardynamics.cloud
