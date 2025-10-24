"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

interface TargetCursorProps {
  targetSelector?: string;
  spinDuration?: number;
  hideDefaultCursor?: boolean;
}

// Lazy load to avoid impacting TTFB - use path alias
const TargetCursor = dynamic(() => import('@/app/components/TargetCursor'), { 
  ssr: false 
}) as React.ComponentType<TargetCursorProps>;

export default function ClientCursorWrapper(): React.ReactElement | null {
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
    
    // Check if device is mobile or tablet
    const checkDevice = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024; // Hide cursor below 1024px (lg breakpoint)
      setIsMobileOrTablet(isTouchDevice || isSmallScreen);
    };
    
    checkDevice();
    
    // Re-check on window resize
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Don't render cursor on mobile/tablet or SSR
  if (!isClient || isMobileOrTablet) {
    return null;
  }

  return <TargetCursor spinDuration={2} hideDefaultCursor={true} />;
}
