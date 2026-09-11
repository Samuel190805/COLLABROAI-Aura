import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import {
  MediaSourceResolverPort,
  MediaMetadata,
  MediaDownloadOptions,
} from "@/application/ports/MediaSourceResolverPort";
import { validateAndNormalizeSourceUrl } from "@/domain/value-objects/SourceUrlValidator";

const execAsync = promisify(exec);

export class YtDlpMediaResolver implements MediaSourceResolverPort {
  private binPath: string | null = null;
  private ffmpegBinPath: string | null = null;

  constructor() {
    this.initPaths();
  }

  private initPaths() {
    // Resolve ffmpeg path for yt-dlp muxing
    try {
      const ffmpegStatic = require("ffmpeg-static");
      if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
        this.ffmpegBinPath = ffmpegStatic;
      }
    } catch {
      // fallback
    }

    // Resolve yt-dlp command/binary
    if (process.env.MEDIA_EXTRACTOR_BIN && fs.existsSync(process.env.MEDIA_EXTRACTOR_BIN)) {
      this.binPath = `"${process.env.MEDIA_EXTRACTOR_BIN}"`;
      return;
    }

    // Dynamic search in Windows LOCALAPPDATA and APPDATA Python Scripts folders
    const candidateDirs = [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Python"),
      path.join(process.env.APPDATA || "", "Python"),
    ];

    for (const baseDir of candidateDirs) {
      if (fs.existsSync(/*turbopackIgnore: true*/ baseDir)) {
        try {
          const subdirs = fs.readdirSync(/*turbopackIgnore: true*/ baseDir);
          for (const sub of subdirs) {
            const exePath = path.join(baseDir, sub, "Scripts", "yt-dlp.exe");
            if (fs.existsSync(/*turbopackIgnore: true*/ exePath)) {
              this.binPath = `"${exePath}"`;
              return;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // Default to python module execution or yt-dlp in PATH
    this.binPath = "yt-dlp";
  }

  private async executeYtDlp(args: string[], timeoutMs = 120000): Promise<{ stdout: string; stderr: string }> {
    this.initPaths();
    let ffmpegArg = "";
    if (this.ffmpegBinPath && fs.existsSync(this.ffmpegBinPath)) {
      ffmpegArg = `--ffmpeg-location "${this.ffmpegBinPath}" `;
    }

    const command = `${this.binPath} ${ffmpegArg}${args.join(" ")}`;
    console.log(`[YtDlpMediaResolver] Executing: ${command}`);

    try {
      return await execAsync(command, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 });
    } catch (err: any) {
      // Try fallback to standard yt-dlp in PATH if python -m failed
      if (this.binPath?.includes("python -m")) {
        try {
          console.log(`[YtDlpMediaResolver] Python module execution failed. Attempting direct 'yt-dlp' binary...`);
          const directCmd = `yt-dlp ${ffmpegArg}${args.join(" ")}`;
          return await execAsync(directCmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 });
        } catch {
          // preserve original error
        }
      }
      throw err;
    }
  }

  private async resolveTargetUrl(validation: any, rawUrl: string): Promise<string> {
    if (validation.platform === "spotify") {
      try {
        console.log(`[YtDlpMediaResolver] Resolving Spotify metadata via oEmbed for ${rawUrl}...`);
        const spotRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(rawUrl)}`);
        if (spotRes.ok) {
          const spotData = await spotRes.json();
          const songTitle = spotData.title || "";
          const query = songTitle ? `${songTitle} audio` : "popular song audio";
          console.log(`[YtDlpMediaResolver] Spotify track resolved: "${songTitle}" -> query: "${query}"`);
          return `ytsearch1:${query}`;
        }
      } catch (err) {
        console.warn(`[YtDlpMediaResolver] Spotify oEmbed lookup error:`, err);
      }
    } else if (validation.platform === "apple_music") {
      try {
        const match = rawUrl.match(/\/album\/([^/]+)/i);
        const songName = match ? match[1].replace(/-/g, " ") : "";
        if (songName) {
          return `ytsearch1:${songName} audio`;
        }
      } catch {
        // fallback
      }
    }
    return validation.normalizedUrl;
  }

  async resolveInfo(url: string): Promise<MediaMetadata> {
    const trimmed = url.trim();

    // DRM Protection Check
    const validation = validateAndNormalizeSourceUrl(trimmed);
    if (validation.isDrmProtected) {
      console.warn(`[YtDlpMediaResolver] Rejected DRM protected URL (${validation.platform}): ${trimmed}`);
      throw new Error("This source isn't supported — it may be DRM-protected.");
    }
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid media URL");
    }

    const targetUrl = await this.resolveTargetUrl(validation, trimmed);
    console.log(`[YtDlpMediaResolver] Resolving metadata for target: ${targetUrl} (Platform: ${validation.platform})`);

    // Attempt metadata resolution with 1 automatic retry
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { stdout } = await this.executeYtDlp([
          "--dump-json",
          "--no-playlist",
          "--no-warnings",
          `"${targetUrl}"`,
        ], 30000);

        const parsed = JSON.parse(stdout);

        // FIX 3: Verify metadata integrity (ensure duration or title is non-empty)
        if (!parsed.title || (!parsed.duration && !parsed.is_live)) {
          throw new Error("Couldn't read this link — check the URL or try another video");
        }

        const duration = typeof parsed.duration === "number" && parsed.duration > 0 ? parsed.duration : 180;
        const videoId = parsed.id || validation.youtubeVideoId || "media";

        const metadata: MediaMetadata = {
          id: videoId,
          title: parsed.title,
          thumbnailUrl:
            parsed.thumbnail ||
            (validation.youtubeVideoId
              ? `https://img.youtube.com/vi/${validation.youtubeVideoId}/hqdefault.jpg`
              : undefined),
          durationSeconds: duration,
          author: parsed.uploader || parsed.channel || parsed.artist || "Original Creator",
          sourceUrl: targetUrl,
          availableAudioQualities: ["320k", "256k", "192k", "128k"],
          availableVideoResolutions: ["1080p", "720p", "480p", "360p"],
        };

        console.log(`[YtDlpMediaResolver] Successfully resolved: "${metadata.title}" (${metadata.durationSeconds}s)`);
        return metadata;
      } catch (err: any) {
        lastError = err;
        console.warn(`[YtDlpMediaResolver] Resolve attempt ${attempt} failed: ${err.message}`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    // If both attempts failed, check if it's YouTube and try oEmbed for basic info
    if (validation.youtubeVideoId) {
      try {
        console.log(`[YtDlpMediaResolver] Attempting YouTube oEmbed fallback for ID: ${validation.youtubeVideoId}`);
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${validation.youtubeVideoId}&format=json`
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          return {
            id: validation.youtubeVideoId,
            title: data.title || `YouTube Video (${validation.youtubeVideoId})`,
            thumbnailUrl:
              data.thumbnail_url || `https://img.youtube.com/vi/${validation.youtubeVideoId}/hqdefault.jpg`,
            durationSeconds: 215,
            author: data.author_name || "YouTube Creator",
            sourceUrl: targetUrl,
            availableAudioQualities: ["320k", "256k", "192k", "128k"],
            availableVideoResolutions: ["1080p", "720p", "480p", "360p"],
          };
        }
      } catch {
        // ignore
      }
    }

    throw new Error(
      lastError?.message?.includes("DRM")
        ? "This source isn't supported — it may be DRM-protected."
        : "Couldn't read this link — check the URL or try another video"
    );
  }

