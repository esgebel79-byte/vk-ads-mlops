import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { cn } from "@/shared/lib/cn";

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <Header
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
      />

      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r border-surface-border bg-white lg:block">
          <Sidebar />
        </aside>

        {menuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40"
              aria-label="Close overlay"
              onClick={() => setMenuOpen(false)}
            />
            <aside
              className={cn(
                "absolute left-0 top-14 h-[calc(100%-3.5rem)] w-64 border-r border-surface-border bg-white shadow-lg",
              )}
            >
              <Sidebar mobile onNavigate={() => setMenuOpen(false)} />
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
