import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

const renderInlineMarkdown = (content, keyPrefix = "part") =>
  String(content || "")
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      part.startsWith("`") && part.endsWith("`") ? <code key={`${keyPrefix}-code-${index}`}>{part.slice(1, -1)}</code> : /^\*\*[^*]+\*\*$/.test(part) ? (
        <strong key={`${keyPrefix}-bold-${index}`}>{part.slice(2, -2)}</strong>
      ) : <React.Fragment key={`${keyPrefix}-text-${index}`}>{part}</React.Fragment>
    );

export default function MessageContent({ content }) {
  const lines = String(content || "").split("\n");
  const blocks = [];
  let paragraph = [];
  let index = 0;
  const flush = () => { if (paragraph.length) { blocks.push({ type: "text", lines: paragraph }); paragraph = []; } };
  while (index < lines.length) {
    const fence = lines[index].match(/^\s*```\s*([\w+#.-]*)\s*$/);
    if (fence) {
      flush(); index += 1; const code = [];
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language: fence[1], code: code.join("\n") });
    } else if (!lines[index].trim()) { flush(); index += 1; } else paragraph.push(lines[index++]);
  }
  flush();
  return <div className="ai_match_maker__formatted-response">{blocks.map((block, blockIndex) => block.type === "code" ? <CodeBlock key={blockIndex} language={block.language} code={block.code} /> : <div className="ai_match_maker__markdown-block" key={blockIndex}>{block.lines.map((line, lineIndex) => { const heading = line.match(/^#{1,3}\s+(.+)$/); const bullet = line.match(/^\s*[-*]\s+(.+)$/); return <React.Fragment key={lineIndex}>{heading ? <h3>{renderInlineMarkdown(heading[1])}</h3> : bullet ? <div className="ai_match_maker__markdown-bullet">{renderInlineMarkdown(bullet[1])}</div> : renderInlineMarkdown(line)}{lineIndex < block.lines.length - 1 && <br />}</React.Fragment>; })}</div>)}</div>;
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard?.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  return <div className="ai_match_maker__code-block"><div className="ai_match_maker__code-toolbar"><span>{language || "CODE"}</span><button type="button" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}</button></div><pre><code>{code}</code></pre></div>;
}
