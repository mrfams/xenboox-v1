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
import {
  Search,
  Plus,
  Edit,
  Trash2,
  User,
  Mail,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | string | null;
  createdAt: string;
  userEntityAccess?: Array<{
    id: string;
    role: string;
    entityId: string;
  }>;
};

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "finance_director", label: "Finance Director" },
  { value: "accountant", label: "Accountant" },
  { value: "payroll_officer", label: "Payroll Officer" },
  { value: "cashier", label: "Cashier" },
  { value: "department_manager", label: "Department Manager" },
  { value: "employee", label: "Employee" },
  { value: "external_auditor", label: "External Auditor" },
  { value: "donor", label: "Donor" },
] as const;

export default function UsersPage() {
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee" as (typeof ROLE_OPTIONS)[number]["value"],
    entityId: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "employee" as (typeof ROLE_OPTIONS)[number]["value"],
    entityId: "",
  });

  const {
    data: usersData,
    isLoading,
    refetch,
  } = trpc.admin.listUsers.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: search || undefined,
  });
  const { data: orgsData } = trpc.admin.listOrganizations.useQuery({});
  const orgs = orgsData?.items ?? [];

  const createMutation = trpc.admin.createUser.useMutation({
    onSuccess: () => {
      setOpenCreate(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "employee",
        entityId: "",
      });
      refetch();
      toast.success("User created");
    },
    onError: (e) => toast.error(e.message || "Failed to create user"),
  });
  const updateMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      setOpenEdit(false);
      setSelectedUser(null);
      refetch();
      toast.success("User updated");
    },
    onError: (e) => toast.error(e.message || "Failed to update user"),
  });
  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      setOpenDelete(false);
      setSelectedUser(null);
      refetch();
      toast.success("User deleted");
    },
    onError: (e) => toast.error(e.message || "Failed to delete user"),
  });

  const users = usersData?.items ?? [];
  const totalUsers = usersData?.total ?? 0;

  const filteredUsers = search && !usersData ? [] : users;

  const defaultEntityId = orgs?.[0]?.entities?.[0]?.id || "";

  const hasMore = totalUsers > (page + 1) * PAGE_SIZE;

  const handleCreate = () => {
    const entityId = createForm.entityId || defaultEntityId;
    if (
      !createForm.name ||
      !createForm.email ||
      !createForm.password ||
      !entityId
    ) {
      toast.error("Please fill all fields");
      return;
    }
    createMutation.mutate({ ...createForm, entityId });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleEdit = () => {
    if (!selectedUser) return;
    updateMutation.mutate({ userId: selectedUser.id, ...editForm });
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    deleteMutation.mutate({ userId: selectedUser.id });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    const access = user.userEntityAccess?.[0];
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: (access?.role ||
        "employee") as (typeof ROLE_OPTIONS)[number]["value"],
      entityId: access?.entityId || defaultEntityId,
    });
    setOpenEdit(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setOpenDelete(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    const roleMap: Record<
      string,
      "default" | "destructive" | "outline" | "secondary"
    > = {
      owner: "destructive",
      admin: "default",
      finance_director: "default",
      accountant: "outline",
      payroll_officer: "outline",
      cashier: "outline",
      department_manager: "secondary",
      employee: "secondary",
      external_auditor: "secondary",
      donor: "secondary",
    };
    return roleMap[role] || "outline";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage organization users and their access
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>
                Add a new user to the organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  placeholder="Min 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, role: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity">Entity</Label>
                <Select
                  value={createForm.entityId}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, entityId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs?.flatMap(
                      (o) =>
                        o.entities?.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {o.name} — {e.name}
                          </SelectItem>
                        )) || [],
                    )}
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
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {totalUsers > 0
                  ? `Showing ${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, totalUsers)} of ${totalUsers}`
                  : "No users"}
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
            {totalUsers > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}-
                {Math.min((page + 1) * PAGE_SIZE, totalUsers)} of {totalUsers}
              </p>
            )}

            {isLoading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No users found matching your search
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name || "Unnamed User"}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.userEntityAccess
                              ?.slice(0, 2)
                              .map((access) => (
                                <Badge
                                  key={access.id}
                                  variant={getRoleBadgeVariant(access.role)}
                                >
                                  {access.role?.replace("_", " ")}
                                </Badge>
                              ))}
                            {user.userEntityAccess &&
                              user.userEntityAccess.length > 2 && (
                                <Badge variant="outline">
                                  +{user.userEntityAccess.length - 2} more
                                </Badge>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.emailVerified ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground text-xs">
                              <XCircle className="h-3 w-3" /> Unverified
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openEditDialog(user as unknown as User)
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openDeleteDialog(user as unknown as User)
                              }
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
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and roles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, role: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-entity">Entity</Label>
              <Select
                value={editForm.entityId}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, entityId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an entity" />
                </SelectTrigger>
                <SelectContent>
                  {orgs?.flatMap(
                    (o) =>
                      o.entities?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {o.name} — {e.name}
                        </SelectItem>
                      )) || [],
                  )}
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
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedUser?.name || selectedUser?.email}</strong>? This
              will remove all user data and cannot be undone.
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
