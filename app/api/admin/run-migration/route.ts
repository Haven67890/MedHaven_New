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

async function updateProgress(
  supabaseAdmin: ReturnType<typeof createServiceClient>,
  data: {
    migrated: number
    failed: number
    total: number
    status: string
    failures: any[]
  }
) {
  try {
    const { error } = await supabaseAdmin.from("migration_progress").upsert({
      id: "b2_migration",
      migrated: data.migrated,
      failed: data.failed,
      total: data.total,
      status: data.status,
      failures: data.failures,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      console.error("Failed to update migration_progress:", error)
    }
  } catch (err) {
    console.error("Error updating migration_progress:", err)
  }
}

async function runBackgroundMigration(supabaseAdmin: ReturnType<typeof createServiceClient>) {
  try {
    const materialsFiles = await listAllObjects(supabaseAdmin, "materials")
    let quizBankFiles: string[] = []
    try {
      quizBankFiles = await listAllObjects(supabaseAdmin, "quiz-bank")
    } catch (err) {
      console.warn("Quiz bank list error:", err)
    }

    const allItems: { bucket: string; path: string }[] = [
      ...materialsFiles.map((path) => ({ bucket: "materials", path })),
      ...quizBankFiles.map((path) => ({ bucket: "quiz-bank", path })),
    ]

    const total = allItems.length
    let migrated = 0
    let failed = 0
    const failures: { bucket: string; path: string; error: string }[] = []

    await updateProgress(supabaseAdmin, {
      migrated,
      failed,
      total,
      status: "running",
      failures,
    })

    if (total === 0) {
      await updateProgress(supabaseAdmin, {
        migrated: 0,
        failed: 0,
        total: 0,
        status: "complete",
        failures: [],
      })
      return
    }

    const BATCH_SIZE = 50
    const DELAY_MS = 500

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i]
      const currentNum = i + 1

      try {
        const { data, error: downloadError } = await supabaseAdmin.storage
          .from(item.bucket)
          .download(item.path)

        if (downloadError || !data) {
          throw new Error(downloadError?.message || "Failed to download blob from Supabase")
        }

        const buffer = Buffer.from(await data.arrayBuffer())
        const contentType = data.type || "application/octet-stream"

        await uploadToB2(item.path, buffer, contentType, DEFAULT_B2_BUCKET)
        migrated++
        console.log(`Migrated: ${item.path} (${currentNum}/${total})`)
      } catch (err: any) {
        failed++
        const errMsg = err?.message || String(err)
        failures.push({ bucket: item.bucket, path: item.path, error: errMsg })
        console.error(`Failed migration for ${item.path}: ${errMsg}`)
      }

      const isEndOfBatch = currentNum % BATCH_SIZE === 0
      const isLastItem = currentNum === total

      if (isEndOfBatch || isLastItem) {
        await updateProgress(supabaseAdmin, {
          migrated,
          failed,
          total,
          status: "running",
          failures,
        })

        if (!isLastItem) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
        }
      }
    }

    await updateProgress(supabaseAdmin, {
      migrated,
      failed,
      total,
      status: "complete",
      failures,
    })
  } catch (err: any) {
    console.error("Migration fatal background error:", err)
    await updateProgress(supabaseAdmin, {
      migrated: 0,
      failed: 0,
      total: 0,
      status: "failed",
      failures: [{ bucket: "system", path: "migration", error: err?.message || String(err) }],
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

    // 2. Start migration in background
    setImmediate(() => {
      runBackgroundMigration(serviceSupabase).catch((err) => {
        console.error("Background migration error:", err)
      })
    })

    return NextResponse.json({
      status: "started",
      message: "Migration running in background",
    })
  } catch (err: any) {
    console.error("Migration trigger error:", err)
    return NextResponse.json({ error: err.message || "An error occurred during migration execution" }, { status: 500 })
  }
}
