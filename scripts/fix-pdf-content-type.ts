/**
 * Script: fix-pdf-content-type.ts
 * Purpose: One-time migration script to update Content-Type metadata for existing PDF objects in Supabase Storage.
 *
 * Safety Features:
 * 1. DRY-RUN MODE: Set DRY_RUN=true or pass --dry-run. Lists affected files without mutating Storage.
 * 2. IDEMPOTENCY: Skips files whose metadata mimetype is already 'application/pdf'.
 * 3. PER-FILE LOGGING: Logs clear status ([SKIP], [DRY-RUN], [SUCCESS], [FAILED]) for every file evaluated.
 * 4. SMALL-BATCH TEST: Set LIMIT=N or pass --limit N to process only N files.
 *
 * Usage Examples:
 *   Dry-run (all files):
 *     DRY_RUN=true npx tsx scripts/fix-pdf-content-type.ts
 *
 *   Dry-run (limit 5 files):
 *     DRY_RUN=true LIMIT=5 npx tsx scripts/fix-pdf-content-type.ts
 *     npx tsx scripts/fix-pdf-content-type.ts --dry-run --limit 5
 *
 *   Live migration (batch of 5 files):
 *     LIMIT=5 npx tsx scripts/fix-pdf-content-type.ts
 *     npx tsx scripts/fix-pdf-content-type.ts --limit 5
 */

import { createClient } from "@supabase/supabase-js"

interface StorageFileItem {
  path: string
  name: string
  id: string | null
  metadata: Record<string, any> | null
}

async function listAllStorageFiles(supabase: any, dir = ""): Promise<StorageFileItem[]> {
  let results: StorageFileItem[] = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data: items, error } = await supabase.storage.from("materials").list(dir, {
      limit: pageSize,
      offset: offset,
      sortBy: { column: "name", order: "asc" },
    })

    if (error || !items) {
      console.error(`[ERROR] Listing failed for path "${dir}":`, error)
      break
    }

    if (items.length === 0) break

    for (const item of items) {
      const fullPath = dir ? `${dir}/${item.name}` : item.name
      if (item.id === null) {
        // Directory entry -> recursively traverse
        const subFiles = await listAllStorageFiles(supabase, fullPath)
        results = results.concat(subFiles)
      } else {
        results.push({
          path: fullPath,
          name: item.name,
          id: item.id,
          metadata: item.metadata,
        })
      }
    }

    if (items.length < pageSize) break
    offset += pageSize
  }

  return results
}

