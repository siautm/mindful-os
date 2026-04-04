import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { NoiseType } from "../lib/whiteNoise";
import {
  FOCUS_WALLPAPER_FALLBACK,
  FOCUS_WALLPAPER_MIXKIT_ID,
  mixkitPosterUrl,
  mixkitVideoUrl,
} from "../lib/focusWallpapers";

interface FocusLiveWallpaperProps {
  noiseType: NoiseType;
}

/**
 * Fullscreen looping video matched to the selected ambient sound; soft vignette for timer readability.
 * Falls back to a simple dual-orb gradient if the stream fails.
 */
export function FocusLiveWallpaper({ noiseType }: FocusLiveWallpaperProps) {
  const mixkitId = FOCUS_WALLPAPER_MIXKIT_ID[noiseType];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setVideoFailed(false);
  }, [noiseType, mixkitId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || mixkitId == null || videoFailed) return;
    el.muted = true;
    void el.play().catch(() => setVideoFailed(true));
  }, [mixkitId, noiseType, videoFailed]);

  const showVideo = mixkitId != null && !videoFailed;
  const fb = FOCUS_WALLPAPER_FALLBACK[noiseType];

  return (
    <div className={`absolute inset-0 overflow-hidden ${fb.base}`}>
      {showVideo && (
        <video
          ref={videoRef}
          key={`${mixkitId}-${noiseType}`}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scale(1.06)" }}
          src={mixkitVideoUrl(mixkitId)}
          poster={mixkitPosterUrl(mixkitId)}
          muted
          playsInline
          loop
          autoPlay
          onError={() => setVideoFailed(true)}
        />
      )}

      {!showVideo && (
        <div className="absolute inset-0">
          <motion.div
            className={`absolute left-[10%] top-[20%] size-[min(70vw,520px)] rounded-full ${fb.a} blur-[100px]`}
            animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
            transition={{ duration: fb.speed, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className={`absolute right-[5%] bottom-[15%] size-[min(65vw,480px)] rounded-full ${fb.b} blur-[110px]`}
            animate={{ x: [0, -35, 25, 0], y: [0, 25, -35, 0] }}
            transition={{ duration: fb.speed * 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      <div
        className={
          showVideo
            ? "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"
            : "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/70"
        }
        aria-hidden
      />
    </div>
  );
}
