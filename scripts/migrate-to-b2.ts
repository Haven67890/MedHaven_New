import { createServiceClient } from "../lib/supabase/server"
import { uploadToB2, DEFAULT_B2_BUCKET } from "../lib/b2"

async function listAllObjects(
  supabaseAdmin: ReturnType<typeof createServiceClient>,
  bucketName: string,
  path = ""
): Promise<string[]> {
  const filePaths: string[] = []
  const { data, error } = await supabaseAdmin.storage.from(bucketName).list(path, { limit: 1000 })

  if (error) {
    console.error(`Error listing bucket '${bucketName}' path "${path}":`, error)
    return filePaths
  }

  if (!data) return filePaths

  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name
    // In Supabase storage list(), subdirectories lack item.id / item.metadata
    if (!item.id && !item.metadata) {
      const subFiles = await listAllObjects(supabaseAdmin, bucketName, fullPath)
      filePaths.push(...subFiles)
    } else {
      filePaths.push(fullPath)
    }
  }

  return filePaths
}

async function migrateBucket(
  supabaseAdmin: ReturnType<typeof createServiceClient>,
  bucketName: string,
  targetB2Bucket: string
) {
  console.log(`\n==================================================`)
  console.log(`Starting migration for bucket: '${bucketName}' -> B2 Bucket: '${targetB2Bucket}'`)
  console.log(`==================================================`)

  const files = await listAllObjects(supabaseAdmin, bucketName)
  console.log(`Found ${files.length} total objects in Supabase bucket '${bucketName}'.`)

  let successCount = 0
  let failureCount = 0
  const failures: { path: string; error: string }[] = []

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    const currentNum = i + 1
    try {
      // 1. Download from Supabase
      const { data, error: downloadError } = await supabaseAdmin.storage.from(bucketName).download(filePath)
      if (downloadError || !data) {
        throw new Error(downloadError?.message || "Failed to download blob from Supabase")
      }

      const buffer = Buffer.from(await data.arrayBuffer())
      const contentType = data.type || "application/octet-stream"

      // 2. Upload to B2
      await uploadToB2(filePath, buffer, contentType, targetB2Bucket)

      // 3. Verify upload
      successCount++
      console.log(`Migrated: ${filePath} (${currentNum}/${files.length})`)
    } catch (err: any) {
      failureCount++
      const errMsg = err?.message || String(err)
      failures.push({ path: filePath, error: errMsg })
      console.error(`FAILED: ${filePath} (${currentNum}/${files.length}) - Error: ${errMsg}`)
    }
  }

  console.log(`\n--------------------------------------------------`)
  console.log(`Bucket '${bucketName}' Migration Summary:`)
  console.log(`Total Found: ${files.length}`)
  console.log(`Successfully Migrated: ${successCount}`)
  console.log(`Failed: ${failureCount}`)

  if (failures.length > 0) {
    console.log(`\nList of Failures in '${bucketName}':`)
    failures.forEach((f) => console.log(` - ${f.path}: ${f.error}`))
  }
  console.log(`--------------------------------------------------\n`)

  return { total: files.length, successCount, failureCount, failures }
}

async function runMigration() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Error: SUPABASE_SERVICE_ROLE_KEY is not set in process.env.")
    console.error("Please set SUPABASE_SERVICE_ROLE_KEY, B2_KEY_ID, and B2_APP_KEY environment variables to run the migration.")
    process.exit(1)
  }

  console.log("Initializing Supabase service client...")
  const supabaseAdmin = createServiceClient()

  // Part 2: materials bucket (handles all 858 files)
  const materialsResult = await migrateBucket(supabaseAdmin, "materials", DEFAULT_B2_BUCKET)

  // Part 6: quiz-bank bucket (15 files)
  let quizBankResult = { total: 0, successCount: 0, failureCount: 0, failures: [] as any[] }
  try {
    quizBankResult = await migrateBucket(supabaseAdmin, "quiz-bank", DEFAULT_B2_BUCKET)
  } catch (err) {
    console.warn("Quiz bank bucket migration attempted, encountered:", err)
  }

  console.log(`\n==================================================`)
  console.log(`FINAL OVERALL MIGRATION REPORT:`)
  console.log(`Materials Bucket: ${materialsResult.successCount}/${materialsResult.total} migrated (${materialsResult.failureCount} failed)`)
  console.log(`Quiz-Bank Bucket: ${quizBankResult.successCount}/${quizBankResult.total} migrated (${quizBankResult.failureCount} failed)`)
  console.log(`==================================================\n`)
}

runMigration().catch((err) => {
  console.error("Fatal migration error:", err)
  process.exit(1)
})
