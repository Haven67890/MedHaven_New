import './globals.css'
import { ThemeProvider } from "@/components/providers/theme-provider"
import { AuthProvider } from '@/components/providers/AuthProvider'

export const metadata = {
  title: { default: 'MedHaven — University ecosystem' },
  description: 'MedHaven is a clearer founder for modern healthcare',
  applicationName: 'MedHaven',
  icons: {
    icon: 'https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Untitled%20design.png',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
