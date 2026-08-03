export interface JobListing {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  salary?: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string[];
  benefits: string[];
  postedDate: string;
  closingDate?: string;
  isActive: boolean;
  teamSize?: string;
  reportsTo?: string;
  tags: string[];
}

export const departments = [
  "All",
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Operations",
  "Customer Success",
  "Finance",
  "Legal",
  "People",
];

export const locations = [
  "All",
  "Remote",
  "Remote (US/EU)",
  "Remote (Africa)",
  "New York",
  "London",
  "Lagos",
];

export const jobTypes = [
  "All",
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
];

export const jobListings: JobListing[] = [
  {
    id: "1",
    slug: "senior-frontend-engineer",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    salary: "$150,000 - $200,000",
    description:
      "We're looking for a Senior Frontend Engineer to help build the next generation of AI-powered accounting software. You'll work closely with our design and product teams to create beautiful, performant interfaces that make complex financial data accessible and actionable.",
    responsibilities: [
      "Build and maintain high-quality React/Next.js applications",
      "Collaborate with design team to implement pixel-perfect UI components",
      "Optimize application performance and user experience",
      "Mentor junior engineers and contribute to engineering culture",
      "Participate in code reviews and architectural decisions",
      "Work with tRPC and TypeScript for type-safe API integration",
    ],
    requirements: [
      "5+ years of experience with React and TypeScript",
      "Strong understanding of Next.js and modern web technologies",
      "Experience with Tailwind CSS and component libraries",
      "Familiarity with tRPC or similar API frameworks",
      "Excellent communication and collaboration skills",
      "Passion for building products that make a difference",
    ],
    niceToHave: [
      "Experience with fintech or accounting software",
      "Knowledge of internationalization (i18n)",
      "Experience with React Native for mobile development",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
      "Annual team retreats",
    ],
    postedDate: "Jan 20, 2025",
    isActive: true,
    teamSize: "8-12 engineers",
    reportsTo: "VP of Engineering",
    tags: ["React", "Next.js", "TypeScript", "Frontend"],
  },
  {
    id: "2",
    slug: "ai-ml-engineer",
    title: "AI/ML Engineer (Agent Systems)",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    salary: "$160,000 - $220,000",
    description:
      "Join our AI team to build and optimize the intelligent agents that power Xenboox. You'll work on cutting-edge LLM applications, multi-agent systems, and autonomous workflows that handle real accounting tasks with precision and reliability.",
    responsibilities: [
      "Design and implement AI agent architectures using LangGraph",
      "Build and optimize LLM pipelines for accounting tasks",
      "Develop confidence scoring and escalation mechanisms",
      "Create evaluation frameworks for agent performance",
      "Collaborate with domain experts to ensure accuracy",
      "Monitor and improve agent reliability in production",
    ],
    requirements: [
      "3+ years of experience in ML engineering",
      "Strong Python skills and experience with LangChain/LangGraph",
      "Experience with LLM APIs (OpenAI, Anthropic, etc.)",
      "Understanding of prompt engineering and fine-tuning",
      "Familiarity with vector databases and RAG systems",
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
      "Annual team retreats",
    ],
    postedDate: "Jan 18, 2025",
    isActive: true,
    teamSize: "4-6 engineers",
    reportsTo: "Head of AI",
    tags: ["AI", "ML", "LangGraph", "LLM"],
  },
  {
    id: "3",
    slug: "product-designer",
    title: "Product Designer",
    department: "Design",
    location: "Remote",
    type: "Full-time",
    salary: "$130,000 - $170,000",
    description:
      "We're seeking a Product Designer to create intuitive, beautiful experiences for complex financial workflows. You'll own the design process from research to implementation, working closely with product and engineering to deliver features that users love.",
    responsibilities: [
      "Lead design for key product features and workflows",
      "Conduct user research and usability testing",
      "Create wireframes, prototypes, and high-fidelity mockups",
      "Build and maintain our design system",
      "Collaborate with engineering on implementation",
      "Advocate for user needs in product decisions",
    ],
    requirements: [
      "4+ years of product design experience",
      "Strong portfolio showcasing UX/UI work",
      "Proficiency with Figma and design systems",
      "Experience with user research methodologies",
      "Understanding of accessibility best practices",
      "Excellent communication skills",
    ],
    niceToHave: [
      "Experience designing fintech or accounting products",
      "Knowledge of data visualization",
      "Experience with motion design",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
      "Annual team retreats",
    ],
    postedDate: "Jan 15, 2025",
    isActive: true,
    teamSize: "3-4 designers",
    reportsTo: "Head of Design",
    tags: ["Design", "Figma", "UX", "UI"],
  },
  {
    id: "4",
    slug: "customer-success-manager",
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Remote",
    type: "Full-time",
    salary: "$90,000 - $120,000",
    description:
      "Help our customers succeed with Xenboox. You'll be the trusted advisor for our most important accounts, ensuring they get maximum value from our platform and driving long-term retention and growth.",
    responsibilities: [
      "Manage a portfolio of customer accounts",
      "Onboard new customers and ensure successful implementation",
      "Identify opportunities for product adoption and expansion",
      "Resolve customer issues and escalate when necessary",
      "Gather feedback to improve product and processes",
      "Build strong relationships with key stakeholders",
    ],
    requirements: [
      "3+ years in customer success or account management",
      "Experience with B2B SaaS products",
      "Strong communication and relationship-building skills",
      "Problem-solving mindset",
      "Data-driven approach to customer health",
      "Experience with CRM tools (Salesforce, HubSpot)",
    ],
    niceToHave: [
      "Experience in fintech or accounting software",
      "Knowledge of accounting principles",
      "Experience with enterprise customers",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
      "Annual team retreats",
    ],
    postedDate: "Jan 12, 2025",
    isActive: true,
    teamSize: "5-7 team members",
    reportsTo: "VP of Customer Success",
    tags: ["Customer Success", "Account Management", "B2B"],
  },
  {
    id: "5",
    slug: "implementation-specialist",
    title: "Accountant / Implementation Specialist",
    department: "Operations",
    location: "Remote",
    type: "Full-time",
    salary: "$80,000 - $110,000",
    description:
      "Combine your accounting expertise with implementation skills to help customers transition to Xenboox. You'll configure chart of accounts, set up integrations, and train finance teams on best practices.",
    responsibilities: [
      "Configure Xenboox for new customer deployments",
      "Set up chart of accounts and accounting structures",
      "Migrate data from legacy accounting systems",
      "Train customers on Xenboox features and workflows",
      "Provide ongoing accounting support and guidance",
      "Document best practices and create training materials",
    ],
    requirements: [
      "Accounting degree or equivalent experience",
      "3+ years of accounting experience",
      "Experience with accounting software (QuickBooks, Xero, Sage)",
      "Strong technical skills and ability to learn new tools",
      "Excellent training and communication skills",
      "Detail-oriented and organized",
    ],
    niceToHave: [
      "CPA or equivalent certification",
      "Experience with data migration",
      "Knowledge of multiple accounting standards (IFRS, GAAP)",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
      "Annual team retreats",
    ],
    postedDate: "Jan 10, 2025",
    isActive: true,
    teamSize: "4-6 specialists",
    reportsTo: "Head of Implementation",
    tags: ["Accounting", "Implementation", "Customer Onboarding"],
  },
  {
    id: "6",
    slug: "growth-marketing-lead",
    title: "Growth Marketing Lead",
    department: "Marketing",
    location: "Remote",
    type: "Full-time",
    salary: "$120,000 - $160,000",
    description:
      "Lead our growth marketing efforts to acquire and retain customers across our target markets. You'll own the full marketing funnel from awareness to activation, working across content, paid, and partnerships.",
    responsibilities: [
      "Develop and execute growth marketing strategies",
      "Manage paid acquisition channels (Google, LinkedIn, etc.)",
      "Create compelling content for target audiences",
      "Optimize conversion rates across the funnel",
      "Build and manage affiliate and partnership programs",
      "Track and report on marketing performance metrics",
    ],
    requirements: [
      "5+ years in growth or performance marketing",
      "Experience with B2B SaaS marketing",
      "Strong analytical skills and data-driven mindset",
      "Experience with marketing automation tools",
      "Excellent copywriting and content creation skills",
      "Understanding of SEO and content marketing",
    ],
    niceToHave: [
      "Experience marketing fintech or accounting products",
      "Knowledge of African markets",
      "Experience with PLG (product-led growth)",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
      "Annual team retreats",
    ],
    postedDate: "Jan 8, 2025",
    isActive: true,
    teamSize: "3-5 marketers",
    reportsTo: "VP of Marketing",
    tags: ["Marketing", "Growth", "B2B", "SaaS"],
  },
  {
    id: "7",
    slug: "backend-engineer",
    title: "Backend Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    salary: "$140,000 - $190,000",
    description:
      "Build the backend infrastructure that powers Xenboox. You'll work on API design, database optimization, and scalable services that handle millions of financial transactions with reliability and precision.",
    responsibilities: [
      "Design and implement scalable backend services",
      "Build and optimize database schemas and queries",
      "Develop tRPC procedures with proper validation",
      "Ensure data security and compliance",
      "Optimize application performance",
      "Write clean, maintainable, and well-tested code",
    ],
    requirements: [
      "4+ years of backend engineering experience",
      "Strong TypeScript and Node.js skills",
      "Experience with PostgreSQL and Drizzle ORM",
      "Understanding of API design principles",
      "Experience with cloud platforms (Vercel, AWS)",
      "Familiarity with message queues and background jobs",
    ],
    niceToHave: [
      "Experience with fintech or financial systems",
      "Knowledge of accounting principles",
      "Experience with event-driven architectures",
    ],
    benefits: [
      "Competitive salary and equity",
      "Flexible remote work",
      "Health insurance",
      "Learning & development budget",
      "Annual team retreats",
    ],
    postedDate: "Jan 5, 2025",
    isActive: true,
    teamSize: "8-12 engineers",
    reportsTo: "VP of Engineering",
    tags: ["Backend", "TypeScript", "Node.js", "PostgreSQL"],
  },
  {
    id: "8",
    slug: "intern-engineering",
    title: "Engineering Intern",
    department: "Engineering",
    location: "Remote",
    type: "Internship",
    description:
      "Gain hands-on experience building AI-powered accounting software. You'll work on real projects alongside our engineering team, learning modern development practices and contributing to meaningful features.",
    responsibilities: [
      "Work on assigned projects with mentor guidance",
      "Write clean, tested code",
      "Participate in code reviews and team meetings",
      "Learn our tech stack and development practices",
      "Present your work to the team",
    ],
    requirements: [
      "Currently pursuing CS degree or equivalent",
      "Basic knowledge of JavaScript/TypeScript",
      "Familiarity with React or similar frameworks",
      "Eagerness to learn and grow",
      "Good communication skills",
    ],
    niceToHave: [
      "Personal projects or open source contributions",
      "Experience with Next.js or similar frameworks",
      "Interest in fintech or AI",
    ],
    benefits: [
      "Paid internship",
      "Mentorship from senior engineers",
      "Potential for full-time conversion",
      "Flexible schedule",
    ],
    postedDate: "Jan 3, 2025",
    closingDate: "Mar 31, 2025",
    isActive: true,
    tags: ["Internship", "Engineering", "Entry Level"],
  },
];

