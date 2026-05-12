import { useEffect, useState } from 'react';

export interface TocItem {
  id: string;
  title: string;
}

interface SettingsTocProps {
  items: TocItem[];
}

export default function SettingsToc({ items }: SettingsTocProps) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (!items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('id');
          if (id) setActiveId(id);
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 },
    );
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  return (
    <nav className="sticky top-20 self-start" aria-label="환경설정 섹션 목록">
      <ul className="border-l border-gray-200 dark:border-slate-800">
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={[
                  'block py-1.5 pl-4 -ml-px text-sm transition-colors border-l',
                  active
                    ? 'text-gray-900 dark:text-gray-100 border-gray-900 dark:border-gray-100 font-medium'
                    : 'text-gray-500 dark:text-gray-500 border-transparent hover:text-gray-900 dark:hover:text-gray-200',
                ].join(' ')}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
