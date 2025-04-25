import type { Metadata } from 'next';
// Comment out next/font imports
// import { Inter, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { FloatingToolbar } from '@/components/ui/FloatingToolbar';
import { Toaster } from "@/components/ui/toaster";
import { NotificationsProvider, NotificationsPanel } from "@/components/ui/NotificationsPanel"; // Import Notifications
import { ThemeProvider } from "@/components/ThemeProvider"; // Import the provider
// Initialize critical app components
import '@/lib/init';

// Comment out font initializations
// const inter = Inter({ subsets: ['latin'] });
// 
// const geistSans = Geist({
//     variable: '--font-geist-sans',
//     subsets: ['latin'],
// });
// 
// const geistMono = Geist_Mono({
//     variable: '--font-geist-mono',
//     subsets: ['latin'],
// });

export const metadata: Metadata = {
    title: 'CollabFlow',
    description: 'Document Collaboration Platform',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`antialiased relative`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <NotificationsProvider>
                        <FloatingToolbar />
                        <NotificationsPanel />
                        <main className="min-h-screen pt-16 px-4">
                            {children}
                        </main>
                        <Toaster />
                    </NotificationsProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
