import { SignUp } from '@clerk/nextjs'
import { Zap } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">AgencyAI</span>
        </div>
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              card: 'shadow-lg border border-slate-200',
            },
          }}
        />
      </div>
    </div>
  )
}
