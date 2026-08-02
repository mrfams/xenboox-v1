import { Fingerprint, Lock, ShieldCheck, UserCheck } from "lucide-react";

import {
  Section,
  SectionHeading,
  CheckItem,
} from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";

const guarantees = [
  {
    icon: Lock,
    title: "Encrypted everywhere",
    line: "AES-256 at rest, TLS 1.3 in transit.",
  },
  {
    icon: ShieldCheck,
    title: "Entity isolation",
    line: "Your data never mixes with another company's.",
  },
  {
    icon: Fingerprint,
    title: "Full attribution",
    line: "Every action logged — who, what, when, and why.",
  },
  {
    icon: UserCheck,
    title: "Human-in-the-loop",
    line: "Material decisions always require your approval.",
  },
];

export function Security() {
  return (
    <Section id="security">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <FadeInUp>
          <div className="max-w-xl">
            <SectionHeading
              align="left"
              eyebrow="Built on trust"
              title="Bank-grade security, built for financial data."
              lead="Xenboox is engineered around one principle: your books are your business. We protect them like ours."
            />
            <ul className="mt-8 space-y-3.5">
              <CheckItem>
                Encryption and entity isolation at the database layer
              </CheckItem>
              <CheckItem>
                A complete audit trail on every journal entry
              </CheckItem>
              <CheckItem>
                Approval gates that stop agents before material actions
              </CheckItem>
              <CheckItem>
                Confidence scoring — uncertain work escalates, never guesses
              </CheckItem>
            </ul>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.15}>
          <div className="relative">
            <div
              className="absolute -inset-6 rounded-[2rem] bg-primary/5 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8">
              <div className="flex items-center gap-3 border-b border-border pb-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-balanced-green/10 text-balanced-green">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    Security you can show your auditor
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Controls, logs, and approvals — ready when they ask.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                {guarantees.map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.line}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeInUp>
      </div>
    </Section>
  );
}
