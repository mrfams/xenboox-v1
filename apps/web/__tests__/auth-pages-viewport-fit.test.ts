/**
 * Auth Pages — Viewport Fit & No Duplicate Links Tests
 *
 * Verifies:
 * 1. Login page: no card wrapper, single toggle link, everything fits on screen
 * 2. Register page: no duplicate "Already have an account?" links
 * 3. Both pages use clean minimal layout (Linear/Vercel pattern)
 */
import { readFileSync } from "fs";
import { join } from "path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

describe("Auth Pages — Viewport Fit & No Duplicates", () => {
  // ─── Login Form ────────────────────────────────────────────────────
  describe("LoginForm", () => {
    let form: string;

    beforeAll(() => {
      form = readFile("components/auth/login-form.tsx");
    });

    it("has NO card wrapper (no Card/CardContent imports)", () => {
      expect(form).not.toMatch(/import.*Card/);
    });

    it("has NO rounded-2xl border card class", () => {
      expect(form).not.toContain("rounded-2xl border");
    });

    it("has exactly ONE toggle link (Sign up)", () => {
      const signUpMatches = form.match(/Sign up/g);
      expect(signUpMatches).toHaveLength(1);
    });

    it("does NOT have duplicate Sign in/Sign up links", () => {
      // Should not have "Sign in" as a toggle link (login form shouldn't link to itself)
      const signInLinks = form.match(/href="\/login"/g);
      expect(signInLinks).toBeNull();
    });

    it("uses Logo component (not hand-rolled xbx box)", () => {
      expect(form).toContain("<Logo");
      expect(form).not.toContain("xbx");
    });

    it("form inputs use h-10 (compact, viewport-fit)", () => {
      expect(form).toContain('className="h-10"');
    });

    it("uses bg-background for divider (not bg-card)", () => {
      expect(form).toContain("bg-background px-2");
    });

    it("toggle link uses text-foreground (not text-primary)", () => {
      expect(form).toContain(
        'className="font-medium text-foreground hover:text-primary transition-colors"',
      );
    });
  });

  // ─── Register Form ─────────────────────────────────────────────────
  describe("RegisterForm", () => {
    let form: string;

    beforeAll(() => {
      form = readFile("components/auth/register-form.tsx");
    });

    it("has NO Card/CardContent/CardHeader imports", () => {
      expect(form).not.toMatch(/import.*Card/);
    });

    it("has NO Card JSX element", () => {
      expect(form).not.toContain("<Card");
      expect(form).not.toContain("</Card>");
    });

    it("has exactly ONE toggle link (Sign in)", () => {
      const signInMatches = form.match(/Sign in/g);
      // "Sign in" appears in the toggle link and in "sign-in" references
      // but the toggle link text should be the only standalone "Sign in"
      const toggleLinks = form.match(/href="\/login"/g);
      expect(toggleLinks).toHaveLength(1);
    });

    it("uses Logo component (not hand-rolled xbx box)", () => {
      expect(form).toContain("<Logo");
      expect(form).not.toContain("xbx");
    });

    it("form inputs use h-10 (compact, viewport-fit)", () => {
      expect(form).toContain('className="h-10"');
    });

    it("error state uses icon (not plain text)", () => {
      expect(form).toContain("text-destructive");
      expect(form).toContain("svg");
    });

    it("toggle link uses text-foreground (not text-primary)", () => {
      expect(form).toContain(
        'className="font-medium text-foreground hover:text-primary transition-colors"',
      );
    });
  });

  // ─── Register Page ─────────────────────────────────────────────────
  describe("RegisterPage (wrapper)", () => {
    let page: string;

    beforeAll(() => {
      page = readFile("app/(auth)/register/page.tsx");
    });

    it("does NOT have duplicate toggle links outside RegisterForm", () => {
      // The page wrapper should NOT contain "Already have an account?"
      expect(page).not.toContain("Already have an account");
    });

    it("does NOT contain Link import (no links needed in wrapper)", () => {
      expect(page).not.toContain("import Link");
    });

    it("just renders RegisterForm (no extra wrapper content)", () => {
      expect(page).toContain("<RegisterForm />");
    });
  });

  // ─── Auth Layout ───────────────────────────────────────────────────
  describe("AuthLayout", () => {
    let layout: string;

    beforeAll(() => {
      layout = readFile("app/(auth)/layout.tsx");
    });

    it("uses max-w-sm (compact, viewport-fit)", () => {
      expect(layout).toContain("max-w-sm");
    });

    it("uses py-6 (reduced padding for viewport fit)", () => {
      expect(layout).toContain("py-6");
    });

    it("does NOT have hero panel visible (should be commented out)", () => {
      // Remove comments and check for active (non-commented) hero panel
      const uncommented = layout
        .replace(/\/\/.*$/gm, "")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      expect(uncommented).not.toMatch(
        /hidden.*w-full.*flex-col.*justify-between/,
      );
    });
  });
});
