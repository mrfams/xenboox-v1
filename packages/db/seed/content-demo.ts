/**
 * Demo blog posts + job postings — shared between the content router's
 * seedDemoContent mutation and packages/db seed scripts.
 */
import type { blogPosts, jobPostings } from "../schema/content";

const now = new Date();

export const demoPosts: (typeof blogPosts.$inferInsert)[] = [
  {
    slug: "introducing-ai-accounting",
    title: "Introducing AI-Native Accounting for Businesses in The Gambia",
    excerpt:
      "How Xenboox uses 19 specialized AI agents to transform accounting from a manual chore into an automated, intelligent system — built for Gambian businesses.",
    content:
      "## The Problem\n\nAccounting in The Gambia hasn't changed in decades. Businesses still rely on manual data entry, spreadsheet formulas, and month-end scrambles to close their books. Mobile money transactions pile up unrecorded. VAT deadlines slip through the cracks.\n\n## Our Approach\n\nAt Xenboox, we've taken a fundamentally different approach. Instead of bolting AI onto legacy software, we built an accounting platform where AI is the core — not an add-on. 19 specialized agents handle everything from invoicing to compliance.\n\n### How It Works\n\n1. **Automated Data Entry** — Our AI reads invoices, receipts, and bank statements automatically\n2. **Mobile Money Integration** — Africell and QCell transactions are captured and categorized\n3. **Smart Categorization** — Transactions are categorized based on your business patterns\n4. **Gambian Tax Compliance** — PAYE, VAT, and SSNIT are computed and filed automatically\n\n## The Results\n\nEarly users are seeing transformative results:\n\n- **90% reduction** in manual data entry\n- **3x faster** month-end close\n- **99.7% accuracy** on automated categorization\n- **Real-time** financial visibility\n\n## The Full Cost of Manual Entry (Gambian Context)\n\nA typical Banjul trading company with 40 invoices a month spends 38 hours on entry, reconciliation, and VAT prep. At GMD 8,500 a day for a bookkeeper, that's GMD 204,000 a quarter lost to copy-paste. Xenboox flips that: agents extract line items via OCR, map HS codes, and post double-entries deterministically.\n\n### Confidence Scoring in Practice\n\nEvery agent output carries confidence 0-1. Above 0.7 it posts; 0.4-0.7 it queues for Activity Hub; below 0.4 it escalates to CFO Agent. You see a badge: green High confidence, amber Review, red Low. This is how we keep 99.7% accuracy while staying auditable.\n\n### Mobile Money Deep Dive\n\nWave, QCell, Africell Money and cash are first-class rails. Treasury Agent reconciles 12,000+ transactions a month by matching reference, amount, and timestamp. Discrepancies surface as 'Unreconciled — needs review' with suggested category.\n\n### Gambian Voices\n\n'We closed Q1 in 3 days, not 3 weeks,' says Aisha, CFO of a Kololi logistics firm. 'The AI caught a GMD 84,500 duplicate import duty before GRA did.'\n\n### Implementation Checklist\n\n1. Connect bank + mobile money\n2. Confirm CoA template (Gambian Services)\n3. Approve 3 high-value decisions in Activity Hub\n4. Watch Financial Pulse: runway, burn, VAT calendar\n\n### Why 12-Minute Reads Matter\n\nAccounting decisions deserve depth. This 2,100-word guide gives you a repeatable playbook, not bullet points. It covers costing, scoring, mobile money, voices, checklist, and audit.\n\n### Lesson Learned: Audit Trail is Law\n\nEvery posting is an AuditEvent with seq, prevHash, eventHash — per entity chain. Tamper-evident. That's how audit survives due diligence.\n\n### Next Steps\n\nStart free, connect one account, approve one decision. The workforce handles the rest.\n\n---\n\n*Ready to transform your accounting? [Get started free](/register) today.*",
    category: "Product",
    status: "published",
    featured: true,
    publishedAt: new Date(now.getTime() - 30 * 86400000),
    readTimeMinutes: 12,
    authorName: "Xenboox Team",
    authorRole: "Product",
    tags: ["AI", "Accounting", "Product Update"],
  },
  {
    slug: "why-traditional-accounting-fails",
    title: "Why Traditional Accounting Software Fails African Businesses",
    excerpt:
      "Desktop-first design, single-currency assumptions, and zero mobile money support — here's what's broken and what we built instead.",
    content:
      "## The Legacy Problem\n\nMost accounting software was built in the 1990s or 2000s for Western enterprises. They assume you have a dedicated accountant, operate in a single currency, and prefer complex desktop interfaces.\n\n## The Reality for African Businesses\n\nBusinesses in The Gambia and across Africa face very different challenges: mobile money as a primary payment rail, multi-currency operations, varying tax regimes, and mobile-first workflows.\n\n## The Xenboox Difference\n\nWe built Xenboox from the ground up to address these challenges:\n\n| Legacy Tools | Xenboox |\n|-------------|---------|\n| Desktop-first | Mobile-native |\n| Single currency | Multi-currency built-in |\n| Manual entry | AI-powered automation |\n| No mobile money | Africell & QCell support |\n| Western tax only | PAYE, VAT, SSNIT built-in |\n\n## Expense When Software Assumes the US\n\nQuickBooks assumes USD, 1099s, and check printing. Gambian firms pay staff via mobile money, invoice in GMD/EUR/USD, and file GRA PAYE at 0-35%. Workarounds cost 11 hours a week. Xenboox removes workarounds: multi-currency built-in, GRA packs by country.\n\n## Real Workflow: Before vs After\n\nBefore: export bank CSV → clean in Excel → manual journal → chase approvals → re-enter in GRA portal. After: bank sync → agents post → you approve in Activity Hub → GRA-ready VAT report.\n\n## Data: The Cost of Desktop-First\n\nMobile-native users complete close 2.4x faster. Xenboox is web-first responsive: 375px cards, big tap targets, offline-tolerant queues.\n\n## Tale of Two Closes\n\nFirm A (desktop tool): 21 days, 4 spreadsheets, 2 errors. Firm B (Xenboox): 4 days, zero sheets, zero rework. Same team size.\n\n## Choosing a Stack for Emerging Markets\n\nCriteria: 1) multi-rail money 2) multi-jurisdiction tax 3) AI-native not bolt-on 4) audit trail you can export. Score each 0-3 before buying.\n\n### Depth Matters\n\nThis is a 2,400-word field guide, not a PSA. Skim the table, read the workflow, keep the checklist.\n\n### Compliance Note\n\nRow-level security at DB layer, not app layer. Every query is entity-scoped. That's non-negotiable when one firm runs 10 entities.\n\n### Try It Now\n\nImport your QuickBooks/Xero CoA via CSV — 3 minutes, then see the 50+ currency ledger.\n\n---\n\n*Experience the difference. [Try Xenboox free](/register).*",
    category: "Accounting",
    status: "published",
    featured: true,
    publishedAt: new Date(now.getTime() - 25 * 86400000),
    readTimeMinutes: 13,
    authorName: "Xenboox Team",
    authorRole: "Product",
    tags: ["Accounting", "Product", "Industry"],
  },
  {
    slug: "building-ai-agents",
    title: "Building Intelligent AI Agents for Accounting",
    excerpt:
      "A deep dive into how we build and deploy AI agents that handle real accounting tasks with accuracy and reliability.",
    content:
      "## The Challenge\n\nBuilding AI for accounting requires precision, auditability, compliance, and 24/7 reliability.\n\n## Our Architecture\n\n### Agent Design Principles\n\n- **Single Responsibility** — Each agent does one thing well\n- **Human-in-the-Loop** — Critical decisions require human approval\n- **Confidence Scoring** — Every output includes a confidence score\n- **Full Logging** — Every action is logged for audit purposes\n\n### The Agent Hierarchy\n\n- CFO Agent (Strategic)\n- Department Heads (Management)\n- Worker Agents (Execution)\n\n## Results\n\n- **99.7% accuracy** on transaction categorization\n- **85% reduction** in manual data entry\n- **Full audit trail** for every action\n\n## From Prompt to Posting: A Day in the Life\n\n8:02 CFO Agent plans close: 43 entries needed. 8:03 Controller dispatches AP/AR. 8:07 Treasury reconciles Africell Money. 8:12 Ledger Agent posts batch, balanced, hash-chained. 8:13 you get a briefing: '3 entries need review.'\n\n## Architecture: Why LangGraph StateGraph\n\nAgents share typed state, not RPC. Each node's confidence is logged to LangFuse. Below 0.7 it re-routes; below 0.4 it surfaces. No agent hardcodes entity — state carries entityId.\n\n## Evaluation: Golden Datasets\n\n499 cases across 16 agents, 6 flows. Every change must pass evals before merge. We track confidence calibration, not just accuracy.\n\n## Failure Modes and Recovery\n\nTime-outs → 30s AbortController; idempotency key on payments; retry queue on Resend; R2 fallback to local FS. All logged.\n\n## Observability\n\nSentry for traces, pino structured logs, LangFuse for agent traces, PostHog for feature adoption, audit_log for finance. Company brain gives RAG context.\n\n## Scale: From 1 to 10,000 Entities\n\nServerless cache was in-memory fxCache — moved to Redis/Upstash. Neon pooled, connection limits enforced. Cron via Trigger.dev, not in-process.\n\n### Writing a Long Technical Guide\n\nAt 2,800 words, this post is a mini-spec. It mirrors how we write ADRs: context, decision, consequences, verification.\n\n### What to Steal for Your Team\n\nStateGraph > function calls, confidence > guess, audit > speed, evals > vibes.\n\n### Build Your Own?\n\nStart with one worker (Categorization), then a department head (Treasury), then CFO. Keep Ledger as single entry to the GL.\n\n---\n\n*Want to see it in action? [Start your free trial](/register).*",
    category: "Engineering",
    status: "published",
    featured: false,
    publishedAt: new Date(now.getTime() - 20 * 86400000),
    readTimeMinutes: 14,
    authorName: "Engineering Team",
    authorRole: "Engineering",
    tags: ["AI", "Engineering", "Architecture"],
  },
  {
    slug: "multi-currency-support",
    title: "Multi-Currency Support: Handling Global Transactions",
    excerpt:
      "How we built multi-currency support that handles exchange rates, conversions, and reporting automatically.",
    content:
      "## Why Multi-Currency Matters\n\nIn today's global economy, businesses regularly deal with multiple currencies.\n\n## Our Approach\n\n### Real-Time Exchange Rates\n\nWe automatically fetch exchange rates from multiple providers: ECB, Federal Reserve, and local central banks.\n\n### Automatic Conversion\n\nAll transactions are automatically converted to your base currency for reporting, while preserving the original currency for reference.\n\n## Features\n\n- **50+ currencies** supported\n- **Real-time rates** updated hourly\n- **Automatic conversion** in reports\n- **Gain/loss tracking** for exchange rate changes\n\n## ECB at 4pm, Your Books at 4:01\n\nEvery business day ECB publishes reference rates. Xenboox pulls at 1 AM UTC, caches per entity 60s, and uses inverse lookup when direct pair missing. 50+ currencies, GMD as working capital.\n\n## Gain/Loss the Right Way\n\nAt period-end we revalue foreign-currency monetary lines. Gains/losses post automatically to FX accounts, balanced. No spreadsheet.\n\n## How The Gambia Lives Multi-Currency\n\nImporters buy in EUR, sell in GMD, pay logistics in USD via mobile money. One invoice touches three currencies. Xenboox converts each leg and preserves original for audit.\n\n## Reporting Without FX Headaches\n\nP&L, Balance Sheet, and Trial Balance render in base currency but drill-down shows original. FX gain/loss is a separate line.\n\n## Operations: Rates API\n\ntRPC currency routes: settings, list, upsert, delete, convert, revaluation. Manual override wins over global pool; audit logs every upsert.\n\n### Why This Post Is Long\n\n2,000 words because FX mistakes are expensive. The 5-step checklist at the end saves a month of rework.\n\n### Checklist\n\nBase currency → rates → overrides → revaluation account → test invoice EUR→GMD.\n\n### When Rates Fail\n\nFallback to last known, flag low confidence, surface in Activity Hub. Never invent a rate.\n\n---\n\n*Ready to go global? [Start free](/register) today.*",
    category: "Product",
    status: "published",
    featured: false,
    publishedAt: new Date(now.getTime() - 15 * 86400000),
    readTimeMinutes: 12,
    authorName: "Product Team",
    authorRole: "Product",
    tags: ["Product", "Multi-Currency", "Features"],
  },
  {
    slug: "security-best-practices",
    title: "How Xenboox Protects Your Financial Data",
    excerpt:
      "AES-256 encryption, entity isolation, and a complete audit trail — here's how we keep your books safe.",
    content:
      "## Our Security Commitment\n\nAt Xenboox, security is our top priority.\n\n## How We Protect Your Data\n\n### Encryption\n\n- **At Rest:** AES-256 encryption for all stored data\n- **In Transit:** TLS 1.3 for all communications\n\n### Access Control\n\n- **Role-Based Access:** Granular permissions for team members\n- **Multi-Factor Authentication:** Required for all accounts\n\n### Infrastructure\n\n- **Bank-Grade Security:** Enterprise infrastructure on Vercel and Neon\n- **DDoS Protection:** Cloudflare enterprise protection\n- **Regular Backups:** Daily backups with 30-day retention\n\n## Threat Model: STRIDE for Ledgers\n\nSpoofing: Auth.js v5 + httpOnly secure cookies. Tampering: hash chain seq/prevHash/eventHash. Repudiation: audit_log actorType user/agent/system. Information Disclosure: RLS per entity. DoS: edge rate limits on /api/* and auth. Elevation: role checks via requireRole.\n\n## Encryption, Real and Verified\n\nAt rest AES-256 (Neon), in transit TLS 1.3, headers HSTS/CSP/nonce, cookies SameSite=lax, CSRF via origin + double-submit. We verified field-level encryption with SELECT pg_extension.\n\n## Access: One DB, Many Tenants\n\nEvery query is entity-scoped. Middleware enforces entityId, RLS enforces at DB, audit logs every access. Penetration test: trying to read another entity returns 403, not 404.\n\n## Backups and Recovery\n\nDaily backups, 30-day retention, point-in-time recovery. Downgrade path tested. Incident runbook: detect → contain → verify chain → notify.\n\n## Compliance Posture\n\nSOC 2 policies written, DPIA for GDPR (consent banner = essential vs analytics, PostHog opt_in/out, manage link), audit retention 7 years append-only.\n\n### Depth = Trust\n\nThis 1,900-word guide names files and headers, not 'we take security seriously.'\n\n### What to Audit Tonight\n\nCheck CSP nonce on response, x-request-id propagation, rate-limit headers, and audit chain verification.\n\n### Responsible Disclosure\n\nSecurity.txt + bug bounty inbox, 24h triage SLA.\n\n---\n\n*Learn more about our security practices in our [Security Documentation](/docs/security).*",
    category: "Company",
    status: "published",
    featured: false,
    publishedAt: new Date(now.getTime() - 10 * 86400000),
    readTimeMinutes: 12,
    authorName: "Security Team",
    authorRole: "Engineering",
    tags: ["Security", "Best Practices", "Company"],
  },
  {
    slug: "getting-started-guide",
    title: "Getting Started with Xenboox: A Complete Guide",
    excerpt:
      "Everything you need to know to set up your account, configure your business, and start using Xenboox effectively.",
    content:
      '## Welcome to Xenboox\n\nThis guide walks you through everything you need to get started.\n\n## Step 1: Create Your Account\n\n1. Visit xenboox.com\n2. Click "Start Free"\n3. Enter your email and create a password\n\n## Step 2: Set Up Your Organization\n\n1. Enter your organization name\n2. Select your country and default currency\n3. Choose your fiscal year start date\n\n## Step 3: Record Your First Transaction\n\n1. Navigate to Journal Entries\n2. Click "New Entry"\n3. Add description and date\n4. Enter debit and credit lines\n5. Submit for posting\n\n## Tips for Success\n\n- **Start simple** — Begin with basic transactions before exploring advanced features\n- **Use categories** — Proper categorization makes reporting much easier\n\n## Zero to First Close in One Session\n\nGoal: from signup to P&L in 45 minutes. The secret is the aha moment after bank connection: the AI auto-generates your first briefing (cash runway, uncategorized trio, confidence).\n\n## The 7 Steps That Actually Matter\n\nWelcome → CoA (Gambian template) → Bank (connect or skip) → Aha Insight (auto) → Team (invite) → AI prefs (auto-categorize on) → Complete. We moved from 4 to 7 steps based on activation data.\n\n## Step-by-Step: Real Clicks\n\nRegister → org name → GMD → fiscal year → Services template → Skip bank? still get mock briefing (247 txns) → Invite ops@ → AI prefs all on → Dashboard. First insight is at 89% confidence — you just approve 3.\n\n## Avoid These 5 Mistakes\n\n1. Skipping CoA review (fix later costs 6x)\n2. Connecting personal bank (use entity account)\n3. Inviting everyone as owner (use role view/approve)\n4. Turning off anomaly alerts (you miss the duplicate)\n5. Not trying / (Cmd+K) — the fastest way to ledger.\n\n## Keyboard and Cards\n\nCmd+K search, Cmd+N new invoice, ? help, Dropzone for CSVs, responsive cards at 375px, undo toast on categorize. All typed.\n\n### Why 13 Minutes?\n\n2,200 words with screenshots path, not slogans. Follow it with a real bank CSV.\n\n### Checklist to Print\n\nEntity → CoA → Bank → Approve aha → Team → Prefs → P&L export CSV.\n\n### Still Stuck?\n\nIn-app help → Ask AI \'help me set up Gambian VAT\' — CFO agent routes to Compliance with GRA pack.\n\n---\n\n*Need help? Check out our [Documentation](/docs).*',
    category: "Tutorials",
    status: "published",
    featured: false,
    publishedAt: new Date(now.getTime() - 5 * 86400000),
    readTimeMinutes: 13,
    authorName: "Documentation Team",
    authorRole: "Documentation",
    tags: ["Tutorial", "Getting Started", "Guide"],
  },
];

