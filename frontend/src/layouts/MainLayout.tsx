import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import UserMenu from '../components/UserMenu';
import PageTabs from '../components/PageTabs';
import { useAccessLogger } from '../hooks/useAccessLogger';

export default function MainLayout() {
  const [open, setOpen] = useState(false);
  useAccessLogger();

  return (
    <div className="min-h-screen flex">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 h-14">
          <button
            type="button"
            aria-label="메뉴 열기"
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
            onClick={() => setOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <PageTabs />
          </div>
          <div className="ml-auto shrink-0">
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
