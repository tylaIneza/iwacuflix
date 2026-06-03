import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Iwacuflix — Stream Movies & Series',
  description: 'Watch the best movies and series on Iwacuflix, completely free.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#141414] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
