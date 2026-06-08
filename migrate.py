#!/usr/bin/env python3
"""
Sanity.io -> AstroWind migration script
Exports all published posts to src/data/post/*.md
Downloads all images to src/assets/images/blog/
"""

import json
import os
import re
import urllib.request
import urllib.parse
from pathlib import Path

PROJECT_ID = "1eqp3hod"
DATASET = "production"
TOKEN = "sk9GmYZALwphIvEfOvQRN350YvSpSsKm93RRZCsKRhnU9mjEjPjAzwiVYblD7FnGWAcA1z6ckJH7zTyAcE7YZCpGeu5uQoivnaKz3Wmqjx3brS9fKewdnCa76GzsDdSPKPcp14o5rpAIQjpqULKZ06hPP3rCirOSBLYdv1Gt2CxC7tUW6PpM"

BASE_DIR = Path(__file__).parent
POST_DIR = BASE_DIR / "src" / "data" / "post"
IMAGE_DIR = BASE_DIR / "src" / "assets" / "images" / "blog"


def sanity_query(query):
    url = f"https://{PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/{DATASET}"
    params = urllib.parse.urlencode({"query": query})
    req = urllib.request.Request(
        f"{url}?{params}",
        headers={"Authorization": f"Bearer {TOKEN}"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["result"]


def image_ref_to_url(ref):
    m = re.match(r"image-([a-f0-9]+)-(\d+x\d+)-(\w+)", ref)
    if not m:
        return None, None
    hash_, dims, ext = m.groups()
    url = f"https://cdn.sanity.io/images/{PROJECT_ID}/{DATASET}/{hash_}-{dims}.{ext}"
    filename = f"{hash_}.{ext}"
    return url, filename


def download_image(url, filename):
    dest = IMAGE_DIR / filename
    if dest.exists():
        return filename
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    try:
        with urllib.request.urlopen(req) as r, open(dest, "wb") as f:
            f.write(r.read())
        print(f"    ↓ {filename}")
    except Exception as e:
        print(f"    ✗ {url}: {e}")
        return None
    return filename


def spans_to_md(spans, mark_defs):
    defs = {d["_key"]: d for d in (mark_defs or [])}
    result = []
    for span in spans:
        text = span.get("text", "")
        if not text:
            result.append(text)
            continue
        for mark in span.get("marks", []):
            if mark == "strong":
                text = f"**{text}**"
            elif mark == "em":
                text = f"*{text}*"
            elif mark in ("underline",):
                text = f"<u>{text}</u>"
            elif mark in ("strike-through", "strikethrough"):
                text = f"~~{text}~~"
            elif mark == "code":
                text = f"`{text}`"
            elif mark in defs:
                d = defs[mark]
                if d["_type"] == "link":
                    href = d.get("href", "")
                    text = f"[{text}]({href})"
        result.append(text)
    return "".join(result)


def portable_text_to_md(blocks):
    if not blocks:
        return ""
    lines = []
    list_stack = []  # track list context

    for block in blocks:
        btype = block.get("_type", "")

        if btype == "block":
            style = block.get("style", "normal")
            list_item = block.get("listItem")  # "bullet" or "number"
            level = block.get("level", 1)
            text = spans_to_md(block.get("children", []), block.get("markDefs", []))

            if list_item:
                prefix = "  " * (level - 1)
                bullet = "-" if list_item == "bullet" else "1."
                lines.append(f"{prefix}{bullet} {text}")
                list_stack.append(list_item)
                continue
            else:
                if list_stack:
                    lines.append("")
                    list_stack.clear()

            if style == "h1":
                lines.append(f"# {text}")
            elif style == "h2":
                lines.append(f"## {text}")
            elif style == "h3":
                lines.append(f"### {text}")
            elif style == "h4":
                lines.append(f"#### {text}")
            elif style == "h5":
                lines.append(f"##### {text}")
            elif style == "h6":
                lines.append(f"###### {text}")
            elif style == "blockquote":
                lines.append(f"> {text}")
            else:
                lines.append(text)
            lines.append("")

        elif btype == "image":
            ref = block.get("asset", {}).get("_ref", "")
            if ref:
                url, filename = image_ref_to_url(ref)
                if url and filename:
                    dl = download_image(url, filename)
                    if dl:
                        alt = block.get("alt", "")
                        lines.append(f"![{alt}](~/assets/images/blog/{filename})")
                        lines.append("")

    if list_stack:
        lines.append("")

    return "\n".join(lines).strip()


def yaml_str(s):
    if s is None:
        return '""'
    s = str(s)
    if any(c in s for c in ['"', "'", ":", "#", "|", ">", "\n", "{"]):
        escaped = s.replace('"', '\\"')
        return f'"{escaped}"'
    return f'"{s}"'


def main():
    POST_DIR.mkdir(parents=True, exist_ok=True)
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    print("Querying Sanity for published posts...")
    posts = sanity_query("""
        *[_type == "post" && !(_id in path("drafts.**"))] | order(publishedAt desc) {
            _id,
            title,
            slug,
            publishedAt,
            excerpt,
            body,
            mainImage,
            "author": author->{name, slug},
            "categories": categories[]->{title, slug, color}
        }
    """)
    print(f"Found {len(posts)} published posts\n")

    for i, post in enumerate(posts):
        slug = (post.get("slug") or {}).get("current", "")
        if not slug:
            slug = re.sub(r"[^a-z0-9-]", "", (post.get("title") or f"post-{i}").lower().replace(" ", "-"))

        title = post.get("title") or "Untitled"
        published_at = post.get("publishedAt") or ""
        excerpt = post.get("excerpt") or ""
        author_obj = post.get("author") or {}
        author_name = author_obj.get("name", "Nathan Marsak")
        categories = post.get("categories") or []
        category = categories[0]["title"] if categories else ""
        tags = [c["title"] for c in categories]

        print(f"[{i+1}/{len(posts)}] {title}")

        # Main image
        main_image_path = ""
        mi = post.get("mainImage") or {}
        mi_ref = (mi.get("asset") or {}).get("_ref", "")
        if mi_ref:
            url, filename = image_ref_to_url(mi_ref)
            if url and filename:
                dl = download_image(url, filename)
                if dl:
                    main_image_path = f"~/assets/images/blog/{filename}"

        # Body
        body_md = portable_text_to_md(post.get("body") or [])

        # Frontmatter
        fm = ["---"]
        fm.append(f"publishDate: {published_at}")
        fm.append(f"title: {yaml_str(title)}")
        if excerpt:
            fm.append(f"excerpt: {yaml_str(excerpt)}")
        if main_image_path:
            fm.append(f"image: {main_image_path}")
        if category:
            fm.append(f"category: {yaml_str(category)}")
        if tags:
            fm.append("tags:")
            for t in tags:
                fm.append(f"  - {t}")
        fm.append(f"author: {yaml_str(author_name)}")
        fm.append("---")

        content = "\n".join(fm) + "\n\n" + body_md + "\n"

        out_path = POST_DIR / f"{slug}.md"
        out_path.write_text(content, encoding="utf-8")

    print(f"\n✓ Done! {len(posts)} posts written to src/data/post/")
    print(f"  Images saved to src/assets/images/blog/")


if __name__ == "__main__":
    main()
