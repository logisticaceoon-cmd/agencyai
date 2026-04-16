import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center px-6">
        <p className="text-6xl font-bold text-slate-200">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Pagina no encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">
          La pagina que buscas no existe o fue movida.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Ir al inicio
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
