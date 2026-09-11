import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { container } from "@/lib/container";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const assetId = resolvedParams.id;
    const asset = await container.assetRepository.findById(assetId);

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Optional user authorization check if asset has userId
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    if (asset.props.userId && currentUserId && asset.props.userId !== currentUserId) {
      // Allow viewing or restrict if needed
    }

    let filePath = asset.filePath;
    // Normalize relative paths
    if (filePath.startsWith("/media/")) {
      const rel = filePath.replace("/media/", "");
      const candidates = [
        path.join(process.cwd(), "storage", rel),
        path.join(process.cwd(), "storage", "jobs", rel),
        path.join(process.cwd(), "tmp", "jobs", rel),
        path.join(process.cwd(), "tmp", rel),
        path.join(process.cwd(), "public", "media", rel),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          filePath = cand;
          break;
        }
      }
    } else if (filePath.startsWith("/api/media/")) {
      const rel = filePath.replace("/api/media/", "");
      const candidates = [
        path.join(process.cwd(), "storage", rel),
        path.join(process.cwd(), "tmp", "jobs", rel),
        path.join(process.cwd(), "public", "media", rel),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          filePath = cand;
          break;
        }
      }
    }

    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath) || !fs.statSync(/*turbopackIgnore: true*/ filePath).isFile()) {
      return NextResponse.json({ error: "Asset binary file missing from storage" }, { status: 404 });
    }

    const stat = await fs.promises.stat(/*turbopackIgnore: true*/ filePath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".flac": "audio/flac",
      ".m4a": "audio/mp4",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogg": "audio/ogg",
      ".json": "application/json",
    };
    const contentType = asset.props.mimeType || mimeTypes[ext] || "application/octet-stream";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ filePath, { start, end });
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new Response(stream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${asset.name || path.basename(filePath)}"`,
        },
      });
    } else {
      const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ filePath);
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
          "Content-Disposition": `inline; filename="${asset.name || path.basename(filePath)}"`,
        },
      });
    }
  } catch (err: any) {
    console.error("[/api/assets/[id]] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve asset" }, { status: 500 });
  }
}
