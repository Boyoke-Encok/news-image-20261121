// News-image entry for 21 November 2026 (Node 22, standard library only).
// The image is drawn deterministically ahead of time and shipped beside
// this file as entry.png; the program copies it to /output/entry.png and
// verifies the copy: PNG magic bytes, identical size and identical
// SHA-256 digest. No network, no randomness, no writes besides the copy.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const SOURCE = new URL("./entry.png", import.meta.url);
const TARGET = join(OUTPUT_DIR, "entry.png");
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function sha256Of(path: string): Promise<string> {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

async function run(): Promise<void> {
  const source = await readFile(SOURCE);
  if (source.length === 0) {
    throw new Error("entry.png is empty");
  }
  if (!source.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error("entry.png does not start with PNG magic bytes");
  }
  // IHDR: bytes 16-19 are the width, 20-23 the height (big-endian).
  const width = source.readUInt32BE(16);
  const height = source.readUInt32BE(20);
  if (width !== 1024 || height !== 1024) {
    throw new Error(`entry.png is ${width}x${height}, expected 1024x1024`);
  }
  if (source.length > 1048576) {
    throw new Error(`entry.png is ${source.length} bytes, over the 1 MiB cap`);
  }
  const before = await stat(SOURCE);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await copyFile(SOURCE, TARGET);
  const after = await stat(TARGET);
  if (after.size !== before.size) {
    throw new Error(
      `copied size ${after.size} does not match source size ${before.size}`,
    );
  }
  const digest = await sha256Of(TARGET);
  console.log(`entry.png -> ${TARGET} (${after.size} bytes, sha256 ${digest})`);
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