export function getJobBySlug(slug: string): JobListing | undefined {
  return jobListings.find((job) => job.slug === slug);
}

export function getJobsByDepartment(department: string): JobListing[] {
  if (department === "All") return jobListings.filter((job) => job.isActive);
  return jobListings.filter(
    (job) => job.department === department && job.isActive,
  );
}

export function getJobsByLocation(location: string): JobListing[] {
  if (location === "All") return jobListings.filter((job) => job.isActive);
  return jobListings.filter((job) => job.location === location && job.isActive);
}

export function getJobsByType(type: string): JobListing[] {
  if (type === "All") return jobListings.filter((job) => job.isActive);
  return jobListings.filter((job) => job.type === type && job.isActive);
}

export function searchJobs(query: string): JobListing[] {
  const lowercaseQuery = query.toLowerCase();
  return jobListings.filter(
    (job) =>
      job.isActive &&
      (job.title.toLowerCase().includes(lowercaseQuery) ||
        job.department.toLowerCase().includes(lowercaseQuery) ||
        job.location.toLowerCase().includes(lowercaseQuery) ||
        job.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery))),
  );
}

export function getRelatedJobs(currentSlug: string, limit = 3): JobListing[] {
  const currentJob = getJobBySlug(currentSlug);
  if (!currentJob)
    return jobListings.filter((job) => job.isActive).slice(0, limit);

  return jobListings
    .filter((job) => job.slug !== currentSlug && job.isActive)
    .sort((a, b) => {
      const aSameDept = a.department === currentJob.department ? 1 : 0;
      const bSameDept = b.department === currentJob.department ? 1 : 0;
      return bSameDept - aSameDept;
    })
    .slice(0, limit);
}
