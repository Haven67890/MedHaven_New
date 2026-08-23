import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { b2Client, DEFAULT_B2_BUCKET } from "@/lib/b2"
import { HeadObjectCommand } from "@aws-sdk/client-s3"

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

async function updateProgress(
  supabaseAdmin: ReturnType<typeof createServiceClient>,
  data: {
    deleted: number
    skipped: number
    failed: number
    total: number
    status: string
  }
) {
  try {
    const { error } = await supabaseAdmin.from("migration_progress").upsert({
      id: "cleanup",
      migrated: data.deleted,
      failed: data.failed,
      total: data.total,
      status: data.status,
      failures: { skipped: data.skipped, failed: data.failed, deleted: data.deleted },
      updated_at: new Date().toISOString(),
    })
    if (error) {
      console.error("Failed to update migration_progress for cleanup:", error)
    }
  } catch (err) {
    console.error("Error updating migration_progress for cleanup:", err)
  }
}

async function runBackgroundCleanup(supabaseAdmin: ReturnType<typeof createServiceClient>) {
  try {
    const materialsFiles = await listAllObjects(supabaseAdmin, "materials")
    let quizBankFiles: string[] = []
    try {
      quizBankFiles = await listAllObjects(supabaseAdmin, "quiz-bank")
    } catch (err) {
      console.warn("Quiz bank list error:", err)
    }

    const bucketItemsMap: { [bucket: string]: string[] } = {
      materials: materialsFiles,
      "quiz-bank": quizBankFiles,
    }

    const total = materialsFiles.length + quizBankFiles.length
    let deleted = 0
    let skipped = 0
    let failed = 0

    await updateProgress(supabaseAdmin, {
      deleted,
      skipped,
      failed,
      total,
      status: "running",
    })

    if (total === 0) {
      await updateProgress(supabaseAdmin, {
        deleted: 0,
        skipped: 0,
        failed: 0,
        total: 0,
        status: "complete",
      })
      return
    }

    const BATCH_SIZE = 50

    for (const bucket of ["materials", "quiz-bank"]) {
      const files = bucketItemsMap[bucket] || []
      let confirmedBatch: string[] = []

      for (let i = 0; i < files.length; i++) {
        const path = files[i]

        let existsInB2 = false
        try {
          const command = new HeadObjectCommand({
            Bucket: DEFAULT_B2_BUCKET,
            Key: path,
          })
          await b2Client.send(command)
          existsInB2 = true
        } catch (err) {
          skipped++
          console.warn(`Skipped from deletion (not confirmed in B2): ${path}`)
        }

        if (existsInB2) {
          confirmedBatch.push(path)
        }

        const isLastInBucket = i === files.length - 1
        const isBatchFull = confirmedBatch.length >= BATCH_SIZE

        if ((isBatchFull || isLastInBucket) && confirmedBatch.length > 0) {
          const toDelete = [...confirmedBatch]
          confirmedBatch = []

          const { error: removeError } = await supabaseAdmin.storage
            .from(bucket)
            .remove(toDelete)

          if (removeError) {
            failed += toDelete.length
            console.error(`Failed to remove batch from bucket ${bucket}:`, removeError)
          } else {
            for (const deletedPath of toDelete) {
              deleted++
              console.log(`Deleted from Supabase: ${deletedPath} (${deleted}/${total})`)
            }
          }

          await updateProgress(supabaseAdmin, {
            deleted,
            skipped,
            failed,
            total,
            status: "running",
          })
        }
      }
    }

    await updateProgress(supabaseAdmin, {
      deleted,
      skipped,
      failed,
      total,
      status: "complete",
    })
  } catch (err: any) {
    console.error("Cleanup fatal background error:", err)
    await updateProgress(supabaseAdmin, {
      deleted: 0,
      skipped: 0,
      failed: 0,
      total: 0,
      status: "failed",
    })
  }
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

    const allowedRoles = ["admin", "super_admin", "SUPER_ADMIN"]
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 })
    }

    // 2. Start cleanup in background
    setImmediate(() => {
      runBackgroundCleanup(serviceSupabase).catch((err) => {
        console.error("Background cleanup error:", err)
      })
    })

    return NextResponse.json({
      status: "started",
      message: "Cleanup running in background",
    })
  } catch (err: any) {
    console.error("Cleanup trigger error:", err)
    return NextResponse.json({ error: err.message || "An error occurred during cleanup execution" }, { status: 500 })
  }
}
