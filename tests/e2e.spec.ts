import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

test.describe('MedHaven Production Issue Fix Verification', () => {
  test.beforeAll(() => {
    const dir = path.join(process.cwd(), 'test-results')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })

  test('Test 0: Image Proxy API route returns HTTP 200 with valid image content-type header', async ({ page }) => {
    const testImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/d/de/Human_heart_model.jpg'
    console.log(`Testing /api/image-proxy?url=${testImageUrl}...`)

    const proxyUrl = `http://localhost:3000/api/image-proxy?url=${encodeURIComponent(testImageUrl)}`
    const response = await page.goto(proxyUrl)

    expect(response?.status()).toBe(200)

    const contentType = response?.headers()['content-type']
    console.log(`Image proxy response status: ${response?.status()}, content-type: ${contentType}`)

    expect(contentType).toBeTruthy()
    expect(contentType).toMatch(/^image\//)
    console.log('Test 0 PASSED: /api/image-proxy returned HTTP 200 with valid image content-type.')
  })

  test('Test 1: Navigate to Study Library on a 375px mobile viewport and assert main grid spans 100% viewport width', async ({ page }) => {
    console.log('Test 1: Setting 375px mobile viewport...')
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('https://medhaven.onrender.com/library', { waitUntil: 'domcontentloaded' })

    const mainContainer = page.locator('main').first()
    await expect(mainContainer).toBeVisible({ timeout: 15000 })

    const containerBox = await mainContainer.boundingBox()
    console.log(`Main container bounding box on 375px viewport: width=${containerBox?.width}px, x=${containerBox?.x}`)

    expect(containerBox).not.toBeNull()
    if (containerBox) {
      // Container width on 375px should span 100% of available body/main width (>= 370px)
      expect(containerBox.width).toBeGreaterThanOrEqual(370)
    }

    await page.screenshot({ path: 'test-results/mobile-library-viewport-375px.png' })
    console.log('Test 1 PASSED: Main container spans 100% width on 375px viewport.')
  })

  test('Test 2: Medical Image route returns valid http source URL for medical image queries', async ({ page }) => {
    console.log('Test 2: Querying /api/assistant/medical-image for picture of the liver histology...')
    const response = await page.goto('https://medhaven.onrender.com/api/assistant/medical-image?query=picture%20of%20the%20liver%20histology', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)

    const data = await response?.json()
    console.log('Medical image API response:', data)

    expect(data).toHaveProperty('url')
    expect(typeof data.url).toBe('string')
    expect(data.url).toMatch(/^https?:\/\/.+|^(\/api\/image-proxy)/)

    await page.screenshot({ path: 'test-results/medical-image-api-response.png' })
    console.log('Test 2 PASSED: Medical image API returned valid URL:', data.url)
  })

  test('Step 1: Homepage verification', async ({ page }) => {
    console.log('Step 1: Navigating to https://medhaven.onrender.com...')
    const response = await page.goto('https://medhaven.onrender.com', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)

    const logo = page.locator('img[alt*="MedHaven"], img[src*="logo"]').first()
    await expect(logo).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'test-results/01-homepage.png' })
    console.log('Step 1 PASSED: Homepage loaded and logo visible.')
  })
})
