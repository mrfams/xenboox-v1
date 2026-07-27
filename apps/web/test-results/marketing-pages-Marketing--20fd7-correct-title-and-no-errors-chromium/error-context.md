# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing-pages.spec.ts >> Marketing Pages — Public Routes >> / loads with correct title and no errors
- Location: e2e\marketing-pages.spec.ts:22:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 39

- Array []
+ Array [
+   "Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://cdn.jsdelivr.net 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Either the 'unsafe-inline' keyword, a hash ('sha256-n46vPwSWuMC0W703pBofImv82Z26xo4LXymv0E9caPk='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+   "Applying inline style violates the following Content Security Policy directive 'style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'nonce-miP53TH2wXQUBr/9CvIRmw==''. Note that 'unsafe-inline' is ignored if either a hash or nonce value is present in the source list. The action has been blocked.",
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e2]:
        - banner [ref=e3]:
            - generic [ref=e4]:
                - link "X Xenboox" [ref=e5] [cursor=pointer]:
                    - /url: /
                    - generic [ref=e6]: X
                    - generic [ref=e7]: Xenboox
                - navigation [ref=e8]:
                    - link "Features" [ref=e9] [cursor=pointer]:
                        - /url: /features
                    - link "Pricing" [ref=e10] [cursor=pointer]:
                        - /url: /pricing
                    - link "Documentation" [ref=e11] [cursor=pointer]:
                        - /url: /docs
                    - link "Download" [ref=e12] [cursor=pointer]:
                        - /url: /download
                    - link "Contact" [ref=e13] [cursor=pointer]:
                        - /url: /contact
                - generic [ref=e14]:
                    - link "Log in" [ref=e15] [cursor=pointer]:
                        - /url: /login
                    - link "Sign Up Free" [ref=e16] [cursor=pointer]:
                        - /url: /register
        - main [ref=e17]:
            - generic [ref=e25]:
                - generic [ref=e26]: Trusted by finance teams across Africa
                - heading "AI-native accounting for African enterprises" [level=1] [ref=e30]:
                    - text: AI-native accounting
                    - text: for African enterprises
                - paragraph [ref=e31]: Close your books faster, reduce errors, and get real-time financial intelligence — powered by AI agents that handle the work so your team can focus on growth.
                - generic [ref=e32]:
                    - link "Start Free" [ref=e33] [cursor=pointer]:
                        - /url: /register
                        - generic [ref=e35]:
                            - text: Start Free
                            - img [ref=e36]
                    - link "Talk to Sales" [ref=e38] [cursor=pointer]:
                        - /url: /contact
                - paragraph [ref=e39]: No credit card required · Free tier available · Enterprise plans include dedicated support
            - generic [ref=e42]:
                - paragraph [ref=e44]: Trusted by finance teams at
                - generic [ref=e46]:
                    - generic [ref=e47]: Standard Bank
                    - generic [ref=e48]: MTN
                    - generic [ref=e49]: Flutterwave
                    - generic [ref=e50]: Yoco
                    - generic [ref=e51]: PiggyVest
                    - generic [ref=e52]: Chipper
                    - generic [ref=e53]: Standard Bank
                    - generic [ref=e54]: MTN
                    - generic [ref=e55]: Flutterwave
                    - generic [ref=e56]: Yoco
                    - generic [ref=e57]: PiggyVest
                    - generic [ref=e58]: Chipper
            - generic [ref=e61]:
                - generic [ref=e63]:
                    - generic [ref=e64]:
                        - img [ref=e65]
                        - text: How it works
                    - heading "Get started in three simple steps" [level=2] [ref=e67]
                    - paragraph [ref=e68]: From zero to automated accounting in under an hour. No training required.
                - generic [ref=e69]:
                    - generic [ref=e72]:
                        - img [ref=e76]
                        - generic [ref=e80]: "01"
                        - heading "Connect your data" [level=3] [ref=e81]
                        - paragraph [ref=e82]: Import your chart of accounts, connect bank feeds, and upload historical statements. Xenboox automatically maps your existing structure.
                    - generic [ref=e84]:
                        - img [ref=e88]
                        - generic [ref=e91]: "02"
                        - heading "AI takes over the routine" [level=3] [ref=e92]
                        - paragraph [ref=e93]: "19 specialized agents begin working: reconciling transactions, processing invoices, running payroll, and flagging exceptions for review."
                    - generic [ref=e95]:
                        - img [ref=e99]
                        - generic [ref=e104]: "03"
                        - heading "You supervise, not data-enter" [level=3] [ref=e105]
                        - paragraph [ref=e106]: Review exceptions, approve critical transactions, and ask your CFO Agent anything. Your books stay current without the daily grind.
            - generic [ref=e111]:
                - generic [ref=e113]:
                    - generic [ref=e114]:
                        - img [ref=e115]
                        - text: Purpose-built for modern finance teams
                    - heading "Built for how Africa does business" [level=2] [ref=e117]
                - generic [ref=e118]:
                    - generic [ref=e120]:
                        - img [ref=e123]
                        - heading "AI-Powered Accounting" [level=3] [ref=e126]
                        - paragraph [ref=e127]: Intelligent agents automate journal entries, reconciliations, and compliance checks — freeing your team to focus on strategy, not data entry.
                    - generic [ref=e129]:
                        - img [ref=e132]
                        - heading "Multi-Entity, Multi-Currency" [level=3] [ref=e136]
                        - paragraph [ref=e137]: Manage subsidiaries, branches, and currencies from a single platform. Consolidate financials across entities in real time with full intercompany accounting.
                    - generic [ref=e139]:
                        - img [ref=e142]
                        - heading "Enterprise Security & Compliance" [level=3] [ref=e144]
                        - paragraph [ref=e145]: AES-256 encryption, row-level data isolation, SOC 2-aligned controls, and comprehensive audit trails protecting your financial data.
            - generic [ref=e148]:
                - generic [ref=e150]:
                    - heading "Everything you need to run your finance function" [level=2] [ref=e151]
                    - paragraph [ref=e152]: From journal entries to consolidated reporting — a complete accounting platform with no gaps.
                - generic [ref=e153]:
                    - generic [ref=e155]:
                        - img [ref=e157]
                        - heading "Double-Entry Ledger" [level=3] [ref=e161]
                        - paragraph [ref=e162]: Full IFRS-ready general ledger with chart of accounts, journals, and trial balance.
                    - generic [ref=e164]:
                        - img [ref=e166]
                        - heading "Payables & Receivables" [level=3] [ref=e168]
                        - paragraph [ref=e169]: Invoice processing, payment scheduling, aging reports, and supplier management.
                    - generic [ref=e171]:
                        - img [ref=e173]
                        - heading "Financial Reporting" [level=3] [ref=e176]
                        - paragraph [ref=e177]: P&L, balance sheet, cash flow, and custom reports generated in real time.
                    - generic [ref=e179]:
                        - img [ref=e181]
                        - heading "Multi-Platform Access" [level=3] [ref=e184]
                        - paragraph [ref=e185]: Web, mobile, and desktop — your financial data available wherever you work.
                    - generic [ref=e187]:
                        - img [ref=e189]
                        - heading "Role-Based Access" [level=3] [ref=e194]
                        - paragraph [ref=e195]: Granular permissions, approval workflows, and entity-level access control.
                    - generic [ref=e197]:
                        - img [ref=e199]
                        - heading "Dedicated Support" [level=3] [ref=e201]
                        - paragraph [ref=e202]: Onboarding specialists, account managers, and support engineers assigned to your team.
            - generic [ref=e205]:
                - generic [ref=e207]:
                    - generic [ref=e208]:
                        - img [ref=e209]
                        - text: Trusted by finance professionals
                    - heading "What our users are saying" [level=2] [ref=e211]
                - generic [ref=e212]:
                    - generic [ref=e214]:
                        - img [ref=e215]
                        - paragraph [ref=e218]: “Xenboox reduced our month-end close from 10 days to 3. The AI agents handle reconciliations overnight — we just review the exceptions in the morning.”
                        - generic [ref=e219]:
                            - img [ref=e220]
                            - img [ref=e222]
                            - img [ref=e224]
                            - img [ref=e226]
                            - img [ref=e228]
                        - generic [ref=e230]:
                            - paragraph [ref=e231]: Finance Director
                            - paragraph [ref=e232]: Regional Retail Chain, West Africa
                    - generic [ref=e234]:
                        - img [ref=e235]
                        - paragraph [ref=e238]: “We run three entities across two currencies. Xenboox's consolidation view shows me the group position in real time. That used to take my team a full week.”
                        - generic [ref=e239]:
                            - img [ref=e240]
                            - img [ref=e242]
                            - img [ref=e244]
                            - img [ref=e246]
                            - img [ref=e248]
                        - generic [ref=e250]:
                            - paragraph [ref=e251]: Group CFO
                            - paragraph [ref=e252]: Holding Company, Pan-Africa
                    - generic [ref=e254]:
                        - img [ref=e255]
                        - paragraph [ref=e258]: “The payroll agent calculates PAYE and SSNIT correctly for Gambia and Nigeria. No more spreadsheet errors, no more late filing penalties.”
                        - generic [ref=e259]:
                            - img [ref=e260]
                            - img [ref=e262]
                            - img [ref=e264]
                            - img [ref=e266]
                            - img [ref=e268]
                        - generic [ref=e270]:
                            - paragraph [ref=e271]: Payroll Manager
                            - paragraph [ref=e272]: NGO, Multiple Jurisdictions
            - generic [ref=e277]:
                - generic [ref=e278]:
                    - generic [ref=e279]:
                        - img [ref=e280]
                        - text: Enterprise Security
                    - heading "Built for the most demanding requirements" [level=2] [ref=e282]
                    - paragraph [ref=e283]: Your financial data is protected by industry-standard encryption, strict access controls, and comprehensive audit logging. Every action is recorded, every transaction is traceable, and every entity is fully isolated.
                    - list [ref=e284]:
                        - listitem [ref=e285]:
                            - img [ref=e286]
                            - generic [ref=e289]: AES-256 encryption for data at rest. TLS 1.3 for data in transit.
                        - listitem [ref=e290]:
                            - img [ref=e291]
                            - generic [ref=e294]: Row-level security ensures complete entity data isolation.
                        - listitem [ref=e295]:
                            - img [ref=e296]
                            - generic [ref=e299]: SOC 2-aligned controls with continuous monitoring and incident response.
                        - listitem [ref=e300]:
                            - img [ref=e301]
                            - generic [ref=e304]: Comprehensive audit trail — every action logged with actor, timestamp, and context.
                - generic [ref=e306]:
                    - heading "Compliance & Certifications" [level=3] [ref=e307]
                    - generic [ref=e308]:
                        - generic [ref=e309]:
                            - generic [ref=e310]: GDPR
                            - generic [ref=e311]: Data protection compliant
                        - generic [ref=e312]:
                            - generic [ref=e313]: IFRS
                            - generic [ref=e314]: Reporting standards
                        - generic [ref=e315]:
                            - generic [ref=e316]: SOC 2
                            - generic [ref=e317]: Control framework aligned
                        - generic [ref=e318]:
                            - generic [ref=e319]: TLS 1.3
                            - generic [ref=e320]: Encryption in transit
                    - paragraph [ref=e321]: Third-party security audits conducted quarterly.
            - generic [ref=e325]:
                - generic [ref=e326]:
                    - heading "All your financial data, one platform" [level=2] [ref=e327]
                    - paragraph [ref=e328]: No more switching between QuickBooks for accounting, Excel for reports, and email for approvals. Everything works together from day one.
                    - list [ref=e329]:
                        - listitem [ref=e330]:
                            - img [ref=e332]
                            - generic [ref=e334]: Web, mobile, and desktop apps with seamless sync
                        - listitem [ref=e335]:
                            - img [ref=e337]
                            - generic [ref=e340]: 19 AI agents working across all modules simultaneously
                        - listitem [ref=e341]:
                            - img [ref=e343]
                            - generic [ref=e348]: Real-time updates — no more batch processing or overnight runs
                        - listitem [ref=e349]:
                            - img [ref=e351]
                            - generic [ref=e353]: Custom reports and dashboards built in seconds via chat
                - generic [ref=e355]:
                    - generic [ref=e356]:
                        - generic [ref=e357]:
                            - paragraph [ref=e358]: General Ledger
                            - paragraph [ref=e359]: Available now
                        - generic [ref=e360]:
                            - paragraph [ref=e361]: AP & AR
                            - paragraph [ref=e362]: Available now
                        - generic [ref=e363]:
                            - paragraph [ref=e364]: Payroll
                            - paragraph [ref=e365]: Available now
                        - generic [ref=e366]:
                            - paragraph [ref=e367]: Treasury
                            - paragraph [ref=e368]: Available now
                        - generic [ref=e369]:
                            - paragraph [ref=e370]: Reports
                            - paragraph [ref=e371]: Available now
                        - generic [ref=e372]:
                            - paragraph [ref=e373]: Compliance
                            - paragraph [ref=e374]: Available now
                        - generic [ref=e375]:
                            - paragraph [ref=e376]: Budgeting
                            - paragraph [ref=e377]: Available now
                        - generic [ref=e378]:
                            - paragraph [ref=e379]: Inventory
                            - paragraph [ref=e380]: Coming soon
                    - paragraph [ref=e381]: All modules share data and work through the same AI agents
            - generic [ref=e387]:
                - generic [ref=e388]:
                    - img [ref=e389]
                    - text: Get started in minutes
                - heading "Ready to transform your accounting?" [level=2] [ref=e391]
                - paragraph [ref=e392]: Join businesses across Africa that trust Xenboox to automate their financial operations.
                - generic [ref=e393]:
                    - link "Create Free Account" [ref=e394] [cursor=pointer]:
                        - /url: /register
                        - generic [ref=e396]:
                            - text: Create Free Account
                            - img [ref=e397]
                    - link "Book a Demo" [ref=e399] [cursor=pointer]:
                        - /url: /contact
                - paragraph [ref=e400]: Free tier available. No credit card required. Enterprise plans include dedicated support.
        - contentinfo [ref=e401]:
            - generic [ref=e402]:
                - generic [ref=e403]:
                    - heading "Stay in the loop" [level=3] [ref=e404]
                    - paragraph [ref=e405]: Product updates, accounting tips, and African fintech insights. No spam, unsubscribe anytime.
                    - generic [ref=e406]:
                        - textbox "Enter your email" [ref=e407]
                        - button "Subscribe" [ref=e408] [cursor=pointer]
                - generic [ref=e409]:
                    - generic [ref=e410]:
                        - link "X Xenboox" [ref=e411] [cursor=pointer]:
                            - /url: /
                            - generic [ref=e412]: X
                            - generic [ref=e413]: Xenboox
                        - paragraph [ref=e414]: AI-native accounting platform built for African businesses. Automated journal entries, reconciliations, payroll, and financial reporting — powered by 19 specialized AI agents.
                        - generic [ref=e415]:
                            - link "X / Twitter" [ref=e416] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e417]
                            - link "LinkedIn" [ref=e419] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e420]
                            - link "GitHub" [ref=e422] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e423]
                            - link "YouTube" [ref=e425] [cursor=pointer]:
                                - /url: "#"
                                - img [ref=e426]
                    - generic [ref=e428]:
                        - heading "Product" [level=3] [ref=e429]
                        - list [ref=e430]:
                            - listitem [ref=e431]:
                                - link "Features" [ref=e432] [cursor=pointer]:
                                    - /url: /features
                            - listitem [ref=e433]:
                                - link "Pricing" [ref=e434] [cursor=pointer]:
                                    - /url: /pricing
                            - listitem [ref=e435]:
                                - link "Download" [ref=e436] [cursor=pointer]:
                                    - /url: /download
                            - listitem [ref=e437]:
                                - link "Documentation" [ref=e438] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e439]:
                                - link "Changelog" [ref=e440] [cursor=pointer]:
                                    - /url: /docs
                            - listitem [ref=e441]:
                                - link "API Reference" [ref=e442] [cursor=pointer]:
                                    - /url: /docs
                    - generic [ref=e443]:
                        - heading "Company" [level=3] [ref=e444]
                        - list [ref=e445]:
                            - listitem [ref=e446]:
                                - link "About" [ref=e447] [cursor=pointer]:
                                    - /url: /about
                            - listitem [ref=e448]:
                                - link "Blog" [ref=e449] [cursor=pointer]:
                                    - /url: /blog
                            - listitem [ref=e450]:
                                - link "Careers" [ref=e451] [cursor=pointer]:
                                    - /url: /careers
                            - listitem [ref=e452]:
                                - link "Contact" [ref=e453] [cursor=pointer]:
                                    - /url: /contact
                            - listitem [ref=e454]:
                                - link "Press Kit" [ref=e455] [cursor=pointer]:
                                    - /url: /about
                    - generic [ref=e456]:
                        - heading "Legal" [level=3] [ref=e457]
                        - list [ref=e458]:
                            - listitem [ref=e459]:
                                - link "Privacy" [ref=e460] [cursor=pointer]:
                                    - /url: /privacy
                            - listitem [ref=e461]:
                                - link "Terms" [ref=e462] [cursor=pointer]:
                                    - /url: /terms
                            - listitem [ref=e463]:
                                - link "Cookies" [ref=e464] [cursor=pointer]:
                                    - /url: /cookies
                            - listitem [ref=e465]:
                                - link "Refund Policy" [ref=e466] [cursor=pointer]:
                                    - /url: /refund
                            - listitem [ref=e467]:
                                - link "SLA" [ref=e468] [cursor=pointer]:
                                    - /url: /sla
                - generic [ref=e469]:
                    - paragraph [ref=e470]: © 2026 Xenboox. All rights reserved.
                    - generic [ref=e471]:
                        - link "Privacy" [ref=e472] [cursor=pointer]:
                            - /url: /privacy
                        - link "Terms" [ref=e473] [cursor=pointer]:
                            - /url: /terms
                        - link "Cookies" [ref=e474] [cursor=pointer]:
                            - /url: /cookies
    - alert [ref=e475]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  |
  3  | const BASE_URL = process.env.BASE_URL || "https://xenboox.vercel.app";
  4  |
  5  | test.describe("Marketing Pages — Public Routes", () => {
  6  |   const publicPages = [
  7  |     { path: "/", title: /Xenboox|AI.native accounting/i },
  8  |     { path: "/features", title: /Features|Xenboox/i },
  9  |     { path: "/pricing", title: /Pricing|Xenboox/i },
  10 |     { path: "/about", title: /About|Xenboox/i },
  11 |     { path: "/blog", title: /Blog|Xenboox/i },
  12 |     { path: "/contact", title: /Contact|Xenboox/i },
  13 |     { path: "/privacy", title: /Privacy|Xenboox/i },
  14 |     { path: "/terms", title: /Terms|Xenboox/i },
  15 |     { path: "/cookies", title: /Cookies|Xenboox/i },
  16 |     { path: "/refund", title: /Refund|Xenboox/i },
  17 |     { path: "/sla", title: /SLA|Xenboox/i },
  18 |     { path: "/docs", title: /Docs|Xenboox/i },
  19 |   ];
  20 |
  21 |   for (const { path, title } of publicPages) {
  22 |     test(`${path} loads with correct title and no errors`, async ({ page }) => {
  23 |       const errors: string[] = [];
  24 |       page.on("pageerror", (err) => errors.push(err.message));
  25 |       page.on("console", (msg) => {
  26 |         if (msg.type() === "error") errors.push(msg.text());
  27 |       });
  28 |
  29 |       const response = await page.goto(path, {
  30 |         waitUntil: "networkidle",
  31 |         timeout: 30000,
  32 |       });
  33 |
  34 |       // Should return 200
  35 |       expect(response?.status()).toBe(200);
  36 |
  37 |       // Should have the correct title
  38 |       await expect(page).toHaveTitle(title);
  39 |
  40 |       // Should not have JavaScript errors
  41 |       expect(
  42 |         errors.filter((e) => !e.includes("Failed to load resource")),
> 43 |       ).toEqual([]);
     |         ^ Error: expect(received).toEqual(expected) // deep equality
  44 |
  45 |       // Should have a visible body
  46 |       await expect(page.locator("body")).toBeVisible();
  47 |     });
  48 |   }
  49 | });
  50 |
```
