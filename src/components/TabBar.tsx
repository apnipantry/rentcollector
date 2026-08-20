import Link from "next/link";

export interface TabItem {
  href: string;
  label: string;
  count?: number;
}

export default function TabBar({
  items,
  activeHref,
}: {
  items: TabItem[];
  activeHref: string;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav className="flex min-w-max gap-1 border-b border-line">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
                active
                  ? "border-accent font-medium text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {item.label}
              {item.count != null && (
                <span
                  className={`ml-1.5 text-xs ${
                    active ? "text-ink-muted" : "text-ink-muted/80"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
