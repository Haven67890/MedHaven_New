import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import { createServiceClient } from "../lib/supabase/server"
import { getSupabaseConfig } from "../lib/supabase/config"
import { getSlideDeckProvider } from "../lib/embed"

interface MaterialRow {
  id: string
  course_id: string | null
  title: string
  type: string | null
  tier: string | null
  source_url: string | null
  storage_path: string | null
  description: string | null
  status: string | null
  created_at: string
}

interface BrokenUrlFlag {
  id: string
  title: string
  source_url: string
  status: string
}

interface TierInconsistentFlag {
  id: string
  title: string
  tier: string
  type: string
  reason: string
}

interface GDocsViewerFailureFlag {
  id: string
  title: string
  source_url: string
  gdocs_url: string
  status: string
}

function resolveMaterialUrl(row: MaterialRow): string | null {
  if (row.source_url && row.source_url.trim()) {
    return row.source_url.trim()
  }
  if (row.storage_path && row.storage_path.trim()) {
    const sp = row.storage_path.trim()
    if (sp.startsWith("http://") || sp.startsWith("https://")) {
      return sp
    }
    return `https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/${sp}`
  }
  return null
}

async function checkUrlStatus(url: string, timeoutMs = 15000): Promise<{ statusCode: number | string; ok: boolean }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "MedHaven-Audit/1.0"
      },
      signal: controller.signal
    }).catch((err) => {
      return { error: err.message || "Network request failed" }
    })

    clearTimeout(timeoutId)

    if ("error" in res) {
      return { statusCode: `ERROR (${res.error})`, ok: false }
    }

    return { statusCode: res.status, ok: res.ok }
  } catch (err: any) {
    return { statusCode: `ERROR (${err.message || "Unknown error"})`, ok: false }
  }
}

function checkTierTypeConsistency(row: MaterialRow): string | null {
  const type = (row.type || "").trim().toLowerCase()
  const tier = (row.tier || "").trim().toLowerCase()

  const validTypes = new Set([
    "pdf",
    "video",
    "image",
    "slideshare",
    "doc",
    "link",
    "office",
    "lecture_slide",
    "past_question",
    "textbook",
    "tutorial_note"
  ])

  const validTiers = new Set([
    "study",
    "recommended",
    "recommendation",
    "past_question",
    "slides"
  ])

  if (!type) {
    return "Missing material format type"
  }
  if (!validTypes.has(type)) {
    return `Unrecognized material type '${row.type}' (expected one of: ${Array.from(validTypes).join(", ")})`
  }

  if (!tier) {
    return "Missing material content tier"
  }
  if (!validTiers.has(tier)) {
    return `Unrecognized material tier '${row.tier}' (expected one of: ${Array.from(validTiers).join(", ")})`
  }

  // Tier vs Type semantic pattern rules based on app routing & filtering conventions
  if (tier === "past_question" && (type === "video" || type === "slideshare")) {
    return `Tier is 'past_question' but format type is '${row.type}' (past questions are expected to be documents/images)`
  }

  if (tier === "slides" && type === "video") {
    return `Tier is 'slides' but format type is 'video'`
  }

  if (type === "slideshare") {
    const provider = getSlideDeckProvider(row.source_url)
    if (!provider) {
      return `Format type is 'slideshare' but source_url is not a supported slide deck provider (SlideShare, SlideServe, Scribd, Slides.com)`
    }
  }

  if (type === "link" && !row.source_url) {
    return `Format type is 'link' but no source_url is provided`
  }

  return null
}

