"use client";

import { useState } from "react";
import { Twitter, Linkedin, LinkIcon, Check } from "lucide-react";
import { toast } from "sonner";

export function BlogShareBar({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const shareOnTwitter = () => {
    const text = encodeURIComponent(title);
    const sharedUrl = encodeURIComponent(url);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${sharedUrl}`,
      "_blank",
      "noopener,noreferrer,width=600,height=400",
    );
  };

  const shareOnLinkedIn = () => {
    const sharedUrl = encodeURIComponent(url);
    const sharedTitle = encodeURIComponent(title);
    window.open(
      `https://www.linkedin.com/shareArticle?mini=true&url=${sharedUrl}&title=${sharedTitle}`,
      "_blank",
      "noopener,noreferrer,width=600,height=400",
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Share on Twitter"
        onClick={shareOnTwitter}
        className="p-2 rounded-lg text-slate-400 hover:text-[#1DA1F2] hover:bg-slate-100 transition-colors"
      >
        <Twitter className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Share on LinkedIn"
        onClick={shareOnLinkedIn}
        className="p-2 rounded-lg text-slate-400 hover:text-[#0A66C2] hover:bg-slate-100 transition-colors"
      >
        <Linkedin className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Copy link"
        onClick={copyLink}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        {copied ? (
          <Check className="h-5 w-5 text-green-500" />
        ) : (
          <LinkIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
