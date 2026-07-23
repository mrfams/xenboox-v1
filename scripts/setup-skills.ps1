# Xenboox Skills Setup — Cross-Agent Skill Installation
# Run this script to install external skill collections for all coding agents.

Write-Host "=== Xenboox External Skills Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Install external skill collections via skills.sh
Write-Host "[1/4] Installing Garry Tan's gstack skills..." -ForegroundColor Yellow
try {
  npx --yes skills add garrytan/gstack
  Write-Host "  ✅ gstack installed" -ForegroundColor Green
} catch {
  Write-Host "  ⚠️  skills.sh not available. Skills provided via .agents/skills/ directly." -ForegroundColor Yellow
}

Write-Host "[2/4] Installing Matt Pocock's skills..." -ForegroundColor Yellow
try {
  npx --yes skills add mattpocock/skills
  Write-Host "  ✅ mattpocock/skills installed" -ForegroundColor Green
} catch {
  Write-Host "  ⚠️  skills.sh not available. Skills provided via .agents/skills/ directly." -ForegroundColor Yellow
}

Write-Host "[3/4] Installing Anthropic's skills..." -ForegroundColor Yellow
try {
  npx --yes skills add anthropics/skills
  Write-Host "  ✅ anthropics/skills installed" -ForegroundColor Green
} catch {
  Write-Host "  ⚠️  skills.sh not available. Skills provided via .agents/skills/ directly." -ForegroundColor Yellow
}

# 2. Verify skill directory
Write-Host "[4/4] Verifying skill directories..." -ForegroundColor Yellow
$skillDirs = Get-ChildItem -Path ".agents/skills" -Directory
Write-Host "  Found $($skillDirs.Count) skills in .agents/skills/" -ForegroundColor Green
foreach ($dir in $skillDirs) {
  $hasSkMd = Test-Path ".agents/skills/$($dir.Name)/SKILL.md"
  $status = if ($hasSkMd) { "✅" } else { "⚠️  missing SKILL.md" }
  Write-Host "    $status $($dir.Name)"
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your coding agents can now discover skills in:"
Write-Host "  .agents/skills/    (cross-agent standard)"
Write-Host "  .opencode/         (OpenCode config)"
Write-Host "  .claude/           (Claude Code config)"
Write-Host ""
Write-Host "To install gbrain for persistent memory:"
Write-Host "  npm install -g gbrain"
Write-Host "  cd .brain && gbrain init"
