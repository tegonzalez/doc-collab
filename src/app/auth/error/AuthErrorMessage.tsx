'use client';

import { useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function AuthErrorMessage() {
  const searchParams = useSearchParams();
  // Use optional chaining to handle potentially null searchParams
  const errorMessage = searchParams?.get('message') || 'An unknown authentication error occurred.';

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
      <div className="flex items-center space-x-2">
         <AlertTriangle className="h-4 w-4 text-red-600" />
         <span>{errorMessage}</span>
      </div>
    </div>
  );
}
