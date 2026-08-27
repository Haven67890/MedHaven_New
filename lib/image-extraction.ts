import JSZip from "jszip"
import * as pdfjs from "pdfjs-dist"
import zlib from "zlib"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { b2Client, DEFAULT_B2_BUCKET } from "@/lib/b2"

// Interfaces
export interface ExtractedImage {
  buffer: Buffer
  contentType: string
  filename: string
  width: number
  height: number
  source_context?: string
}

/**
 * Parse image dimensions directly from binary Buffer headers
 * Supports JPEG, PNG, GIF, WEBP
 */
export function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (!buffer || buffer.length < 8) return null

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (buffer.length >= 24) {
      const width = buffer.readUInt32BE(16)
      const height = buffer.readUInt32BE(20)
      return { width, height }
    }
  }

  // GIF
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    (buffer[3] === 0x38 && (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61)
  ) {
    if (buffer.length >= 10) {
      const width = buffer.readUInt16LE(6)
      const height = buffer.readUInt16LE(8)
      return { width, height }
    }
  }

  // WEBP
  if (
    buffer.length >= 30 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunkType = buffer.toString("ascii", 12, 16)
    if (chunkType === "VP8 ") {
      const width = buffer.readUInt16LE(26) & 0x3fff
      const height = buffer.readUInt16LE(28) & 0x3fff
      return { width, height }
    } else if (chunkType === "VP8L") {
      const b0 = buffer[21]
      const b1 = buffer[22]
      const b2 = buffer[23]
      const b3 = buffer[24]
      const width = 1 + (((b1 & 0x3f) << 8) | b0)
      const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
      return { width, height }
    } else if (chunkType === "VP8X") {
      const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16))
      const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16))
      return { width, height }
    }
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++
        continue
      }
      const marker = buffer[offset + 1]
      // SOF markers (Start of Frame)
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        if (offset + 8 < buffer.length) {
          const height = buffer.readUInt16BE(offset + 5)
          const width = buffer.readUInt16BE(offset + 7)
          return { width, height }
        }
      }
      if (offset + 3 >= buffer.length) break
      const length = buffer.readUInt16BE(offset + 2)
      offset += 2 + length
    }
  }

  return null
}

function getContentTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  if (ext === "png") return "image/png"
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
  if (ext === "webp") return "image/webp"
  if (ext === "gif") return "image/gif"
  return "image/png"
}

/**
 * Vision API Triage: Classifies image as 'specimen' vs 'decorative_noise' using llama-3.2-11b-vision-preview
 */
export async function classifyImageWithVision(
  imageBuffer: Buffer,
  contentType: string
): Promise<"specimen" | "decorative_noise"> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return "specimen" // fallback default
  }

  try {
    const base64Data = imageBuffer.toString("base64")
    const dataUrl = `data:${contentType};base64,${base64Data}`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Classify this image extracted from a medical lecture. Is it a diagnostic/clinical/pathology/histology/equipment/anatomy specimen worth reviewing for medical study ('specimen'), or is it decorative noise like a logo, icon, chart, page border, or title graphic ('decorative_noise')? Return strictly a JSON object: {\"triage\": \"specimen\"} or {\"triage\": \"decorative_noise\"}."
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      })
    })

    if (!response.ok) {
      console.warn("Groq vision classification failed with status:", response.status)
      return "specimen"
    }

    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content
    if (!rawContent) return "specimen"

    const parsed = JSON.parse(rawContent)
    if (parsed.triage === "decorative_noise") {
      return "decorative_noise"
    }
    return "specimen"
  } catch (err) {
    console.warn("Error in classifyImageWithVision:", err)
    return "specimen"
  }
}

/**
 * Extract embedded images from PPTX or DOCX zip archive
 */
