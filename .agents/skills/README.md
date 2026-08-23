# Xenboox Skill System 🧠

A comprehensive AI skill system with 73 specialized personas that auto-fire based on task context.

## Overview

The Xenboox Skill System provides specialized AI expertise across 10 business domains:

| Domain                | Skills | Auto-Fire |
| --------------------- | ------ | --------- |
| Leadership & Strategy | 3      | ✅        |
| Product               | 4      | ✅        |
| Engineering           | 9      | ✅        |
| Design                | 7      | ✅        |
| Content               | 5      | ✅        |
| Marketing             | 6      | ✅        |
| Sales                 | 2      | ✅        |
| Customer Success      | 3      | ✅        |
| Research & Data       | 3      | ✅        |
| Operations            | 5      | ✅        |

## Quick Start

### Manual Loading

```typescript
import { loadSkillsForRequest } from ".agents/skills/auto-loader";

const result = loadSkillsForRequest(
  "Help me implement a new feature for invoice processing",
  ["apps/web/app/invoices/page.tsx"],
);

console.log(result.skills);
// Output: [
//   { name: 'software-architect', category: 'engineering', confidence: 0.85 },
//   { name: 'implement', category: 'engineering', confidence: 0.82 },
//   { name: 'test-driven-development', category: 'engineering', confidence: 0.78 }
// ]
```

### Auto-Loading (Recommended)

Skills are automatically loaded based on:

1. **Keywords** in your request
2. **File patterns** you're working with
3. **Task triggers** you mention

Example:

```
User: "Help me fix this bug in the login flow"
→ Auto-loads: systematic-debugging, code-review, diagnosing-bugs
```

## Skill Categories

### 1. Leadership & Strategy 👔

- **ceo-founder**: Strategic vision, company direction
- **coo**: Operations optimization, process improvement
- **strategy-manager**: Competitive analysis, market positioning

### 2. Product 📋

- **product-manager**: Roadmap planning, feature prioritization
- **product-analyst**: Data-driven decisions, metrics analysis
- **to-prd**: Converts ideas to PRDs (community)
- **to-spec**: Converts PRDs to technical specs (community)

### 3. Engineering ⚙️

- **software-architect**: System design, scalability
- **devops-engineer**: CI/CD, infrastructure
- **security-engineer**: Security audits, compliance
- **implement**: Implementation planning (community)
- **systematic-debugging**: Debugging methodology (community)
- **test-driven-development**: TDD practices (community)

### 4. Design 🎨

- **product-designer**: End-to-end product design
- **ui-ux-designer**: Interface design, usability
- **design-taste-frontend**: Frontend design taste (community)
- **high-end-visual-design**: Premium visual design (community)
- **minimalist-ui**: Minimalist UI patterns (community)

### 5. Content ✍️

- **technical-writer**: Documentation, API docs
- **blog-writer**: Content creation, SEO
- **writing-beats**: Writing rhythm (community)
- **edit-article**: Article editing (community)

### 6. Marketing 📣

- **marketing-manager**: Campaign strategy, ROI
- **seo-audit**: SEO analysis (community)
- **marketing-psychology**: Psychological tactics (community)
- **content-strategy**: Content strategy (community)

### 7. Sales 💰

- **sales-representative**: Sales processes, closing
- **lead-researcher**: Lead qualification, research

### 8. Customer Success 🤝

- **customer-success-manager**: Onboarding, retention
- **customer-support**: Support workflows
- **onboarding-specialist**: User activation

### 9. Research & Data 📊

- **competitor-analyst**: Competitive intelligence
- **data-analyst**: Data analysis, insights
- **research**: Deep research (community)

### 10. Operations ⚡

- **project-manager**: Sprint management, delivery
- **automation-specialist**: Workflow automation
- **finance-analyst**: Financial analysis

## Auto-Loading Rules

### Keywords

Skills are triggered by keywords in your request:

```json
{
  "engineering": ["code", "implement", "bug", "refactor", "test", "deploy"],
  "marketing": ["seo", "campaign", "social", "email", "growth"],
  "sales": ["lead", "prospect", "pipeline", "deal", "close"]
}
```

### File Patterns

Skills are triggered by file types you're working with:

```json
{
  "engineering": ["*.ts", "*.tsx", "*.js", "*.jsx", "*.py"],
  "design": ["*.css", "*.scss", "*.styled.*"],
  "content": ["*.md", "*.mdx", "*.txt"]
}
```

### Triggers

Skills are triggered by specific task phrases:

```json
{
  "engineering": ["implement feature", "fix bug", "refactor code"],
  "marketing": ["seo audit", "marketing strategy", "campaign planning"],
  "sales": ["sales process", "lead qualification", "demo script"]
}
```

## Configuration

### manifest.json

Controls skill routing and thresholds:

```json
{
  "routing": {
    "maxSkillsPerRequest": 5,
    "confidenceThreshold": 0.6,
    "fallbackSkills": ["grill-with-docs", "office-hours"]
  }
}
```

### Confidence Thresholds

- **80%+**: Strong match, load all skills
- **60-79%**: Good match, load top 2-3
- **50-59%**: Weak match, load 1 skill
- **<50%**: No match, use fallbacks

## Adding New Skills

### 1. Create Skill Directory

```bash
mkdir .agents/skills/my-new-skill
```

### 2. Create SKILL.md

```markdown
---
name: my-new-skill
description: What this skill does
---

# My New Skill

## When to Use

- Use case 1
- Use case 2

## Your Perspective

- Key insight 1
- Key insight 2

## Key Questions

- Question 1?
- Question 2?

## Output Format

1. **Context**: ...
2. **Recommendation**: ...
3. **Metrics**: ...
```

### 3. Update manifest.json

```json
{
  "categories": {
    "myCategory": {
      "skills": ["my-new-skill"],
      "keywords": ["keyword1", "keyword2"],
      "triggers": ["trigger phrase"]
    }
  }
}
```

## Testing

Run the auto-loader test:

```bash
npx ts-node .agents/skills/test-auto-loader.ts
```

## Examples

### Example 1: Engineering Task

```
Request: "Help me implement a new feature for invoice processing"
Files: ["apps/web/app/invoices/page.tsx"]

Loaded Skills:
- software-architect (85% confidence)
- implement (82% confidence)
- test-driven-development (78% confidence)
```

### Example 2: Marketing Task

```
Request: "We need to improve our SEO strategy"
Files: []

Loaded Skills:
- marketing-manager (88% confidence)
- seo-audit (85% confidence)
- content-strategy (72% confidence)
```

### Example 3: Product Task

```
Request: "Let's prioritize features for next sprint"
Files: []

Loaded Skills:
- product-manager (90% confidence)
- product-analyst (85% confidence)
- to-spec (78% confidence)
```

## Best Practices

1. **Be Specific**: The more specific your request, the better the skill match
2. **Include Files**: Working with specific files helps routing
3. **Use Triggers**: Phrases like "implement feature" trigger relevant skills
4. **Review Loaded Skills**: Check which skills were loaded and why
5. **Provide Feedback**: Help improve routing rules over time

## Troubleshooting

### Skills Not Loading

- Check if keywords match
- Verify file patterns
- Lower confidence threshold in manifest.json

### Wrong Skills Loading

- Refine keywords in manifest.json
- Add more specific triggers
- Update file patterns

### Performance Issues

- Reduce maxSkillsPerRequest
- Optimize keyword matching
- Cache manifest loading

## Support

For issues or questions:

- Check the manifest.json configuration
- Review skill SKILL.md files
- Run test-auto-loader.ts for debugging

---

**Version**: 1.0.0
**Last Updated**: August 23, 2026
