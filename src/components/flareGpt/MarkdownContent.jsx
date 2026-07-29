import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import CodeBlock from "@/components/flareGpt/CodeBlock";

// Custom renderers for the handful of markdown elements assistant
// responses actually use — table styling matches the DeFi page's
// StrategyComparisonTable (rounded header row, tabular-nums, divide
// lines) so a comparison answered inside chat looks like it belongs to
// the same product, not a generic markdown dump. Code blocks are
// future-proofed (copy button + language label) even though none of
// today's placeholder responses happen to use one.
//
// Body copy runs on `text-chat-text` (16px, #050505 light / #FCFCFC dark) —
// a dedicated, chat-only token, not the app-wide `ink-secondary` this used
// to read on: that token is a deliberately dimmer gray meant for secondary
// UI chrome, and using it for the actual substance of an AI reply was the
// root of the low-contrast, small-feeling text this pass fixes. Headings
// share the same color (by design — see index.css) and get their own
// visual weight through size (20px, one step up from body), heavier
// weight, and more top margin instead, so hierarchy still reads clearly
// without dimming anything down. Genuinely secondary elements (blockquotes,
// table header labels) intentionally keep `ink-muted` — de-emphasizing
// *some* text is what makes the primary content stand out, not a oversight.
// `break-words` on every element that can hold arbitrary-length text is
// deliberate, not decorative — a 42-char wallet address or a long URL
// typed inline (rather than passed through the dedicated WalletAddressBadge
// block, which truncates instead) has nothing else forcing it to wrap, and
// the default `overflow-wrap: normal` lets it push the message bubble
// wider than the viewport on mobile instead. UserMessage.jsx already has
// this on the user's own bubble; these are the assistant-side equivalents.
const COMPONENTS = {
  p: ({ children }) => <p className="text-base leading-7 text-chat-text break-words">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-chat-text">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 text-base leading-7 text-chat-text break-words">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 text-base leading-7 text-chat-text break-words">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  h1: ({ children }) => <h3 className="text-xl font-bold tracking-tight text-chat-text mt-5 mb-1 break-words">{children}</h3>,
  h2: ({ children }) => <h4 className="text-xl font-semibold tracking-tight text-chat-text mt-4 mb-1 break-words">{children}</h4>,
  h3: ({ children }) => <h5 className="text-xl font-semibold tracking-tight text-chat-text mt-4 mb-1 break-words">{children}</h5>,
  hr: () => <hr className="border-t border-divider" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-brand/30 pl-3 text-base leading-7 text-ink-muted italic break-words">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-brand-text underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className || "");
    if (!isBlock) {
      return (
        <code className="rounded bg-surface-inset px-1.5 py-0.5 font-mono text-[13px] text-chat-text break-words">
          {children}
        </code>
      );
    }
    const language = className?.replace("language-", "") || "text";
    return <CodeBlock language={language}>{String(children).replace(/\n$/, "")}</CodeBlock>;
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-xl border border-divider scrollbar-none">
      <table className="w-full min-w-[420px] text-left text-base">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-inset">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
      {children}
    </th>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-divider">{children}</tbody>,
  td: ({ children }) => (
    <td className="px-3 py-2.5 text-chat-text tabular-nums">{children}</td>
  ),
};

export default function MarkdownContent({ markdown }) {
  return (
    <div className="space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
