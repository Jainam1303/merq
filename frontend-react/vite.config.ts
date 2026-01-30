import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { transform } from "esbuild";

const jsxInJs = () => ({
  name: "jsx-in-js",
  enforce: "pre" as const,
  async transform(code: string, id: string) {
    if (id.includes(`${path.sep}src${path.sep}`) && id.endsWith(".js")) {
      const result = await transform(code, { loader: "jsx", jsx: "automatic" });
      return { code: result.code, map: result.map };
    }
    return null;
  }
});

export default defineConfig({
  plugins: [
    jsxInJs(),
    react({
      include: /src[\\/].*\.(js|jsx|ts|tsx)$/
    })
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx"
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "next/link": path.resolve(__dirname, "src/shims/next-link.tsx"),
      "next/navigation": path.resolve(__dirname, "src/shims/next-navigation.ts")
    }
  },
  server: {
    port: 5173
  },
  build: {
    outDir: "dist"
  }
});
