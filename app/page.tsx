import type { Metadata } from 'next'
import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import PainPointsSection from '@/components/landing/PainPointsSection'
import SolutionSection from '@/components/landing/SolutionSection'
import ComparisonSection from '@/components/landing/ComparisonSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import PricingSection from '@/components/landing/PricingSection'
import TestimonialsSection from '@/components/landing/TestimonialsSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'AgencyAI — El sistema operativo para agencias de marketing digital',
  description:
    'Centraliza clientes, tareas, reportes, finanzas y tu equipo en un solo lugar. Diseñado para agencias, traffickers y freelancers de marketing digital. Empieza gratis.',
  keywords: [
    'agencia marketing digital',
    'gestión agencias',
    'CRM agencias',
    'reportes marketing',
    'finanzas agencia',
    'SaaS agencias',
  ],
  openGraph: {
    title: 'AgencyAI — El sistema operativo para agencias de marketing digital',
    description: 'Centraliza clientes, tareas, reportes, finanzas y tu equipo en un solo lugar.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <HeroSection />
      <PainPointsSection />
      <SolutionSection />
      <ComparisonSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  )
}
