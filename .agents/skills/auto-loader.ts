/**
 * Xenboox Skill Auto-Loader System
 * Automatically loads relevant skills based on task context
 */

import { readFileSync, existsSync } from "fs";
import { join, basename } from "path";

// Types
type SkillCategory =
  | "leadership"
  | "product"
  | "engineering"
  | "design"
  | "content"
  | "marketing"
  | "sales"
  | "customerSuccess"
  | "research"
  | "operations";

interface SkillManifest {
  name: string;
  version: string;
  categories: Record<
    SkillCategory,
    {
      skills: string[];
      keywords: string[];
      filePatterns: string[];
      triggers: string[];
    }
  >;
  routing: {
    maxSkillsPerRequest: number;
    confidenceThreshold: number;
    fallbackSkills: string[];
  };
}

interface SkillMatch {
  name: string;
  category: SkillCategory;
  confidence: number;
  reason: string;
}

// Load manifest
function loadManifest(): SkillManifest {
  const manifestPath = join(__dirname, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error("manifest.json not found");
  }
  return JSON.parse(readFileSync(manifestPath, "utf-8"));
}

// Match keywords in text
function matchKeywords(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  let matches = 0;

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matches++;
    }
  }

  return matches / keywords.length;
}

// Match file patterns
function matchFilePatterns(files: string[], patterns: string[]): number {
  if (patterns.length === 0 || files.length === 0) return 0;

  let matches = 0;
  const glob = require("glob");

  for (const pattern of patterns) {
    for (const file of files) {
      if (glob.match(file, pattern)) {
        matches++;
      }
    }
  }

  return matches / files.length;
}

// Match triggers
function matchTriggers(text: string, triggers: string[]): number {
  const lowerText = text.toLowerCase();
  let matches = 0;

  for (const trigger of triggers) {
    if (lowerText.includes(trigger.toLowerCase())) {
      matches++;
    }
  }

  return matches / triggers.length;
}

// Main auto-load function
export function autoLoadSkills(
  request: string,
  files: string[] = [],
): SkillMatch[] {
  const manifest = loadManifest();
  const matches: SkillMatch[] = [];

  for (const [category, config] of Object.entries(manifest.categories)) {
    const skillCategory = category as SkillCategory;

    // Calculate confidence based on keywords, file patterns, and triggers
    const keywordScore = matchKeywords(request, config.keywords);
    const fileScore = matchFilePatterns(files, config.filePatterns);
    const triggerScore = matchTriggers(request, config.triggers);

    // Weighted average (triggers are most important)
    const confidence =
      keywordScore * 0.3 + fileScore * 0.2 + triggerScore * 0.5;

    if (confidence >= manifest.routing.confidenceThreshold) {
      // Add each skill in the category
      for (const skillName of config.skills) {
        matches.push({
          name: skillName,
          category: skillCategory,
          confidence,
          reason: `Matched ${Math.round(confidence * 100)}% on ${category} category`,
        });
      }
    }
  }

  // Sort by confidence and limit to max skills
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches.slice(0, manifest.routing.maxSkillsPerRequest);
}

// Get skill content
export function getSkillContent(skillName: string): string | null {
  const skillPath = join(__dirname, skillName, "SKILL.md");
  if (!existsSync(skillPath)) {
    return null;
  }
  return readFileSync(skillPath, "utf-8");
}

// Load skills for a request
export function loadSkillsForRequest(
  request: string,
  files: string[] = [],
): { skills: SkillMatch[]; content: string[] } {
  const matches = autoLoadSkills(request, files);
  const content: string[] = [];

  for (const match of matches) {
    const skillContent = getSkillContent(match.name);
    if (skillContent) {
      content.push(`## ${match.name} (${match.category})\n\n${skillContent}`);
    }
  }

  return { skills: matches, content };
}

// Example usage
export function exampleUsage() {
  const request = "Help me implement a new feature for invoice processing";
  const files = [
    "apps/web/app/invoices/page.tsx",
    "packages/db/schema/invoices.ts",
  ];

  const result = loadSkillsForRequest(request, files);

  console.log(
    "Skills loaded:",
    result.skills.map((s) => s.name),
  );
  console.log(
    "Content length:",
    result.content.join("\n").length,
    "characters",
  );

  return result;
}

// Export for use in other modules
export default {
  autoLoadSkills,
  getSkillContent,
  loadSkillsForRequest,
  exampleUsage,
};
