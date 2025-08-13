'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface QuickFiltersProps {
  currentAction?: string;
}

export default function QuickFilters({ currentAction }: QuickFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleQuickFilter = (action: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (action === currentAction) {
      // If clicking the same filter, remove it
      params.delete('action');
    } else {
      // Set the new action filter
      params.set('action', action);
    }
    
    // Navigate to the filtered view
    router.push(`/admin/audit?${params.toString()}`);
  };

  return (
    <div className="flex space-x-2">
      <button
        type="button"
        onClick={() => handleQuickFilter('register')}
        className={`px-3 py-1 text-xs rounded-full transition-colors ${
          currentAction === 'register'
            ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
            : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
        }`}
      >
        Registration
      </button>
      <button
        type="button"
        onClick={() => handleQuickFilter('login')}
        className={`px-3 py-1 text-xs rounded-full transition-colors ${
          currentAction === 'login'
            ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
            : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
        }`}
      >
        Login
      </button>
      <button
        type="button"
        onClick={() => handleQuickFilter('diag')}
        className={`px-3 py-1 text-xs rounded-full transition-colors ${
          currentAction === 'diag'
            ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
            : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800'
        }`}
      >
        Diagnostic
      </button>
    </div>
  );
}
