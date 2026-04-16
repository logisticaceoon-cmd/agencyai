import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      service: 'AgencyAI Cowork API',
    },
    timestamp: new Date().toISOString(),
  })
}
