import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// FROM address — usa dominio verificado en Resend si está disponible, si no usa onboarding@resend.dev
const FROM_ADDRESS = process.env.EMAIL_FROM || 'Ceonyx · Logística CEOON <onboarding@resend.dev>'

export async function POST(request: Request) {
  try {
    // Auth via API key (misma que usa el resto del cowork API)
    const auth = await validateApiKey(request)
    if (isApiAuthError(auth)) return auth

    const body = await request.json()
    const { to, cc, bcc, subject, html, text } = body

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Se requieren los campos: to, subject' },
        { status: 400 }
      )
    }

    // Normalizar destinatarios a array
    const toList: string[] = Array.isArray(to) ? to : [to]
    const ccList: string[] = cc ? (Array.isArray(cc) ? cc : [cc]) : []
    const bccList: string[] = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      bcc: bccList.length > 0 ? bccList : undefined,
      subject,
      html: html || undefined,
      text: text || undefined,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: data?.id,
      message: `Email enviado a ${toList.join(', ')}`,
    })
  } catch (err) {
    console.error('Error in POST /api/cowork/send-email:', err)
    return NextResponse.json({ error: 'Error interno al enviar email' }, { status: 500 })
  }
}
