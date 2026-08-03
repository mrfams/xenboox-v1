export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readTime: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  tags: string[];
  featured: boolean;
  image?: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "introducing-ai-accounting",
    title: "Introducing AI-Native Accounting for Modern Businesses",
    excerpt:
      "How Xenboox uses artificial intelligence to transform accounting from a manual chore into an automated, intelligent system.",
    content: `
## The Problem

Accounting hasn't changed in decades. Businesses still rely on manual data entry, spreadsheet formulas, and month-end scrambles to close their books. The tools we use were built for a different era.

## Our Approach

At Xenboox, we've taken a fundamentally different approach. Instead of bolting AI onto legacy software, we built an accounting platform where AI is the core — not an add-on.

### How It Works

1. **Automated Data Entry** — Our AI reads invoices, receipts, and bank statements automatically
2. **Smart Categorization** — Transactions are categorized based on your business patterns
3. **Intelligent Reconciliation** — Bank feeds are matched with your books automatically
4. **Real-Time Insights** — Get instant visibility into your financial health

## The Results

Early users are seeing transformative results:

- **90% reduction** in manual data entry
- **3x faster** month-end close
- **99.7% accuracy** on automated categorization
- **Real-time** financial visibility

## What's Next

We're just getting started. Our roadmap includes:

- Multi-currency support for global businesses
- Advanced forecasting and budgeting
- Industry-specific templates and workflows
- Deeper integrations with banks and payment providers

---

*Ready to transform your accounting? [Get started free](/register) today.*
    `,
    category: "Product",
    date: "Jan 15, 2025",
    readTime: "5 min",
    author: {
      name: "Xenboox Team",
      role: "Product",
    },
    tags: ["AI", "Accounting", "Product Update"],
    featured: true,
  },
  {
    slug: "why-traditional-accounting-fails",
    title: "Why Traditional Accounting Software Fails Modern Businesses",
    excerpt:
      "The structural reasons legacy accounting tools don't work for today's businesses — and what we built instead.",
    content: `
## The Legacy Problem

Most accounting software was built in the 1990s or 2000s for a different world. They assume:

- You have a dedicated accountant
- You operate in a single currency
- You have reliable internet connectivity
- You're comfortable with complex interfaces

## The Reality

Modern businesses face very different challenges:

### Multi-Currency Operations
Businesses today operate across borders. They need to handle multiple currencies, exchange rates, and international transactions — features that legacy tools treat as afterthoughts.

### Mobile-First Workflows
Business owners and finance teams work from their phones. They need to capture receipts, approve transactions, and check cash position on the go.

### Real-Time Visibility
Month-old financial reports don't help anyone make decisions. Businesses need real-time insight into their financial health.

### Intelligent Automation
Manual data entry is error-prone and time-consuming. AI can handle routine tasks while humans focus on strategy.

## The Xenboox Difference

We built Xenboox from the ground up to address these challenges:

| Legacy Tools | Xenboox |
|-------------|---------|
| Desktop-first | Mobile-native |
| Single currency | Multi-currency built-in |
| Manual entry | AI-powered automation |
| Monthly reports | Real-time dashboards |
| Complex interfaces | Simple, intuitive design |

## Conclusion

The accounting software industry is ripe for disruption. We're building the platform that modern businesses actually need.

---

*Experience the difference. [Try Xenboox free](/register).*
    `,
    category: "Accounting",
    date: "Jan 10, 2025",
    readTime: "7 min",
    author: {
      name: "Xenboox Team",
      role: "Product",
    },
    tags: ["Accounting", "Product", "Industry"],
    featured: true,
  },
  {
    slug: "building-ai-agents",
    title: "Building Intelligent AI Agents for Accounting",
    excerpt:
      "A deep dive into how we build and deploy AI agents that handle real accounting tasks with accuracy and reliability.",
    content: `
## The Challenge

Building AI for accounting is fundamentally different from building AI for other domains. Accounting requires:

1. **Precision** — Every calculation must be exact
2. **Auditability** — Every action must be traceable
3. **Compliance** — Every transaction must follow regulations
4. **Reliability** — The system must work 24/7 without errors

## Our Architecture

### Agent Design Principles

We follow strict principles when building AI agents:

- **Single Responsibility** — Each agent does one thing well
- **Human-in-the-Loop** — Critical decisions require human approval
- **Confidence Scoring** — Every output includes a confidence score
- **Full Logging** — Every action is logged for audit purposes

### The Agent Hierarchy

Our agents work in a coordinated hierarchy:

- CFO Agent (Strategic)
- Department Heads (Management)
- Worker Agents (Execution)

This ensures proper oversight while maintaining efficiency.

## Results

Our AI agents are delivering real value:

- **99.7% accuracy** on transaction categorization
- **85% reduction** in manual data entry
- **Real-time** anomaly detection
- **Full audit trail** for every action

## What's Next

We're continuing to push the boundaries of what's possible with AI in accounting. Stay tuned for more updates.

---

*Want to see it in action? [Start your free trial](/register).*
    `,
    category: "Engineering",
    date: "Jan 5, 2025",
    readTime: "10 min",
    author: {
      name: "Engineering Team",
      role: "Engineering",
    },
    tags: ["AI", "Engineering", "Architecture"],
    featured: false,
  },
  {
    slug: "multi-currency-support",
    title: "Multi-Currency Support: Handling Global Transactions",
    excerpt:
      "How we built multi-currency support that handles exchange rates, conversions, and reporting automatically.",
    content: `
## Why Multi-Currency Matters

In today's global economy, businesses regularly deal with multiple currencies. Whether you're paying international suppliers, receiving payments from overseas customers, or operating in multiple countries, you need accounting software that handles this seamlessly.

## Our Approach

### Real-Time Exchange Rates

We automatically fetch exchange rates from multiple providers to ensure accuracy:

- ECB (European Central Bank)
- Federal Reserve
- Local central banks

### Automatic Conversion

All transactions are automatically converted to your base currency for reporting, while preserving the original currency for reference.

### Multi-Currency Reporting

Generate financial reports in any currency, with proper conversion and formatting.

## Features

- **50+ currencies** supported
- **Real-time rates** updated hourly
- **Automatic conversion** in reports
- **Original currency** preserved
- **Gain/loss tracking** for exchange rate changes

## Example

Here's how a simple transaction looks:

| Field | Value |
|-------|-------|
| Original Amount | €1,000 EUR |
| Exchange Rate | 1.08 |
| Base Amount | $1,080 USD |
| Date | Jan 15, 2025 |

---

*Ready to go global? [Start free](/register) today.*
    `,
    category: "Product",
    date: "Dec 28, 2024",
    readTime: "6 min",
    author: {
      name: "Product Team",
      role: "Product",
    },
    tags: ["Product", "Multi-Currency", "Features"],
    featured: false,
  },
  {
    slug: "getting-started-guide",
    title: "Getting Started with Xenboox: A Complete Guide",
    excerpt:
      "Everything you need to know to set up your account, configure your business, and start using Xenboox effectively.",
    content: `
## Welcome to Xenboox

This guide will walk you through everything you need to get started with Xenboox.

## Step 1: Create Your Account

1. Visit [xenboox.com](/)
2. Click "Start Free"
3. Enter your email and create a password
4. Verify your email address

## Step 2: Set Up Your Organization

1. Enter your organization name
2. Select your country and default currency
3. Choose your fiscal year start date
4. Select an account template

## Step 3: Invite Your Team

1. Go to Settings → Team
2. Enter email addresses of team members
3. Assign appropriate roles
4. Send invitations

## Step 4: Record Your First Transaction

1. Navigate to Journal Entries
2. Click "New Entry"
3. Add description and date
4. Enter debit and credit lines
5. Submit for posting

## Step 5: Connect Bank Feeds

1. Go to Banking → Connect Account
2. Select your bank
3. Authorize the connection
4. Start importing transactions

## Tips for Success

- **Start simple** — Begin with basic transactions before exploring advanced features
- **Use categories** — Proper categorization makes reporting much easier
- **Review regularly** — Check your dashboard daily to stay on top of things
- **Ask for help** — Our support team is here if you need assistance

---

*Need help? Check out our [Documentation](/docs) or [Contact Support](/contact).*
    `,
    category: "Tutorials",
    date: "Dec 20, 2024",
    readTime: "8 min",
    author: {
      name: "Documentation Team",
      role: "Documentation",
    },
    tags: ["Tutorial", "Getting Started", "Guide"],
    featured: false,
  },
  {
    slug: "security-best-practices",
    title: "Security Best Practices for Your Financial Data",
    excerpt:
      "How we protect your data and what you can do to keep your account secure.",
    content: `
## Our Security Commitment

At Xenboox, security is our top priority. We implement multiple layers of protection to keep your financial data safe.

## How We Protect Your Data

### Encryption

- **At Rest:** AES-256 encryption for all stored data
- **In Transit:** TLS 1.3 for all communications
- **Key Management:** Hardware security modules (HSMs)

### Access Control

- **Role-Based Access:** Granular permissions for team members
- **Multi-Factor Authentication:** Required for all accounts
- **Session Management:** Automatic timeout and device tracking

### Infrastructure

- **SOC 2 Compliant:** Regular third-party audits
- **DDoS Protection:** Cloudflare enterprise protection
- **Regular Backups:** Daily backups with 30-day retention

## What You Can Do

### Enable Multi-Factor Authentication

MFA adds an extra layer of security to your account. We strongly recommend enabling it for all users.

### Use Strong Passwords

- Use a unique password for Xenboox
- Consider using a password manager
- Never share your credentials

### Review Access Regularly

- Audit team member access monthly
- Remove access for former employees immediately
- Use least-privilege principle for roles

### Monitor Account Activity

- Check the audit log regularly
- Set up alerts for suspicious activity
- Report any concerns to our security team

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly to security@xenboox.com.

---

*Learn more about our security practices in our [Security Documentation](/docs/security).*
    `,
    category: "Company",
    date: "Dec 15, 2024",
    readTime: "5 min",
    author: {
      name: "Security Team",
      role: "Engineering",
    },
    tags: ["Security", "Best Practices", "Company"],
    featured: false,
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPost[] {
  const currentPost = getBlogPostBySlug(currentSlug);
  if (!currentPost) return blogPosts.slice(0, limit);

  return blogPosts
    .filter((post) => post.slug !== currentSlug)
    .sort((a, b) => {
      // Prioritize same category
      const aSameCategory = a.category === currentPost.category ? 1 : 0;
      const bSameCategory = b.category === currentPost.category ? 1 : 0;
      return bSameCategory - aSameCategory;
    })
    .slice(0, limit);
}

export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter((post) => post.featured);
}

export function getPostsByCategory(category: string): BlogPost[] {
  if (category === "All") return blogPosts;
  return blogPosts.filter((post) => post.category === category);
}
