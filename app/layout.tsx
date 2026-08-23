import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from "@/components/providers/theme-provider"
import { AuthProvider } from '@/components/providers/AuthProvider'
import { PwaProvider } from '@/components/providers/pwa-provider'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://medhaven.onrender.com'),
  title: {
    default: 'MedHaven — Medical Study Platform for UNIJOS & JUTH Students',
    template: '%s | MedHaven',
  },
  description: 'MedHaven is the dedicated medical study platform for UNIJOS and JUTH medical students.',
  applicationName: 'MedHaven',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MedHaven',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <PwaProvider>
              {children}
            </PwaProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
