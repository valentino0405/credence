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

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <TargetCursor spinDuration={2} hideDefaultCursor={true} />;
}
