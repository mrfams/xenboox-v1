"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  X,
  FileText,
  TrendingUp,
  MessageSquare,
  Loader2,
  Upload,
  Image,
  Trash2 as RemoveIcon,
  Clipboard,
  Check,
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { ImageCropper } from "@/components/shared/image-cropper";
import { trpc } from "@/lib/trpc/client";

const categories = [
  "All",
  "Product",
  "Engineering",
  "Company",
  "Tutorials",
  "Accounting",
];

type EditorForm = {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  image: string;
};

const emptyForm: EditorForm = {
  title: "",
  excerpt: "",
  content: "",
  category: "Product",
  tags: "",
  image: "",
};

export default function BlogAdminPage() {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditorForm>(emptyForm);
  const [imageUploading, setImageUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [galleryDragOver, setGalleryDragOver] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<
    { tempId: string; url: string; name: string }[]
  >([]);
  const [uploadedImages, setUploadedImages] = useState<
    { url: string; name: string }[]
  >([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropMode, setCropMode] = useState<"cover" | "gallery">("cover");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when editor closes
  useEffect(() => {
    if (!showEditor) {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      for (const p of galleryPreviews) URL.revokeObjectURL(p.url);
      setCoverPreview(null);
      setGalleryPreviews([]);
      setUploadedImages([]);
    }
  }, [showEditor]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = trpc.content.adminListPosts.useQuery({
    status: selectedCategory === "All" ? undefined : selectedCategory,
    query: searchQuery || undefined,
  });

  const { data: previousImages } = trpc.content.adminListBlogImages.useQuery();

  const createPost = trpc.content.adminCreatePost.useMutation({
    onSuccess: () => {
      utils.content.adminListPosts.invalidate();
      setShowEditor(false);
    },
  });
  const updatePost = trpc.content.adminUpdatePost.useMutation({
    onSuccess: () => utils.content.adminListPosts.invalidate(),
  });
  const deletePost = trpc.content.adminDeletePost.useMutation({
    onSuccess: () => utils.content.adminListPosts.invalidate(),
  });
  const seedDemo = trpc.content.seedDemoContent.useMutation({
    onSuccess: () => utils.content.adminListPosts.invalidate(),
  });

  const posts = useMemo(() => data?.posts ?? [], [data]);
  const stats = useMemo(
    () =>
      data?.stats ?? {
        total: 0,
        published: 0,
        drafts: 0,
        views: 0,
        comments: 0,
      },
    [data],
  );

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        searchQuery === "" ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || post.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [posts, searchQuery, selectedCategory]);

  const handleCreatePost = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowEditor(true);
  };

  const handleEditPost = (post: (typeof posts)[number]) => {
    setEditingId(post.id);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      tags: post.tags.join(", "),
      image: post.image ?? "",
    });
    setShowEditor(true);
  };

  const handleSavePost = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const payload = {
      slug: slug || `post-${Date.now()}`,
      title: formData.title,
      excerpt: formData.excerpt,
      content: formData.content,
      category: formData.category,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      readTimeMinutes: Math.max(
        1,
        Math.ceil(formData.content.split(/\s+/).filter(Boolean).length / 200),
      ),
      authorName: "Admin",
      authorRole: "Editor",
      status: "published" as const,
      ...(formData.image ? { image: formData.image } : {}),
    };

    if (editingId) {
      updatePost.mutate({ id: editingId, data: payload });
      setShowEditor(false);
    } else {
      createPost.mutate(payload);
    }
  };

  const handleDeletePost = (postId: string) => {
    deletePost.mutate(
      { id: postId },
      {
        onSuccess: () => setDeleteConfirmId(null),
      },
    );
  };

  /** Upload a single blob (from cropper or direct) as cover image */
  const uploadBlob = async (blob: Blob, name: string) => {
    const preview = URL.createObjectURL(blob);
    setCoverPreview(preview);
    setImageUploading(true);
    try {
      const formDataUpload = new FormData();
      const file = new File([blob], name, { type: "image/jpeg" });
      formDataUpload.append("file", file);

      const res = await fetch("/api/upload-blog-image", {
        method: "POST",
        body: formDataUpload,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await res.json();
      setFormData((prev) => ({ ...prev, image: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      URL.revokeObjectURL(preview);
      setCoverPreview(null);
      setImageUploading(false);
    }
  };

  /** Upload multiple blobs (from cropper or direct) to gallery */
  const uploadBlobs = async (blobs: { blob: Blob; name: string }[]) => {
    const previews = blobs.map((b) => ({
      tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: URL.createObjectURL(b.blob),
      name: b.name,
    }));
    setGalleryPreviews((prev) => [...prev, ...previews]);
    setImageUploading(true);
    try {
      const formDataUpload = new FormData();
      for (const b of blobs) {
        const file = new File([b.blob], b.name, { type: "image/jpeg" });
        formDataUpload.append("files", file);
      }

      const res = await fetch("/api/upload-blog-image", {
        method: "POST",
        body: formDataUpload,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      if (data.url) {
        setUploadedImages((prev) => [
          ...prev,
          { url: data.url, name: blobs[0].name },
        ]);
      } else if (data.uploaded) {
        setUploadedImages((prev) => [...prev, ...data.uploaded]);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upload images");
    } finally {
      for (const p of previews) URL.revokeObjectURL(p.url);
      setGalleryPreviews((prev) =>
        prev.filter((p) => !previews.some((pr) => pr.tempId === p.tempId)),
      );
      setImageUploading(false);
    }
  };

  /** Validate a file for type and size */
  const validateImageFile = (file: File): boolean => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPEG, PNG, WebP, or AVIF).");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum size is 5 MB.");
      return false;
    }
    return true;
  };

  /** Open crop dialog for cover image */
  const openCropForCover = (file: File) => {
    if (!validateImageFile(file)) return;
    setCropFile(file);
    setCropMode("cover");
    setCropOpen(true);
  };

  /** Open crop dialog for gallery — crops one file at a time */
  const openCropForGallery = (files: File[]) => {
    const valid = files.filter((f) => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > 5 * 1024 * 1024) return false;
      return true;
    });
    if (valid.length === 0) {
      alert("No valid images to upload.");
      return;
    }
    if (valid.length !== files.length) {
      alert(
        "Some files were skipped (wrong type or too large).\nUploading the valid ones.",
      );
    }
    // Crop the first file; on complete, queue the rest
    pendingGalleryFilesRef.current = valid.slice(1);
    setCropFile(valid[0]);
    setCropMode("gallery");
    setCropOpen(true);
  };

  const pendingGalleryFilesRef = useRef<File[]>([]);

  /** Called when cropper produces a cropped blob */
  const handleCropComplete = async (blob: Blob, previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    setCropOpen(false);
    setCropFile(null);

    if (cropMode === "cover") {
      await uploadBlob(blob, "cover.jpg");
    } else {
      // Gallery: upload this blob, then open cropper for next file
      await uploadBlobs([{ blob, name: "image.jpg" }]);
      const remaining = pendingGalleryFilesRef.current;
      if (remaining.length > 0) {
        const next = remaining[0];
        pendingGalleryFilesRef.current = remaining.slice(1);
        setCropFile(next);
        setCropOpen(true);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    openCropForCover(file);
    e.target.value = "";
  };

  const handleGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files?.length) return;
    openCropForGallery(Array.from(files));
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    openCropForCover(file);
  };

  const handleGalleryDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGalleryDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length) openCropForGallery(files);
  };

  const handleGalleryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGalleryDragOver(true);
  };

  const handleGalleryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setGalleryDragOver(false);
  };

  const copyMarkdown = async (url: string) => {
    const md = `![image](${url})`;
    await navigator.clipboard.writeText(md);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const setAsCover = (url: string) => {
    setFormData((prev) => ({ ...prev, image: url }));
  };

  const removeGalleryImage = (url: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.url !== url));
  };

  const handleTogglePublish = (post: (typeof posts)[number]) => {
    updatePost.mutate({
      id: post.id,
      data: {
        status: post.status === "published" ? "draft" : "published",
      },
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
                  Blog Manager
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Create, edit, and manage your blog posts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {posts.length === 0 && !isLoading && (
                <button
                  onClick={() => seedDemo.mutate()}
                  disabled={seedDemo.isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {seedDemo.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Seed Demo Content
                </button>
              )}
              <button
                onClick={handleCreatePost}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                New Post
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
                label: "Total Posts",
                value: stats.total,
                icon: FileText,
                color: "blue",
              },
              {
                label: "Published",
                value: stats.published,
                icon: Eye,
                color: "green",
              },
              {
                label: "Total Views",
                value: stats.views.toLocaleString(),
                icon: TrendingUp,
                color: "purple",
              },
              {
                label: "Comments",
                value: stats.comments,
                icon: MessageSquare,
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
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-64"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-slate-500">
              {isLoading
                ? "Loading..."
                : `${filteredPosts.length} post${filteredPosts.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </FadeInUp>

        {/* Posts Table */}
        <FadeInUp delay={0.2}>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Post
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                        <p className="mt-2 text-sm text-slate-500">
                          Loading posts...
                        </p>
                      </td>
                    </tr>
                  ) : filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <FileText className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm text-slate-500">
                          No posts found. Create your first post or seed demo
                          content.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map((post) => (
                      <tr
                        key={post.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <Link
                              href={`/blog/${post.slug}`}
                              className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                            >
                              {post.title}
                            </Link>
                            <p className="mt-1 text-sm text-slate-500 line-clamp-1">
                              {post.excerpt}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {post.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {post.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleTogglePublish(post)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                              post.status === "published"
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {post.status === "published" ? (
                              <>
                                <Eye className="h-3 w-3" />
                                Published
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" />
                                {post.status === "draft" ? "Draft" : "Archived"}
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {post.views.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/blog/${post.slug}`}
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleEditPost(post)}
                              className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(post.id)}
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
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit Post" : "New Post"}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cover Image
                </label>
                {coverPreview ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                      isDragOver
                        ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={coverPreview}
                      alt="Upload preview"
                      className="h-48 w-full object-cover"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[1px]">
                      <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                      <p className="text-sm font-semibold text-white">
                        Uploading cover image...
                      </p>
                    </div>
                  </div>
                ) : formData.image ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                      isDragOver
                        ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={formData.image}
                      alt="Cover preview"
                      className="h-48 w-full object-cover"
                    />
                    {isDragOver && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-blue-500/20 backdrop-blur-[2px]">
                        <Image className="h-10 w-10 text-blue-600 mb-2" />
                        <p className="text-sm font-semibold text-blue-700">
                          Drop to replace image
                        </p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-xs text-white/80 truncate max-w-[70%]">
                        Cover image set
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, image: "" }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-red-600"
                      >
                        <RemoveIcon className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-all duration-200 ${
                      isDragOver
                        ? "border-blue-500 bg-blue-50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                        : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    <Image
                      className={`h-8 w-8 transition-colors ${isDragOver ? "text-blue-500" : "text-slate-400"}`}
                    />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">
                        {isDragOver
                          ? "Drop image here"
                          : "Click or drag to upload cover image"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        JPEG, PNG, WebP, or AVIF. Max 5 MB.
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Image Gallery — multi-file drop zone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Image Gallery
                </label>
                <label
                  onDragOver={handleGalleryDragOver}
                  onDragLeave={handleGalleryDragLeave}
                  onDrop={handleGalleryDrop}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-5 transition-all duration-200 ${
                    galleryDragOver
                      ? "border-blue-500 bg-blue-50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                      : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  {imageUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  ) : (
                    <Upload
                      className={`h-6 w-6 transition-colors ${galleryDragOver ? "text-blue-500" : "text-slate-400"}`}
                    />
                  )}
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">
                      {imageUploading
                        ? "Uploading..."
                        : galleryDragOver
                          ? "Drop images here"
                          : "Click or drag multiple images"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      JPEG, PNG, WebP, or AVIF. Max 5 MB each.
                    </p>
                  </div>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={handleGalleryUpload}
                    disabled={imageUploading}
                    className="hidden"
                  />
                </label>

                {(galleryPreviews.length > 0 || uploadedImages.length > 0) && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {galleryPreviews.map((preview) => (
                      <div
                        key={preview.tempId}
                        className="relative overflow-hidden rounded-lg border border-slate-200"
                      >
                        <img
                          src={preview.url}
                          alt={preview.name}
                          className="h-24 w-full object-cover"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[1px]">
                          <Loader2 className="h-5 w-5 animate-spin text-white mb-1" />
                          <p className="text-[10px] font-medium text-white truncate max-w-[80%]">
                            {preview.name}
                          </p>
                        </div>
                      </div>
                    ))}
                    {uploadedImages.map((img) => (
                      <div
                        key={img.url}
                        className="group relative overflow-hidden rounded-lg border border-slate-200"
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="h-24 w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/50">
                          <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setAsCover(img.url)}
                              className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                              title="Set as cover image"
                            >
                              Cover
                            </button>
                            <button
                              type="button"
                              onClick={() => copyMarkdown(img.url)}
                              className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                              title="Copy markdown"
                            >
                              {copiedUrl === img.url ? (
                                <Check className="inline h-3 w-3 text-green-600" />
                              ) : (
                                <Clipboard className="inline h-3 w-3" />
                              )}
                              {copiedUrl === img.url ? " Copied" : " Copy"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(img.url)}
                              className="rounded-md bg-red-500/90 px-2 py-1 text-[10px] font-medium text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-red-600"
                              title="Remove from gallery"
                            >
                              <RemoveIcon className="inline h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {formData.image === img.url && (
                          <div className="absolute top-1.5 left-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                            COVER
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {previousImages && previousImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Previously used cover images
                    </p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {previousImages.map((img) => (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => setAsCover(img.url)}
                          className={`group relative overflow-hidden rounded-lg border-2 transition-all duration-150 ${
                            formData.image === img.url
                              ? "border-blue-500 ring-2 ring-blue-500/20"
                              : "border-transparent hover:border-slate-300"
                          }`}
                          title={img.postTitle || "Use as cover"}
                        >
                          <img
                            src={img.url}
                            alt={img.postTitle || "Previously used image"}
                            className="h-16 w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40">
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 shadow-sm">
                                {formData.image === img.url ? "Active" : "Use"}
                              </span>
                            </div>
                          </div>
                          {formData.image === img.url && (
                            <div className="absolute top-1 left-1 rounded bg-blue-600 px-1 py-0.5 text-[8px] font-bold text-white">
                              COVER
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter post title..."
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Excerpt
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData({ ...formData, excerpt: e.target.value })
                  }
                  placeholder="Brief description of the post..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    {categories
                      .filter((c) => c !== "All")
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                  </select>
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
                    placeholder="AI, Product, Engineering"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Content (Markdown supported)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Write your post content here... Markdown is supported."
                  rows={12}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
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
                onClick={handleSavePost}
                disabled={
                  !formData.title ||
                  !formData.content ||
                  createPost.isPending ||
                  updatePost.isPending
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(createPost.isPending || updatePost.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Save className="h-4 w-4" />
                {editingId ? "Save Changes" : "Create Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm">
            <div className="rounded-xl border bg-white p-6 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">
                Delete Post
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Are you sure you want to delete this blog post? This action
                cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePost(deleteConfirmId)}
                  disabled={deletePost.isPending}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deletePost.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Image Cropper */}
      {cropFile && (
        <ImageCropper
          file={cropFile}
          open={cropOpen}
          onClose={() => {
            setCropOpen(false);
            setCropFile(null);
            pendingGalleryFilesRef.current = [];
          }}
          onCrop={handleCropComplete}
          maxOutputSize={1600}
        />
      )}
    </div>
  );
}
