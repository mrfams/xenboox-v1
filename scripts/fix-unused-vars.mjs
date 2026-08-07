#!/usr/bin/env node
/**
 * Auto-fix ESLint no-unused-vars warnings.
 * Handles both single-line and multi-line imports.
 *
 * Run: node scripts/fix-unused-vars.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// Get all warnings from ESLint
let output = "";
try {
  output = execSync("cd apps/web && npx next lint 2>&1", {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
} catch (e) {
  output = e.stdout || "";
}

const lines = output.split("\n");
const warnings = [];

let currentFile = "";
for (const line of lines) {
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

console.log(`In ${Object.keys(byFile).length} files`);

let totalFixed = 0;
let totalSkipped = 0;

for (const [file, fileWarnings] of Object.entries(byFile)) {
  try {
    const fullPath = `C:/Users/asano/Desktop/xenboox/apps/web/${file}`;
    let content = readFileSync(fullPath, "utf-8");
    let modified = false;

    for (const w of fileWarnings) {
      const fileLines = content.split("\n");
      const lineIdx = w.line - 1;
      const line = fileLines[lineIdx];
      if (!line) {
        totalSkipped++;
        continue;
      }

      const name = w.name;

      // Check if this line is part of a multi-line import
      // Look backwards to find the start of the import statement
      let importStartLine = lineIdx;
      let importEndLine = lineIdx;

      // Find the start of the import
      for (let i = lineIdx; i >= Math.max(0, lineIdx - 20); i--) {
        if (fileLines[i].match(/import\s*(type\s*)?{/)) {
          importStartLine = i;
          break;
        }
        if (fileLines[i].match(/import\s*\w+\s+from/)) {
          // Single-line default import
          importStartLine = i;
          break;
        }
      }

      // Find the end of the import (the "from" line)
      for (let i = importStartLine; i < Math.min(fileLines.length, importStartLine + 20); i++) {
        if (fileLines[i].includes("from \"") || fileLines[i].includes("from '")) {
          importEndLine = i;
          break;
        }
      }

      const importBlock = fileLines.slice(importStartLine, importEndLine + 1).join("\n");

      // Case 1: Multi-line or single-line import with braces
      const braceImportMatch = importBlock.match(
        /import\s*(type\s+)?\{([^}]+)\}\s*(?:type\s+)?from\s*["']([^"']+)["']/
      );
      if (braceImportMatch) {
        const [, typePrefix, importsRaw, fromPath] = braceImportMatch;
        const imports = importsRaw.split(",").map((s) => s.trim()).filter(Boolean);
        const filtered = imports.filter((imp) => {
          const importName = imp.split(/\s+as\s+/)[0].trim().replace(/^type\s+/, "");
          return importName !== name;
        });

        if (filtered.length === 0) {
          // Remove entire import block
          fileLines.splice(importStartLine, importEndLine - importStartLine + 1);
          modified = true;
          totalFixed++;
        } else if (filtered.length < imports.length) {
          // Rebuild the import
          const prefix = typePrefix ? "import type " : "import ";
          const isTypeExport = importBlock.includes("import type");
          const importPrefix = isTypeExport ? "import type " : "import ";
          
          if (filtered.length <= 3) {
            // Single line
            fileLines.splice(
              importStartLine,
              importEndLine - importStartLine + 1,
              `${importPrefix}{ ${filtered.join(", ")} } from "${fromPath}";`
            );
          } else {
            // Multi-line
            const newLines = [`${importPrefix}{`];
            for (const imp of filtered) {
              newLines.push(`  ${imp},`);
            }
            newLines.push(`} from "${fromPath}";`);
            fileLines.splice(
              importStartLine,
              importEndLine - importStartLine + 1,
              ...newLines
            );
          }
          modified = true;
          totalFixed++;
        } else {
          totalSkipped++;
        }
        content = fileLines.join("\n");
        continue;
      }

      // Case 2: Single-line default import
      const defMatch = line.match(/import\s+(\w+)\s+from\s*["']([^"']+)["']/);
      if (defMatch && defMatch[1] === name) {
        fileLines.splice(lineIdx, 1);
        modified = true;
        totalFixed++;
        content = fileLines.join("\n");
        continue;
      }

      // Case 3: Unused local variable (const/let) - prefix with _
      const varMatch = line.match(/(const|let)\s+(\w+)\s*=/);
      if (varMatch && varMatch[2] === name) {
        fileLines[lineIdx] = line.replace(
          new RegExp(`(const|let)\\s+${name}\\s*=`),
          `$1 _${name} =`
        );
        modified = true;
        totalFixed++;
        content = fileLines.join("\n");
        continue;
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
