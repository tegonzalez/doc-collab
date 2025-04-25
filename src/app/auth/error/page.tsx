// Remove 'use client' and dynamic export
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { AlertTriangle, Loader2 } from 'lucide-react';
import AuthErrorMessage from './AuthErrorMessage'; // Import the new component

export default function AuthErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-2 text-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold">Authentication Error</CardTitle>
          <CardDescription className="text-sm text-gray-500">
            We couldn&apos;t authenticate you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center items-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
            <AuthErrorMessage />
          </Suspense>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/">
              Return to Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
