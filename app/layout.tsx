import './globals.css'
import { ThemeProvider } from "@/components/providers/theme-provider"
import { AuthProvider } from '@/components/providers/AuthProvider'
import { PwaProvider } from '@/components/providers/pwa-provider'

export const metadata = {
  title: { default: 'MedHaven — University ecosystem' },
  description: 'MedHaven is a clearer founder for modern healthcare',
  applicationName: 'MedHaven',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Untitled%20design.png',
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
