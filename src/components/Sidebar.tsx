"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

export default function Sidebar({
  title,
  items,
  identity,
  onLogout,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  identity?: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-ink text-white sm:w-56">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-sm font-semibold tracking-wide">{title}</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/owner" &&
              item.href !== "/admin" &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`block rounded px-3 py-2.5 text-sm transition-colors sm:py-2 ${
                active
                  ? "bg-accent text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        {identity && (
          <p className="truncate px-2 pb-2 text-xs text-white/50">
            {identity}
          </p>
        )}
        <form action={onLogout}>
          <button className="w-full rounded px-2 py-1.5 text-left text-xs text-white/50 hover:text-white/80">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
