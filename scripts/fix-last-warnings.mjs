#!/usr/bin/env node
/**
 * Fix the last batch of no-unused-vars warnings.
 * These are variables that need _ prefix (loop vars, destructured, etc.)
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

// Parse warnings
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
      col: parseInt(m[2]),
      name: m[3],
      isDefined: m[4] === "defined",
    });
  }
}

const total = Object.values(byFile).reduce((s, a) => s + a.length, 0);
console.log(`Found ${total} remaining warnings in ${Object.keys(byFile).length} files`);

let fixed = 0;

for (const [file, warnings] of Object.entries(byFile)) {
  const fullPath = `C:/Users/asano/Desktop/xenboox/apps/web/${file}`;
  let content;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch { continue; }

  const fileLines = content.split("\n");
  let modified = false;

  for (const w of warnings) {
    if (w.name.startsWith("_")) continue; // Already prefixed

    const lineIdx = w.line - 1;
    if (lineIdx >= fileLines.length) continue;
    const line = fileLines[lineIdx];
    if (!line) continue;

    const nameEscaped = w.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 1. Try to find and remove unused type imports: type X from "..."
    if (w.isDefined) {
      const typeImportRegex = new RegExp(`import\\s+type\\s+${nameEscaped}\\s+from\\s*["'][^"']+["'];?\\n?`, "g");
      if (typeImportRegex.test(content)) {
        content = content.replace(typeImportRegex, "");
        modified = true;
        fixed++;
        continue;
      }
    }

    // 2. For "defined but never used" — these are likely function params or loop vars
    if (w.isDefined) {
      // Loop variable: (item, i) => or for (... of items)
      // Replace `i` with `_` in the parameter position
      const newLines = content.split("\n");
      const targetLine = newLines[lineIdx];
      if (!targetLine) continue;

      // Check if this is a function parameter: , i) or (i, or (i =>
      if (targetLine.match(new RegExp(`[,\\(]\\s*${nameEscaped}\\s*[\\),]`))) {
        newLines[lineIdx] = targetLine.replace(
          new RegExp(`(\\(|,)\\s*${nameEscaped}\\s*(\\))`),
          `$1 _${w.name}$2`
        );
        content = newLines.join("\n");
        modified = true;
        fixed++;
        continue;
      }

      // Check if this is a for-loop var: for (let i = 0; ...)
      if (targetLine.match(new RegExp(`for\\s*\\(\\s*(const|let|var)\\s+${nameEscaped}\\s*=`))) {
        newLines[lineIdx] = targetLine.replace(
          new RegExp(`(for\\s*\\(\\s*(?:const|let|var)\\s+)${nameEscaped}(\\s*=)`),
          `$1_${w.name}$2`
        );
        content = newLines.join("\n");
        modified = true;
        fixed++;
        continue;
      }
    }

    // 3. For "assigned but never used" — prefix the variable declaration
    if (!w.isDefined) {
      const newLines = content.split("\n");
      const targetLine = newLines[lineIdx];
      if (!targetLine) continue;

      // const/let/var variable
      const varMatch = targetLine.match(new RegExp(`(const|let|var)\\s+${nameEscaped}\\s*=`));
      if (varMatch) {
        newLines[lineIdx] = targetLine.replace(
          new RegExp(`(const|let|var)\\s+${nameEscaped}\\s*=`),
          `$1 _${w.name} =`
        );
        content = newLines.join("\n");
        modified = true;
        fixed++;
        continue;
      }

      // Destructured variable: const { x, y } = ... or const [x, y] = ...
      const objDestruct = targetLine.match(/const\s*\{([^}]+)\}/);
      if (objDestruct) {
        const vars = objDestruct[1].split(",").map(s => s.trim());
        if (vars.some(v => v === w.name || v.startsWith(w.name + ":"))) {
          const newVars = vars.map(v => {
            if (v === w.name) return `_${v}`;
            if (v.startsWith(w.name + ":")) return v.replace(w.name, `_${w.name}`);
            return v;
          });
          newLines[lineIdx] = targetLine.replace(objDestruct[1], newVars.join(", "));
          content = newLines.join("\n");
          modified = true;
          fixed++;
          continue;
        }
      }

      const arrDestruct = targetLine.match(/const\s*\[([^\]]+)\]/);
      if (arrDestruct) {
        const vars = arrDestruct[1].split(",").map(s => s.trim());
        if (vars.includes(w.name)) {
          const newVars = vars.map(v => v === w.name ? `_${v}` : v);
          newLines[lineIdx] = targetLine.replace(arrDestruct[1], newVars.join(", "));
          content = newLines.join("\n");
          modified = true;
          fixed++;
          continue;
        }
      }

      // Function parameter in arrow function
      const arrowMatch = targetLine.match(/\(([^)]+)\)\s*=>/);
      if (arrowMatch) {
        const params = arrowMatch[1].split(",").map(s => s.trim());
        if (params.includes(w.name)) {
          const newParams = params.map(p => p === w.name ? `_${p}` : p);
          newLines[lineIdx] = targetLine.replace(arrowMatch[1], newParams.join(", "));
          content = newLines.join("\n");
          modified = true;
          fixed++;
          continue;
        }
      }

      // Single-param arrow: x => ...
      const singleArrow = targetLine.match(new RegExp(`\\b${nameEscaped}\\s*=>`));
      if (singleArrow && !w.name.startsWith("_")) {
        newLines[lineIdx] = targetLine.replace(
          new RegExp(`\\b${nameEscaped}\\s*=>`),
          `_${w.name} =>`
        );
        content = newLines.join("\n");
        modified = true;
        fixed++;
        continue;
      }
    }
  }

  // Clean up empty lines
  content = content.replace(/\n{3,}/g, "\n\n");

  if (modified) {
    writeFileSync(fullPath, content);
    console.log(`Fixed ${file}`);
  }
}

console.log(`\nTotal fixes: ${fixed}`);
