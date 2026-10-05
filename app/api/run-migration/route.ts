import { NextResponse } from "next/server"

export async function POST() {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: "ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_url TEXT NULL" }),
    })

    const text = await res.text()
    
    if (!res.ok) {
      const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: "ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_url TEXT NULL" }),
      })
      const text2 = await res2.text()
      if (!res2.ok) {
        return NextResponse.json({ error: `exec_sql: ${text} | pg/query: ${text2}` }, { status: 500 })
      }
      return NextResponse.json({ success: true, method: "pg/query", result: text2 })
    }

    return NextResponse.json({ success: true, method: "exec_sql", result: text })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