export async function extractImagesFromOfficeZip(
  fileBuffer: Buffer,
  fileType: "pptx" | "docx" | string
): Promise<{ extracted: ExtractedImage[]; filteredCount: number }> {
  const extracted: ExtractedImage[] = []
  let filteredCount = 0

  const zip = await JSZip.loadAsync(fileBuffer)
  const isPptx = fileType.toLowerCase().includes("pptx")
  const prefix = isPptx ? "ppt/media/" : "word/media/"

  // Text contexts map: filename -> text
  const mediaToTextMap: Record<string, string> = {}

  if (isPptx) {
    // Map slide relationship files to media files and slide text
    const relFiles = Object.keys(zip.files).filter(
      (f) => f.startsWith("ppt/slides/_rels/") && f.endsWith(".rels")
    )

    for (const relFile of relFiles) {
      try {
        const slideXmlPath = relFile.replace("_rels/", "").replace(".rels", "")
        const relXml = await zip.files[relFile].async("string")
        const slideXml = zip.files[slideXmlPath] ? await zip.files[slideXmlPath].async("string") : ""

        // Extract slide text from <a:t> tags
        const textMatches = slideXml.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || []
        const slideText = textMatches
          .map((m) => m.replace(/<[^>]+>/g, "").trim())
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")

        // Match media targets in relationship XML
        const targetMatches = relXml.match(/Target="([^"]+)"/g) || []
        for (const tm of targetMatches) {
          const target = tm.replace(/Target="|"/g, "")
          const mediaName = target.split("/").pop()
          if (mediaName && slideText) {
            mediaToTextMap[mediaName] = slideText
          }
        }
      } catch (err) {
        console.warn(`Failed to parse PPTX slide text for ${relFile}:`, err)
      }
    }
  } else {
    // DOCX: Extract document text from word/document.xml
    try {
      const docXmlFile = zip.files["word/document.xml"]
      if (docXmlFile) {
        const docXml = await docXmlFile.async("string")
        const textMatches = docXml.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []
        const docText = textMatches
          .map((m) => m.replace(/<[^>]+>/g, "").trim())
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")

        if (docText) {
          const mediaFiles = Object.keys(zip.files).filter(
            (f) => f.startsWith("word/media/") && !zip.files[f].dir
          )
          for (const mf of mediaFiles) {
            const mediaName = mf.split("/").pop()
            if (mediaName) {
              mediaToTextMap[mediaName] = docText.slice(0, 3000)
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed to parse DOCX document text:", err)
    }
  }

  const mediaFiles = Object.keys(zip.files).filter(
    (filename) => filename.startsWith(prefix) && !zip.files[filename].dir
  )

  for (const filename of mediaFiles) {
    try {
      const fileData = await zip.files[filename].async("nodebuffer")
      const dims = getImageDimensions(fileData)
      const width = dims?.width || 0
      const height = dims?.height || 0

      // Noise filter: skip under 100x100px
      if (width < 100 || height < 100) {
        filteredCount++
        continue
      }

      const baseName = filename.split("/").pop() || filename
      const sourceContext = mediaToTextMap[baseName] || undefined

      extracted.push({
        buffer: fileData,
        contentType: getContentTypeFromFilename(filename),
        filename: baseName,
        width,
        height,
        source_context: sourceContext,
      })
    } catch (err) {
      console.warn(`Failed to extract image ${filename} from office zip:`, err)
    }
  }

  return { extracted, filteredCount }
}

/**
 * Helper to produce valid PNG buffer from raw RGBA pixel data
 */
function crc32(buf: Buffer): number {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0)
    }
  }
  return ~c >>> 0
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const len = data.length
  const typeBuf = Buffer.from(type, "ascii")
  const buf = Buffer.concat([typeBuf, data])
  const crc = crc32(buf)

  const res = Buffer.alloc(4 + 4 + len + 4)
  res.writeUInt32BE(len, 0)
  typeBuf.copy(res, 4)
  data.copy(res, 8)
  res.writeUInt32BE(crc, 8 + len)
  return res
}

function convertRgbaToPngBuffer(width: number, height: number, rgbaData: Uint8Array | Buffer): Buffer {
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth 8
  ihdrData[9] = 6 // color type 6 (RGBA)
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  const ihdrChunk = createPngChunk("IHDR", ihdrData)

  const rowSize = width * 4
  const rawData = Buffer.alloc(height * (1 + rowSize))
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + rowSize)] = 0 // Filter type 0
    Buffer.from(rgbaData.buffer, rgbaData.byteOffset + y * rowSize, rowSize).copy(
      rawData,
      y * (1 + rowSize) + 1
    )
  }

  const compressed = zlib.deflateSync(rawData)
  const idatChunk = createPngChunk("IDAT", compressed)
  const iendChunk = createPngChunk("IEND", Buffer.alloc(0))

  return Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk])
}

/**
 * Extract embedded images from PDF using pdfjs-dist
 * Gracefully reports errors without throwing / crashing job.
 */
