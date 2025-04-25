import type { Metadata } from 'next';
import { Inter, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { FloatingToolbar } from '@/components/ui/FloatingToolbar';
import { Toaster } from "@/components/ui/toaster";
import { NotificationsProvider, NotificationsPanel } from "@/components/ui/NotificationsPanel"; // Import Notifications

const inter = Inter({ subsets: ['latin'] });

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

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
        <html lang="en">
            <body className={`${inter.className} ${geistSans.variable} ${geistMono.variable} antialiased relative`}>
                <NotificationsProvider>
                    <FloatingToolbar />
                    <NotificationsPanel />
                    <main className="min-h-screen pt-16 px-4">
                      {children}
                    </main>
                    <Toaster />
                </NotificationsProvider>
            </body>
        </html>
    );
}
