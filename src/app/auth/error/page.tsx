'use client';

import React, { Suspense } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Error content component that uses useSearchParams
function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message') || 'An unknown authentication error occurred';
  const decodedMessage = decodeURIComponent(errorMessage);

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Authentication Error</CardTitle>
          <CardDescription>
            There was a problem with authentication
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {decodedMessage}
            </AlertDescription>
          </Alert>
          
          <p className="text-sm text-muted-foreground mt-4">
            This could be due to an expired link, invalid token, or server configuration issue.
            Please try again or contact the administrator if the problem persists.
          </p>
        </CardContent>
        
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/">
              Return to Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Auth error page that displays error messages
export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="container flex items-center justify-center min-h-screen py-12">
        <div>Loading error information...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
} 