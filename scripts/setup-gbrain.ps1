# Xenboox GBrain Setup — Persistent Agent Memory
# Run this script to install and configure gbrain for agent memory.

Write-Host "=== Xenboox GBrain Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Install gbrain
Write-Host "[1/4] Installing gbrain..." -ForegroundColor Yellow
try {
  npm install -g gbrain
  Write-Host "  ✅ gbrain installed globally" -ForegroundColor Green
} catch {
  Write-Host "  ❌ Failed to install gbrain. Try: npm install -g gbrain" -ForegroundColor Red
  exit 1
}

# 2. Initialize brain directory
Write-Host "[2/4] Initializing brain directory..." -ForegroundColor Yellow
try {
  Set-Location -Path ".brain"
  gbrain init
  Set-Location -Path ".."
  Write-Host "  ✅ Brain initialized in .brain/" -ForegroundColor Green
} catch {
  Write-Host "  ⚠️  Could not init brain. .brain/ already has content." -ForegroundColor Yellow
}

# 3. Verify configuration
Write-Host "[3/4] Verifying configuration..." -ForegroundColor Yellow
$opencodeCfg = Test-Path ".opencode/opencode.json"
$claudeCfg = Test-Path ".claude/settings.json"
if ($opencodeCfg) { Write-Host "  ✅ OpenCode config found" -ForegroundColor Green }
if ($claudeCfg) { Write-Host "  ✅ Claude Code config found" -ForegroundColor Green }

# 4. Start gbrain server
Write-Host "[4/4] Starting gbrain MCP server..." -ForegroundColor Yellow
Write-Host "  Run: gbrain serve"
Write-Host "  Or use the MCP config in .opencode/opencode.json which starts it automatically."

Write-Host ""
Write-Host "=== GBrain Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Start the server:  gbrain serve"
Write-Host "  2. Seed knowledge:     gbrain write entities/ent-001/profile.md '...'"
Write-Host "  3. Query the brain:    gbrain query 'What are the VAT rules?'"
Write-Host "  4. Dream cycle:        gbrain dream  (overnight enrichment)"
Write-Host ""
Write-Host "Requirements:"
Write-Host "  - Node.js 18+         ✅ already installed"
Write-Host "  - PostgreSQL + pgvector — Neon (already in stack)"
Write-Host "  - ~50MB disk for gbrain deps"
