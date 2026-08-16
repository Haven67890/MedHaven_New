/**
 * Script: fix-pdf-content-type.ts
 * Purpose: One-time migration script to update Content-Type metadata for existing PDF objects in Supabase Storage.
 *
 * Supabase Storage API does NOT support metadata-only updates (e.g., updating content-type without file body).
 * Therefore, this script re-uploads each PDF object to the 'materials' bucket with explicit
 * { contentType: 'application/pdf', upsert: true } options so Supabase Storage serves it with Content-Disposition: inline.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/fix-pdf-content-type.ts
 */

import { createClient } from "@supabase/supabase-js"

async function fixPdfContentType() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log("Listing materials bucket files...")
  const { data: files, error: listError } = await supabase.storage.from("materials").list("", {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  })

  if (listError) {
    console.error("Failed to list files in materials bucket:", listError)
    process.exit(1)
  }

  const pdfFiles = (files || []).filter((f) => f.name.toLowerCase().endsWith(".pdf"))
  console.log(`Found ${pdfFiles.length} PDF files out of ${files?.length || 0} total files in 'materials' bucket.`)

  let successCount = 0
  let failCount = 0

  for (const file of pdfFiles) {
    const filePath = file.name
    console.log(`Processing: ${filePath}...`)

    try {
      // Download current file binary
      const { data: blob, error: downloadError } = await supabase.storage.from("materials").download(filePath)
      if (downloadError || !blob) {
        console.error(`  [FAILED] Download failed for ${filePath}:`, downloadError)
        failCount++
        continue
      }

      // Convert Blob to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Re-upload with explicit contentType
      const { error: uploadError } = await supabase.storage.from("materials").upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/pdf",
      })

      if (uploadError) {
        console.error(`  [FAILED] Re-upload failed for ${filePath}:`, uploadError)
        failCount++
      } else {
        console.log(`  [SUCCESS] Updated content-type to application/pdf for ${filePath}`)
        successCount++
      }
    } catch (err: any) {
      console.error(`  [ERROR] Exception processing ${filePath}:`, err.message)
      failCount++
    }
  }

  console.log("\n--- Summary ---")
  console.log(`Total PDF files processed: ${pdfFiles.length}`)
  console.log(`Successfully updated: ${successCount}`)
  console.log(`Failed: ${failCount}`)
}

fixPdfContentType().catch((err) => {
  console.error("Migration script failed:", err)
  process.exit(1)
})
