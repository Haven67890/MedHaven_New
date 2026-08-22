import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { uploadToB2, DEFAULT_B2_BUCKET } from "@/lib/b2"

async function listAllObjects(
  supabaseAdmin: ReturnType<typeof createServiceClient>,
  bucketName: string,
  path = ""
): Promise<string[]> {
  const filePaths: string[] = []
  const { data, error } = await supabaseAdmin.storage.from(bucketName).list(path, { limit: 1000 })

  if (error || !data) {
    return filePaths
  }

  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name
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
  const files = await listAllObjects(supabaseAdmin, bucketName)
  let successCount = 0
  let failureCount = 0
  const failures: { bucket: string; path: string; error: string }[] = []

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    try {
      const { data, error: downloadError } = await supabaseAdmin.storage.from(bucketName).download(filePath)
      if (downloadError || !data) {
        throw new Error(downloadError?.message || "Failed to download blob from Supabase")
      }

      const buffer = Buffer.from(await data.arrayBuffer())
      const contentType = data.type || "application/octet-stream"

      await uploadToB2(filePath, buffer, contentType, targetB2Bucket)
      successCount++
    } catch (err: any) {
      failureCount++
      failures.push({ bucket: bucketName, path: filePath, error: err?.message || String(err) })
    }
  }

  return { total: files.length, successCount, failureCount, failures }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // 1. Check admin authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 })
    }

    // 2. Run migration for materials bucket
    const materialsResult = await migrateBucket(serviceSupabase, "materials", DEFAULT_B2_BUCKET)

    // 3. Run migration for quiz-bank bucket
    let quizBankResult = { total: 0, successCount: 0, failureCount: 0, failures: [] as any[] }
    try {
      quizBankResult = await migrateBucket(serviceSupabase, "quiz-bank", DEFAULT_B2_BUCKET)
    } catch (err: any) {
      console.warn("Quiz bank bucket migration error:", err)
    }

    const totalMigrated = materialsResult.successCount + quizBankResult.successCount
    const totalFailed = materialsResult.failureCount + quizBankResult.failureCount
    const allFailures = [...materialsResult.failures, ...quizBankResult.failures]

    return NextResponse.json({
      success: true,
      migrated: totalMigrated,
      failed: totalFailed,
      details: {
        materials: materialsResult,
        quizBank: quizBankResult,
      },
      failures: allFailures,
    })
  } catch (err: any) {
    console.error("Migration trigger error:", err)
    return NextResponse.json({ error: err.message || "An error occurred during migration execution" }, { status: 500 })
  }
}
