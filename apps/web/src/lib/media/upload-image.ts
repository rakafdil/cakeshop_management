import sharp from "sharp";
import { randomUUID } from "node:crypto";

import {
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import {
  storage,
  BUCKET_NAME,
} from "./storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FORMATS = [
  "jpeg",
  "png",
  "webp",
];

export async function uploadImage(file: File) {
  // 1. Validasi ukuran
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Maximum image size is 10MB");
  }

  // 2. Convert File menjadi Buffer
  const inputBuffer = Buffer.from(
    await file.arrayBuffer(),
  );

  // 3. Validasi format berdasarkan isi file
  const image = sharp(inputBuffer, {
    limitInputPixels: 25_000_000,
  });

  const metadata = await image.metadata();

  if (!metadata.format ||
      !ALLOWED_FORMATS.includes(metadata.format)) {
    throw new Error("Unsupported image format");
  }

  // 4. Compress dan convert menjadi WebP
  const compressedBuffer = await image
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 80,
    })
    .toBuffer();

  // 5. Generate unique filename
  const key = `products/${randomUUID()}.webp`;

  // 6. Upload ke Neon Object Storage
  await storage.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: compressedBuffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    size: compressedBuffer.length,
    contentType: "image/webp",
  };
}