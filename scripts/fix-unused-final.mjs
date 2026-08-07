#!/usr/bin/env node
/**
 * Fix ALL remaining ESLint no-unused-vars warnings.
 * Uses full-file search instead of line-by-line.
 */
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

let lintOutput = "";
try {
  lintOutput = execSync("cd apps/web && npx next lint 2>&1", {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (e) {
  lintOutput = e.stdout || "";
}

// Parse warnings: {file: [{line, name, isDefined}]}
const lintLines = lintOutput.split("\n");
const byFile = {};
let currentFile = "";

for (const line of lintLines) {
  if (line.match(/^\.\//)) {
    currentFile = line.trim();
    continue;
  }
  const m = line.match(
    /(\d+):(\d+)\s+Warning:\s+'([^']+)' is (defined|assigned)/
  );
  if (m && currentFile) {
    if (!byFile[currentFile]) byFile[currentFile] = [];
    byFile[currentFile].push({
      line: parseInt(m[1]),
      name: m[3],
      isDefined: m[4] === "defined",
    });
  }
}

const total = Object.values(byFile).reduce((s, a) => s + a.length, 0);
console.log(`Found ${total} warnings in ${Object.keys(byFile).length} files`);

let fixed = 0;

for (const [file, warnings] of Object.entries(byFile)) {
  const fullPath = `C:/Users/asano/Desktop/xenboox/apps/web/${file}`;
  let content;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch { continue; }

  let modified = false;
  const unusedNames = new Set(warnings.map((w) => w.name));

  // ── PHASE 1: Remove unused named imports from ALL import statements ──
  // Match both single-line and multi-line imports with braces
  // Use a regex that works across lines
  const importRegex = /import\s*(type\s+)?\{([^}]+)\}\s*(?:type\s+)?from\s*["']([^"']+)["'];?/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const [fullMatch, typePrefix, importsRaw, fromPath] = match;
    const imports = importsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const filtered = imports.filter((imp) => {
      const importName = imp.split(/\s+as\s+/)[0].trim().replace(/^type\s+/, "");
      return !unusedNames.has(importName);
    });

    if (filtered.length < imports.length) {
      if (filtered.length === 0) {
        content = content.replace(fullMatch, "");
      } else {
        const isType = typePrefix || fullMatch.includes("import type");
        const prefix = isType ? "import type " : "import ";
        let newImport;
        if (filtered.length <= 3) {
          newImport = `${prefix}{ ${filtered.join(", ")} } from "${fromPath}";`;
        } else {
          newImport = `${prefix}{\n${filtered.map((i) => `  ${i},`).join("\n")}\n} from "${fromPath}";`;
        }
        content = content.replace(fullMatch, newImport);
      }
      modified = true;
      fixed++;
      // Reset regex since we modified the string
      importRegex.lastIndex = 0;
    }
  }

  // Remove unused default imports
  for (const w of warnings) {
    if (!w.isDefined) continue;
    const defRegex = new RegExp(`import\\s+${w.name}\\s+from\\s*["'][^"']+["'];?\\n?`, "g");
    if (defRegex.test(content)) {
      content = content.replace(defRegex, "");
      modified = true;
      fixed++;
    }
  }

  // Remove type-only imports: import type { X } from "..."
  // Already handled above

  // ── PHASE 2: Prefix unused local variables with _ ──
  // Only for variables that are "assigned" (not "defined" imports)
  const fileLines = content.split("\n");
  
  for (const w of warnings) {
    if (w.isDefined) continue; // Already handled as imports
    if (w.name.startsWith("_")) continue; // Already prefixed

    const lineIdx = w.line - 1;
    // Adjust line index for removed import lines
    // (skip this - just try to find the variable by name in the file)
    
    const nameEscaped = w.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    // Try to find and fix the variable in the file content
    // const/let variable
    const varRegex = new RegExp(`(const|let)\\s+${nameEscaped}\\s*=`, "g");
    if (varRegex.test(content)) {
      content = content.replace(
        new RegExp(`(const|let)\\s+${nameEscaped}\\s*=`),
        `$1 _${w.name} =`
      );
      modified = true;
      fixed++;
      continue;
    }

    // Loop variable
    const loopRegex = new RegExp(`(const|let)\\s+${nameEscaped}\\s+(of|in)\\s`, "g");
    if (loopRegex.test(content)) {
      content = content.replace(
        new RegExp(`(const|let)\\s+${nameEscaped}\\s+(of|in)\\s`),
        `$1 _${w.name} $2 `
      );
      modified = true;
      fixed++;
      continue;
    }

    // Function parameter
    const paramRegex = new RegExp(`(\\(|,)\\s*${nameEscaped}\\s*(,|:\\s*\\w)`, "g");
    if (paramRegex.test(content)) {
      content = content.replace(
        new RegExp(`(\\(|,)\\s*${nameEscaped}\\s*(,|:\\s*\\w)`),
        `$1 _${w.name}$2`
      );
      modified = true;
      fixed++;
      continue;
    }
  }

  // ── PHASE 3: Clean up empty lines left by removed imports ──
  content = content.replace(/\n{3,}/g, "\n\n");

  if (modified) {
    writeFileSync(fullPath, content);
    console.log(`Fixed ${file}`);
  }
}

console.log(`\nTotal fixes: ${fixed}`);
