"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-snug">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-warm-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-warm-800">{children}</em>,
  h1: ({ children }) => <p className="mb-1 text-base font-semibold text-warm-900">{children}</p>,
  h2: ({ children }) => <p className="mb-1 text-[15px] font-semibold text-warm-900">{children}</p>,
  h3: ({ children }) => <p className="mb-1 text-[15px] font-semibold text-warm-900">{children}</p>,
  code: ({ className, children, ...props }) => {
    if (className) {
      return (
        <code
          className={`block w-full bg-transparent p-0 font-mono text-[13px] text-warm-900 ${className}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-warm-100/90 px-1 py-0.5 font-mono text-[13px] text-warm-900" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 max-w-full overflow-x-auto rounded-lg border border-warm-100 bg-warm-50 p-2">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-sage-300 pl-2 text-warm-700">{children}</blockquote>
  ),
  a: ({ href, children }) => {
    const ok = href && (href.startsWith("https://") || href.startsWith("http://"));
    if (!ok) {
      return <span className="text-warm-800">{children}</span>;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-sage-700 underline decoration-sage-300 underline-offset-2 hover:text-sage-900"
      >
        {children}
      </a>
    );
  },
  hr: () => <hr className="my-2 border-warm-200" />,
  table: ({ children }) => (
    <div className="mb-2 max-w-full overflow-x-auto rounded-lg border border-warm-100">
      <table className="min-w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-warm-50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-warm-100 px-2 py-1.5 font-semibold text-warm-800">{children}</th>
  ),
  td: ({ children }) => <td className="border border-warm-100 px-2 py-1.5 text-warm-800">{children}</td>,
};

export function AssistantMarkdownMessage({ content }: { content: string }) {
  if (!content.trim()) {
    return null;
  }
  return (
    <div className="assistant-markdown text-[15px] text-warm-900 [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
