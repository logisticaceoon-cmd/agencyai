import { NextResponse } from 'next/server'

// Este endpoint fue eliminado — la migración se ejecuta manualmente en el SQL Editor de Supabase
export async function GET() {
  return NextResponse.json({ error: 'Endpoint eliminado' }, { status: 410 })
}
