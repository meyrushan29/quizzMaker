import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.quizzmaker.app",
  appName: "QuizzMaker",
  webDir: "dist",
  server: {
    // Loads the live Vercel deployment directly instead of bundling a
    // local copy, so frontend updates ship instantly via Vercel without
    // needing a new Play Store release. Requests stay same-origin, so
    // no backend CORS changes are needed.
    url: "https://quizz-maker-seven.vercel.app",
    cleartext: false,
  },
}

export default config
