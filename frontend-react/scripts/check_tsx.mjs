import { promises as fs } from "node:fs";
import path from "node:path";
import { transform } from "esbuild";

const root = path.resolve("src");

const walk = async (dir, acc = []) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, acc);
    } else if (entry.isFile() && full.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
};

const main = async () => {
  const files = await walk(root);
  for (const file of files) {
    const code = await fs.readFile(file, "utf8");
    try {
      await transform(code, { loader: "tsx", jsx: "automatic" });
    } catch (error) {
      console.error(`TSX parse failed: ${file}`);
      console.error(error.message || error);
      process.exit(1);
    }
  }
  console.log(`OK: ${files.length} .tsx files parsed as TSX`);
};

main();
