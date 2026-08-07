"use client";

import { useState } from "react";
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
} from "lucide-react";

import { FadeInUp } from "@/components/marketing/reveal";
import { blogPosts, type BlogPost } from "@/lib/blog-data";

// Admin state management (client-side for demo)
type AdminBlogPost = BlogPost & {
  isPublished: boolean;
  views: number;
  comments: number;
};

const initialPosts: AdminBlogPost[] = blogPosts.map((post, _index) => ({
  ...post,
  isPublished: true,
  views: Math.floor(Math.random() * 5000) + 500,
  comments: Math.floor(Math.random() * 50),
}));

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>(initialPosts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<AdminBlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "Product",
    tags: "",
  });

  const categories = [
    "All",
    "Product",
    "Engineering",
    "Company",
    "Tutorials",
    "Accounting",
  ];

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalPosts: posts.length,
    published: posts.filter((p) => p.isPublished).length,
    totalViews: posts.reduce((sum, p) => sum + p.views, 0),
    totalComments: posts.reduce((sum, p) => sum + p.comments, 0),
  };

  const handleCreatePost = () => {
    setEditingPost(null);
    setFormData({
      title: "",
      excerpt: "",
      content: "",
      category: "Product",
      tags: "",
    });
    setShowEditor(true);
  };

  const handleEditPost = (post: AdminBlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      tags: post.tags.join(", "),
    });
    setShowEditor(true);
  };

  const handleSavePost = () => {
    const newPost: AdminBlogPost = {
      id: editingPost?.id || String(Date.now()),
      slug: formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      title: formData.title,
      excerpt: formData.excerpt,
      content: formData.content,
      category: formData.category,
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      readTime: `${Math.max(1, Math.ceil(formData.content.split(" ").length / 200))} min`,
      author: {
        name: "Admin",
        role: "Editor",
      },
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      featured: false,
      isPublished: true,
      views: 0,
      comments: 0,
    };

    if (editingPost) {
      setPosts(
        posts.map((p) =>
          p.id === editingPost.id
            ? { ...newPost, views: p.views, comments: p.comments }
            : p,
        ),
      );
    } else {
      setPosts([newPost, ...posts]);
    }
    setShowEditor(false);
  };

  const handleDeletePost = (postId: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      setPosts(posts.filter((p) => p.id !== postId));
    }
  };

  const handleTogglePublish = (postId: string) => {
    setPosts(
      posts.map((p) =>
        p.id === postId ? { ...p, isPublished: !p.isPublished } : p,
      ),
    );
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
            <button
              onClick={handleCreatePost}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              New Post
            </button>
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
                value: stats.totalPosts,
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
                value: stats.totalViews.toLocaleString(),
                icon: TrendingUp,
                color: "purple",
              },
              {
                label: "Comments",
                value: stats.totalComments,
                icon: MessageSquare,
                color: "amber",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                    <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
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
              {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
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
                  {filteredPosts.map((post) => (
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
                          onClick={() => handleTogglePublish(post.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            post.isPublished
                              ? "bg-green-50 text-green-700 hover:bg-green-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {post.isPublished ? (
                            <>
                              <Eye className="h-3 w-3" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              Draft
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {post.views.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {post.date}
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
                            onClick={() => handleDeletePost(post.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                {editingPost ? "Edit Post" : "New Post"}
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
                disabled={!formData.title || !formData.content}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {editingPost ? "Save Changes" : "Create Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
