import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["favicon.ico", "favicon.svg", "robots.txt"],
      manifest: {
        name: "Tornefy",
        short_name: "Tornefy",
        description: "Plataforma completa para organizar e gerenciar treinos de e-sports",
        categories: ["games", "entertainment", "sports"],
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b0b0f",
        theme_color: "#0b0b0f",
        orientation: "portrait-primary",
        screenshots: [
          {
            src: "/favicon.svg",
            sizes: "540x720",
            type: "image/svg+xml",
            form_factor: "narrow",
          },
          {
            src: "/favicon.svg",
            sizes: "720x540",
            type: "image/svg+xml",
            form_factor: "wide",
          },
        ],
        icons: [
          {
            src: "/favicon.svg",
            sizes: "48x48 72x72 96x96 128x128 256x256 512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

