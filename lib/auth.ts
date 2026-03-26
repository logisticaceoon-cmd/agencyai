import { createServerSupabaseClient } from './supabase-server'
import { prisma } from './prisma'
import { redirect } from 'next/navigation'

export async function getSession() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  })
  return user
}

export async function getCurrentUserWithOrg() {
  const session = await getSession()
  if (!session?.user) return { user: null, org: null, membership: null }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      organizationMembers: {
        where: { status: 'active' },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  })

  if (!user) return { user: null, org: null, membership: null }

  const membership = user.organizationMembers[0] ?? null
  const org = membership?.organization ?? null

  return { user, org, membership }
}

export async function getCurrentOrg() {
  const { org } = await getCurrentUserWithOrg()
  return org
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function requireAuthWithOrg() {
  const { user, org, membership } = await getCurrentUserWithOrg()
  if (!user) redirect('/login')
  if (!org) redirect('/onboarding')
  return { user, org, membership: membership! }
}

export async function requireRole(roles: string[]) {
  const user = await requireAuth()
  if (!roles.includes(user.role)) redirect('/dashboard')
  return user
}

export async function requireOrgRole(roles: string[]) {
  const { user, org, membership } = await requireAuthWithOrg()
  if (!roles.includes(membership.role)) redirect('/dashboard')
  return { user, org, membership }
}
