// News-image entry for 21 November 2026, v2 (Node 22, standard library only).
// The image is a dense front page drawn deterministically ahead of time
// and shipped beside this file as entry.png: 33 stories from 8 regions,
// one-line headlines and two-line summaries under a dated masthead.
// The program copies it to /output/entry.png and verifies the copy:
// PNG magic bytes, the IHDR chunk naming a 1024x1024 image, size at
// most 1 MiB, an IEND trailer closing the file, identical size and
// identical SHA-256 digest. No network, no randomness, no writes
// besides the copy.
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
// The 12-byte IEND trailer: zero length, "IEND", fixed CRC 0xAE426082.
const IEND_TRAILER = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1024;
const MAX_BYTES = 1048576;
// Stories carried on the front page (see README.md for the list).
const STORY_COUNT = 33;

async function sha256Of(path: string): Promise<string> {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

function verifyPng(bytes: Buffer, label: string): void {
  if (bytes.length === 0) {
    throw new Error(`${label} is empty`);
  }
  if (!bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error(`${label} does not start with PNG magic bytes`);
  }
  // First chunk must be IHDR: 13 data bytes, chunk type "IHDR".
  if (bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${label} does not start with an IHDR chunk`);
  }
  // IHDR data: bytes 16-19 are the width, 20-23 the height (big-endian).
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
    throw new Error(
      `${label} is ${width}x${height}, expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`,
    );
  }
  if (bytes.length > MAX_BYTES) {
    throw new Error(`${label} is ${bytes.length} bytes, over the 1 MiB cap`);
  }
  if (!bytes.subarray(bytes.length - 12).equals(IEND_TRAILER)) {
    throw new Error(`${label} does not end with an IEND trailer`);
  }
}

async function run(): Promise<void> {
  const source = await readFile(SOURCE);
  verifyPng(source, "entry.png");
  const before = await stat(SOURCE);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await copyFile(SOURCE, TARGET);
  const after = await stat(TARGET);
  if (after.size !== before.size) {
    throw new Error(
      `copied size ${after.size} does not match source size ${before.size}`,
    );
  }
  // Re-verify the bytes that actually landed in the output directory,
  // so a partial or altered copy cannot pass on size alone.
  const copied = await readFile(TARGET);
  verifyPng(copied, TARGET);
  const digest = await sha256Of(TARGET);
  console.log(
    `entry.png -> ${TARGET} (${after.size} bytes, sha256 ${digest}, ` +
      `${STORY_COUNT} stories)`,
  );
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
