/**
 * Test script for Xenboox Skill Auto-Loader
 * Run with: npx ts-node .agents/skills/test-auto-loader.ts
 */

import { autoLoadSkills, loadSkillsForRequest } from "./auto-loader";

// Test cases
const testCases = [
  {
    name: "Engineering Task",
    request: "Help me implement a new feature for invoice processing",
    files: ["apps/web/app/invoices/page.tsx", "packages/db/schema/invoices.ts"],
    expectedCategories: ["engineering"],
  },
  {
    name: "Marketing Task",
    request: "We need to improve our SEO strategy and content marketing",
    files: [],
    expectedCategories: ["marketing"],
  },
  {
    name: "Product Task",
    request:
      "Let's prioritize the features for next sprint and create user stories",
    files: [],
    expectedCategories: ["product"],
  },
  {
    name: "Design Task",
    request: "I need to design a new dashboard UI with better UX",
    files: ["components/dashboard/Chart.tsx", "styles/dashboard.css"],
    expectedCategories: ["design"],
  },
  {
    name: "Sales Task",
    request: "Help me prepare a sales demo script and handle objections",
    files: [],
    expectedCategories: ["sales"],
  },
  {
    name: "Customer Success Task",
    request: "We need to improve our onboarding flow and reduce churn",
    files: [],
    expectedCategories: ["customerSuccess"],
  },
  {
    name: "Leadership Task",
    request: "What's our competitive positioning and market strategy?",
    files: [],
    expectedCategories: ["leadership"],
  },
  {
    name: "Research Task",
    request: "Analyze our competitors and identify market opportunities",
    files: [],
    expectedCategories: ["research"],
  },
  {
    name: "Operations Task",
    request: "Let's automate this workflow and improve efficiency",
    files: [],
    expectedCategories: ["operations"],
  },
  {
    name: "Content Task",
    request:
      "Write a blog post about AI accounting and technical documentation",
    files: ["docs/api.md", "blog/ai-accounting.md"],
    expectedCategories: ["content"],
  },
];

// Run tests
console.log("🧪 Testing Xenboox Skill Auto-Loader\n");

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`📝 Test: ${testCase.name}`);
  console.log(`   Request: "${testCase.request}"`);
  console.log(
    `   Files: ${testCase.files.length > 0 ? testCase.files.join(", ") : "None"}`,
  );

  try {
    const result = autoLoadSkills(testCase.request, testCase.files);

    console.log(`   ✅ Skills loaded: ${result.map((s) => s.name).join(", ")}`);
    console.log(
      `   📊 Confidence: ${result.map((s) => `${s.category}: ${Math.round(s.confidence * 100)}%`).join(", ")}`,
    );

    // Check if expected categories are present
    const loadedCategories = [...new Set(result.map((s) => s.category))];
    const hasExpected = testCase.expectedCategories.some((cat) =>
      loadedCategories.includes(cat as any),
    );

    if (hasExpected) {
      console.log(`   ✅ PASSED - Expected categories found\n`);
      passed++;
    } else {
      console.log(`   ❌ FAILED - Expected categories not found\n`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error}\n`);
    failed++;
  }
}

// Summary
console.log("─".repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log("─".repeat(50));

// Detailed example
console.log("\n🔍 Detailed Example:");
console.log("─".repeat(50));

const exampleRequest =
  "Help me implement a new feature for invoice processing with proper security";
const exampleFiles = [
  "apps/web/app/invoices/page.tsx",
  "packages/db/schema/invoices.ts",
];

console.log(`Request: "${exampleRequest}"`);
console.log(`Files: ${exampleFiles.join(", ")}`);
console.log("\nLoaded Skills:");

const result = loadSkillsForRequest(exampleRequest, exampleFiles);
for (const match of result.skills) {
  console.log(`\n📌 ${match.name} (${match.category})`);
  console.log(`   Confidence: ${Math.round(match.confidence * 100)}%`);
  console.log(`   Reason: ${match.reason}`);
}

console.log("\n✅ Auto-Loader test complete!");
