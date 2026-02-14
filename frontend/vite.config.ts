import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    // Keep these (required)
    react(),
    tailwindcss(),

    // Add PWA
    VitePWA({
      registerType: "autoUpdate",

      // ✅ In dev, I recommend keeping this OFF to avoid caching headaches.
      // Turn it on later if you specifically want to test SW in `npm run dev`.
      devOptions: {
        enabled: false,
      },

      manifest: {
        name: "EcoQuest",
        short_name: "EcoQuest",
        description: "Recycle game + carbon-aware compute",
        theme_color: "#0ea5a4",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        // Prevent SPA fallback from breaking icons/manifest
        navigateFallbackDenylist: [
          /^\/pwa-.*\.png$/,
          /^\/favicon\.ico$/,
          /^\/apple-touch-icon\.png$/,
          /^\/manifest\.webmanifest$/,
          /^\/assets\/.*$/,
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Keep as-is
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
