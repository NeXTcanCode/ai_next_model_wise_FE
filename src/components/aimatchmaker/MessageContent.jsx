import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

const inline = (value) => String(value || "").split(/(`[^`]+`|\*\*[^*]+\*\*|(?<!\*)\*[^*]+\*(?!\*))/g).map((part, i) => part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : /^\*\*.+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : /^\*.+\*$/.test(part) ? <em key={i}>{part.slice(1, -1)}</em> : <React.Fragment key={i}>{part}</React.Fragment>);

export default function MessageContent({ content }) {
  const source = typeof content === "string" ? content : JSON.stringify(content, null, 2) || "";
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let text = [];
  let i = 0;
  const flush = () => { if (text.length) { blocks.push({ type: "text", lines: text }); text = []; } };
  while (i < lines.length) {
    const fence = lines[i].match(/^\s*```\s*([\w+#.-]*)\s*$/);
    if (fence) { flush(); i++; const code = []; while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]); if (i < lines.length) i++; blocks.push({ type: "code", language: fence[1], code: code.join("\n") }); }
    else if (!lines[i].trim()) { flush(); i++; } else text.push(lines[i++]);
  }
  flush();
  return <div className="ai_match_maker__formatted-response">{blocks.map((block, bi) => block.type === "code" ? <CodeBlock key={bi} language={block.language} code={block.code} /> : <div className="ai_match_maker__markdown-block" key={bi}>{block.lines.map((line, li) => { const heading = line.match(/^#{1,6}\s+(.+)$/); const bullet = line.match(/^\s*[-*+]\s+(.+)$/); const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/); const quote = line.match(/^\s*>\s?(.*)$/); const node = heading ? <h3>{inline(heading[1])}</h3> : bullet ? <div className="ai_match_maker__markdown-bullet">{inline(bullet[1])}</div> : numbered ? <div className="ai_match_maker__markdown-numbered">{inline(numbered[1])}</div> : quote ? <blockquote>{inline(quote[1])}</blockquote> : inline(line); return <React.Fragment key={li}>{node}{li < block.lines.length - 1 && <br />}</React.Fragment>; })}</div>)}</div>;
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard?.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  return <div className="ai_match_maker__code-block"><div className="ai_match_maker__code-toolbar"><span>{language || "CODE"}</span><button type="button" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}</button></div><pre><code>{code}</code></pre></div>;
}
