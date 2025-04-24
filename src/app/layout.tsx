import type { Metadata } from 'next';
import { Inter, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { FloatingToolbar } from '@/components/ui/FloatingToolbar'; // Import the new toolbar
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is here if not already

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
            <body className={`${inter.className} ${geistSans.variable} ${geistMono.variable} antialiased relative`}> {/* Added relative positioning */}
                <FloatingToolbar /> {/* Add the toolbar */}
                <main className="min-h-screen">{children}</main> {/* Wrap children in main */}
                <Toaster /> {/* Keep toaster */}
            </body>
        </html>
    );
}
