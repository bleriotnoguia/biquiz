'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/config/supabase'

const RedirectLoggedInToDashboard = () => {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/admin')
    })
  }, [router])

  return null
}

export default RedirectLoggedInToDashboard
