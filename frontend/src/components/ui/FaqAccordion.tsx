import { useEffect, useRef, useState } from 'react';
import type { FaqItem } from '@/types';

interface FaqAccordionProps {
  items: FaqItem[];
  /** Single-open vs multi-open. Defaults to single-open for visual parity. */
  singleOpen?: boolean;
  className?: string;
}

/**
 * FAQ accordion. Default is single-open (closing one item when another opens),
 * matching Website/index.html:890-908 behaviour. Pass singleOpen={false}
 * for an admin-style multi-open (Website/admin.html uses a separate pattern).
 */
export function FaqAccordion({ items, singleOpen = true, className = '' }: FaqAccordionProps) {
  const [singleIdx, setSingleIdx] = useState<number | null>(() => {
    const i = items.findIndex((it) => it.defaultOpen);
    return i >= 0 ? i : null;
  });
  const [multi, setMulti] = useState<Set<number>>(() => {
    const s = new Set<number>();
    items.forEach((it, i) => {
      if (it.defaultOpen) s.add(i);
    });
    return s;
  });

  function toggle(i: number) {
    if (singleOpen) {
      setSingleIdx((s) => (s === i ? null : i));
    } else {
      setMulti((m) => {
        const next = new Set(m);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        return next;
      });
    }
  }

  function isOpen(i: number): boolean {
    return singleOpen ? singleIdx === i : multi.has(i);
  }

  return (
    <div className={`faq-list ${className}`.trim()}>
      {items.map((item, i) => (
        <FaqRow key={i} item={item} open={isOpen(i)} onToggle={() => toggle(i)} />
      ))}
    </div>
  );
}

function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  const aRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = aRef.current;
    if (!el) return;
    if (open) {
      el.style.maxHeight = `${el.scrollHeight}px`;
    } else {
      el.style.maxHeight = '';
    }
  }, [open]);

  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button
        className="faq-q"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>{item.q}</span>
        <span className="plus" aria-hidden />
      </button>
      <div className="faq-a" ref={aRef}>
        <p>{item.a}</p>
      </div>
    </div>
  );
}
