import type { ReactElement } from 'react';
import { parseMarkdown, type MdInline, type MdNode } from './markdown.js';

/**
 * JSX renderer for the AST produced by parseMarkdown(). Kept in
 * its own .tsx file so markdown.ts stays plain .ts (no JSX).
 */

function renderInline(inline: MdInline): ReactElement {
  switch (inline.kind) {
    case 'text':
      return <>{inline.value}</>;
    case 'bold':
      return (
        <strong>
          {inline.inlines.map((c, i) => (
            <span key={i}>{renderInline(c)}</span>
          ))}
        </strong>
      );
    case 'italic':
      return (
        <em>
          {inline.inlines.map((c, i) => (
            <span key={i}>{renderInline(c)}</span>
          ))}
        </em>
      );
  }
}

function renderNode(node: MdNode): ReactElement {
  switch (node.kind) {
    case 'h': {
      const Tag = `h${node.level}` as 'h1' | 'h2' | 'h3';
      return <Tag>{node.text}</Tag>;
    }
    case 'p':
      return (
        <p>
          {node.inlines.map((c, i) => (
            <span key={i}>{renderInline(c)}</span>
          ))}
        </p>
      );
  }
}

export function renderMarkdown(src: string): ReactElement {
  const nodes = parseMarkdown(src);
  return (
    <>
      {nodes.map((n, i) => (
        <span key={i}>{renderNode(n)}</span>
      ))}
    </>
  );
}