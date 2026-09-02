import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Luma Staff Portal eCrew',
  description: 'Official Roblox Aviation Staff Management Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#f0f3ff] text-slate-800">
        {children}
      </body>
    </html>
  );
}
