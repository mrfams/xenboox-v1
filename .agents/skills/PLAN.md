# Xenboox Skill System Plan

## Overview

Build a comprehensive AI skill system with 40+ specialized personas that auto-fire based on task context. Hybrid approach: install popular community skills + create custom business-specific skills.

## Architecture

```
.agents/skills/
├── community/                    # Installed community skills
│   ├── leadership/
│   ├── product/
│   ├── engineering/
│   ├── design/
│   ├── content/
│   ├── marketing/
│   └── operations/
├── custom/                       # Xenboox-specific skills
│   ├── leadership/
│   ├── product/
│   ├── engineering/
│   ├── design/
│   ├── content/
│   ├── marketing/
│   ├── sales/
│   ├── customer-success/
│   ├── research-data/
│   └── operations/
├── manifest.json                 # Skill registry and routing rules
└── auto-loader.ts                # Auto-fire system
```

## Phase 1: Install Community Skills (30+ skills)

### Leadership & Strategy

- `grill-me` from mattpocock/skills (937K installs)
- `to-prd` from mattpocock/skills (365K installs)
- `brainstorming` from obra/superpowers (336K installs)
- `writing-plans` from obra/superpowers (227K installs)

### Product

- `to-spec` from mattpocock/skills (350K installs)
- `design-an-interface` from mattpocock/skills (215K installs)
- `research` from mattpocock/skills (356K installs)
- `ubiquitous-language` from mattpocock/skills (203K installs)

### Engineering

- `implement` from mattpocock/skills (408K installs)
- `resolving-merge-conflicts` from mattpocock/skills (344K installs)
- `systematic-debugging` from obra/superpowers (233K installs)
- `test-driven-development` from obra/superpowers (205K installs)
- `executing-plans` from obra/superpowers (192K installs)

### Design

- `design-taste-frontend` from leonxlnx/taste-skill (389K installs)
- `high-end-visual-design` from leonxlnx/taste-skill (291K installs)
- `redesign-existing-projects` from leonxlnx/taste-skill (287K installs)
- `minimalist-ui` from leonxlnx/taste-skill (266K installs)
- `brandkit` from leonxlnx/taste-skill (235K installs)

### Content

- `writing-beats` from mattpocock/skills (243K installs)
- `edit-article` from mattpocock/skills (197K installs)
- `writing-skills` from obra/superpowers (172K installs)

### Marketing

- `seo-audit` from coreyhaines31/marketingskills (192K installs)
- `marketing-psychology` from coreyhaines31/marketingskills (132K installs)
- `content-strategy` from coreyhaines31/marketingskills (127K installs)
- `programmatic-seo` from coreyhaines31/marketingskills (122K installs)

### Research & Data

- `ai-research-explore` from llllllama/rigorpilot-skills (311K installs)

### Operations

- `dispatching-parallel-agents` from obra/superpowers (171K installs)
- `verification-before-completion` from obra/superpowers (186K installs)

## Phase 2: Create Custom Skills (15+ skills)

### Leadership & Strategy

- `ceo-founder` - Strategic vision, company direction, investor relations
- `coo` - Operations optimization, process improvement, scaling
- `strategy-manager` - Competitive analysis, market positioning, growth strategy

### Product

- `product-manager` - Roadmap planning, feature prioritization, stakeholder management
- `product-analyst` - Data-driven decisions, metrics analysis, user behavior

### Engineering

- `software-architect` - System design, tech stack decisions, scalability
- `devops-engineer` - CI/CD, infrastructure, deployment automation
- `security-engineer` - Security audits, compliance, vulnerability assessment

### Design

- `product-designer` - End-to-end product design, user research, prototyping
- `ui-ux-designer` - Interface design, interaction patterns, usability testing

### Content

- `technical-writer` - Documentation, API docs, tutorials
- `blog-writer` - Content creation, SEO optimization, engagement

### Marketing

- `marketing-manager` - Campaign strategy, channel management, ROI tracking
- `social-media-manager` - Social strategy, content calendar, community management
- `email-marketer` - Email campaigns, automation, segmentation
- `growth-marketer` - Growth experiments, conversion optimization, A/B testing

### Sales

- `sales-representative` - Sales processes, objection handling, closing techniques
- `lead-researcher` - Lead qualification, prospect research, pipeline building
- `account-manager` - Client relationships, upselling, retention

### Customer Success

- `customer-support` - Support workflows, ticket resolution, knowledge base
- `customer-success-manager` - Onboarding, health scoring, churn prevention
- `onboarding-specialist` - User onboarding, activation, time-to-value

### Research & Data

- `competitor-analyst` - Competitive intelligence, feature comparison, market analysis
- `data-analyst` - Data analysis, visualization, insights generation
- `ai-ml-specialist` - AI/ML implementation, model selection, optimization

### Operations

- `project-manager` - Project planning, sprint management, delivery tracking
- `operations-manager` - Process optimization, resource allocation, efficiency
- `automation-specialist` - Workflow automation, tool integration, efficiency gains
- `finance-analyst` - Financial analysis, budgeting, forecasting

## Phase 3: Auto-Fire System

### Routing Rules (manifest.json)

```json
{
  "routing": {
    "keywords": {
      "strategy": ["strategy", "vision", "direction", "competitive", "market"],
      "product": ["feature", "roadmap", "user story", "backlog", "sprint"],
      "engineering": ["code", "implement", "bug", "refactor", "test"],
      "design": ["ui", "ux", "design", "mockup", "prototype", "wireframe"],
      "content": ["blog", "docs", "writing", "copy", "content"],
      "marketing": ["seo", "campaign", "social", "email", "growth"],
      "sales": ["lead", "prospect", "pipeline", "deal", "close"],
      "customer-success": [
        "support",
        "onboard",
        "churn",
        "health",
        "retention"
      ],
      "research": ["research", "analyze", "data", "metrics", "insights"],
      "operations": ["process", "workflow", "automate", "optimize", "scale"]
    },
    "filePatterns": {
      "engineering": ["*.ts", "*.tsx", "*.js", "*.jsx", "*.py"],
      "design": ["*.css", "*.scss", "*.styled.*"],
      "content": ["*.md", "*.mdx", "*.txt"],
      "marketing": ["*marketing*", "*seo*", "*campaign*"]
    }
  }
}
```

### Auto-Loader Logic

1. Parse user request for keywords
2. Match against routing rules
3. Load relevant skills (max 3-5 per request)
4. Inject skill context into agent prompt
5. Execute with specialized persona

## Implementation Order

1. **Week 1**: Install community skills + create manifest
2. **Week 2**: Create custom skills (Leadership, Product, Engineering)
3. **Week 3**: Create custom skills (Design, Content, Marketing)
4. **Week 4**: Create custom skills (Sales, Customer Success, Research, Operations)
5. **Week 5**: Build auto-fire system + testing

## Success Metrics

- 40+ skills installed/created
- Auto-fire accuracy > 90%
- Skill utilization tracking
- User satisfaction scores

## Next Steps

1. Review and approve this plan
2. Begin Phase 1: Install community skills
3. Create skill manifest and routing rules
4. Start building custom skills
