"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash")
    const type = (searchParams.get("type") || "signup") as "signup" | "recovery" | "invite" | "magiclink"
    const next = searchParams.get("next") || "/dashboard"

    if (!tokenHash) {
      setStatus("error")
      setMessage("Link inválido o expirado.")
      return
    }

    const supabase = createClient()
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then((result: { error: { message: string } | null }) => {
      if (result.error) {
        setStatus("error")
        setMessage("El link expiró o ya fue usado. Solicitá uno nuevo.")
      } else {
        setStatus("success")
        setMessage("¡Cuenta confirmada! Redirigiendo...")
        setTimeout(() => router.push(next), 1500)
      }
    })
  }, [router, searchParams])

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", maxWidth: "400px", width: "100%" }}>
        <h1 style={{ color: "#2563eb", fontSize: "28px", marginBottom: "16px" }}>⚡ AgencyAI</h1>
        {status === "loading" && (
          <>
            <div style={{ width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "#64748b" }}>Verificando tu cuenta...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
            <h2 style={{ color: "#16a34a", marginBottom: "8px" }}>¡Listo!</h2>
            <p style={{ color: "#64748b" }}>{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
            <h2 style={{ color: "#dc2626", marginBottom: "8px" }}>Error</h2>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>{message}</p>
            <a href="/login" style={{ background: "#2563eb", color: "white", padding: "10px 24px", borderRadius: "8px", textDecoration: "none", fontSize: "14px" }}>Volver al login</a>
          </>
        )}
      </div>
      <style>{"@keyframes spin { to { transform: rotate(360deg) } }"}</style>
    </div>
  )
}
