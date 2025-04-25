'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ProjectExplorer } from '../../components/ProjectExplorer';
import { useNotifications } from '@/components/ui/NotificationsPanel';

// In a real implementation, you would fetch the user's display name 
// from an API route based on the userId in the session.
// For now, we're hardcoding the display name for the admin user.
const USER_DISPLAY_NAME = 'Admin';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const showWelcome = searchParams.get('welcome') === 'true';
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(showWelcome);
  const { addNotification } = useNotifications();
  
  useEffect(() => {
    if (showWelcome) {
      // Hide welcome message after 10 seconds
      const timer = setTimeout(() => {
        setIsWelcomeVisible(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // Show welcome notification on initial render
  useEffect(() => {
    // Check for URL parameter that indicates a fresh login
    const params = new URLSearchParams(window.location.search);
    const justLoggedIn = params.get('welcome') === 'true';
    
    if (justLoggedIn) {
      // Show welcome notification after a short delay to ensure UI is ready
      setTimeout(() => {
        addNotification({
          title: `Welcome, ${USER_DISPLAY_NAME}!`,
          details: 'You have successfully logged in. Your session will expire in 3 days.',
          type: 'info'
        });
      }, 500);
      
      // Clean up URL parameters after processing
      const newUrl = window.location.pathname; // Remove query parameters
      window.history.replaceState({}, '', newUrl);
    }
  }, [addNotification]);

  return (
    <div className="container mx-auto p-6">
      {isWelcomeVisible && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Welcome!</AlertTitle>
          <AlertDescription className="text-green-700">
            You have been successfully authenticated. You can now use the application.
          </AlertDescription>
        </Alert>
      )}
      
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">My Projects</h2>
          <p className="text-gray-600">Your recent projects will appear here.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Activity</h2>
          <p className="text-gray-600">Your recent activity will appear here.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Settings</h2>
          <p className="text-gray-600">Manage your profile and application settings.</p>
        </div>
      </div>
      
      <ProjectExplorer />
    </div>
  );
}
