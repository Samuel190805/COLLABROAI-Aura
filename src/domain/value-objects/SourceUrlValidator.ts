/**
 * Source URL Validator & Normalizer
 * Fix 3: Full YouTube URL Shape Normalization & Search Query Auto-Detection
 * Fix 4: Audio Streaming Resolution (Spotify, Apple Music) & Video DRM Protection Rejection
 */

// List of known DRM-protected video streaming platforms (with EME/Widevine) that cannot be directly extracted
export const VIDEO_DRM_DOMAINS = [
  "hotstar.com",
  "jiohotstar.com",
  "jiocinema.com",
  "netflix.com",
  "primevideo.com",
  "amazon.com/gp/video",
  "amazon.com/video",
  "disneyplus.com",
  "tv.apple.com",
  "hulu.com",
  "hbomax.com",
  "max.com",
  "peacocktv.com",
  "zee5.com",
  "sonyliv.com",
  "paramountplus.com",
  "crunchyroll.com",
  "voot.com",
];

// Openly accessible / supported domains for media extraction
export const SUPPORTED_ALLOWLIST_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "m.youtube.com",
  "music.youtube.com",
  "soundcloud.com",
  "bandcamp.com",
  "vimeo.com",
  "dailymotion.com",
  "twitch.tv",
  "mixcloud.com",
  "archive.org",
  "spotify.com",
  "music.apple.com",
];

export interface ValidatedSourceUrl {
  isValid: boolean;
  isDrmProtected: boolean;
  normalizedUrl: string;
  youtubeVideoId: string | null;
  platform: string;
  error?: string;
}

/**
 * Normalizes all common YouTube URL formats to a canonical 11-char video ID and standard URL.
 */
export function extractCanonicalYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Raw 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/watch\?(?:[^#\s]*&)?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validates any incoming media URL or search query against DRM restrictions and supported platform rules.
 */
export function validateAndNormalizeSourceUrl(rawUrl: string): ValidatedSourceUrl {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return {
      isValid: false,
      isDrmProtected: false,
      normalizedUrl: "",
      youtubeVideoId: null,
      platform: "unknown",
      error: "Please enter a valid media URL or search query",
    };
  }

  const trimmed = rawUrl.trim();

  // 1. Direct ytsearch or search query
  if (trimmed.startsWith("ytsearch:") || trimmed.startsWith("ytsearch1:")) {
    return {
      isValid: true,
      isDrmProtected: false,
      normalizedUrl: trimmed,
      youtubeVideoId: null,
      platform: "search",
    };
  }

  // 2. Check for direct 11-char YouTube ID
  const ytId = extractCanonicalYouTubeId(trimmed);
  if (ytId && !trimmed.includes("http") && !trimmed.includes(".")) {
    return {
      isValid: true,
      isDrmProtected: false,
      normalizedUrl: `https://www.youtube.com/watch?v=${ytId}`,
      youtubeVideoId: ytId,
      platform: "youtube",
    };
  }

  // 3. Detect if input is a plain text song/artist search rather than a structured URL
  const looksLikeUrl =
    /^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/|\?|$))/i.test(trimmed);

  if (!looksLikeUrl && trimmed.length >= 2) {
    return {
      isValid: true,
      isDrmProtected: false,
      normalizedUrl: `ytsearch1:${trimmed}`,
      youtubeVideoId: null,
      platform: "search",
    };
  }

  // 4. Parse URL safely
  let parsedUrl: URL;
  try {
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    parsedUrl = new URL(withProtocol);
  } catch {
    // If not a standard URL, treat as search query for seamless 1-click experience
    return {
      isValid: true,
      isDrmProtected: false,
      normalizedUrl: `ytsearch1:${trimmed}`,
      youtubeVideoId: null,
      platform: "search",
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  const fullPath = parsedUrl.pathname.toLowerCase();

  // 5. Spotify Track / Album Support (Audio Resolution)
  if (hostname === "spotify.com" || hostname.endsWith(".spotify.com")) {
    return {
      isValid: true,
      isDrmProtected: false,
      normalizedUrl: trimmed,
      youtubeVideoId: null,
      platform: "spotify",
    };
  }

  // 6. Apple Music Support (Audio Resolution)
  if (hostname === "music.apple.com" || hostname.endsWith(".music.apple.com")) {
    return {
      isValid: true,
      isDrmProtected: false,
      normalizedUrl: trimmed,
      youtubeVideoId: null,
      platform: "apple_music",
    };
  }

  // 7. Check if domain is a known DRM-protected video platform
  for (const drmDomain of VIDEO_DRM_DOMAINS) {
    if (
      hostname === drmDomain ||
      hostname.endsWith(`.${drmDomain}`) ||
      (hostname + fullPath).includes(drmDomain)
    ) {
      return {
        isValid: false,
        isDrmProtected: true,
        normalizedUrl: trimmed,
        youtubeVideoId: null,
        platform: drmDomain,
        error: "This video source is protected by DRM encryption (e.g. Netflix / Hotstar) and cannot be extracted.",
      };
    }
  }

  // 8. Canonical YouTube URL shape
  if (ytId) {
    return {
      isValid: true,
      isDrmProtected: false,
      normalizedUrl: `https://www.youtube.com/watch?v=${ytId}`,
      youtubeVideoId: ytId,
      platform: "youtube",
    };
  }

  // 9. Check against supported allow-list domains
  const isSupportedAllowlisted = SUPPORTED_ALLOWLIST_DOMAINS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  // 10. Check if direct audio or video file URL
  const isDirectMediaFile = /\.(mp3|wav|flac|m4a|aac|ogg|mp4|webm|mkv|mov|avi)(\?.*)?$/i.test(
    parsedUrl.pathname
  );

  if (isSupportedAllowlisted || isDirectMediaFile) {
    return {
      isValid: true,
      isDrmProtected: false,
      normalizedUrl: parsedUrl.toString(),
      youtubeVideoId: null,
      platform: isDirectMediaFile ? "direct_file" : hostname,
    };
  }

  // 11. Generic web URL
  return {
    isValid: true,
    isDrmProtected: false,
    normalizedUrl: parsedUrl.toString(),
    youtubeVideoId: null,
    platform: hostname,
  };
}

export const DRM_DOMAINS = VIDEO_DRM_DOMAINS;
export default validateAndNormalizeSourceUrl;
