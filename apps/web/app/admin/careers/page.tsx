"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Briefcase,
  ArrowLeft,
  Save,
  X,
  Users,
  Building2,
  Loader2,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { trpc } from "@/lib/trpc/client";

const departments = [
  "All",
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Operations",
  "Customer Success",
  "Finance",
  "Legal",
  "People",
];

const locations = [
  "All",
  "Remote",
  "Remote (US/EU)",
  "Remote (Africa)",
  "New York",
  "London",
  "Lagos",
];

const jobTypes = ["All", "Full-time", "Part-time", "Contract", "Internship"];

type EditorForm = {
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Internship";
  salary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  niceToHave: string;
  benefits: string;
  tags: string;
};

const emptyForm: EditorForm = {
  title: "",
  department: "Engineering",
  location: "Remote",
  type: "Full-time",
  salary: "",
  description: "",
  responsibilities: "",
  requirements: "",
  niceToHave: "",
  benefits: "",
  tags: "",
};

export default function CareersAdminPage() {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditorForm>(emptyForm);

  const { data, isLoading } = trpc.content.adminListJobs.useQuery({
    department: selectedDepartment === "All" ? undefined : selectedDepartment,
    status: selectedStatus === "All" ? undefined : selectedStatus,
    query: searchQuery || undefined,
  });

  const createJob = trpc.content.adminCreateJob.useMutation({
    onSuccess: () => {
      utils.content.adminListJobs.invalidate();
      setShowEditor(false);
    },
  });
  const updateJob = trpc.content.adminUpdateJob.useMutation({
    onSuccess: () => utils.content.adminListJobs.invalidate(),
  });
  const deleteJob = trpc.content.adminDeleteJob.useMutation({
    onSuccess: () => utils.content.adminListJobs.invalidate(),
  });
  const seedDemo = trpc.content.seedDemoContent.useMutation({
    onSuccess: () => utils.content.adminListJobs.invalidate(),
  });

  const jobs = useMemo(() => data?.jobs ?? [], [data]);
  const stats = useMemo(
    () =>
      data?.stats ?? {
        total: 0,
        active: 0,
        applications: 0,
        departmentCount: 0,
      },
    [data],
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        searchQuery === "" ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment =
        selectedDepartment === "All" || job.department === selectedDepartment;
      const matchesStatus =
        selectedStatus === "All" ||
        (selectedStatus === "Active" && job.isActive) ||
        (selectedStatus === "Inactive" && !job.isActive);
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [jobs, searchQuery, selectedDepartment, selectedStatus]);

  const handleCreateJob = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowEditor(true);
  };

  const handleEditJob = (job: (typeof jobs)[number]) => {
    setEditingId(job.id);
    setFormData({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      salary: job.salary ?? "",
      description: job.description,
      responsibilities: job.responsibilities.join("\n"),
      requirements: job.requirements.join("\n"),
      niceToHave: (job.niceToHave ?? []).join("\n"),
      benefits: job.benefits.join("\n"),
      tags: job.tags.join(", "),
    });
    setShowEditor(true);
  };

  const handleSaveJob = () => {
    const payload = {
      title: formData.title,
      department: formData.department,
      location: formData.location,
      type: formData.type,
      salary: formData.salary || undefined,
      description: formData.description,
      responsibilities: formData.responsibilities
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      requirements: formData.requirements
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      niceToHave: formData.niceToHave
        ? formData.niceToHave
            .split("\n")
            .map((r) => r.trim())
            .filter(Boolean)
        : [],
      benefits: formData.benefits
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      postedDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      isActive: true,
      status: "open" as const,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (editingId) {
      updateJob.mutate({ id: editingId, data: payload });
      setShowEditor(false);
    } else {
      createJob.mutate(payload);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    if (confirm("Are you sure you want to delete this job listing?")) {
      deleteJob.mutate({ id: jobId });
    }
  };

  const handleToggleActive = (job: (typeof jobs)[number]) => {
    updateJob.mutate({
      id: job.id,
      data: { isActive: !job.isActive },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Admin
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Careers Manager
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Create, edit, and manage job listings
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {jobs.length === 0 && !isLoading && (
                <button
                  onClick={() => seedDemo.mutate()}
                  disabled={seedDemo.isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {seedDemo.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Briefcase className="h-4 w-4" />
                  )}
                  Seed Demo Jobs
                </button>
              )}
              <button
                onClick={handleCreateJob}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                New Position
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Stats */}
        <FadeInUp>
          <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
            {[
              {
                label: "Total Positions",
                value: stats.total,
                icon: Briefcase,
                color: "blue",
              },
              {
                label: "Active",
                value: stats.active,
                icon: Eye,
                color: "green",
              },
              {
                label: "Applications",
                value: stats.applications,
                icon: Users,
                color: "purple",
              },
              {
                label: "Departments",
                value: stats.departmentCount,
                icon: Building2,
                color: "amber",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <stat.icon className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FadeInUp>

        {/* Filters */}
        <FadeInUp delay={0.1}>
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search positions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-64"
                />
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === "All" ? "All Departments" : dept}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <p className="text-sm text-slate-500">
              {isLoading
                ? "Loading..."
                : `${filteredJobs.length} position${filteredJobs.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </FadeInUp>

        {/* Jobs Table */}
        <FadeInUp delay={0.2}>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Applications
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                        <p className="mt-2 text-sm text-slate-500">
                          Loading positions...
                        </p>
                      </td>
                    </tr>
                  ) : filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm text-slate-500">
                          No positions found. Create your first one or seed demo
                          jobs.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <Link
                              href={`/careers/${job.slug}`}
                              className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                            >
                              {job.title}
                            </Link>
                            {job.salary && (
                              <p className="mt-1 text-sm text-slate-500">
                                {job.salary}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {job.department}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {job.location}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {job.type}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(job)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                              job.isActive
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {job.isActive ? (
                              <>
                                <Eye className="h-3 w-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" />
                                Closed
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {job.applications}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/careers/${job.slug}`}
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleEditJob(job)}
                              className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </FadeInUp>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit Position" : "New Position"}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Salary Range
                  </label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) =>
                      setFormData({ ...formData, salary: e.target.value })
                    }
                    placeholder="e.g. $150,000 - $200,000"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    {departments
                      .filter((d) => d !== "All")
                      .map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location
                  </label>
                  <select
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    {locations
                      .filter((l) => l !== "All")
                      .map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Job Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as EditorForm["type"],
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    {jobTypes
                      .filter((t) => t !== "All")
                      .map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the role..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Responsibilities (one per line) *
                </label>
                <textarea
                  value={formData.responsibilities}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      responsibilities: e.target.value,
                    })
                  }
                  placeholder={
                    "Build and maintain React applications\nCollaborate with design team\nMentor junior engineers"
                  }
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Requirements (one per line) *
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) =>
                    setFormData({ ...formData, requirements: e.target.value })
                  }
                  placeholder={
                    "5+ years of experience\nStrong TypeScript skills\nExcellent communication"
                  }
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nice to Have (one per line)
                  </label>
                  <textarea
                    value={formData.niceToHave}
                    onChange={(e) =>
                      setFormData({ ...formData, niceToHave: e.target.value })
                    }
                    placeholder="Experience with fintech\nKnowledge of accounting"
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Benefits (one per line) *
                  </label>
                  <textarea
                    value={formData.benefits}
                    onChange={(e) =>
                      setFormData({ ...formData, benefits: e.target.value })
                    }
                    placeholder="Competitive salary\nRemote work\nHealth insurance"
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="React, TypeScript, Frontend"
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveJob}
                disabled={
                  !formData.title ||
                  !formData.description ||
                  !formData.responsibilities ||
                  !formData.requirements ||
                  createJob.isPending ||
                  updateJob.isPending
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(createJob.isPending || updateJob.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Save className="h-4 w-4" />
                {editingId ? "Save Changes" : "Create Position"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
