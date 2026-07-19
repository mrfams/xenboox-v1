import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { DocsPageHeader } from "../../components/docs-page-header"
import { FeatureGrid } from "../../components/feature-grid"
import { InfoCallout } from "../../components/info-callout"
import { RelatedLinks } from "../../components/related-links"
import { Settings, Bell, Shield, Key, User, Palette } from "lucide-react"

const features = [
  { title: "Profile Management", description: "Update your personal profile, contact information, and preferences. Change password and manage account settings.", icon: User },
  { title: "Notification Preferences", description: "Configure email and in-app notifications for various events including invoice approvals, payroll runs, and system alerts.", icon: Bell },
  { title: "Security Settings", description: "Enable two-factor authentication, view active sessions, manage API keys, and review security audit logs.", icon: Shield },
  { title: "API Key Management", description: "Generate and manage API keys for programmatic access. Set key permissions and expiration dates.", icon: Key },
  { title: "Appearance", description: "Customize the interface with light/dark mode, compact layouts, and accessibility settings.", icon: Palette },
]

export default function SettingsDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Settings"
        description="Manage your profile, security preferences, notification settings, and API keys. Customize your Xenboox experience."
        breadcrumbs={[{ label: "Modules", href: "/docs/modules" }, { label: "Settings", href: "/docs/modules/settings" }]}
        icon={Settings}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Settings module provides centralized management of user preferences, security configurations, 
                and API integrations. Configure your notification preferences, manage API keys, and customize 
                your experience. Organization-level settings are managed by administrators through the admin 
                dashboard.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Key Features</h2>
          <FeatureGrid features={features} columns={3} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">API Keys</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-3">API keys allow programmatic access to Xenboox modules and agents. Follow these best practices:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><span>Create separate keys for different applications or services</span></li>
                <li className="flex items-start gap-2"><div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><span>Set appropriate permission scopes for each key</span></li>
                <li className="flex items-start gap-2"><div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><span>Rotate keys regularly and revoke unused keys</span></li>
                <li className="flex items-start gap-2"><div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><span>Never share API keys or commit them to version control</span></li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="warning" title="Security">
          Always use API keys with the minimum required permissions. Rotate keys periodically and immediately 
          revoke any compromised keys from the Security settings page.
        </InfoCallout>

        <RelatedLinks
          links={[
            { title: "Organizations Module", href: "/docs/modules/organizations", description: "User and role management" },
            { title: "Security Overview", href: "/docs/security", description: "Security best practices" },
            { title: "Getting Started", href: "/docs/getting-started", description: "Initial setup guide" },
          ]}
        />
      </div>
    </>
  )
}