export async function extractImagesFromPdf(
  fileBuffer: Buffer
): Promise<{ extracted: ExtractedImage[]; filteredCount: number }> {
  const extracted: ExtractedImage[] = []
  let filteredCount = 0

  try {
    const pdfData = new Uint8Array(fileBuffer)
    const loadingTask = pdfjs.getDocument({ data: pdfData })
    const pdf = await loadingTask.promise

    const OPS: any = pdfjs.OPS || (pdfjs as any).default?.OPS || {}
    const paintImageXObject = OPS.paintImageXObject !== undefined ? OPS.paintImageXObject : 85
    const paintJpegXObject = OPS.paintJpegXObject !== undefined ? OPS.paintJpegXObject : 82

    const processedObjIds = new Set<string>()

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)

        // Capture page text content as source_context
        let pageText = ""
        try {
          const textContent = await page.getTextContent()
          pageText = textContent.items
            .map((item: any) => item.str || "")
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        } catch (textErr) {
          console.warn(`Could not extract text from PDF page ${pageNum}:`, textErr)
        }

        const operatorList = await page.getOperatorList()

        for (let i = 0; i < operatorList.fnArray.length; i++) {
          const fn = operatorList.fnArray[i]
          if (fn === paintImageXObject || fn === paintJpegXObject) {
            const objId = operatorList.argsArray[i][0]
            if (!objId || processedObjIds.has(objId)) continue
            processedObjIds.add(objId)

            try {
              let imgObj: any = null
              if (page.objs && typeof page.objs.get === "function") {
                imgObj = await new Promise((resolve) => {
                  try {
                    page.objs.get(objId, (data: any) => resolve(data))
                  } catch {
                    resolve(null)
                  }
                })
              }

              if (!imgObj) continue

              const width = imgObj.width || 0
              const height = imgObj.height || 0

              // Noise filter: skip under 100x100px
              if (width < 100 || height < 100) {
                filteredCount++
                continue
              }

              let imgBuffer: Buffer | null = null
              let contentType = "image/png"
              let ext = "png"

              if (imgObj.data instanceof Uint8Array || Buffer.isBuffer(imgObj.data)) {
                if (imgObj.kind === 1 || imgObj.kind === 2) {
                  // RGB / RGBA or grayscale raw data
                  const numPixels = width * height
                  const rgbaBuf = Buffer.alloc(numPixels * 4)
                  const srcData = imgObj.data

                  if (srcData.length === numPixels * 4) {
                    Buffer.from(srcData.buffer, srcData.byteOffset, srcData.byteLength).copy(rgbaBuf)
                  } else if (srcData.length === numPixels * 3) {
                    for (let p = 0; p < numPixels; p++) {
                      rgbaBuf[p * 4] = srcData[p * 3]
                      rgbaBuf[p * 4 + 1] = srcData[p * 3 + 1]
                      rgbaBuf[p * 4 + 2] = srcData[p * 3 + 2]
                      rgbaBuf[p * 4 + 3] = 255
                    }
                  } else if (srcData.length === numPixels) {
                    for (let p = 0; p < numPixels; p++) {
                      const val = srcData[p]
                      rgbaBuf[p * 4] = val
                      rgbaBuf[p * 4 + 1] = val
                      rgbaBuf[p * 4 + 2] = val
                      rgbaBuf[p * 4 + 3] = 255
                    }
                  }

                  imgBuffer = convertRgbaToPngBuffer(width, height, rgbaBuf)
                } else if (
                  imgObj.data[0] === 0xff &&
                  imgObj.data[1] === 0xd8
                ) {
                  // Direct JPEG stream
                  imgBuffer = Buffer.from(imgObj.data.buffer, imgObj.data.byteOffset, imgObj.data.byteLength)
                  contentType = "image/jpeg"
                  ext = "jpg"
                } else {
                  // Fallback convert to PNG
                  const rgbaBuf = Buffer.alloc(width * height * 4, 255)
                  imgBuffer = convertRgbaToPngBuffer(width, height, rgbaBuf)
                }
              }

              if (imgBuffer) {
                extracted.push({
                  buffer: imgBuffer,
                  contentType,
                  filename: `pdf_p${pageNum}_${objId}.${ext}`,
                  width,
                  height,
                  source_context: pageText ? `[PDF Page ${pageNum}]: ${pageText.slice(0, 3000)}` : undefined,
                })
              }
            } catch (imgErr) {
              console.warn(`Could not extract image object ${objId} on page ${pageNum}:`, imgErr)
            }
          }
        }
      } catch (pageErr) {
        console.warn(`Could not process PDF page ${pageNum}:`, pageErr)
      }
    }
  } catch (pdfErr) {
    console.warn("PDF image extraction failed or encountered error:", pdfErr)
  }

  return { extracted, filteredCount }
}

/**
 * Fetch a material's binary buffer from Storage / B2
 */
export async function fetchMaterialFileBuffer(material: {
  id: string
  storage_path?: string | null
  source_url?: string | null
}): Promise<Buffer | null> {
  if (material.storage_path) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.B2_BUCKET_NAME || DEFAULT_B2_BUCKET,
        Key: material.storage_path,
      })
      const response = await b2Client.send(command)
      const byteArray = await response.Body?.transformToByteArray()
      if (byteArray) {
        return Buffer.from(byteArray)
      }
    } catch (err) {
      console.warn(`Failed to fetch material ${material.id} from B2 storage:`, err)
    }
  }

  if (material.source_url) {
    try {
      const res = await fetch(material.source_url)
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer()
        return Buffer.from(arrayBuf)
      }
    } catch (err) {
      console.warn(`Failed to fetch material ${material.id} from source_url:`, err)
    }
  }

  return null
}

