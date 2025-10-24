'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface NavItem {
  href: string;
  label: string;
}

interface PillNavProps {
  items?: NavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  initialLoadAnimation?: boolean;
}

// Dynamically import PillNav to avoid SSR issues with GSAP
const PillNav = dynamic(() => import('@/app/components/PillNav'), { 
  ssr: false,
  loading: () => (
    // Simple fallback while PillNav loads
    <div className="flex gap-1 ml-2">
      <div className="px-3 py-1 rounded-full text-white text-xs font-semibold uppercase tracking-wide">Loading...</div>
    </div>
  )
}) as React.ComponentType<PillNavProps>;

export default function FullNavbar(): React.ReactElement {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user } = useUser();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Navigation items for center navigation
  const navItems: NavItem[] = [
    { href: "/home", label: "Home" },
    { href: "/market", label: "Market" },
    { href: "/prediction", label: "Predictions" },
    { href: "/news", label: "News" },
    { href: "/chatbot", label: "AI Chat" },
    { href: "/dashboard", label: "Dashboard" }
  ];
  
  return (
    <>
    <nav className="fixed top-0 inset-x-0 z-40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-gradient-to-b from-black via-black/90 to-transparent border-b border-white/15">
      {/* Left side - Credence branding with logo */}
      <Link href="/" className="cursor-target flex items-center gap-2 sm:gap-3 text-white font-semibold text-sm sm:text-lg hover:text-gray-300 transition">
        <Image 
          src="/clogo-modified.png" 
          alt="Credence Logo" 
          width={28} 
          height={28} 
          className="rounded-full object-cover sm:w-8 sm:h-8"
        />
        <span className="hidden sm:inline">Credence: AI in Finance</span>
        <span className="sm:hidden">Credence</span>
      </Link>

      {/* Centered Navigation with Logo (only show when authenticated and client-side) */}
      {isLoaded && isSignedIn && user && isClient && (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto hidden lg:flex">
          <div className="rounded-full border-2 border-white/90 py-2 px-3 bg-transparent flex items-center justify-center backdrop-blur-sm">
            <Image 
              src={user.imageUrl || "/clogo-modified.png"} 
              alt={`${user.firstName || 'User'}'s Profile`} 
              width={30} 
              height={30} 
              className="mr-3 rounded-full object-cover border border-white/20" 
            />
            {/* Animated navigation pills with GSAP */}
            <PillNav
              items={navItems}
              baseColor="#ffffff"
              pillColor="rgba(255, 255, 255, 0.1)"
              pillTextColor="#ffffff"
              hoveredPillTextColor="#000000"
              className="flex gap-1"
              ease="power3.easeOut"
              initialLoadAnimation={true}
            />
          </div>
        </div>
      )}
      
      {/* Right side - Authentication & User controls */}
      <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm">
        {!isLoaded ? (
          <div className="text-gray-400 text-xs">Loading...</div>
        ) : isSignedIn && userId ? (
          <>
            <Link href="/dashboard" className="cursor-target text-white hover:text-gray-300 transition hidden sm:inline">
              Dashboard
            </Link>
            <Link href="/stocks/AAPL" className="cursor-target text-white hover:text-gray-300 transition hidden md:inline">
              Stocks
            </Link>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7 sm:w-8 sm:h-8",
                  userButtonPopoverCard: "bg-black/90 border border-white/20",
                  userButtonPopoverActionButton: "text-white hover:bg-white/10",
                  userButtonPopoverActionButtonText: "text-white",
                  userButtonPopoverFooter: "hidden"
                }
              }}
            />
          </>
        ) : (
          <>
            <Link href="/sign-in" className="cursor-target text-white hover:text-gray-300 transition">
              Sign In
            </Link>
            <Link href="/sign-up" className="cursor-target px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition text-xs sm:text-sm">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>

    {/* Mobile Menu */}
    {isMobileMenuOpen && isSignedIn && (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        <div className="fixed top-0 right-0 bottom-0 w-64 bg-gradient-to-b from-gray-900 to-black border-l border-white/20 p-6 overflow-y-auto">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          
          <div className="mt-12 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-3 text-white hover:bg-white/10 rounded-lg transition cursor-target"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/stocks/AAPL"
              className="block px-4 py-3 text-white hover:bg-white/10 rounded-lg transition cursor-target"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Stocks
            </Link>
          </div>
        </div>
      </div>
    )}
    
    {/* Mobile Menu Button */}
    {isSignedIn && (
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed bottom-6 right-6 z-40 lg:hidden bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-2xl hover:from-purple-700 hover:to-blue-700 transition cursor-target"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>
    )}
    </>
  );
}
