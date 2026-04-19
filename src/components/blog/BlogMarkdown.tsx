"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isAllowedBlogImageUrl, isAllowedBlogLinkUrl } from "@/lib/blog-url-validation";

const mdComponents: Components = {
  p: ({ children }) => (
    <p className="mb-4 text-[17px] leading-relaxed text-warm-800 last:mb-0 md:text-lg">{children}</p>
  ),
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-6 text-warm-800">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-6 text-warm-800">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-warm-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-warm-800">{children}</em>,
  h1: ({ children }) => (
    <h2 className="mb-3 mt-10 font-heading text-2xl font-bold tracking-tight text-warm-900 first:mt-0 md:text-3xl">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="mb-3 mt-8 font-heading text-xl font-bold text-warm-900 first:mt-0 md:text-2xl">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-2 mt-6 font-heading text-lg font-semibold text-warm-900 first:mt-0">{children}</h4>
  ),
  code: ({ className, children, ...props }) => {
    if (className) {
      return (
        <code
          className={`block w-full bg-transparent p-0 font-mono text-[15px] text-warm-900 ${className}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded-lg bg-rose-50/90 px-1.5 py-0.5 font-mono text-[15px] text-rose-900"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-6 max-w-full overflow-x-auto rounded-2xl border border-warm-100 bg-warm-50/90 p-4 shadow-inner">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-4 border-rose-200 bg-rose-50/40 py-1 pl-4 text-warm-700 [&>p]:mb-0">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => {
    if (!href || !isAllowedBlogLinkUrl(href)) {
      return <span className="text-warm-800">{children}</span>;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-rose-600 underline decoration-rose-200 underline-offset-[3px] transition-colors hover:text-rose-700"
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => {
    if (typeof src !== "string" || !src || !isAllowedBlogImageUrl(src)) return null;
    return (
      <span className="my-8 block w-full">
        <img
          src={src}
          alt={typeof alt === "string" ? alt : ""}
          className="max-h-[min(72vh,640px)] w-auto max-w-full rounded-2xl border border-warm-100 object-contain shadow-cozy"
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  },
  hr: () => <hr className="my-10 border-warm-200/80" />,
  table: ({ children }) => (
    <div className="mb-6 max-w-full overflow-x-auto rounded-2xl border border-warm-100 shadow-sm">
      <table className="min-w-full border-collapse text-left text-[15px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gradient-to-r from-warm-50 to-rose-50/50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-warm-100 px-3 py-2 font-semibold text-warm-800">{children}</th>
  ),
  td: ({ children }) => <td className="border border-warm-100 px-3 py-2 text-warm-700">{children}</td>,
};

export function BlogMarkdown({ content }: { content: string }) {
  if (!content.trim()) {
    return null;
  }
  return (
    <div className="blog-md prose-warm max-w-none [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
