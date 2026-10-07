import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Testes puros (utils/hooks) rodam em "node"; quem precisa de DOM declara
// "// @vitest-environment jsdom" no topo do arquivo.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["./vitest.setup.js"],
  },
});