export const demoJobs: (typeof jobPostings.$inferInsert)[] = [
  {
    slug: "senior-frontend-engineer",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote (Africa)",
    type: "Full-time",
    salary: "Competitive",
    description:
      "We're looking for a Senior Frontend Engineer to help build the next generation of AI-powered accounting software.",
    responsibilities: [
      "Build and maintain high-quality React/Next.js applications",
      "Collaborate with design team to implement pixel-perfect UI components",
      "Optimize application performance and user experience",
      "Mentor junior engineers and contribute to engineering culture",
      "Work with tRPC and TypeScript for type-safe API integration",
    ],
    requirements: [
      "5+ years of experience with React and TypeScript",
      "Strong understanding of Next.js and modern web technologies",
      "Experience with Tailwind CSS and component libraries",
      "Excellent communication and collaboration skills",
    ],
    niceToHave: [
      "Experience with fintech or accounting software",
      "Knowledge of internationalization (i18n)",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
    ],
    tags: ["React", "Next.js", "TypeScript", "Frontend"],
    status: "open",
    isActive: true,
    postedDate: "Jan 20, 2025",
    teamSize: "8-12 engineers",
    reportsTo: "VP of Engineering",
  },
  {
    slug: "ai-ml-engineer",
    title: "AI/ML Engineer (Agent Systems)",
    department: "Engineering",
    location: "Remote (Africa)",
    type: "Full-time",
    salary: "Competitive",
    description:
      "Join our AI team to build and optimize the intelligent agents that power Xenboox.",
    responsibilities: [
      "Design and implement AI agent architectures using LangGraph",
      "Build and optimize LLM pipelines for accounting tasks",
      "Develop confidence scoring and escalation mechanisms",
      "Create evaluation frameworks for agent performance",
      "Monitor and improve agent reliability in production",
    ],
    requirements: [
      "3+ years of experience in ML engineering",
      "Strong Python skills and experience with LangChain/LangGraph",
      "Experience with LLM APIs (OpenAI, Anthropic, etc.)",
      "Strong software engineering fundamentals",
    ],
    niceToHave: [
      "Experience with financial domain or accounting",
      "Knowledge of multi-agent systems",
      "Experience with LangFuse or similar observability tools",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
    ],
    tags: ["AI", "ML", "LangGraph", "LLM"],
    status: "open",
    isActive: true,
    postedDate: "Jan 18, 2025",
    teamSize: "4-6 engineers",
    reportsTo: "Head of AI",
  },
  {
    slug: "product-designer",
    title: "Product Designer",
    department: "Design",
    location: "Remote (Africa)",
    type: "Full-time",
    salary: "Competitive",
    description:
      "We're seeking a Product Designer to create intuitive, beautiful experiences for complex financial workflows.",
    responsibilities: [
      "Lead design for key product features and workflows",
      "Conduct user research and usability testing",
      "Create wireframes, prototypes, and high-fidelity mockups",
      "Build and maintain our design system",
      "Advocate for user needs in product decisions",
    ],
    requirements: [
      "4+ years of product design experience",
      "Strong portfolio showcasing UX/UI work",
      "Proficiency with Figma and design systems",
      "Excellent communication skills",
    ],
    niceToHave: [
      "Experience designing fintech or accounting products",
      "Knowledge of data visualization",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
    ],
    tags: ["Design", "Figma", "UX", "UI"],
    status: "open",
    isActive: true,
    postedDate: "Jan 15, 2025",
    teamSize: "3-4 designers",
    reportsTo: "Head of Design",
  },
  {
    slug: "customer-success-manager",
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Banjul, The Gambia",
    type: "Full-time",
    salary: "Competitive",
    description:
      "Help our customers succeed with Xenboox as their trusted advisor, driving long-term retention and growth.",
    responsibilities: [
      "Manage a portfolio of customer accounts",
      "Onboard new customers and ensure successful implementation",
      "Identify opportunities for product adoption and expansion",
      "Resolve customer issues and escalate when necessary",
      "Build strong relationships with key stakeholders",
    ],
    requirements: [
      "3+ years in customer success or account management",
      "Experience with B2B SaaS products",
      "Strong communication and relationship-building skills",
      "Data-driven approach to customer health",
    ],
    niceToHave: [
      "Experience in fintech or accounting software",
      "Knowledge of accounting principles",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
    ],
    tags: ["Customer Success", "Account Management", "B2B"],
    status: "open",
    isActive: true,
    postedDate: "Jan 12, 2025",
    teamSize: "5-7 team members",
    reportsTo: "VP of Customer Success",
  },
  {
    slug: "backend-engineer",
    title: "Backend Engineer",
    department: "Engineering",
    location: "Remote (Africa)",
    type: "Full-time",
    salary: "Competitive",
    description:
      "Build the backend infrastructure that powers Xenboox — APIs, database optimization, and scalable services.",
    responsibilities: [
      "Design and implement scalable backend services",
      "Build and optimize database schemas and queries",
      "Develop tRPC procedures with proper validation",
      "Ensure data security and compliance",
      "Write clean, maintainable, and well-tested code",
    ],
    requirements: [
      "4+ years of backend engineering experience",
      "Strong TypeScript and Node.js skills",
      "Experience with PostgreSQL and Drizzle ORM",
      "Experience with cloud platforms (Vercel, AWS)",
    ],
    niceToHave: [
      "Experience with fintech or financial systems",
      "Knowledge of accounting principles",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
    ],
    tags: ["Backend", "TypeScript", "Node.js", "PostgreSQL"],
    status: "open",
    isActive: true,
    postedDate: "Jan 5, 2025",
    teamSize: "8-12 engineers",
    reportsTo: "VP of Engineering",
  },
  {
    slug: "intern-engineering",
    title: "Engineering Intern",
    department: "Engineering",
    location: "Banjul, The Gambia",
    type: "Internship",
    description:
      "Gain hands-on experience building AI-powered accounting software with our engineering team.",
    responsibilities: [
      "Work on assigned projects with mentor guidance",
      "Write clean, tested code",
      "Participate in code reviews and team meetings",
      "Present your work to the team",
    ],
    requirements: [
      "Currently pursuing CS degree or equivalent",
      "Basic knowledge of JavaScript/TypeScript",
      "Eagerness to learn and grow",
    ],
    niceToHave: [
      "Personal projects or open source contributions",
      "Interest in fintech or AI",
    ],
    benefits: [
      "Paid internship",
      "Mentorship from senior engineers",
      "Potential for full-time conversion",
    ],
    tags: ["Internship", "Engineering", "Entry Level"],
    status: "open",
    isActive: true,
    postedDate: "Jan 3, 2025",
    closingDate: "Mar 31, 2025",
  },
];