/**
 * Main process pipeline:
 * Extracts images, uploads surviving candidates to `quiz-bank` bucket,
 * and inserts candidate records into `quiz_image_bank` table with status='archived'
 */
export async function processMaterialImageExtraction(material: {
  id: string
  title: string
  course_id: string
  type?: string | null
  storage_path?: string | null
  source_url?: string | null
  uploaded_by?: string | null
}): Promise<{ totalExtracted: number; totalFiltered: number; totalSaved: number }> {
  try {
    let serviceClient: any
    try {
      serviceClient = createServiceClient()
    } catch {
      serviceClient = await createClient()
    }

    const fileBuffer = await fetchMaterialFileBuffer(material)
    if (!fileBuffer) {
      console.warn(`Could not retrieve file buffer for material ${material.id} (${material.title})`)
      return { totalExtracted: 0, totalFiltered: 0, totalSaved: 0 }
    }

    const fileType = (material.type || "").toLowerCase()
    const fileNameOrPath = (material.storage_path || material.source_url || "").toLowerCase()

    let extractionResult: { extracted: ExtractedImage[]; filteredCount: number } = {
      extracted: [],
      filteredCount: 0,
    }

    if (fileType === "pdf" || fileNameOrPath.endsWith(".pdf")) {
      extractionResult = await extractImagesFromPdf(fileBuffer)
    } else if (
      fileType === "pptx" ||
      fileType === "docx" ||
      fileNameOrPath.endsWith(".pptx") ||
      fileNameOrPath.endsWith(".docx")
    ) {
      extractionResult = await extractImagesFromOfficeZip(fileBuffer, fileType || fileNameOrPath)
    } else {
      return { totalExtracted: 0, totalFiltered: 0, totalSaved: 0 }
    }

    const { extracted, filteredCount } = extractionResult
    let savedCount = 0

    for (let index = 0; index < extracted.length; index++) {
      const item = extracted[index]
      const fileExt = item.filename.split(".").pop() || "png"
      const storagePath = `auto_extracted/${material.id}/${Date.now()}_img_${index + 1}.${fileExt}`

      // Upload to quiz-bank storage bucket
      const { error: uploadErr } = await serviceClient.storage
        .from("quiz-bank")
        .upload(storagePath, item.buffer, {
          contentType: item.contentType,
          upsert: true,
        })

      if (uploadErr) {
        console.error(`Failed to upload extracted image ${item.filename} to quiz-bank storage:`, uploadErr)
        continue
      }

      // Generate direct public Supabase Storage URL for public quiz-bank bucket
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fexsfbdvewlmvzfnwqul.supabase.co"
      const imageUrl = `${supabaseUrl}/storage/v1/object/public/quiz-bank/${storagePath}`

      // AI Triage classification via vision model
      const aiTriage = await classifyImageWithVision(item.buffer, item.contentType)

      // Grounding rule: only pre-fill draft if source_context (real nearby lecturer text) exists
      let draftFindings = ""
      if (item.source_context && item.source_context.trim().length > 0) {
        const cleanContext = item.source_context.trim()
        draftFindings = `[AI Draft - Unverified]: ${cleanContext.length > 350 ? cleanContext.slice(0, 350) + "..." : cleanContext}`
      }

      // Insert quiz_image_bank row
      const payload = {
        course_id: material.course_id,
        title: `${material.title} (Extracted Image ${index + 1})`,
        image_url: imageUrl,
        category: "other",
        question: "Identify the structure or clinical findings in this extracted specimen.",
        correct_findings: draftFindings, // Draft pre-filled ONLY if source_context present, else blank
        source_context: item.source_context || null,
        ai_triage: aiTriage,
        differential_diagnosis: null,
        source: `auto_extracted:${material.id}`,
        status: "archived", // ALWAYS archived
        uploaded_by: material.uploaded_by || null,
      }

      const { error: insertErr } = await serviceClient
        .from("quiz_image_bank")
        .insert(payload)

      if (insertErr) {
        console.error(`Failed to insert quiz_image_bank entry for extracted image ${item.filename}:`, insertErr)
      } else {
        savedCount++
      }
    }

    return {
      totalExtracted: extracted.length + filteredCount,
      totalFiltered: filteredCount,
      totalSaved: savedCount,
    }
  } catch (err) {
    console.error(`Error in processMaterialImageExtraction for material ${material.id}:`, err)
    return { totalExtracted: 0, totalFiltered: 0, totalSaved: 0 }
  }
}
