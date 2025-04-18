import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  base: '/updates-display/',
  build: {
    target: "esnext",
  },
  plugins: [
    tailwindcss(),
  ],
});
