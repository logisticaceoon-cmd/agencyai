import { NextResponse } from 'next/server'

// Las tablas de rendimiento se gestionan directamente en Supabase
// Este endpoint de setup ya no es necesario
export async function GET() {
  return NextResponse.json({ message: 'Setup no requerido. Tablas gestionadas en Supabase.' }, { status: 410 })
}
