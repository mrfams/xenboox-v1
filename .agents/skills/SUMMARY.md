# Xenboox Skill System - Complete Inventory

## Overview

**Total Skills: 73**

- Community Skills: 23 (installed from open-source)
- Custom Skills: 25 (built for Xenboox)
- Original Skills: 25 (already existed)

## Skill Categories

### 1. Leadership & Strategy (3 skills)

- `ceo-founder` - Strategic vision, company direction, investor relations
- `coo` - Operations optimization, process improvement, scaling
- `strategy-manager` - Competitive analysis, market positioning, growth strategy

### 2. Product (4 skills)

- `product-manager` - Roadmap planning, feature prioritization, stakeholder management
- `product-analyst` - Data-driven decisions, metrics analysis, user behavior
- `to-prd` (community) - Converts ideas to PRDs
- `to-spec` (community) - Converts PRDs to technical specs

### 3. Engineering (9 skills)

- `software-architect` - System design, tech stack decisions, scalability
- `devops-engineer` - CI/CD, infrastructure, deployment automation
- `security-engineer` - Security audits, compliance, vulnerability assessment
- `implement` (community) - Implementation planning
- `systematic-debugging` (community) - Debugging methodology
- `test-driven-development` (community) - TDD practices
- `resolving-merge-conflicts` (community) - Git conflict resolution
- `code-review` (existing) - Code review standards
- `tdd` (existing) - Test-driven development

### 4. Design (7 skills)

- `product-designer` - End-to-end product design, user research, prototyping
- `ui-ux-designer` - Interface design, interaction patterns, usability testing
- `design-taste-frontend` (community) - Frontend design taste
- `high-end-visual-design` (community) - Premium visual design
- `minimalist-ui` (community) - Minimalist UI patterns
- `brandkit` (community) - Brand design system
- `ux-writer` (existing) - UX writing

### 5. Content (5 skills)

- `technical-writer` - Documentation, API docs, tutorials
- `blog-writer` - Content creation, SEO optimization, engagement
- `writing-beats` (community) - Writing rhythm and structure
- `edit-article` (community) - Article editing
- `copywriter` (existing) - Copywriting

### 6. Marketing (6 skills)

- `marketing-manager` - Campaign strategy, channel management, ROI tracking
- `seo-audit` (community) - SEO analysis and optimization
- `marketing-psychology` (community) - Psychological marketing tactics
- `content-strategy` (community) - Content strategy planning
- `programmatic-seo` (community) - Programmatic SEO
- `marketing-ideas` (community) - Marketing ideas generation

### 7. Sales (2 skills)

- `sales-representative` - Sales processes, objection handling, closing techniques
- `lead-researcher` - Lead qualification, prospect research, pipeline building

### 8. Customer Success (3 skills)

- `customer-success-manager` - Onboarding, health scoring, churn prevention
- `customer-support` - Support workflows, ticket resolution, knowledge base
- `onboarding-specialist` - User onboarding, activation, time-to-value

### 9. Research & Data (3 skills)

- `competitor-analyst` - Competitive intelligence, feature comparison, market analysis
- `data-analyst` - Data analysis, visualization, insights generation
- `research` (community) - Deep research methodology

### 10. Operations (5 skills)

- `project-manager` - Project planning, sprint management, delivery tracking
- `automation-specialist` - Workflow automation, tool integration, efficiency gains
- `finance-analyst` - Financial analysis, budgeting, forecasting
- `executing-plans` (community) - Plan execution methodology
- `dispatching-parallel-agents` (community) - Parallel agent coordination

### 11. Existing Skills (25 skills)

- `agent-eval`, `autoplan`, `brand-voice`, `code-review`, `copywriter`
- `create-agent`, `create-api-route`, `create-migration`, `create-module`
- `cso`, `diagnosing-bugs`, `domain-modeling`, `enterprise-readiness`
- `grill-with-docs`, `handoff`, `load-xenboox-context`, `month-end-close`
- `office-hours`, `plan-eng-review`, `product-reviewer`, `qa`
- `researcher`, `review`, `tdd`, `ux-writer`

## Auto-Loading System

### How It Works

1. **Request Analysis**: Parse user request for keywords
2. **File Pattern Matching**: Check file extensions against patterns
3. **Trigger Detection**: Identify task-specific triggers
4. **Confidence Scoring**: Calculate match confidence (0-100%)
5. **Skill Selection**: Load top 3-5 skills by confidence
6. **Context Injection**: Add skill content to agent prompt

### Routing Rules (manifest.json)

```json
{
  "leadership": {
    "keywords": ["strategy", "vision", "direction", "competitive", "market"],
    "triggers": [
      "strategic decision",
      "company direction",
      "competitive analysis"
    ]
  },
  "product": {
    "keywords": ["feature", "roadmap", "user story", "backlog", "sprint"],
    "triggers": ["feature request", "product planning", "roadmap"]
  },
  "engineering": {
    "keywords": ["code", "implement", "bug", "refactor", "test"],
    "filePatterns": ["*.ts", "*.tsx", "*.js", "*.jsx", "*.py"],
    "triggers": ["implement feature", "fix bug", "refactor code"]
  }
}
```

### Confidence Thresholds

- **High (80%+)**: Strong match, load all skills in category
- **Medium (60-79%)**: Good match, load top 2-3 skills
- **Low (50-59%)**: Weak match, load 1 skill
- **Below 50%**: No match, use fallback skills

## Usage Examples

### Example 1: Engineering Task

**Request**: "Help me implement a new feature for invoice processing"
**Files**: `apps/web/app/invoices/page.tsx`
**Skills Loaded**: `software-architect`, `implement`, `test-driven-development`

### Example 2: Marketing Task

**Request**: "We need to improve our SEO strategy"
**Files**: None
**Skills Loaded**: `marketing-manager`, `seo-audit`, `content-strategy`

### Example 3: Product Task

**Request**: "Let's prioritize the features for next sprint"
**Files**: None
**Skills Loaded**: `product-manager`, `product-analyst`, `to-spec`

## Integration with AGENTS.md

The skill system is integrated into the project's AGENTS.md file:

```markdown
## Skill Auto-Loading

When starting a task, auto-load the relevant skill(s) from `.agents/skills/` based on task category:

| Task Category    | Skill(s) to Load                                    |
| ---------------- | --------------------------------------------------- |
| Code review      | `review`, `code-review`                             |
| Bug diagnosis    | `diagnosing-bugs`                                   |
| New feature      | `tdd`, `implement`                                  |
| Architecture     | `plan-eng-review`, `software-architect`             |
| Security audit   | `cso`, `security-engineer`                          |
| Marketing        | `marketing-manager`, `seo-audit`                    |
| Sales            | `sales-representative`, `lead-researcher`           |
| Customer success | `customer-success-manager`, `onboarding-specialist` |
```

## Next Steps

1. **Test the system** with sample requests
2. **Refine routing rules** based on actual usage
3. **Add more community skills** as they become available
4. **Create skill utilization dashboard** for tracking
5. **Implement skill recommendations** based on user behavior

## Maintenance

### Adding New Skills

1. Create `SKILL.md` in `.agents/skills/<skill-name>/`
2. Add to `manifest.json` under appropriate category
3. Update this summary

### Updating Skills

1. Edit `SKILL.md` file
2. Version bump in `manifest.json`
3. Update documentation

### Removing Skills

1. Delete skill directory
2. Remove from `manifest.json`
3. Update documentation

---

**Last Updated**: August 23, 2026
**Version**: 1.0.0
**Maintained By**: Xenboox AI Team
