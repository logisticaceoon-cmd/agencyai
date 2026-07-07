import { NextResponse } from 'next/server'

// Ruta de migración ya ejecutada — stub permanente
export async function POST() {
  return NextResponse.json({ error: 'Migración ya ejecutada. Endpoint deshabilitado.' }, { status: 410 })
}
