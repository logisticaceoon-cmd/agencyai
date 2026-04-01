'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAuditRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/audits')
  }, [router])
  return null
}