async function fixPdfContentType() {
  const args = process.argv.slice(2)
  const isDryRunArg = args.includes("--dry-run")
  const isDryRunEnv = process.env.DRY_RUN === "true" || process.env.DRY_RUN === "1"
  const isDryRun = isDryRunArg || isDryRunEnv

  let limitParam: number | null = null
  const limitArgIdx = args.indexOf("--limit")
  if (limitArgIdx !== -1 && args[limitArgIdx + 1]) {
    limitParam = parseInt(args[limitArgIdx + 1], 10)
  } else if (process.env.LIMIT) {
    limitParam = parseInt(process.env.LIMIT, 10)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log("=== MedHaven PDF Content-Type Migration Script ===")
  console.log(`Mode: ${isDryRun ? "DRY-RUN (No files will be modified)" : "LIVE MIGRATION"}`)
  if (limitParam && !isNaN(limitParam)) {
    console.log(`Batch Limit: ${limitParam} files`)
  } else {
    console.log("Batch Limit: Unlimited (All candidate files)")
  }
  console.log("==================================================\n")

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[WARNING] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")
    console.warn("Script cannot connect to Supabase Storage without environment credentials.\n")
    if (isDryRun) {
      console.log("[DRY-RUN REPORT] No environment variables set for production DB execution.")
      console.log("To run against production, execute with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.")
      return
    }
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log("Fetching complete recursive file listing from 'materials' bucket...")
  const allFiles = await listAllStorageFiles(supabase)
  console.log(`Total files retrieved from 'materials' bucket: ${allFiles.length}`)

  // Filter for PDF candidates (.pdf extension)
  const pdfCandidates = allFiles.filter((f) => f.name.toLowerCase().endsWith(".pdf"))
  console.log(`Found ${pdfCandidates.length} PDF candidate files ending in .pdf\n`)

  let processedCount = 0
  let skippedCount = 0
  let successCount = 0
  let failCount = 0

  const candidateSummary: Array<{ id: string; name: string; currentMime: string; status: string }> = []

  for (const file of pdfCandidates) {
    const filePath = file.path
    const currentMime = file.metadata?.mimetype || file.metadata?.contentType || "unknown"

    // IDEMPOTENCY CHECK: If file already has application/pdf MIME type, skip it
    if (currentMime.toLowerCase() === "application/pdf") {
      console.log(`[SKIP] File: "${filePath}" | Current Mime: "${currentMime}" — Already application/pdf`)
      skippedCount++
      candidateSummary.push({ id: file.id || filePath, name: filePath, currentMime, status: "SKIPPED (Already PDF)" })
      continue
    }

    if (limitParam && !isNaN(limitParam) && processedCount >= limitParam) {
      console.log(`\n[LIMIT REACHED] Reached limit of ${limitParam} files. Stopping batch processing.`)
      break
    }

    processedCount++

    if (isDryRun) {
      console.log(`[DRY-RUN] Candidate #${processedCount}: "${filePath}" | Current Mime: "${currentMime}" — Would update to application/pdf`)
      candidateSummary.push({ id: file.id || filePath, name: filePath, currentMime, status: "WOULD_UPDATE" })
      continue
    }

    // LIVE MODE RE-UPLOAD
    console.log(`[PROCESSING #${processedCount}] Re-uploading: "${filePath}" (Current Mime: "${currentMime}")...`)
    try {
      const { data: blob, error: downloadError } = await supabase.storage.from("materials").download(filePath)
      if (downloadError || !blob) {
        console.error(`  [FAILED] Download failed for "${filePath}":`, downloadError?.message || downloadError)
        failCount++
        candidateSummary.push({ id: file.id || filePath, name: filePath, currentMime, status: "FAILED (Download error)" })
        continue
      }

      const arrayBuffer = await blob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabase.storage.from("materials").upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/pdf",
      })

      if (uploadError) {
        console.error(`  [FAILED] Re-upload failed for "${filePath}":`, uploadError.message)
        failCount++
        candidateSummary.push({ id: file.id || filePath, name: filePath, currentMime, status: "FAILED (Upload error)" })
      } else {
        console.log(`  [SUCCESS] Updated content-type to application/pdf for "${filePath}"`)
        successCount++
        candidateSummary.push({ id: file.id || filePath, name: filePath, currentMime, status: "SUCCESS" })
      }
    } catch (err: any) {
      console.error(`  [ERROR] Exception processing "${filePath}":`, err.message)
      failCount++
      candidateSummary.push({ id: file.id || filePath, name: filePath, currentMime, status: `ERROR (${err.message})` })
    }
  }

  console.log("\n=================== SUMMARY ===================")
  console.log(`Total PDF files found: ${pdfCandidates.length}`)
  console.log(`Skipped (Already application/pdf): ${skippedCount}`)
  if (isDryRun) {
    console.log(`Dry-run candidates requiring update: ${processedCount}`)
  } else {
    console.log(`Live files processed: ${processedCount}`)
    console.log(`Successfully updated: ${successCount}`)
    console.log(`Failed: ${failCount}`)
  }
  console.log("===============================================")

  if (candidateSummary.length > 0) {
    console.log("\n--- Sample Candidates Log ---")
    candidateSummary.slice(0, 15).forEach((item, idx) => {
      console.log(`${idx + 1}. File: ${item.name} | Current Mime: ${item.currentMime} | Status: ${item.status}`)
    })
    if (candidateSummary.length > 15) {
      console.log(`... and ${candidateSummary.length - 15} more.`)
    }
  }
}

fixPdfContentType().catch((err) => {
  console.error("[FATAL] Unhandled error during migration:", err)
  process.exit(1)
})
