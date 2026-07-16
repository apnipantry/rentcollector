"use client";

import { useState } from "react";
import Sidebar, { type NavItem } from "./Sidebar";

export default function AppShell({
  title,
  items,
  identity,
  onLogout,
  children,
}: {
  title: string;
  items: NavItem[];
  identity?: string;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-ink px-4 py-3 text-white sm:hidden">
        <p className="text-sm font-semibold tracking-wide">{title}</p>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded p-1.5 hover:bg-white/10"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0">
            <Sidebar
              title={title}
              items={items}
              identity={identity}
              onLogout={onLogout}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop persistent sidebar */}
      <div className="hidden sm:block">
        <Sidebar
          title={title}
          items={items}
          identity={identity}
          onLogout={onLogout}
        />
      </div>

      <main className="min-h-screen flex-1 bg-paper">{children}</main>
    </div>
  );
}
