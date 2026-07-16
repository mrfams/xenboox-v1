"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
} from "@xenboox/ui";
import { Building, Search, Plus, Edit, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import type { RouterOutputs } from "@/lib/trpc";

type Organization = RouterOutputs["admin"]["listOrganizations"][number];

export default function OrganizationsPage() {
  const [search, setSearch] = useState("");
  const { data: orgs, isLoading } = trpc.admin.listOrganizations.useQuery();

  const filteredOrgs =
    orgs?.filter(
      (o: Organization) =>
        o.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.slug?.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  const getPlanVariant = (plan: string) => {
    const planMap: Record<
      string,
      "default" | "destructive" | "outline" | "secondary"
    > = {
      free: "outline",
      starter: "secondary",
      growth: "default",
      pro: "default",
      firm: "destructive",
    };
    return planMap[plan] || "outline";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            Manage organizations and their settings
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
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
                placeholder="Search organizations by name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-4">
              {isLoading ? (
                <div className="text-center py-8">Loading organizations...</div>
              ) : filteredOrgs.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No organizations found matching your search
                  </p>
                </div>
              ) : (
                filteredOrgs.map((org: Organization) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Building className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-mono">{org.slug}</span> • Owner:{" "}
                          {org.owner?.name || "Unknown"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getPlanVariant(org.plan)}>
                            {org.plan.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{org.entities?.length || 0} entities</div>
                      </div>
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
  );
}
