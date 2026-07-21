"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@xenboox/ui";
import { Search, Plus, Edit, Trash2, Building, Users } from "lucide-react";
import { toast } from "sonner";

type Organization = RouterOutputs["admin"]["listOrganizations"][number];

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "pro", label: "Pro" },
  { value: "firm", label: "Firm" },
] as const;

export default function OrganizationsPage() {
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    plan: "free" as (typeof PLAN_OPTIONS)[number]["value"],
    ownerId: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    plan: "free" as (typeof PLAN_OPTIONS)[number]["value"],
  });

  const {
    data: orgsData,
    isLoading,
    refetch,
  } = trpc.admin.listOrganizations.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: search || undefined,
  });
  const { data: users } = trpc.admin.listUsers.useQuery();

  const createMutation = trpc.admin.createOrganization.useMutation({
    onSuccess: () => {
      setOpenCreate(false);
      setCreateForm({ name: "", slug: "", plan: "free", ownerId: "" });
      refetch();
      toast.success("Organization created");
    },
    onError: (e) => toast.error(e.message || "Failed to create organization"),
  });
  const updateMutation = trpc.admin.updateOrganization.useMutation({
    onSuccess: () => {
      setOpenEdit(false);
      setSelectedOrg(null);
      refetch();
      toast.success("Organization updated");
    },
    onError: (e) => toast.error(e.message || "Failed to update organization"),
  });
  const deleteMutation = trpc.admin.deleteOrganization.useMutation({
    onSuccess: () => {
      setOpenDelete(false);
      setSelectedOrg(null);
      refetch();
      toast.success("Organization deleted");
    },
    onError: (e) => toast.error(e.message || "Failed to delete organization"),
  });

  const orgs = orgsData?.items ?? [];
  const totalOrgs = orgsData?.total ?? 0;

  const filteredOrgs = search && !orgsData ? [] : orgs;

  const hasMore = totalOrgs > (page + 1) * PAGE_SIZE;

  const handleCreate = () => {
    if (!createForm.name || !createForm.slug) {
      toast.error("Please fill all fields");
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleEdit = () => {
    if (!selectedOrg) return;
    updateMutation.mutate({ orgId: selectedOrg.id, ...editForm });
  };

  const handleDelete = () => {
    if (!selectedOrg) return;
    deleteMutation.mutate({ orgId: selectedOrg.id });
  };

  const openEditDialog = (org: Organization) => {
    setSelectedOrg(org);
    setEditForm({ name: org.name, plan: org.plan });
    setOpenEdit(true);
  };

  const openDeleteDialog = (org: Organization) => {
    setSelectedOrg(org);
    setOpenDelete(true);
  };

  const getPlanBadgeVariant = (plan: string) => {
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
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>Set up a new organization.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug</Label>
                <Input
                  id="org-slug"
                  value={createForm.slug}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, slug: e.target.value })
                  }
                  placeholder="acme-corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-plan">Plan</Label>
                <Select
                  value={createForm.plan}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, plan: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-owner">Owner</Label>
                <Select
                  value={createForm.ownerId}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, ownerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {totalOrgs > 0
                  ? `Showing ${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, totalOrgs)} of ${totalOrgs}`
                  : "No organizations"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>

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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Entities</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgs.map((org: Organization) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {org.slug}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPlanBadgeVariant(org.plan)}>
                            {org.plan.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {org.owner?.name || org.owner?.email || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {org.entities?.length || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(org.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(org)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(org)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization name and plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-org-name">Name</Label>
              <Input
                id="edit-org-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-org-plan">Plan</Label>
              <Select
                value={editForm.plan}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, plan: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedOrg?.name}</strong>? This permanently removes the
              organization, all entities, and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
