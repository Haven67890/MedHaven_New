import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const rawEndpoint = process.env.B2_ENDPOINT || "s3.us-east-005.backblazeb2.com"
const host = rawEndpoint.replace(/^https?:\/\//, "").split("/")[0]
const endpoint = `https://${host}`

// Extract region e.g. "us-east-005" from "s3.us-east-005.backblazeb2.com"
const hostParts = host.split(".")
const region = hostParts.length >= 2 && hostParts[0] === "s3" ? hostParts[1] : "us-east-005"

const keyId = process.env.B2_KEY_ID || ""
const appKey = process.env.B2_APP_KEY || ""
export const DEFAULT_B2_BUCKET = process.env.B2_BUCKET_NAME || "medhaven-materials"

export const b2Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: keyId,
    secretAccessKey: appKey,
  },
})

export async function getB2SignedUrl(
  key: string,
  expiresIn = 3600,
  bucketName = DEFAULT_B2_BUCKET
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })
  return getSignedUrl(b2Client, command, { expiresIn })
}

export async function uploadToB2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
  bucketName = DEFAULT_B2_BUCKET
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  await b2Client.send(command)
}
