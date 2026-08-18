"use client";

import { useState } from "react";

type CodeBlockProps = {
  language?: string;
  code: string;
  title?: string;
  showLineNumbers?: boolean;
};

export function CodeBlock({
  language = "text",
  code,
  title,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const lines = code.split("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-lg border border-border bg-muted/50 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground/60 uppercase">
              {language}
            </span>
            <button
              onClick={handleCopy}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm font-mono leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                {showLineNumbers && (
                  <span className="mr-4 inline-block w-8 text-right text-muted-foreground/40 select-none">
                    {i + 1}
                  </span>
                )}
                <span className="text-foreground/90">{line}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
