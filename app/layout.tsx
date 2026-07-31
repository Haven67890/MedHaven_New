import './globals.css'
-import ThemeProvider from "@/components/providers/theme-provider"
+import { ThemeProvider } from "@/components/providers/theme-provider"
import { AuthProvider } from '@/components/providers/AuthProvider'

export const metadata = {
  title: { default: 'MedHaven — University ecosystem' },
  description: 'MedHaven is a clearer founder for modern healthcare',
  applicationName: 'MedHaven',
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
