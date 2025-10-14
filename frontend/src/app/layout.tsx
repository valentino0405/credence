import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FullNavbar from "@/app/components/FullNavbar";
import Footer from "@/app/components/Footer";
import ClientCursorWrapper from "@/app/client-cursor-wrapper";
import { ClerkProvider } from '@clerk/nextjs';
import UserTracker from '@/app/components/UserTracker';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Credence: AI in Finance",
  description: "Next-Generation Algorithmic Trading Platform",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`relative min-h-screen flex flex-col ${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ClientCursorWrapper />
          <UserTracker />
          <FullNavbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
