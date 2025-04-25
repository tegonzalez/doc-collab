// import Image from 'next/image'; // Removed unused import
import Link from 'next/link';

export default function SplashPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-50 to-stone-100 text-center">
      <h1 className="text-5xl font-bold text-slate-800 mb-4">
        Welcome to Doc Collab
      </h1>
      <p className="text-xl text-slate-600 mb-8 max-w-2xl">
        A collaborative platform for technical documentation leveraging Git for version control and Pandoc for flexible document processing.
        Streamline your workflow, manage complex projects, and share securely.
      </p>
      
      {/* Optional: Add an image/logo */}
      {/* 
      <div className="mb-8">
        <Image 
          src="/placeholder-logo.svg" // Replace with your actual logo path
          alt="Doc Collab Logo" 
          width={150} 
          height={150} 
          priority // Load logo quickly
        />
      </div>
      */}

      <div className="flex flex-col gap-4 items-center">
        <Link 
          href="/dashboard" 
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition duration-200 ease-in-out"
        >
          Go to Dashboard
        </Link>
        
        <p className="text-sm text-slate-500">
          (You&apos;ll be redirected back here if not authenticated)
        </p>
      </div>
      
      <p className="mt-12 text-sm text-slate-500">
        First time? We don&apos;t store usernames or passwords. Use the command line tool to generate an admin login link.
      </p>
    </div>
  );
} 
