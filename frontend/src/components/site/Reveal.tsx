import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

/**
 * Wraps content and fades it in once ~15% visible, then stops observing.
 * Matches the IntersectionObserver pattern duplicated in every /Website/*.html
 * (e.g. Website/index.html:882-886, tours.html:822-826, etc.).
 */
export function Reveal({ children, as: Tag = 'div', className = '' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLElement>}
      className={['reveal', shown ? 'in' : '', className].filter(Boolean).join(' ')}
    >
      {children}
    </Tag>
  );
}
