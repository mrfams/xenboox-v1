#!/usr/bin/env node
/**
 * Aggressive ESLint no-unused-vars fixer.
 * Handles: unused imports (all formats), unused variables (prefix with _), unused destructured vars.
 *
 * Run: node scripts/fix-unused-vars-v2.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

let output = "";
try {
  output = execSync("cd apps/web && npx next lint 2>&1", {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (e) {
  // next lint exits with code 1 when there are warnings — that's expected
  output = e.stdout || "";
}

const lintLines = output.split("\n");
const warnings = [];

let currentFile = "";
for (const line of lintLines) {
  if (line.match(/^\.\//)) {
    currentFile = line.trim();
    continue;
  }
  const match = line.match(
    /(\d+):(\d+)\s+Warning:\s+(.+?)\s+@typescript-eslint\/no-unused-vars/
  );
  if (match) {
    const [, lineNum, col, message] = match;
    const nameMatch = message.match(/^'([^']+)' is (defined|assigned)/);
    if (nameMatch) {
      warnings.push({
        file: currentFile,
        line: parseInt(lineNum),
        col: parseInt(col),
        name: nameMatch[1],
        type: nameMatch[2],
      });
    }
  }
}

console.log(`Found ${warnings.length} no-unused-vars warnings`);

// Group by file
const byFile = {};
for (const w of warnings) {
  if (!byFile[w.file]) byFile[w.file] = [];
  byFile[w.file].push(w);
}

let totalFixed = 0;
let totalSkipped = 0;

for (const [file, fileWarnings] of Object.entries(byFile)) {
  try {
    const fullPath = `C:/Users/asano/Desktop/xenboox/apps/web/${file}`;
    let content = readFileSync(fullPath, "utf-8");
    let modified = false;

    // Process warnings in reverse line order to avoid line number shifts
    const sorted = [...fileWarnings].sort((a, b) => b.line - a.line);

    for (const w of sorted) {
      const fileLines = content.split("\n");
      const lineIdx = w.line - 1;
      const line = fileLines[lineIdx];
      if (!line) {
        totalSkipped++;
        continue;
      }

      const name = w.name;

      // Strategy 1: Find the import line containing this name
      let foundImport = false;

      // Search backwards from the warning line to find the import
      for (let i = lineIdx; i >= Math.max(0, lineIdx - 20); i--) {
        const l = fileLines[i];
        if (!l) continue;

        // Multi-line or single-line import with braces
        if (l.match(/import\s*(type\s*)?{/)) {
          // Find the end of this import
          let endI = i;
          for (let j = i; j < Math.min(fileLines.length, i + 20); j++) {
            if (fileLines[j].includes("from \"") || fileLines[j].includes("from '")) {
              endI = j;
              break;
            }
          }

          const importBlock = fileLines.slice(i, endI + 1).join("\n");
          const braceMatch = importBlock.match(
            /import\s*(type\s+)?\{([^}]+)\}\s*(?:type\s+)?from\s*["']([^"']+)["']/
          );
          if (braceMatch) {
            const [, typePrefix, importsRaw, fromPath] = braceMatch;
            const imports = importsRaw.split(",").map((s) => s.trim()).filter(Boolean);
            const filtered = imports.filter((imp) => {
              const importName = imp.split(/\s+as\s+/)[0].trim().replace(/^type\s+/, "");
              return importName !== name;
            });

            if (filtered.length < imports.length) {
              if (filtered.length === 0) {
                fileLines.splice(i, endI - i + 1);
              } else {
                const isType = typePrefix || importBlock.includes("import type");
                const prefix = isType ? "import type " : "import ";
                if (filtered.length <= 3) {
                  fileLines.splice(i, endI - i + 1, `${prefix}{ ${filtered.join(", ")} } from "${fromPath}";`);
                } else {
                  const newLines = [`${prefix}{`];
                  for (const imp of filtered) newLines.push(`  ${imp},`);
                  newLines.push(`} from "${fromPath}";`);
                  fileLines.splice(i, endI - i + 1, ...newLines);
                }
              }
              modified = true;
              totalFixed++;
              foundImport = true;
            }
          }
          break;
        }

        // Default import: import X from "..."
        const defMatch = l.match(/^import\s+(\w+)\s+from\s*["']([^"']+)["']/);
        if (defMatch && defMatch[1] === name) {
          fileLines.splice(i, 1);
          modified = true;
          totalFixed++;
          foundImport = true;
          break;
        }

        // Stop if we hit a non-import, non-blank line
        if (l.trim() && !l.match(/^\s*(import|\/\/|\/\*|\*|\s*$)/)) break;
      }

      if (foundImport) {
        content = fileLines.join("\n");
        continue;
      }

      // Strategy 2: Unused variable - prefix with _
      const freshLines = content.split("\n");
      const freshLine = freshLines[lineIdx];

      // const/let variable
      const varMatch = freshLine?.match(/(const|let)\s+(\w+)\s*=/);
      if (varMatch && varMatch[2] === name && !name.startsWith("_")) {
        freshLines[lineIdx] = freshLine.replace(
          new RegExp(`(const|let)\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=`),
          `$1 _${name} =`
        );
        content = freshLines.join("\n");
        modified = true;
        totalFixed++;
        continue;
      }

      // Loop variable: for (const x of / for (let i = )
      const loopMatch = freshLine?.match(/(const|let)\s+(\w+)\s+(of|in)\s/);
      if (loopMatch && loopMatch[2] === name && !name.startsWith("_")) {
        freshLines[lineIdx] = freshLine.replace(
          new RegExp(`(const|let)\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(of|in)\\s`),
          `$1 _${name} $2 `
        );
        content = freshLines.join("\n");
        modified = true;
        totalFixed++;
        continue;
      }

      // Function parameter: (name) => or function(a, name)
      const paramLine = freshLine;
      if (paramLine && paramLine.includes(name)) {
        // Check if it's a function parameter
        const funcMatch = paramLine.match(/(?:function\s*\w*\s*|\([\w\s,]*\)\s*=>|\([\w\s,]*\):\s*\w+\s*=>)/);
        if (funcMatch && !name.startsWith("_")) {
          // Replace the parameter name with _name
          freshLines[lineIdx] = paramLine.replace(
            new RegExp(`\\b${name}\\b(?!\\w)`, "g"),
            (match, offset) => {
              // Only replace in the parameter position, not in the body
              const beforeMatch = paramLine.slice(0, offset);
              if (beforeMatch.includes("=>") || beforeMatch.includes("{")) return match;
              return `_${name}`;
            }
          );
          if (freshLines[lineIdx] !== paramLine) {
            content = freshLines.join("\n");
            modified = true;
            totalFixed++;
            continue;
          }
        }
      }

      totalSkipped++;
    }

    if (modified) {
      writeFileSync(fullPath, content);
      console.log(`Fixed ${file}`);
    }
  } catch (err) {
    console.error(`Error fixing ${file}: ${err.message}`);
  }
}

console.log(`\nTotal fixed: ${totalFixed}, Skipped: ${totalSkipped}`);
