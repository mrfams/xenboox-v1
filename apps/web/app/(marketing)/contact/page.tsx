import { Mail, MessageSquare, MapPin, ArrowRight } from "lucide-react"

const contactMethods = [
  {
    icon: Mail,
    title: "Email",
    description: "For general inquiries, support, or partnership opportunities.",
    detail: "hello@xenboox.com",
    href: "mailto:hello@xenboox.com",
  },
  {
    icon: MessageSquare,
    title: "Sales",
    description: "Interested in the Enterprise plan or custom integrations?",
    detail: "sales@xenboox.com",
    href: "mailto:sales@xenboox.com",
  },
  {
    icon: MapPin,
    title: "Location",
    description: "We're a remote-first company. Our team is distributed across Africa and Europe.",
    detail: "Remote-first",
    href: null,
  },
]

export default function ContactPage() {
  return (
    <>
      <section className="border-b py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Have a question, feedback, or want to work together? We&apos;d love to hear from you.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {contactMethods.map((method) => (
              <div key={method.title} className="rounded-lg border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <method.icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold">{method.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {method.description}
                </p>
                <div className="mt-4">
                  {method.href ? (
                    <a
                      href={method.href}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {method.detail}
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {method.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Common Questions
          </h2>
          <div className="space-y-6">
            <FaqItem
              question="How do I get support for a technical issue?"
              answer="Email support@xenboox.com with a description of the issue. Include your account email and any relevant screenshots. We typically respond within 24 hours."
            />
            <FaqItem
              question="Do you offer demos for teams?"
              answer="Yes. Contact sales@xenboox.com to schedule a demo of the full platform. We'll walk you through all 19 AI agents and how they fit your workflow."
            />
            <FaqItem
              question="I found a bug. How do I report it?"
              answer="Email support@xenboox.com or open an issue on our GitHub repository. Please include steps to reproduce, expected behavior, and actual behavior."
            />
            <FaqItem
              question="Can I contribute to Xenboox?"
              answer="Xenboox is currently closed-source, but we're open to feedback and feature requests. Reach out to hello@xenboox.com."
            />
          </div>
        </div>
      </section>
    </>
  )
}

function FaqItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-medium">{question}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
    </div>
  )
}
