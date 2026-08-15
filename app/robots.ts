import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://medhaven.onrender.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register'],
        disallow: [
          '/dashboard',
          '/library',
          '/materials',
          '/profile',
          '/courses',
          '/admin',
          '/notifications',
          '/settings',
          '/past-questions',
          '/lectures',
          '/flashcards',
          '/quizzes',
          '/timetable',
          '/progress',
          '/marketplace',
          '/clinical-guides',
          '/tutorials',
          '/directory',
          '/donate',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
