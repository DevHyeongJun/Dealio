import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../api/auth';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (!user) return null;

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  const initials = user.name.slice(0, 1).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-sm text-gray-700 dark:text-gray-200"
      >
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 text-xs font-semibold">
          {initials}
        </span>
        <span className="hidden sm:inline font-medium">{user.name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-30 py-1">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.username}</div>
            {user.email && (
              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</div>
            )}
            <div className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">
              {ROLE_LABELS[user.role]}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
