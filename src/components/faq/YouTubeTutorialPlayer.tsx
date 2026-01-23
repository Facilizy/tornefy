import { useEffect, useId, useMemo, useRef, useState } from "react";
import { loadYouTubeIframeApi } from "@/lib/youtube";

type Props = {
  videoId: string;
  startSeconds?: number;
  className?: string;
  onProgress?: (params: { currentTime: number; duration: number; isEnded: boolean }) => void;
};

export function YouTubeTutorialPlayer({
  videoId,
  startSeconds,
  className,
  onProgress,
}: Props) {
  const reactId = useId();
  const elementId = useMemo(
    () => `yt-player-${reactId.replace(/[:]/g, "-")}-${videoId}`,
    [reactId, videoId]
  );

  const playerRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const stopPolling = () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = window.setInterval(() => {
        const p = playerRef.current;
        if (!p?.getCurrentTime || !p?.getDuration) return;
        const currentTime = Number(p.getCurrentTime() || 0);
        const duration = Number(p.getDuration() || 0);
        if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return;
        onProgress?.({ currentTime, duration, isEnded: false });
      }, 1000);
    };

    (async () => {
      try {
        await loadYouTubeIframeApi();
        if (cancelled) return;

        const YT = (window as any).YT;
        if (!YT?.Player) return;

        // Destroy existing player (if re-rendered with same element id)
        try {
          playerRef.current?.destroy?.();
        } catch {
          // ignore
        }

        playerRef.current = new YT.Player(elementId, {
          videoId,
          playerVars: {
            // We need JS API for currentTime tracking + resume
            enablejsapi: 1,
            origin: window.location.origin,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (e: any) => {
              if (cancelled) return;
              setReady(true);
              const s = typeof startSeconds === "number" ? startSeconds : 0;
              if (s > 0) {
                try {
                  // Seek without autoplay.
                  e.target.seekTo(s, true);
                } catch {
                  // ignore
                }
              }
            },
            onStateChange: (e: any) => {
              if (cancelled) return;
              // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
              const state = e?.data;
              if (state === 1) startPolling();
              else stopPolling();

              if (state === 0) {
                // ended
                const p = playerRef.current;
                const duration = Number(p?.getDuration?.() || 0);
                onProgress?.({ currentTime: duration, duration, isEnded: true });
              }
              if (state === 2) {
                // paused -> flush last known time
                const p = playerRef.current;
                const currentTime = Number(p?.getCurrentTime?.() || 0);
                const duration = Number(p?.getDuration?.() || 0);
                if (duration > 0) onProgress?.({ currentTime, duration, isEnded: false });
              }
            },
          },
        });
      } catch {
        // silent
      }
    })();

    return () => {
      cancelled = true;
      stopPolling();
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, elementId]);

  return (
    <div className={className}>
      {/* The YouTube API replaces this div with an iframe */}
      <div id={elementId} className="w-full h-full" />
      {!ready ? (
        <div className="sr-only">Carregando vídeo…</div>
      ) : null}
    </div>
  );
}
