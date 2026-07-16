import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Input } from "@xenboox/ui"
import { Label } from "@xenboox/ui"
import { Switch } from "@xenboox/ui"
import { Settings, Bell, Shield, Database, Globe } from "lucide-react"
import { useState } from "react"

export default function AdminSettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [slackAlerts, setSlackAlerts] = useState(false)
  const [autoScaling, setAutoScaling] = useState(false)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notification Settings</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-alerts">Email Alerts</Label>
                <Switch
                  id="email-alerts"
                  checked={emailAlerts}
                  onCheckedChange={setEmailAlerts}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="slack-alerts">Slack Alerts</Label>
                <Switch
                  id="slack-alerts"
                  checked={slackAlerts}
                  onCheckedChange={setSlackAlerts}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sms-alerts">SMS Alerts</Label>
                <Switch checked={false} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Settings</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-scaling">Auto Budget Scaling</Label>
                <Switch
                  id="auto-scaling"
                  checked={autoScaling}
                  onCheckedChange={setAutoScaling}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cost-opt">Cost Optimization</Label>
                <Switch checked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="provider-fallback">Provider Fallback</Label>
                <Switch checked />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Settings</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                <Switch checked={false} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="debug-mode">Debug Mode</Label>
                <Switch checked={false} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="audit-log">Audit Logging</Label>
                <Switch checked />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="anthropic-budget">Anthropic Budget (Monthly)</Label>
              <Input 
                type="number" 
                defaultValue="25000" 
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="openai-budget">OpenAI Budget (Monthly)</Label>
              <Input 
                type="number" 
                defaultValue="20000" 
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="haiku-budget">Anthropic Haiku Budget (Monthly)</Label>
              <Input 
                type="number" 
                defaultValue="5000" 
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}