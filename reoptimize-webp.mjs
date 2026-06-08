import sharp from 'sharp';
import { readdir, rename, unlink } from 'fs/promises';
import { join } from 'path';

const IMAGE_DIR = 'src/assets/images/blog';
const QUALITY = 74;

const files = (await readdir(IMAGE_DIR)).filter(f => f.endsWith('.webp'));
console.log(`Re-optimizing ${files.length} WebP files at quality ${QUALITY}...\n`);

let done = 0;
let failed = 0;
let totalBefore = 0n;
let totalAfter = 0n;

for (const filename of files) {
  const srcPath = join(IMAGE_DIR, filename);
  const tmpPath = srcPath + '.tmp.webp';

  try {
    const { size: before } = await import('fs').then(fs => fs.promises.stat(srcPath));
    await sharp(srcPath).webp({ quality: QUALITY }).toFile(tmpPath);
    const { size: after } = await import('fs').then(fs => fs.promises.stat(tmpPath));

    await rename(tmpPath, srcPath);

    totalBefore += BigInt(before);
    totalAfter += BigInt(after);
    done++;

    if (done % 100 === 0) console.log(`  ${done}/${files.length}...`);
  } catch (e) {
    console.error(`  FAIL: ${filename} — ${e.message}`);
    try { await unlink(tmpPath); } catch {}
    failed++;
  }
}

const before = Number(totalBefore) / 1024 / 1024;
const after = Number(totalAfter) / 1024 / 1024;
const saved = before - after;
const pct = ((saved / before) * 100).toFixed(1);

console.log(`\nDone.`);
console.log(`Converted: ${done}  Failed: ${failed}`);
console.log(`Before: ${before.toFixed(1)}MB`);
console.log(`After:  ${after.toFixed(1)}MB`);
console.log(`Saved:  ${saved.toFixed(1)}MB  (${pct}% smaller)`);
