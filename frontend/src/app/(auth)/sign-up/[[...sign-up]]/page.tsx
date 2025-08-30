import React from 'react';
import { SignUp } from '@clerk/nextjs'

export default function Page(): React.ReactElement {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  )
}
