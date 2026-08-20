import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://medhaven.onrender.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/features', '/courses', '/about', '/login', '/register'],
        disallow: [
          '/dashboard',
          '/library',
          '/materials',
          '/profile',
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
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
