import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Button } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { Input } from "@xenboox/ui"
import { Search, Shield, User, Mail, Calendar, Plus, Edit, Trash2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { useState } from "react"

export default function UsersPage() {
  const [search, setSearch] = useState("")
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery()

  const filteredUsers = users?.filter((u: typeof users[0]) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const getRoleBadgeVariant = (role: string) => {
    const roleMap: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      owner: "destructive",
      admin: "default",
      finance_director: "default",
      accountant: "outline",
      payroll_officer: "outline",
      cashier: "outline",
      department_manager: "secondary",
      employee: "secondary",
      external_auditor: "secondary",
      donor: "secondary"
    }
    return roleMap[role] || "outline"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">View and manage organization users and their access</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-4">
              {isLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found matching your search</p>
                </div>
              ) : (
                filteredUsers.map((user: typeof users[0]) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name || "Unnamed User"}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                          {user.sessions?.length > 0 && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Calendar className="h-3 w-3" />
                              Last active
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.userEntityAccess?.slice(0, 2).map((access) => (
                        <Badge key={access.id} variant={getRoleBadgeVariant(access.role)}>
                          {access.role?.replace('_', ' ')}
                        </Badge>
                      ))}
                      {user.userEntityAccess?.length > 2 && (
                        <Badge variant="outline">
                          +{user.userEntityAccess.length - 2} more
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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