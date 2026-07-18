import { Card, CardContent, CardHeader, CardTitle, Input } from "@xenboox/ui"
import { HelpCircle, Search, CreditCard, Users, BarChart3, Shield, Settings } from "lucide-react"
import { useState } from "react"

const faqs = [
  {
    category: "Account & Billing",
    questions: [
      {
        q: "How do I upgrade my plan?",
        a: "Navigate to Settings > Billing to view available plans and upgrade options."
      },
      {
        q: "Can I cancel my subscription?",
        a: "Yes, you can cancel anytime from Settings > Billing. Your data will be retained for 30 days."
      }
    ]
  },
  {
    category: "Data & Security",
    questions: [
      {
        q: "Is my financial data encrypted?",
        a: "Yes, all data is encrypted at rest (AES-256) and in transit (TLS 1.3)."
      },
      {
        q: "How often is my data backed up?",
        a: "Your data is backed up daily to secure cloud storage."
      }
    ]
  },
  {
    category: "Accounting",
    questions: [
      {
        q: "How do I record a transaction?",
        a: "Use the Journal Entries page to record transactions. You can also import from bank statements."
      },
      {
        q: "What is the difference between AP and AR?",
        a: "AP (Accounts Payable) tracks money you owe. AR (Accounts Receivable) tracks money owed to you."
      }
    ]
  },
  {
    category: "Reports",
    questions: [
      {
        q: "How often do reports update?",
        a: "Reports update in real-time as you enter transactions."
      },
      {
        q: "Can I customize report formats?",
        a: "Yes, customize columns, date ranges, and filters on each report page."
      }
    ]
  }
]

export default function FAQPage() {
  const [search, setSearch] = useState("")

  const filteredCategories = faqs.filter(cat =>
    cat.questions.some(q =>
      q.q.toLowerCase().includes(search.toLowerCase()) ||
      q.a.toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">FAQ</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredCategories.map((cat) => (
        <Card key={cat.category}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {cat.category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cat.questions.filter(q =>
                search === "" ||
                q.q.toLowerCase().includes(search.toLowerCase()) ||
                q.a.toLowerCase().includes(search.toLowerCase())
              ).map((item, idx) => (
                <div key={idx}>
                  <h3 className="font-medium text-sm">{item.q}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.a}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {search && filteredCategories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No questions found matching "{search}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}