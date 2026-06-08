#!/usr/bin/env python3
"""
Add alt text to empty image tags in all markdown posts.
Strategy: use the post title + sequential photo number.
Only touches ![]() — leaves ![existing text]() alone.
"""

import os
import re
from pathlib import Path

POST_DIR = Path("src/data/post")

# For a few posts the images aren't all exterior shots —
# these overrides give a more accurate first-image description.
FIRST_IMAGE_OVERRIDES = {
    "fire-on-east-fourth": "Fire damage on East Fourth Street, Los Angeles",
    "thirty-posts-in-thirty-days": "RIP Los Angeles blog — street scene",
    "thirty-posts-now-what": "RIP Los Angeles blog — street scene",
    "a-word-or-two-on-density": "Los Angeles neighborhood street view",
    "on-another-note": "Los Angeles architecture",
    "greetings": "Los Angeles street scene",
    "and-we-re-back": "Los Angeles street scene",
    "the-first-new-post-in-a-very-long-time": "Los Angeles street scene",
    "isr-test": "RIP Los Angeles test image",
    "remembering-santa-monica": "Vintage Santa Monica street scene",
    "say-goodbye-to-old-westwood": "Historic Westwood home slated for demolition",
    "the-lost-art-deco-of-baldwin-hills": "Art Deco building in Baldwin Hills, Los Angeles",
    "old-glendale": "Craftsman bungalows on Glendale Avenue",
}


def get_title(text: str) -> str:
    m = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', text, re.MULTILINE)
    return m.group(1).strip().strip('"\'') if m else "RIP Los Angeles"


def add_alt_text(text: str, title: str, slug: str) -> tuple[str, int]:
    """Replace ![](...) with ![alt text](...). Returns (new_text, count_changed)."""
    counter = [0]
    first_override = FIRST_IMAGE_OVERRIDES.get(slug)

    def replacement(m):
        counter[0] += 1
        n = counter[0]
        if n == 1 and first_override:
            alt = first_override
        elif n == 1:
            alt = f"{title}"
        else:
            alt = f"{title} — photograph {n}"
        return f"![{alt}]("

    new_text = re.sub(r"!\[\]\(", replacement, text)
    return new_text, counter[0]


def main():
    total_filled = 0
    for path in sorted(POST_DIR.glob("*.md")):
        slug = path.stem
        text = path.read_text(encoding="utf-8")
        title = get_title(text)
        new_text, count = add_alt_text(text, title, slug)
        if count:
            path.write_text(new_text, encoding="utf-8")
            print(f"✓ {slug}  ({count} image{'s' if count != 1 else ''})")
            total_filled += count

    print(f"\nTotal images updated: {total_filled}")


if __name__ == "__main__":
    main()
