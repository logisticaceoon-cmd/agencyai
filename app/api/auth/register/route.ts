import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  supabaseId: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, fullName } = schema.parse(body)

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ user: existing })
    }

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        role: 'CEO', // All new registrations are CEOs of their own org
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
