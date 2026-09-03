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
  return <div className="ai_match_maker__formatted-response">{blocks.map((block, bi) => block.type === "code" ? <CodeBlock key={bi} language={block.language} code={block.code} /> : <div className="ai_match_maker__markdown-block" key={bi}>{renderTextBlock(block.lines)}</div>)}</div>;
}

const tableRow = (line) => line.trim().startsWith("|") || (line.includes("|") && line.split("|").length > 2);
const tableSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
const tableCells = (line) => line.trim().replace(/^\|\s*|\s*\|$/g, "").split("|").map((cell) => cell.trim());

function renderTextBlock(lines) {
  const output = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (tableRow(lines[i]) && tableSeparator(lines[i + 1] || "")) {
      const rows = [tableCells(lines[i])];
      i += 2;
      while (i < lines.length && tableRow(lines[i]) && !tableSeparator(lines[i])) rows.push(tableCells(lines[i++]));
      output.push(<div className="ai_match_maker__table-wrap" key={`table-${i}`}><table><thead><tr>{rows[0].map((cell, j) => <th key={j}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, j) => <tr key={j}>{rows[0].map((_, k) => <td key={k}>{inline(row[k] || "")}</td>)}</tr>)}</tbody></table></div>);
      if (i < lines.length) output.push(<br key={`table-break-${i}`} />);
      i -= 1;
      continue;
    }
    const heading = lines[i].match(/^#{1,6}\s+(.+)$/);
    const bullet = lines[i].match(/^\s*[-*+]\s+(.+)$/);
    const numbered = lines[i].match(/^\s*\d+[.)]\s+(.+)$/);
    const quote = lines[i].match(/^\s*>\s?(.*)$/);
    const node = heading ? <h3 key={i}>{inline(heading[1])}</h3> : bullet ? <div className="ai_match_maker__markdown-bullet" key={i}>{inline(bullet[1])}</div> : numbered ? <div className="ai_match_maker__markdown-numbered" key={i}>{inline(numbered[1])}</div> : quote ? <blockquote key={i}>{inline(quote[1])}</blockquote> : <React.Fragment key={i}>{inline(lines[i])}{i < lines.length - 1 && <br />}</React.Fragment>;
    output.push(node);
  }
  return output;
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard?.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  return <div className="ai_match_maker__code-block"><div className="ai_match_maker__code-toolbar"><span>{language || "CODE"}</span><button type="button" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}</button></div><pre><code>{code}</code></pre></div>;
}
