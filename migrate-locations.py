#!/usr/bin/env python3
"""
Generate src/content/locations/*.md files and update post frontmatter
to use location: slug references instead of embedded objects.
"""
import os
import re
import glob as glob_mod

POSTS_DIR = 'src/data/post'
LOCATIONS_DIR = 'src/content/locations'


def slugify(text):
    # Strip trailing ", Los Angeles" or ", Los Angeles, CA"
    text = re.sub(r',?\s*Los Angeles(?:,\s*CA)?$', '', text, flags=re.IGNORECASE).strip()
    # Lowercase
    text = text.lower()
    # Replace non-alphanumeric sequences with a single hyphen
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')


def parse_location_block(content):
    """Extract address, lat, lng from a post's location YAML block."""
    addr = re.search(r'^  address: "(.+?)"', content, re.MULTILINE)
    lat = re.search(r'^  lat: ([\d.eE+\-]+)', content, re.MULTILINE)
    lng = re.search(r'^  lng: ([\d.eE+\-]+)', content, re.MULTILINE)
    if addr:
        return (
            addr.group(1),
            float(lat.group(1)) if lat else None,
            float(lng.group(1)) if lng else None,
        )
    return None, None, None


# ── 1. Collect unique addresses ────────────────────────────────────────────────
locations = {}  # address -> {lat, lng, files}

for filepath in sorted(glob_mod.glob(f'{POSTS_DIR}/*.md')):
    content = open(filepath).read()
    if '\nlocation:\n' not in content:
        continue
    address, lat, lng = parse_location_block(content)
    if not address:
        continue
    if address not in locations:
        locations[address] = {'lat': lat, 'lng': lng, 'files': []}
    locations[address]['files'].append(filepath)

print(f'Found {len(locations)} unique addresses across {sum(len(v["files"]) for v in locations.values())} posts')

# ── 2. Create location collection files ───────────────────────────────────────
for address, data in locations.items():
    slug = slugify(address)
    title = re.sub(r',?\s*Los Angeles(?:,\s*CA)?$', '', address, flags=re.IGNORECASE).strip()
    lat = data['lat']
    lng = data['lng']

    lines = ['---', f'title: "{title}"', f'address: "{address}"']
    if lat is not None:
        lines.append(f'lat: {lat}')
    if lng is not None:
        lines.append(f'lng: {lng}')
    lines += ['---', '']

    out_path = f'{LOCATIONS_DIR}/{slug}.md'
    with open(out_path, 'w') as f:
        f.write('\n'.join(lines))
    print(f'  Created {out_path}  ({len(data["files"])} post(s))')

# ── 3. Update post frontmatter ─────────────────────────────────────────────────
updated = 0
for address, data in locations.items():
    slug = slugify(address)
    for filepath in data['files']:
        content = open(filepath).read()

        # Replace the multi-line location block with a single-line reference.
        # Pattern covers optional lat and lng lines.
        new_content = re.sub(
            r'location:\n  address: ".*?"\n(?:  lat: [\d.eE+\-]+\n)?(?:  lng: [\d.eE+\-]+\n)?',
            f'location: {slug}\n',
            content,
            flags=re.MULTILINE,
        )

        if new_content != content:
            with open(filepath, 'w') as f:
                f.write(new_content)
            updated += 1

print(f'\nUpdated {updated} post files.')