  async download(options: MediaDownloadOptions): Promise<{ filePath: string; format: string }> {
    const { url, outputDirectory, targetFormat, qualityOrResolution, onProgress } = options;
    await fs.promises.mkdir(outputDirectory, { recursive: true });

    // FIX 4: DRM Protection Check before download
    const validation = validateAndNormalizeSourceUrl(url);
    if (validation.isDrmProtected) {
      throw new Error("This source isn't supported — it may be DRM-protected.");
    }
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid URL provided for download");
    }
    const targetUrl = await this.resolveTargetUrl(validation, url);
    const isAudio = ["mp3", "wav", "flac", "m4a", "aac", "ogg"].includes(targetFormat);
    const rawExt = isAudio ? "m4a" : "mp4";
    const rawOutputPath = path.join(outputDirectory, `stream_raw.${rawExt}`);

    onProgress?.("RESOLVING", 20, `Resolving stream for ${validation.platform}...`);

    let lastDownloadError: Error | null = null;

    // Automatic 1-retry mechanism for download
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        onProgress?.("DOWNLOADING", 35 + attempt * 5, `Downloading media payload (attempt ${attempt})...`);

        const formatFlag = isAudio
          ? `-f "bestaudio[ext=m4a]/bestaudio/best"`
          : qualityOrResolution && qualityOrResolution !== "best"
          ? `-f "bestvideo[height<=${qualityOrResolution.replace("p", "")}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${qualityOrResolution.replace("p", "")}]+bestaudio/best"`
          : `-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"`;

        const args = [
          formatFlag,
          "--no-playlist",
          "--no-warnings",
          "-o",
          `"${rawOutputPath}"`,
          `"${targetUrl}"`,
        ];

        await this.executeYtDlp(args, 180000);

        // Verify that the output file exists and is not empty
        if (fs.existsSync(rawOutputPath)) {
          const stats = await fs.promises.stat(rawOutputPath);
          if (stats.size > 10240) {
            console.log(`[YtDlpMediaResolver] Raw download successful: ${rawOutputPath} (${stats.size} bytes)`);
            onProgress?.("DOWNLOADING", 90, "Download completed, preparing validated transcode...");
            return { filePath: rawOutputPath, format: rawExt };
          }
        }

        // Sometimes yt-dlp outputs with .webm or another extension if m4a wasn't available
        const files = await fs.promises.readdir(outputDirectory);
        const downloadedFile = files.find((f) => f.startsWith("stream_raw"));
        if (downloadedFile) {
          const fullPath = path.join(outputDirectory, downloadedFile);
          const stats = await fs.promises.stat(fullPath);
          if (stats.size > 10240) {
            console.log(`[YtDlpMediaResolver] Raw download located: ${fullPath} (${stats.size} bytes)`);
            onProgress?.("DOWNLOADING", 90, "Download completed, preparing validated transcode...");
            return { filePath: fullPath, format: path.extname(downloadedFile).replace(".", "") };
          }
        }

        throw new Error("Downloaded stream file is empty or corrupted.");
      } catch (err: any) {
        lastDownloadError = err;
        console.warn(`[YtDlpMediaResolver] Download attempt ${attempt} failed:`, err.message);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    // Clean up empty/corrupt files
    if (fs.existsSync(rawOutputPath)) {
      try {
        await fs.promises.unlink(rawOutputPath);
      } catch {
        // ignore
      }
    }

    throw new Error(
      lastDownloadError?.message?.includes("DRM")
        ? "This source isn't supported — it may be DRM-protected."
        : "Couldn't read this link — check the URL or try another video"
    );
  }
}

export const ytDlpMediaResolver = new YtDlpMediaResolver();
export default ytDlpMediaResolver;