async function runAudit() {
  console.log("Starting MedHaven Corrected Materials Integrity Audit...")

  let supabase: any
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (envUrl && envServiceKey) {
    console.log("Using Supabase client with environment variables NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY")
    supabase = createClient(envUrl, envServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  } else {
    try {
      supabase = createServiceClient()
    } catch (err: any) {
      console.warn("createServiceClient failed:", err.message, "- attempting fallback with getSupabaseConfig()...")
      try {
        const config = getSupabaseConfig()
        supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        })
      } catch (fallbackErr: any) {
        const fatalMsg = `Failed to initialize Supabase client: Service role error (${err.message}), Fallback config error (${fallbackErr.message || fallbackErr})`
        console.error(fatalMsg)
        writeErrorReport(fatalMsg)
        process.exit(1)
      }
    }
  }

  const { data: materials, error: fetchError } = await supabase
    .from("materials")
    .select("id, course_id, title, type, tier, source_url, storage_path, description, status, created_at")
    .order("created_at", { ascending: false })

  if (fetchError) {
    const fatalMsg = `Failed to fetch materials from Supabase: ${fetchError.message} (Code: ${fetchError.code || 'N/A'}, Hint: ${fetchError.hint || 'None'})`
    console.error(fatalMsg)
    writeErrorReport(fatalMsg)
    process.exit(1)
  }

  const allMaterials: MaterialRow[] = materials || []
  const totalRows = allMaterials.length
  console.log(`Fetched ${totalRows} total material rows. Processing sequentially (one row at a time with 15s timeout)...`)

  const brokenUrls: BrokenUrlFlag[] = []
  const tierInconsistencies: TierInconsistentFlag[] = []
  const gdocsFailures: GDocsViewerFailureFlag[] = []

  let pdfCount = 0

  for (let i = 0; i < allMaterials.length; i++) {
    const row = allMaterials[i]
    const resolvedUrl = resolveMaterialUrl(row)
    const isPdf = (row.type || "").trim().toLowerCase() === "pdf"

    if (isPdf) {
      pdfCount++
    }

    if (!resolvedUrl) {
      brokenUrls.push({
        id: row.id,
        title: row.title,
        source_url: "[NO URL OR STORAGE PATH]",
        status: "MISSING_URL"
      })
    } else {
      // 1. Check raw URL via standard GET
      const urlResult = await checkUrlStatus(resolvedUrl, 15000)
      if (!urlResult.ok) {
        brokenUrls.push({
          id: row.id,
          title: row.title,
          source_url: resolvedUrl,
          status: String(urlResult.statusCode)
        })
      }

      // 2. If PDF, check Google Docs Viewer URL reachability sequentially
      if (isPdf) {
        const gdocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`
        const gdocsResult = await checkUrlStatus(gdocsUrl, 15000)
        if (!gdocsResult.ok) {
          gdocsFailures.push({
            id: row.id,
            title: row.title,
            source_url: resolvedUrl,
            gdocs_url: gdocsUrl,
            status: String(gdocsResult.statusCode)
          })
        }
      }
    }

    const inconsistencyReason = checkTierTypeConsistency(row)
    if (inconsistencyReason) {
      tierInconsistencies.push({
        id: row.id,
        title: row.title,
        tier: row.tier || "[EMPTY]",
        type: row.type || "[EMPTY]",
        reason: inconsistencyReason
      })
    }

    if ((i + 1) % 20 === 0 || i + 1 === totalRows) {
      console.log(`Audited ${i + 1}/${totalRows} rows (PDFs checked: ${pdfCount})...`)
    }
  }

  // Generate Markdown report
  const nowStr = new Date().toISOString()
  let mdReport = `# MedHaven Materials Data Integrity Audit Report\n\n`
  mdReport += `**Generated At:** ${nowStr}\n`
  mdReport += `**Total Rows Checked:** ${totalRows}\n`
  mdReport += `**Total PDFs Checked:** ${pdfCount}\n`
  mdReport += `**Broken URL Count:** ${brokenUrls.length}\n`
  mdReport += `**Tier/Type Inconsistent Count:** ${tierInconsistencies.length}\n`
  mdReport += `**Google Docs Viewer PDF Reachability Failures:** ${gdocsFailures.length}\n\n`

  mdReport += `## Pattern & Criteria Used for Tier/Type Judgment\n\n`
  mdReport += `- **Valid Format Types:** \`pdf\`, \`video\`, \`image\`, \`slideshare\`, \`doc\`, \`link\`, \`office\`, \`lecture_slide\`, \`past_question\`, \`textbook\`, \`tutorial_note\`\n`
  mdReport += `- **Valid Content Tiers:** \`study\`, \`recommended\`, \`recommendation\`, \`past_question\`, \`slides\`\n`
  mdReport += `- **Pattern Inconsistencies Flagged:**\n`
  mdReport += `  - Missing or unrecognized format type or tier value.\n`
  mdReport += `  - Incompatible combination (e.g. tier \`past_question\` with type \`video\` or \`slideshare\`; tier \`slides\` with type \`video\`).\n`
  mdReport += `  - Type \`slideshare\` without a valid supported slide provider URL (\`slideshare.net\`, \`slideserve.com\`, \`scribd.com\`, \`slides.com\`).\n`
  mdReport += `  - Type \`link\` without a \`source_url\`.\n\n`

  mdReport += `## Broken-URL Rows\n\n`
  if (brokenUrls.length === 0) {
    mdReport += `*No broken URLs or missing resource paths found.*\n\n`
  } else {
    mdReport += `| ID | Title | Resolved URL | HTTP Status / Error |\n`
    mdReport += `| --- | --- | --- | --- |\n`
    for (const item of brokenUrls) {
      mdReport += `| \`${item.id}\` | ${item.title.replace(/\|/g, "\\|")} | \`${item.source_url}\` | **${item.status}** |\n`
    }
    mdReport += `\n`
  }

  mdReport += `## Tier-Inconsistent Rows\n\n`
  if (tierInconsistencies.length === 0) {
    mdReport += `*No tier/type inconsistent rows found.*\n\n`
  } else {
    mdReport += `| ID | Title | Current Tier | Current Type | Reason Flagged |\n`
    mdReport += `| --- | --- | --- | --- | --- |\n`
    for (const item of tierInconsistencies) {
      mdReport += `| \`${item.tier}\` | \`${item.type}\` | ${item.reason} |\n`
    }
    mdReport += `\n`
  }

  mdReport += `## Google Docs Viewer Reachability Failures (PDFs)\n\n`
  if (gdocsFailures.length === 0) {
    mdReport += `*All PDF Google Docs Viewer preview URLs loaded successfully (HTTP 200/206).*\n\n`
  } else {
    mdReport += `| ID | Title | Source URL | Google Docs Viewer Status |\n`
    mdReport += `| --- | --- | --- | --- |\n`
    for (const item of gdocsFailures) {
      mdReport += `| \`${item.id}\` | ${item.title.replace(/\|/g, "\\|")} | \`${item.source_url}\` | **${item.status}** |\n`
    }
    mdReport += `\n`
  }

  const outputPath = path.join(process.cwd(), "MATERIALS_AUDIT.md")
  fs.writeFileSync(outputPath, mdReport, "utf8")
  console.log(`Audit report successfully written to ${outputPath}`)
  console.log("\n=================== AUDIT SUMMARY ===================")
  console.log(mdReport)
}

function writeErrorReport(errorDetails: string) {
  const nowStr = new Date().toISOString()
  let mdReport = `# MedHaven Materials Data Integrity Audit Report\n\n`
  mdReport += `**Generated At:** ${nowStr}\n`
  mdReport += `**Execution Status:** FAILED\n\n`
  mdReport += `## Execution Error Details\n\n`
  mdReport += `\`\`\`\n${errorDetails}\n\`\`\`\n\n`

  const outputPath = path.join(process.cwd(), "MATERIALS_AUDIT.md")
  fs.writeFileSync(outputPath, mdReport, "utf8")
}

runAudit().catch((err) => {
  console.error("Unhandled error running audit script:", err)
  writeErrorReport(err.message || String(err))
  process.exit(1)
})
