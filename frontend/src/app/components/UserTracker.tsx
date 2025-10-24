'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

export default function UserTracker() {
  const { user, isSignedIn, isLoaded } = useUser();
  const hasAttemptedSave = useRef(false);

  useEffect(() => {
    const saveUserOnLogin = async () => {
      // Wait for Clerk to load and confirm user is signed in
      if (!isLoaded || !isSignedIn || !user) return;
      
      // Prevent multiple save attempts for the same user session
      if (hasAttemptedSave.current) return;
      hasAttemptedSave.current = true;
      
      try {
        const userEmail = user.primaryEmailAddress?.emailAddress;
        const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        
        if (userEmail) {
          console.log('USER LOGGED IN - SAVING PROFILE:', { 
            userId: user.id, 
            email: userEmail, 
            name: userName 
          });
          
          const response = await fetch('/api/user/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              email: userEmail,
              name: userName || 'Unknown User'
            })
          });
          
          if (!response.ok) {
            console.error('Failed to save user profile - HTTP Error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Response body:', errorText);
            hasAttemptedSave.current = false; // Allow retry on next login
            return;
          }
          
          const result = await response.json();
          
          if (result.success) {
            console.log('LOGIN USER PROFILE SAVED TO DATABASE:', {
              userId: user.id,
              email: userEmail,
              name: userName,
              isNewUser: result.upserted > 0 ? 'YES' : 'NO'
            });
          } else {
            console.error('Failed to save login user profile:', {
              error: result.error || 'Unknown error',
              details: result,
              hint: result.hint || 'Check database connection'
            });
            hasAttemptedSave.current = false; // Allow retry on next login
          }
        } else {
          console.warn('User logged in but no email found:', user);
        }
      } catch (error) {
        console.error('Error saving user profile on login:', error);
        hasAttemptedSave.current = false; // Allow retry on next login
      }
    };
    
    // Save user data whenever they login
    saveUserOnLogin();
  }, [isLoaded, isSignedIn, user?.id]); // Trigger when login state changes

  // This component doesn't render anything
  return null;
}