import React from "react";

const renderInlineMarkdown = (content, keyPrefix = "part") =>
  String(content || "")
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      /^\*\*[^*]+\*\*$/.test(part) ? (
        <strong key={`${keyPrefix}-bold-${index}`}>{part.slice(2, -2)}</strong>
      ) : <React.Fragment key={`${keyPrefix}-text-${index}`}>{part}</React.Fragment>
    );

export default function MessageContent({ content }) {
  return String(content || "").split("\n").map((line, index, lines) => {
    const heading = line.match(/^###\s+(.+)$/);
    return (
      <React.Fragment key={`message-line-${index}`}>
        {heading ? (
          <span className="ai_match_maker__markdown-heading">
            {renderInlineMarkdown(heading[1], `heading-${index}`)}
          </span>
        ) : renderInlineMarkdown(line, `line-${index}`)}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
