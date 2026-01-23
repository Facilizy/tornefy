// Lightweight loader for the YouTube IFrame API.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve, reject) => {
    try {
      const existing = document.querySelector<HTMLScriptElement>("script[data-yt-iframe-api]");
      if (existing) {
        // Script exists but API isn't ready yet.
        window.onYouTubeIframeAPIReady = () => resolve();
        return;
      }

      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.defer = true;
      tag.dataset.ytIframeApi = "true";
      tag.onerror = () => reject(new Error("Falha ao carregar YouTube IFrame API"));

      window.onYouTubeIframeAPIReady = () => resolve();

      document.head.appendChild(tag);
    } catch (e) {
      reject(e);
    }
  });

  return ytApiPromise;
}
