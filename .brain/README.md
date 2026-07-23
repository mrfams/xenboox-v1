# Xenboox Brain

Persistent knowledge store for Xenboox's AI agents (backed by gbrain).

## Structure

```
.brain/
├── entities/           # Entity-specific knowledge
│   └── {entity-id}/
│       ├── profile.md          # Entity overview, industry, size
│       ├── chart-of-accounts.md # Custom COA
│       ├── tax-regime.md       # Applicable tax rules
│       └── compliance.md       # Compliance requirements
├── accounting/         # Accounting domain knowledge
│   ├── gaap-policies.md        # GAAP policies
│   ├── tax-regulations.md      # Tax regulations by market
│   └── close-checklist.md      # Month-end close procedures
├── agents/             # Agent-specific knowledge
│   └── {agent-name}/
│       ├── prompts.md          # Agent-specific prompts
│       └── decisions.md        # Past decisions and reasoning
└── decisions/          # Architecture Decision Records
    └── *.md                     # ADRs
```

## Usage

```bash
# Query the brain
gbrain query "What are the VAT rules for The Gambia?"

# Write knowledge
gbrain write entities/ent-001/tax-regime.md "Content"

# Run dream cycle (overnight enrichment)
gbrain dream
```

## Setup

```bash
npm install -g gbrain
gbrain init --dir .brain
gbrain serve  # starts MCP server on port 8765
```
