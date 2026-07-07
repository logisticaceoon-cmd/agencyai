import { NextResponse } from 'next/server'
import { validateApiKey, isApiAuthError } from '@/lib/api-auth'
import nodemailer from 'nodemailer'

// Gmail SMTP transporter
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || '',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

const FROM_ADDRESS = process.env.EMAIL_FROM || 'AgencyAI <noreply@agencyai.app>'

export async function POST(request: Request) {
  try {
    // Auth via API key
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

    const toList: string[] = Array.isArray(to) ? to : [to]
    const ccList: string[] = cc ? (Array.isArray(cc) ? cc : [cc]) : []
    const bccList: string[] = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []

    const transporter = getTransporter()

    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: toList.join(', '),
      cc: ccList.length > 0 ? ccList.join(', ') : undefined,
      bcc: bccList.length > 0 ? bccList.join(', ') : undefined,
      subject,
      html: html || undefined,
      text: text || undefined,
    })

    return NextResponse.json({
      success: true,
      id: info.messageId,
      message: `Email enviado a ${toList.join(', ')}`,
    })
  } catch (err: any) {
    console.error('Error in POST /api/cowork/send-email:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
