import type { Metadata } from 'next';
import { Bebas_Neue, Raleway } from 'next/font/google';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Notestamp — Stamp Your Knowledge',
  description: 'AI-powered personalized learning. Import anything, master it with AI, earn on-chain credentials. Join the waitlist.',
  openGraph: {
    title: 'Notestamp — Stamp Your Knowledge',
    description: 'AI-powered personalized learning. Import anything, master it with AI, earn on-chain credentials.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${raleway.variable}`}>
      <body className="bg-[#030303] text-white overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
