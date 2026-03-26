import { redirect } from 'next/navigation'

// The landing page "/" is in app/page.tsx.
// Authenticated users are redirected to /dashboard by middleware.
// This file handles the (dashboard) layout group fallback for "/".
export default function RootRedirect() {
  redirect('/dashboard')
}
