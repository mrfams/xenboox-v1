/**
 * Demo blog posts + job postings — shared between the content router's
 * seedDemoContent mutation and packages/db seed scripts.
 */
import type { blogPosts, jobPostings } from "../schema/content";

const now = new Date();

export const demoPosts: (typeof blogPosts.$inferInsert)[] = [
  {
    slug: "introducing-ai-accounting",
    title: "Introducing AI-Native Accounting for Modern Businesses",
    excerpt:
      "How Xenboox uses artificial intelligence to transform accounting from a manual chore into an automated, intelligent system.",
    content:
      "## The Problem\n\nAccounting hasn't changed in decades. Businesses still rely on manual data entry, spreadsheet formulas, and month-end scrambles to close their books.\n\n## Our Approach\n\nAt Xenboox, we've taken a fundamentally different approach. Instead of bolting AI onto legacy software, we built an accounting platform where AI is the core — not an add-on.\n\n### How It Works\n\n1. **Automated Data Entry** — Our AI reads invoices, receipts, and bank statements automatically\n2. **Smart Categorization** — Transactions are categorized based on your business patterns\n3. **Intelligent Reconciliation** — Bank feeds are matched with your books automatically\n4. **Real-Time Insights** — Get instant visibility into your financial health\n\n## The Results\n\nEarly users are seeing transformative results:\n\n- **90% reduction** in manual data entry\n- **3x faster** month-end close\n- **99.7% accuracy** on automated categorization\n- **Real-time** financial visibility\n\n---\n\n*Ready to transform your accounting? [Get started free](/register) today.*",
    category: "Product",
    status: "published",
    featured: true,
    publishedAt: new Date(now.getTime() - 30 * 86400000),
    readTimeMinutes: 5,
    authorName: "Xenboox Team",
    authorRole: "Product",
    tags: ["AI", "Accounting", "Product Update"],
  },
  {
    slug: "why-traditional-accounting-fails",
    title: "Why Traditional Accounting Software Fails Modern Businesses",
    excerpt:
      "The structural reasons legacy accounting tools don't work for today's businesses — and what we built instead.",
    content:
      "## The Legacy Problem\n\nMost accounting software was built in the 1990s or 2000s for a different world. They assume you have a dedicated accountant, operate in a single currency, and prefer complex interfaces.\n\n## The Reality\n\nModern businesses face very different challenges: multi-currency operations, mobile-first workflows, real-time visibility, and intelligent automation.\n\n## The Xenboox Difference\n\nWe built Xenboox from the ground up to address these challenges:\n\n| Legacy Tools | Xenboox |\n|-------------|---------|\n| Desktop-first | Mobile-native |\n| Single currency | Multi-currency built-in |\n| Manual entry | AI-powered automation |\n| Monthly reports | Real-time dashboards |\n\n---\n\n*Experience the difference. [Try Xenboox free](/register).*",
    category: "Accounting",
    status: "published",
    featured: true,
    publishedAt: new Date(now.getTime() - 25 * 86400000),
    readTimeMinutes: 7,
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
      "## The Challenge\n\nBuilding AI for accounting requires precision, auditability, compliance, and 24/7 reliability.\n\n## Our Architecture\n\n### Agent Design Principles\n\n- **Single Responsibility** — Each agent does one thing well\n- **Human-in-the-Loop** — Critical decisions require human approval\n- **Confidence Scoring** — Every output includes a confidence score\n- **Full Logging** — Every action is logged for audit purposes\n\n### The Agent Hierarchy\n\n- CFO Agent (Strategic)\n- Department Heads (Management)\n- Worker Agents (Execution)\n\n## Results\n\n- **99.7% accuracy** on transaction categorization\n- **85% reduction** in manual data entry\n- **Full audit trail** for every action\n\n---\n\n*Want to see it in action? [Start your free trial](/register).*",
    category: "Engineering",
    status: "published",
    featured: false,
    publishedAt: new Date(now.getTime() - 20 * 86400000),
    readTimeMinutes: 10,
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
      "## Why Multi-Currency Matters\n\nIn today's global economy, businesses regularly deal with multiple currencies.\n\n## Our Approach\n\n### Real-Time Exchange Rates\n\nWe automatically fetch exchange rates from multiple providers: ECB, Federal Reserve, and local central banks.\n\n### Automatic Conversion\n\nAll transactions are automatically converted to your base currency for reporting, while preserving the original currency for reference.\n\n## Features\n\n- **50+ currencies** supported\n- **Real-time rates** updated hourly\n- **Automatic conversion** in reports\n- **Gain/loss tracking** for exchange rate changes\n\n---\n\n*Ready to go global? [Start free](/register) today.*",
    category: "Product",
    status: "published",
    featured: false,
    publishedAt: new Date(now.getTime() - 15 * 86400000),
    readTimeMinutes: 6,
    authorName: "Product Team",
    authorRole: "Product",
    tags: ["Product", "Multi-Currency", "Features"],
  },
  {
    slug: "security-best-practices",
    title: "Security Best Practices for Your Financial Data",
    excerpt:
      "How we protect your data and what you can do to keep your account secure.",
    content:
      "## Our Security Commitment\n\nAt Xenboox, security is our top priority.\n\n## How We Protect Your Data\n\n### Encryption\n\n- **At Rest:** AES-256 encryption for all stored data\n- **In Transit:** TLS 1.3 for all communications\n\n### Access Control\n\n- **Role-Based Access:** Granular permissions for team members\n- **Multi-Factor Authentication:** Required for all accounts\n\n### Infrastructure\n\n- **SOC 2 Compliant:** Regular third-party audits\n- **DDoS Protection:** Cloudflare enterprise protection\n- **Regular Backups:** Daily backups with 30-day retention\n\n---\n\n*Learn more about our security practices in our [Security Documentation](/docs/security).*",
    category: "Company",
    status: "published",
    featured: false,
    publishedAt: new Date(now.getTime() - 10 * 86400000),
    readTimeMinutes: 5,
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
      '## Welcome to Xenboox\n\nThis guide walks you through everything you need to get started.\n\n## Step 1: Create Your Account\n\n1. Visit xenboox.com\n2. Click "Start Free"\n3. Enter your email and create a password\n\n## Step 2: Set Up Your Organization\n\n1. Enter your organization name\n2. Select your country and default currency\n3. Choose your fiscal year start date\n\n## Step 3: Record Your First Transaction\n\n1. Navigate to Journal Entries\n2. Click "New Entry"\n3. Add description and date\n4. Enter debit and credit lines\n5. Submit for posting\n\n## Tips for Success\n\n- **Start simple** — Begin with basic transactions before exploring advanced features\n- **Use categories** — Proper categorization makes reporting much easier\n\n---\n\n*Need help? Check out our [Documentation](/docs).*',
    category: "Tutorials",
    status: "published",
    featured: false,
    publishedAt: new Date(now.getTime() - 5 * 86400000),
    readTimeMinutes: 8,
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
    location: "Remote",
    type: "Full-time",
    salary: "$150,000 - $200,000",
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
    location: "Remote",
    type: "Full-time",
    salary: "$160,000 - $220,000",
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
    location: "Remote",
    type: "Full-time",
    salary: "$130,000 - $170,000",
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
    location: "Remote",
    type: "Full-time",
    salary: "$90,000 - $120,000",
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
    location: "Remote",
    type: "Full-time",
    salary: "$140,000 - $190,000",
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
    location: "Remote",
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
