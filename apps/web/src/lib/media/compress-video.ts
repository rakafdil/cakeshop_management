import { spawn } from "node:child_process";

export function compressVideo(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn("ffmpeg", [
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-crf",
      "26",
      "-preset",
      "medium",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-y",
      outputPath,
    ]);

    process.on("error", reject);

    process.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });
}
