"use client";

import {
  Button,
  Badge,
  BalanceCheck,
  ConfidenceIndicator,
  AgentAttribution,
  Progress,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-16">
        {/* ── Header ── */}
        <header>
          <h1 className="text-h1 mb-2">Xenboox Design System</h1>
          <p className="text-body-lg text-muted-foreground">
            v1.0 — Calm, dense, precise, and quietly confident.
          </p>
          <p className="text-caption-subtle mt-2">Last updated: July 2026</p>
        </header>

        <hr className="border-border" />

        {/* ── Colors ── */}
        <section>
          <h2 className="text-h3 mb-6">Colors</h2>
          <div className="grid grid-cols-3 gap-6">
            <ColorSwatch
              name="Ledger Ink"
              hex="#14213D"
              className="bg-ledger-ink"
              textClass="text-white"
            />
            <ColorSwatch
              name="Paper"
              hex="#FAFAF8"
              className="bg-paper border border-border"
              textClass="text-ledger-ink"
            />
            <ColorSwatch
              name="Signal Indigo"
              hex="#3B4FE0"
              className="bg-signal-indigo"
              textClass="text-white"
            />
            <ColorSwatch
              name="Balanced Green"
              hex="#0F7159"
              className="bg-balanced-green"
              textClass="text-white"
            />
            <ColorSwatch
              name="Attention Amber"
              hex="#B8860B"
              className="bg-attention-amber"
              textClass="text-white"
            />
            <ColorSwatch
              name="Error Clay"
              hex="#A6403A"
              className="bg-error-clay"
              textClass="text-white"
            />
          </div>
        </section>

        {/* ── Typography ── */}
        <section>
          <h2 className="text-h3 mb-6">Typography</h2>
          <div className="space-y-4">
            <div>
              <p className="text-caption mb-1">Heading 1 — 48px</p>
              <p className="text-h1">The quick brown fox</p>
            </div>
            <div>
              <p className="text-caption mb-1">Heading 2 — 32px</p>
              <p className="text-h2">The quick brown fox</p>
            </div>
            <div>
              <p className="text-caption mb-1">Heading 3 — 24px</p>
              <p className="text-h3">The quick brown fox</p>
            </div>
            <div>
              <p className="text-caption mb-1">Body Large — 16px</p>
              <p className="text-body-lg">
                The quick brown fox jumps over the lazy dog. Xenboox uses Inter
                for UI and IBM Plex Mono for figures.
              </p>
            </div>
            <div>
              <p className="text-caption mb-1">Body — 14px (default)</p>
              <p className="text-body">
                The quick brown fox jumps over the lazy dog. Xenboox uses Inter
                for UI and IBM Plex Mono for figures.
              </p>
            </div>
            <div>
              <p className="text-caption mb-1">Caption — 12px</p>
              <p className="text-caption">
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>
            <div className="pt-4">
              <p className="text-caption mb-2">
                Tabular Figures (IBM Plex Mono)
              </p>
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Inter (body default)
                  </p>
                  <p className="text-body">$ 1,234.56</p>
                  <p className="text-body">$ 78,901.23</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    IBM Plex Mono (tabular)
                  </p>
                  <p className="font-mono tabular-nums text-body">$ 1,234.56</p>
                  <p className="font-mono tabular-nums text-body">
                    $ 78,901.23
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Buttons ── */}
        <section>
          <h2 className="text-h3 mb-6">Buttons</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="default">Primary (Signal Indigo)</Button>
            <Button variant="secondary">Secondary (Ledger Ink)</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-3 items-center mt-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </section>

        {/* ── Badges ── */}
        <section>
          <h2 className="text-h3 mb-6">Status Badges</h2>
          <p className="text-caption mb-4">
            Three semantic colors only — never invent a fourth.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="success">Reconciled</Badge>
            <Badge variant="warning">Needs Review</Badge>
            <Badge variant="destructive">Unbalanced</Badge>
            <Badge variant="default">Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        {/* ── Confidence Indicator ── */}
        <section>
          <h2 className="text-h3 mb-6">Confidence Indicator</h2>
          <p className="text-caption mb-4">
            Visual bar + percentage next to agent-produced figures below 90%
            confidence.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-body w-24">High (≥90%)</span>
              <ConfidenceIndicator confidence={0.96} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-body w-24">Medium (70-89%)</span>
              <ConfidenceIndicator confidence={0.73} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-body w-24">Low (&lt;70%)</span>
              <ConfidenceIndicator confidence={0.54} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-body w-24">Medium size</span>
              <ConfidenceIndicator confidence={0.85} size="md" />
            </div>
          </div>
        </section>

        {/* ── Agent Attribution ── */}
        <section>
          <h2 className="text-h3 mb-6">Agent Attribution</h2>
          <p className="text-caption mb-4">
            Every agent-touched record shows a consistent tag.
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-caption mb-2">Default variant</p>
              <AgentAttribution
                agentName="Ledger Agent"
                timestamp="2h ago"
                confidence={0.96}
              />
            </div>
            <div>
              <p className="text-caption mb-2">Medium confidence</p>
              <AgentAttribution
                agentName="AP Agent"
                timestamp="1h ago"
                confidence={0.73}
              />
            </div>
            <div>
              <p className="text-caption mb-2">Low confidence</p>
              <AgentAttribution
                agentName="OCR Agent"
                timestamp="5m ago"
                confidence={0.54}
              />
            </div>
            <div>
              <p className="text-caption mb-2">Compact variant</p>
              <AgentAttribution
                agentName="Reconciliation Agent"
                timestamp="30m ago"
                confidence={0.88}
                variant="compact"
              />
            </div>
          </div>
        </section>

        {/* ── Balance Check ── */}
        <section>
          <h2 className="text-h3 mb-6">Balance Check (Signature Element)</h2>
          <p className="text-caption mb-4">
            The double-entry balance indicator. Appears at three specific
            moments: journal entry post, reconciliation close, and month-end
            close. 400ms ease-out — relief, not celebration.
          </p>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-caption w-24">Inline (small)</span>
              <BalanceCheck size="small" label="Entry posted" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-caption w-24">Default</span>
              <BalanceCheck label="Reconciled" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-caption w-24">Hero (large)</span>
              <BalanceCheck size="large" label="Books closed for July 2026" />
            </div>
          </div>
        </section>

        {/* ── Progress ── */}
        <section>
          <h2 className="text-h3 mb-6">Progress</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <p className="text-caption mb-2">Default (Signal Indigo)</p>
              <Progress value={65} />
            </div>
            <div>
              <p className="text-caption mb-2">Success (Balanced Green)</p>
              <Progress value={100} variant="success" />
            </div>
            <div>
              <p className="text-caption mb-2">Warning (Attention Amber)</p>
              <Progress value={45} variant="warning" />
            </div>
            <div>
              <p className="text-caption mb-2">Danger (Error Clay)</p>
              <Progress value={20} variant="danger" />
            </div>
          </div>
        </section>

        {/* ── Table ── */}
        <section>
          <h2 className="text-h3 mb-6">Data Table</h2>
          <p className="text-caption mb-4">
            Sticky headers, tabular figures, zebra striping for long lists.
          </p>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right-tabular">
                      Debit (GMD)
                    </TableHead>
                    <TableHead className="text-right-tabular">
                      Credit (GMD)
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      date: "2026-07-01",
                      desc: "Office Supplies — Stationery",
                      debit: "12,500.00",
                      credit: "—",
                      status: "reconciled",
                    },
                    {
                      date: "2026-07-02",
                      desc: "Client Payment — Alpha Corp",
                      debit: "—",
                      credit: "450,000.00",
                      status: "reconciled",
                    },
                    {
                      date: "2026-07-03",
                      desc: "Utility Bill Payment",
                      debit: "8,750.00",
                      credit: "—",
                      status: "pending",
                    },
                    {
                      date: "2026-07-04",
                      desc: "Salary Disbursement — July",
                      debit: "1,200,000.00",
                      credit: "—",
                      status: "flagged",
                    },
                    {
                      date: "2026-07-05",
                      desc: "Bank Interest Income",
                      debit: "—",
                      credit: "3,450.00",
                      status: "reconciled",
                    },
                  ].map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">
                        {row.date}
                      </TableCell>
                      <TableCell>{row.desc}</TableCell>
                      <TableCell className="text-right-tabular font-mono">
                        {row.debit}
                      </TableCell>
                      <TableCell className="text-right-tabular font-mono">
                        {row.credit}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === "reconciled"
                              ? "success"
                              : row.status === "flagged"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* ── Agent Touch Example ── */}
        <section>
          <h2 className="text-h3 mb-6">Combined Example: Journal Entry</h2>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-h4">JE-2026-07-001</CardTitle>
                <BalanceCheck size="small" label="Balanced" />
              </div>
              <p className="text-caption">
                Office Supplies — Stationery purchase from OfficeMart
              </p>
              <div className="mt-2">
                <AgentAttribution
                  agentName="Ledger Agent"
                  timestamp="2h ago"
                  confidence={0.96}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right-tabular">
                      Debit (GMD)
                    </TableHead>
                    <TableHead className="text-right-tabular">
                      Credit (GMD)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Office Supplies Expense (5001)</TableCell>
                    <TableCell className="text-right-tabular font-mono">
                      12,500.00
                    </TableCell>
                    <TableCell className="text-right-tabular font-mono">
                      —
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cash at Bank (1001)</TableCell>
                    <TableCell className="text-right-tabular font-mono">
                      —
                    </TableCell>
                    <TableCell className="text-right-tabular font-mono">
                      12,500.00
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right-tabular font-mono">
                      12,500.00
                    </TableCell>
                    <TableCell className="text-right-tabular font-mono">
                      12,500.00
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <hr className="border-border" />

        <footer className="text-caption text-center pb-8">
          Xenboox Design System v1.0 — Built per the Design System spec, July
          2026
        </footer>
      </div>
    </div>
  );
}

function ColorSwatch({
  name,
  hex,
  className,
  textClass,
}: {
  name: string;
  hex: string;
  className: string;
  textClass: string;
}) {
  return (
    <div className="space-y-2">
      <div
        className={`h-24 rounded-lg ${className} flex items-end p-3 ${textClass}`}
      >
        <span className="text-xs font-mono font-medium">{hex}</span>
      </div>
      <p className="text-sm font-medium">{name}</p>
    </div>
  );
}
