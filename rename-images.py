#!/usr/bin/env python3
"""
Rename WebP images from Sanity hashes to slug-based names.
e.g. abc123def.webp -> thirty-posts-now-what-01.webp
Originals (jpg/png) are left untouched.
"""

import re
from pathlib import Path

POST_DIR = Path('src/data/post')
IMAGE_DIR = Path('src/assets/images/blog')

IMG_PATTERN = re.compile(r'~/assets/images/blog/([a-f0-9]+\.webp)', re.IGNORECASE)

# Pass 1: walk every post and claim hash -> new name (first post wins)
hash_to_new = {}   # 'abc123.webp' -> 'my-post-slug-01.webp'
new_names_used = set()  # guard against any cross-post collisions

md_files = sorted(POST_DIR.glob('*.md'))
print(f'Scanning {len(md_files)} posts...\n')

for md_file in md_files:
    slug = md_file.stem
    content = md_file.read_text(encoding='utf-8')

    # Collect hashes in document order, skip already-claimed ones
    seen_in_post = set()
    counter = 1
    for match in IMG_PATTERN.finditer(content):
        h = match.group(1)
        if h in seen_in_post:
            continue
        seen_in_post.add(h)

        if h in hash_to_new:
            continue  # already claimed by an earlier post

        # Find a unique name for this hash
        candidate = f'{slug}-{counter:02d}.webp'
        while candidate in new_names_used:
            counter += 1
            candidate = f'{slug}-{counter:02d}.webp'

        hash_to_new[h] = candidate
        new_names_used.add(candidate)
        counter += 1

print(f'Mapped {len(hash_to_new)} unique image hashes to slug-based names.')

# Pass 2: rename the .webp files
print(f'Renaming WebP files...')
renamed = 0
missing = 0
for old_name, new_name in hash_to_new.items():
    old_path = IMAGE_DIR / old_name
    new_path = IMAGE_DIR / new_name
    if old_path.exists():
        old_path.rename(new_path)
        renamed += 1
    else:
        print(f'  NOT FOUND: {old_name}')
        missing += 1

print(f'  Renamed: {renamed}  Not found: {missing}')

# Pass 3: update all markdown files
print(f'Updating markdown files...')
updated = 0
for md_file in md_files:
    content = md_file.read_text(encoding='utf-8')
    new_content = content
    for old_name, new_name in hash_to_new.items():
        new_content = new_content.replace(
            f'~/assets/images/blog/{old_name}',
            f'~/assets/images/blog/{new_name}'
        )
    if new_content != content:
        md_file.write_text(new_content, encoding='utf-8')
        updated += 1

print(f'  Updated: {updated} files')

# Report unreferenced webps (not in any post)
all_webp = {f.name for f in IMAGE_DIR.glob('*.webp')}
claimed_old = set(hash_to_new.keys())
new_names = set(hash_to_new.values())
unreferenced = all_webp - claimed_old - new_names
if unreferenced:
    print(f'\n{len(unreferenced)} WebP files not referenced in any post (left as-is):')
    for f in sorted(unreferenced):
        print(f'  {f}')

print('\nDone!')
