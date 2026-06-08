import sharp from 'sharp';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname, basename } from 'path';

const IMAGE_DIR = 'src/assets/images/blog';
const POST_DIR = 'src/data/post';

// Convert all non-webp images
const files = await readdir(IMAGE_DIR);
const toConvert = files.filter(f => {
  const ext = extname(f).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
});

console.log(`Converting ${toConvert.length} images to WebP (keeping originals)...\n`);

let converted = 0;
let failed = 0;

for (const filename of toConvert) {
  const srcPath = join(IMAGE_DIR, filename);
  const stem = basename(filename, extname(filename));
  const destPath = join(IMAGE_DIR, `${stem}.webp`);

  try {
    await sharp(srcPath)
      .webp({ quality: 82 })
      .toFile(destPath);
    converted++;
    if (converted % 50 === 0) console.log(`  ${converted}/${toConvert.length} done...`);
  } catch (e) {
    console.error(`  FAIL: ${filename} — ${e.message}`);
    failed++;
  }
}

console.log(`\nConverted: ${converted}  Failed: ${failed}`);

// Update markdown files — replace image extensions with .webp
const mdFiles = (await readdir(POST_DIR)).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
console.log(`\nUpdating ${mdFiles.length} markdown files...`);

let mdUpdated = 0;
for (const mdFile of mdFiles) {
  const path = join(POST_DIR, mdFile);
  const original = await readFile(path, 'utf-8');
  // Replace ~/assets/images/blog/hash.jpg|jpeg|png with .webp
  const updated = original.replace(
    /(~\/assets\/images\/blog\/[a-f0-9]+)\.(jpg|jpeg|png)/gi,
    '$1.webp'
  );
  if (updated !== original) {
    await writeFile(path, updated, 'utf-8');
    mdUpdated++;
  }
}

console.log(`Updated ${mdUpdated} markdown files`);
console.log('\nDone.');
