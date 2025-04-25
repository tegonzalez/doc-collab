'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useNotifications } from '@/components/ui/NotificationsPanel';
import FileUpload from '@/components/FileUpload'; // Import the FileUpload component

// This name might need adjusting if fetched later
const USER_DISPLAY_NAME = 'Admin';
// Placeholder Project ID - Replace with actual project context later
const CURRENT_PROJECT_ID = 'project-123';

export default function DashboardClientContent() {
  const searchParams = useSearchParams();
  // Use optional chaining to handle potentially null searchParams
  const showWelcome = searchParams?.get('welcome') === 'true';
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(showWelcome);
  const { addNotification } = useNotifications();

  // Effect for the welcome banner visibility timer
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        setIsWelcomeVisible(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // Effect for the welcome notification and URL cleanup
  useEffect(() => {
    if (showWelcome) {
      // Show notification
      const notificationTimer = setTimeout(() => {
        addNotification({
          title: `Welcome, ${USER_DISPLAY_NAME}!`,
          details: 'You have successfully logged in. Your session will expire in 3 days.',
          type: 'info'
        });
      }, 500);

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Cleanup timer on unmount
      return () => clearTimeout(notificationTimer);
    }
  }, [showWelcome, addNotification]); // Add addNotification dependency

  return (
    <>
      {isWelcomeVisible && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Welcome!</AlertTitle>
          <AlertDescription className="text-green-700">
            You have been successfully authenticated. You can now use the application.
          </AlertDescription>
        </Alert>
      )}
      
      {/* --- File Upload Section --- */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
        <FileUpload 
          projectId={CURRENT_PROJECT_ID} 
          // Optionally pass targetFolderPath here if needed, e.g.:
          // targetFolderPath="uploads/images"
        />
      </div>

      {/* Other client-side dashboard elements could go here if needed */}
    </>
  );
}
