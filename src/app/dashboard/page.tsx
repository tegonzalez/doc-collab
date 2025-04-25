// Remove 'use client';
import { Suspense } from 'react';
import { ProjectExplorer } from '@/components/ProjectExplorer'; // Adjusted path
import DashboardClientContent from './DashboardClientContent';
import { Loader2 } from 'lucide-react'; // Import Loader

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={<div className="mb-6 h-16 flex justify-center items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
        <DashboardClientContent />
      </Suspense>

      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">My Projects</h2>
          <p className="text-gray-600">Your recent projects will appear here.</p>
          {/* Placeholder for project list/creation */}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Activity</h2>
          <p className="text-gray-600">Your recent activity will appear here.</p>
          {/* Placeholder for activity feed */}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-2">Settings</h2>
          <p className="text-gray-600">Manage your profile and application settings.</p>
          {/* Link or placeholder for settings */}
        </div>
      </div>

      {/* ProjectExplorer might need its own suspense if it fetches data */}
      <ProjectExplorer />
    </div>
  );
}
