'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

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

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Navigation items for center navigation
  const navItems: NavItem[] = [
    { href: "/home", label: "Home" },
    { href: "/market", label: "Market" },
    { href: "/prediction", label: "Predictions" },
    { href: "/news", label: "News" },
    { href: "/dashboard", label: "Dashboard" }
  ];
  
  return (
    <nav className="fixed top-0 inset-x-0 z-40 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black via-black/90 to-transparent border-b border-white/15">
      {/* Left side - Credence branding with logo */}
      <Link href="/" className="cursor-target flex items-center gap-3 text-white font-semibold text-lg hover:text-gray-300 transition">
        <Image 
          src="/clogo-modified.png" 
          alt="Credence Logo" 
          width={32} 
          height={32} 
          className="rounded-full object-cover"
        />
        <span>Credence: AI in Finance</span>
      </Link>

      {/* Centered Navigation with Logo (only show when authenticated and client-side) */}
      {isLoaded && isSignedIn && user && isClient && (
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto hidden md:flex">
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
      <div className="flex items-center gap-6 text-sm">
        {!isLoaded ? (
          <div className="text-gray-400 text-xs">Loading...</div>
        ) : isSignedIn && userId ? (
          <>
            <Link href="/dashboard" className="cursor-target text-white hover:text-gray-300 transition">
              Dashboard
            </Link>
            <Link href="/stocks/AAPL" className="cursor-target text-white hover:text-gray-300 transition">
              Stocks
            </Link>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
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
            <Link href="/sign-up" className="cursor-target px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
