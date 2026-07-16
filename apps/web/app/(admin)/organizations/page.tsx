import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Input } from "@xenboox/ui"
import { Building, Search, Users, Calendar } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { useState } from "react"

export default function OrganizationsPage() {
  const [search, setSearch] = useState("")
  const { data: orgs, isLoading } = trpc.admin.listOrganizations.useQuery()

  const filteredOrgs = orgs?.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.slug?.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <Button>Create Organization</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations ({filteredOrgs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-4">
              {isLoading ? (
                <div className="text-center py-8">Loading organizations...</div>
              ) : filteredOrgs.length === 0 ? (
                <div className="text-center py-8">No organizations found</div>
              ) : (
                filteredOrgs.map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground">{org.slug}</p>
                        <p className="text-xs text-muted-foreground">
                          Owner: {org.owner?.name || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{org.plan}</Badge>
                      <Badge variant="outline">
                        {org.entities?.length || 0} entities
                      </Badge>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}