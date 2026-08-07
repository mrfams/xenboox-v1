#!/usr/bin/env node
/**
 * Fix all ESLint no-unused-vars warnings by:
 * 1. Parsing lint output to find unused import/variable names per file
 * 2. Reading each file and removing unused imports from ALL import formats
 * 3. Prefixing unused local variables with _
 *
 * Run: node scripts/fix-unused-v3.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// Step 1: Get lint warnings
let lintOutput = "";
try {
  lintOutput = execSync("cd apps/web && npx next lint 2>&1", {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (e) {
  lintOutput = e.stdout || "";
}

// Step 2: Parse warnings into {file: [{line, name}]}
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
    byFile[currentFile].push({ line: parseInt(m[1]), name: m[3] });
  }
}

const totalWarnings = Object.values(byFile).reduce((s, a) => s + a.length, 0);
console.log(`Found ${totalWarnings} warnings in ${Object.keys(byFile).length} files`);

// Step 3: Fix each file
let fixed = 0;

for (const [file, warnings] of Object.entries(byFile)) {
  const fullPath = `C:/Users/asano/Desktop/xenboox/apps/web/${file}`;
  let content;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch {
    continue;
  }

  const fileLines = content.split("\n");
  let modified = false;

  // Collect all unused import names for this file
  const unusedNames = new Set(warnings.map((w) => w.name));

  // Strategy: Find ALL import statements and remove unused names
  let i = 0;
  while (i < fileLines.length) {
    const line = fileLines[i];

    // Detect start of import statement
    if (line.match(/^\s*import\s/)) {
      // Find the end of the import (line with "from" or end of default import)
      let endI = i;
      
      // Single-line import
      if (line.match(/from\s*["']/)) {
        endI = i;
      } else {
        // Multi-line import - search forward for "from"
        for (let j = i + 1; j < Math.min(fileLines.length, i + 50); j++) {
          if (fileLines[j].match(/from\s*["']/)) {
            endI = j;
            break;
          }
        }
      }

      const importBlock = fileLines.slice(i, endI + 1).join("\n");
      
      // Check if this is a brace import: import { X, Y, Z } from "..."
      const braceMatch = importBlock.match(
        /import\s*(type\s+)?\{([^}]+)\}\s*(?:type\s+)?from\s*["']([^"']+)["']/
      );
      
      if (braceMatch) {
        const [, typePrefix, importsRaw, fromPath] = braceMatch;
        const imports = importsRaw.split(",").map((s) => s.trim()).filter(Boolean);
        const filtered = imports.filter((imp) => {
          const importName = imp.split(/\s+as\s+/)[0].trim().replace(/^type\s+/, "");
          return !unusedNames.has(importName);
        });

        if (filtered.length === 0) {
          // Remove entire import block
          fileLines.splice(i, endI - i + 1);
          modified = true;
          fixed++;
          // Don't increment i since we removed lines
          continue;
        } else if (filtered.length < imports.length) {
          // Rebuild the import
          const isType = typePrefix || importBlock.includes("import type");
          const prefix = isType ? "import type " : "import ";
          
          if (filtered.length <= 3 && (endI === i)) {
            // Single line
            fileLines[i] = `${prefix}{ ${filtered.join(", ")} } from "${fromPath}";`;
            // Remove lines between i and endI if multi-line was collapsed
            if (endI > i) fileLines.splice(i + 1, endI - i);
          } else {
            const newLines = [`${prefix}{`];
            for (const imp of filtered) newLines.push(`  ${imp},`);
            newLines.push(`} from "${fromPath}";`);
            fileLines.splice(i, endI - i + 1, ...newLines);
          }
          modified = true;
          fixed++;
          i = i + (filtered.length <= 3 ? 1 : filtered.length + 2);
          continue;
        }
      }

      // Check if this is a default import: import X from "..."
      const defMatch = importBlock.match(/import\s+(\w+)\s+from\s*["']([^"']+)["']/);
      if (defMatch && unusedNames.has(defMatch[1])) {
        fileLines.splice(i, endI - i + 1);
        modified = true;
        fixed++;
        continue;
      }

      i = endI + 1;
      continue;
    }

    i++;
  }

  // Strategy 2: Prefix unused local variables with _
  for (const w of warnings) {
    const lineIdx = w.line - 1;
    if (lineIdx >= fileLines.length) continue;
    const line = fileLines[lineIdx];
    if (!line) continue;

    // Skip if already prefixed
    if (w.name.startsWith("_")) continue;

    // const/let variable assignment
    const varMatch = line.match(new RegExp(`(const|let)\\s+${w.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`));
    if (varMatch) {
      fileLines[lineIdx] = line.replace(
        new RegExp(`(const|let)\\s+${w.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`),
        `$1 _${w.name} =`
      );
      modified = true;
      fixed++;
      continue;
    }

    // Loop variable: (const i of / (const i in
    const loopMatch = line.match(new RegExp(`(const|let)\\s+${w.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(of|in)\\s`));
    if (loopMatch) {
      fileLines[lineIdx] = line.replace(
        new RegExp(`(const|let)\\s+${w.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(of|in)\\s`),
        `$1 _${w.name} $2 `
      );
      modified = true;
      fixed++;
      continue;
    }

    // Array destructuring: const [x, y] = ...
    const arrDestruct = line.match(/const\s*\[([^\]]+)\]/);
    if (arrDestruct) {
      const vars = arrDestruct[1].split(",").map((s) => s.trim());
      if (vars.includes(w.name)) {
        const newVars = vars.map((v) => v === w.name ? `_${v}` : v);
        fileLines[lineIdx] = line.replace(
          arrDestruct[1],
          newVars.join(", ")
        );
        modified = true;
        fixed++;
        continue;
      }
    }
  }

  if (modified) {
    writeFileSync(fullPath, fileLines.join("\n"));
    console.log(`Fixed ${file}`);
  }
}

console.log(`\nTotal fixes: ${fixed}`);
