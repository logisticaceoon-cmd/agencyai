import Link from 'next/link'
import { Zap } from 'lucide-react'

const footerLinks = {
  Producto: [
    { label: 'Funciones', href: '#features' },
    { label: 'Precios', href: '#pricing' },
    { label: 'Testimonios', href: '#testimonios' },
    { label: 'Documentación', href: '/documentation' },
  ],
  Recursos: [
    { label: 'API Docs', href: '/documentation' },
    { label: 'Guía de inicio', href: '/register' },
    { label: 'Changelog', href: '#' },
    { label: 'Status', href: '#' },
  ],
  Legal: [
    { label: 'Privacidad', href: '#' },
    { label: 'Términos', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-[#060606]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer */}
        <div className="py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">AgencyAI</span>
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-[200px]">
              El sistema operativo para agencias de marketing digital.
            </p>
            <div className="mt-4">
              <a
                href="mailto:soporte@agencyai.app"
                className="text-sm text-zinc-500 hover:text-indigo-400 transition-colors"
              >
                soporte@agencyai.app
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-500 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-zinc-800/50 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} AgencyAI. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs">LinkedIn</a>
            <a href="#" className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs">Twitter</a>
            <a href="#" className="text-zinc-600 hover:text-zinc-400 transition-colors text-xs">Instagram</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
