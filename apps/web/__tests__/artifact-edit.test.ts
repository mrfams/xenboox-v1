import { describe, it, expect } from "vitest";

import {
  stripCodeFences,
  sanitizeEditedHtml,
  looksLikeHtmlDocument,
  extractSelectionContext,
  applySpliceEdit,
  applySpliceEditByLine,
} from "@/lib/chat/artifact-edit";

describe("stripCodeFences", () => {
  it("strips a leading ```html fence and trailing fence", () => {
    expect(stripCodeFences("```html\n<p>Hello</p>\n```")).toBe("<p>Hello</p>");
  });

  it("handles plain ``` fences and leaves regular content alone", () => {
    expect(stripCodeFences("```\nhello\n```")).toBe("hello");
    expect(stripCodeFences("just text")).toBe("just text");
  });
});

describe("sanitizeEditedHtml", () => {
  it("removes script blocks", () => {
    const out = sanitizeEditedHtml(
      "<html><body><script>alert(1)</script><p>ok</p></body></html>",
    );
    expect(out).not.toContain("<script");
    expect(out).toContain("<p>ok</p>");
  });

  it("removes inline event handlers and javascript: URLs", () => {
    const out = sanitizeEditedHtml(
      '<p onclick="alert(1)" onmouseover=\'x\'>ok</p><a href="javascript:evil()">x</a>',
    );
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("onmouseover");
    expect(out).not.toContain("javascript:");
  });

  it("removes embedded iframes/objects but keeps style blocks", () => {
    const out = sanitizeEditedHtml(
      '<html><style>.x{color:red}</style><iframe src="http://x"></iframe><p>ok</p></html>',
    );
    expect(out).not.toContain("<iframe");
    expect(out).toContain("<style>.x{color:red}</style>");
  });

  it("strips @import rules and <base> tags", () => {
    const out = sanitizeEditedHtml(
      '<html><style>@import url("http://evil/x.css");</style><base href="http://evil/"><p>ok</p></html>',
    );
    expect(out).not.toContain("@import");
    expect(out).not.toContain("<base");
  });
});

describe("looksLikeHtmlDocument", () => {
  it("accepts documents with html-ish structure", () => {
    expect(
      looksLikeHtmlDocument(
        "<!DOCTYPE html><html><body><p>hi</p></body></html>",
      ),
    ).toBe(true);
    expect(looksLikeHtmlDocument("<table><tr><td>1</td></tr></table>")).toBe(
      true,
    );
  });

  it("rejects plain text", () => {
    expect(looksLikeHtmlDocument("just some text, no markup")).toBe(false);
  });
});

describe("extractSelectionContext", () => {
  const content = "a".repeat(500) + "SELECTED" + "b".repeat(500);

  it("returns a window around the selection", () => {
    const ctx = extractSelectionContext(content, "SELECTED", 100);
    expect(ctx).toContain("SELECTED");
    expect(ctx.length).toBeLessThan(content.length);
    expect(ctx.length).toBe("SELECTED".length + 200);
  });

  it("returns the full content when the selection is absent", () => {
    expect(extractSelectionContext(content, "MISSING")).toBe(content);
  });
});

describe("applySpliceEdit", () => {
  it("replaces the first occurrence of the selection", () => {
    expect(applySpliceEdit("a,SELECTED,b,SELECTED", "SELECTED", "NEW")).toBe(
      "a,NEW,b,SELECTED",
    );
  });

  it("returns null when the selection cannot be found", () => {
    expect(applySpliceEdit("a,b,c", "zzz", "x")).toBeNull();
  });
});

describe("applySpliceEditByLine", () => {
  it("splices within the line containing the selection", () => {
    const csv = "code,name,amount\n1010,Cash on hand,15000\n2010,Loan,5000";
    const out = applySpliceEditByLine(csv, "15000", "20000");
    expect(out).toBe(
      "code,name,amount\n1010,Cash on hand,20000\n2010,Loan,5000",
    );
  });

  it("returns null when the selection is missing entirely", () => {
    expect(applySpliceEditByLine("a\nb", "zzz", "x")).toBeNull();
  });
});
