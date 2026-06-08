#!/usr/bin/env python3
"""
Geocode all RIP LA blog posts and insert location frontmatter.
Uses Nominatim (OpenStreetMap) — 1 req/sec rate limit.
"""

import re
import time
import sys
import requests
from pathlib import Path

POST_DIR = Path("src/data/post")
NOMINATIM = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "RIPLosAngeles/1.0 (oldbunkerhill@gmail.com)"}

# Maps slug → (geocode_query, display_address)
# display_address is what goes in the `address:` field of the frontmatter
ADDRESSES = {
    # ── number-slug posts ──────────────────────────────────────────────────────
    "10555-bloomfield-street-toluca-lake": (
        "10555 Bloomfield Street, Toluca Lake, Los Angeles, CA",
        "10555 Bloomfield Street, Toluca Lake, Los Angeles",
    ),
    "10912-west-blix-st-no-hollywood": (
        "10912 West Blix Street, North Hollywood, Los Angeles, CA",
        "10912 West Blix Street, North Hollywood, Los Angeles",
    ),
    "1138-wilshire-blvd": (
        "1138 Wilshire Boulevard, Los Angeles, CA",
        "1138 Wilshire Boulevard, Los Angeles",
    ),
    "1321-bates-ave": (
        "1321 Bates Avenue, Los Angeles, CA",
        "1321 Bates Avenue, Los Angeles",
    ),
    "1346-and-1332-north-fairfax": (
        "1346 North Fairfax Avenue, Los Angeles, CA",
        "1346 North Fairfax Avenue, Los Angeles",
    ),
    "13921-vanowen-st-van-nuys": (
        "13921 Vanowen Street, Van Nuys, Los Angeles, CA",
        "13921 Vanowen Street, Van Nuys, Los Angeles",
    ),
    "1412-n-mariposa": (
        "1412 North Mariposa Avenue, Los Angeles, CA",
        "1412 North Mariposa Avenue, Los Angeles",
    ),
    "1449-51-echo-park-ave": (
        "1449 Echo Park Avenue, Los Angeles, CA",
        "1449 Echo Park Avenue, Los Angeles",
    ),
    "1517-23-w-8th-st": (
        "1517 West 8th Street, Los Angeles, CA",
        "1517 West 8th Street, Los Angeles",
    ),
    "1529-n-winona-blvd": (
        "1529 North Winona Boulevard, Los Angeles, CA",
        "1529 North Winona Boulevard, Los Angeles",
    ),
    "1531-south-sawtelle-bundy-lock-and-key": (
        "1531 South Sawtelle Boulevard, Los Angeles, CA",
        "1531 South Sawtelle Boulevard, Los Angeles",
    ),
    "1723-n-wilcox-ave": (
        "1723 Wilcox Avenue, Hollywood, Los Angeles, CA",
        "1723 Wilcox Avenue, Hollywood, Los Angeles",
    ),
    "1809-n-van-ness": (
        # title says 1807; using slug number but title number is canonical
        "1807 North Van Ness Avenue, Los Angeles, CA",
        "1807 North Van Ness Avenue, Los Angeles",
    ),
    "1820-north-berendo-must-die": (
        "1820 North Berendo Street, Los Angeles, CA",
        "1820 North Berendo Street, Los Angeles",
    ),
    "1844-n-alexandria-ave": (
        "1844 North Alexandria Avenue, Los Angeles, CA",
        "1844 North Alexandria Avenue, Los Angeles",
    ),
    "208-n-crescent-dr-beverly-hills": (
        "208 North Crescent Drive, Beverly Hills, CA",
        "208 North Crescent Drive, Beverly Hills",
    ),
    "226-n-berendo-st": (
        "226 North Berendo Street, Los Angeles, CA",
        "226 North Berendo Street, Los Angeles",
    ),
    "2656-s-magnolia": (
        "2656 South Magnolia Avenue, Los Angeles, CA",
        "2656 South Magnolia Avenue, Los Angeles",
    ),
    "3525-south-bronson-ave": (
        "3525 South Bronson Avenue, Los Angeles, CA",
        "3525 South Bronson Avenue, Los Angeles",
    ),
    "354-north-avenue-53": (
        "354 North Avenue 53, Los Angeles, CA",
        "354 North Avenue 53, Los Angeles",
    ),
    "361-n-citrus-ave": (
        "361 North Citrus Avenue, Los Angeles, CA",
        "361 North Citrus Avenue, Los Angeles",
    ),
    "371-377-north-st-andrews-place": (
        "371 North Saint Andrews Place, Los Angeles, CA",
        "371 North St Andrews Place, Los Angeles",
    ),
    "3755-s-canfield-ave-palms": (
        "3755 South Canfield Avenue, Los Angeles, CA",
        "3755 South Canfield Avenue, Los Angeles",
    ),
    "3967-beverly-and-friends": (
        "3967 Beverly Boulevard, Los Angeles, CA",
        "3967 Beverly Boulevard, Los Angeles",
    ),
    "4201-s-crenshaw-3600-w-stocker": (
        "4201 South Crenshaw Boulevard, Los Angeles, CA",
        "4201 South Crenshaw Boulevard, Los Angeles",
    ),
    "4544-los-feliz-blvd": (
        "4544 Los Feliz Boulevard, Los Angeles, CA",
        "4544 Los Feliz Boulevard, Los Angeles",
    ),
    "4629-4651-w-maubert-ave": (
        "4629 West Maubert Avenue, Los Angeles, CA",
        "4629 West Maubert Avenue, Los Angeles",
    ),
    "926-932-938-so-kingsley": (
        "926 South Kingsley Drive, Los Angeles, CA",
        "926 South Kingsley Drive, Los Angeles",
    ),
    "933-s-gramercy-pl": (
        "933 South Gramercy Place, Los Angeles, CA",
        "933 South Gramercy Place, Los Angeles",
    ),
    "950-s-wilton-place": (
        "950 South Wilton Place, Los Angeles, CA",
        "950 South Wilton Place, Los Angeles",
    ),
    "957-963-and-967-arapahoe": (
        "957 Arapahoe Avenue, Los Angeles, CA",
        "957 Arapahoe Avenue, Los Angeles",
    ),
    # ── non-number slugs with address in title ─────────────────────────────────
    "an-appeal-to-reason-at-1537-south-wilton-pl": (
        "1537 South Wilton Place, Los Angeles, CA",
        "1537 South Wilton Place, Los Angeles",
    ),
    "art-deco-pico": (
        "6081 West Pico Boulevard, Los Angeles, CA",
        "6081 West Pico Boulevard, Los Angeles",
    ),
    "b-nai-b-rith-846-south-union-ave": (
        "846 South Union Avenue, Los Angeles, CA",
        "846 South Union Avenue, Los Angeles",
    ),
    "easing-back-into-it-via-915-s-grand-view": (
        "915 South Grand View Street, Los Angeles, CA",
        "915 South Grand View Street, Los Angeles",
    ),
    "la-cienega-motel-1725-so-la-cienega": (
        "1725 South La Cienega Boulevard, Los Angeles, CA",
        "1725 South La Cienega Boulevard, Los Angeles",
    ),
    "meet-553-north-heliotrope": (
        "553 North Heliotrope Drive, Los Angeles, CA",
        "553 North Heliotrope Drive, Los Angeles",
    ),
    "pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave": (
        "1331 South Pacific Avenue, San Pedro, Los Angeles, CA",
        "1331 South Pacific Avenue, San Pedro, Los Angeles",
    ),
    "the-cranky-preservationist-and-friends-in-save-700-normandie-avenue-koreatown-s-little-new-york": (
        "700 Normandie Avenue, Los Angeles, CA",
        "700 Normandie Avenue, Los Angeles",
    ),
    "the-cranky-preservationist-and-the-mystery-of-the-shrinking-hpoz-at-1330-w-pico-aka-the-albany": (
        "1330 West Pico Boulevard, Los Angeles, CA",
        "1330 West Pico Boulevard, Los Angeles",
    ),
    "the-house-at-1408-w-35th-st-and-then-some": (
        "1408 West 35th Street, Los Angeles, CA",
        "1408 West 35th Street, Los Angeles",
    ),
    # ── manual addresses (from body / known sources) ───────────────────────────
    "trebek-s-house": (
        "3405 North Fryman Road, Studio City, Los Angeles, CA",
        "3405 North Fryman Road, Studio City, Los Angeles",
    ),
    "marilyn-s-house": (
        "12305 5th Helena Drive, Los Angeles, CA",
        "12305 5th Helena Drive, Los Angeles",
    ),
    "the-jardinette-apartments-will-they-return-from-the-dead": (
        "5128 Marathon Street, Los Angeles, CA",
        "5128 Marathon Street, Los Angeles",
    ),
    "the-fairfax-has-fallen": (
        "849 North Detroit Street, Los Angeles, CA",
        "849 North Detroit Street, Los Angeles",
    ),
    "the-fairfax-must-fall": (
        "849 North Detroit Street, Los Angeles, CA",
        "849 North Detroit Street, Los Angeles",
    ),
    "let-s-talk-about-taix": (
        "1911 West Sunset Boulevard, Los Angeles, CA",
        "1911 West Sunset Boulevard, Los Angeles",
    ),
    "taix-and-the-city": (
        "1911 West Sunset Boulevard, Los Angeles, CA",
        "1911 West Sunset Boulevard, Los Angeles",
    ),
    "the-house-of-spirits": (
        "1314 Echo Park Avenue, Los Angeles, CA",
        "1314 Echo Park Avenue, Los Angeles",
    ),
    "the-cecil-is-the-city-s-fault": (
        "640 South Main Street, Los Angeles, CA",
        "640 South Main Street, Los Angeles",
    ),
    "the-cecil-s-ghost": (
        "640 South Main Street, Los Angeles, CA",
        "640 South Main Street, Los Angeles",
    ),
    "fire-on-east-fourth": (
        "329 East 4th Street, Los Angeles, CA",
        "329 East 4th Street, Los Angeles",
    ),
    "too-ugly-for-a-yimby": (
        "1476 West 37th Place, Los Angeles, CA",
        "1476 West 37th Place, Los Angeles",
    ),
    "tripalink-worst-thing-ever": (
        "966 Kenmore Avenue, Los Angeles, CA",
        "966 Kenmore Avenue, Los Angeles",
    ),
    "what-in-the-actual-hell-los-angeles": (
        "1238 Magnolia Avenue, Los Angeles, CA",
        "1238 Magnolia Avenue, Los Angeles",
    ),
    "magnolia-update": (
        "1238 Magnolia Avenue, Los Angeles, CA",
        "1238 Magnolia Avenue, Los Angeles",
    ),
    "the-face-of-the-ellis-act": (
        "1428 North Micheltorena Street, Los Angeles, CA",
        "1428 North Micheltorena Street, Los Angeles",
    ),
    "third-strike-wiseman": (
        "419 North Hayworth Avenue, Los Angeles, CA",
        "419 North Hayworth Avenue, Los Angeles",
    ),
    "the-cranky-preservationist-3-beauties-bite-the-dust-episode-20": (
        "2700 West Francis Avenue, Los Angeles, CA",
        "2700 West Francis Avenue, Los Angeles",
    ),
    "the-cranky-preservationist-in-reports-of-the-death-of-the-white-log-coffee-shop-have-been": (
        "1101 South Hill Street, Los Angeles, CA",
        "1101 South Hill Street, Los Angeles",
    ),
    "the-cranky-preservationist-in-what-the-hell-happened-to-the-pantages-neon-episode-22": (
        "6233 Hollywood Boulevard, Los Angeles, CA",
        "6233 Hollywood Boulevard, Los Angeles",
    ),
    "orion-housing-even-worse": (
        "1073 West Exposition Boulevard, Los Angeles, CA",
        "1073 West Exposition Boulevard, Los Angeles",
    ),
    "the-bungalows-of-hyde-park-must-be-sacrificed": (
        "6315 South Brynhurst Avenue, Los Angeles, CA",
        "6315 South Brynhurst Avenue, Los Angeles",
    ),
}

# Posts with no specific building address — no location block added
SKIP_POSTS = {
    "a-word-or-two-on-density",
    "and-we-re-back",
    "greetings",
    "isr-test",
    "on-another-note",
    "thirty-posts-in-thirty-days",
    "thirty-posts-now-what",
    "remembering-santa-monica",
    "say-goodbye-to-old-westwood",
    "old-glendale",
    "the-first-new-post-in-a-very-long-time",
    "the-lost-art-deco-of-baldwin-hills",
    "the-cranky-preservationist-meets-the-l-a-preservation-imp-episode-21",
    "the-cranky-preservationist-in-don-t-f-with-my-bunker-hill-retaining-wall-episode-25",
}


def geocode(query: str) -> tuple[float, float] | None:
    """Return (lat, lng) or None. Retries on 429 with backoff."""
    backoffs = [30, 60, 120]
    for attempt, wait in enumerate([0] + backoffs):
        if wait:
            print(f"  ⏳ Rate-limited, waiting {wait}s before retry {attempt}…")
            time.sleep(wait)
        try:
            r = requests.get(
                NOMINATIM,
                params={"q": query, "format": "json", "limit": 1, "countrycodes": "us"},
                headers=HEADERS,
                timeout=15,
            )
            if r.status_code == 429:
                continue  # try next backoff
            r.raise_for_status()
            data = r.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
            return None  # 200 but no results — don't retry
        except requests.HTTPError as e:
            if "429" in str(e):
                continue
            print(f"  ⚠️  Nominatim error: {e}")
            return None
        except Exception as e:
            print(f"  ⚠️  Nominatim error: {e}")
            return None
    print(f"  ⚠️  Exhausted retries")
    return None


def has_location(text: str) -> bool:
    """Check if frontmatter already contains a location block."""
    fm_match = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not fm_match:
        return False
    return bool(re.search(r"^\s*location\s*:", fm_match.group(1), re.MULTILINE))


def insert_location(text: str, display_address: str, lat: float, lng: float) -> str:
    """Insert location block before `metadata:` in the frontmatter."""
    location_block = (
        f"location:\n"
        f"  address: \"{display_address}\"\n"
        f"  lat: {lat:.6f}\n"
        f"  lng: {lng:.6f}\n"
    )
    # Insert before `metadata:` line
    new_text = re.sub(
        r"^(metadata\s*:)",
        location_block + r"\1",
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if new_text == text:
        # No `metadata:` found — insert before closing `---`
        new_text = re.sub(
            r"(\n---\s*\n)",
            f"\n{location_block.rstrip()}\n\\1",
            text,
            count=1,
        )
    return new_text


def main():
    posts = sorted(POST_DIR.glob("*.md"))
    geocoded = []
    failed = []
    skipped = []
    already_done = []

    for path in posts:
        slug = path.stem
        text = path.read_text(encoding="utf-8")

        if has_location(text):
            already_done.append(slug)
            continue

        if slug in SKIP_POSTS:
            skipped.append(slug)
            continue

        if slug not in ADDRESSES:
            failed.append((slug, "not in ADDRESSES dict"))
            continue

        query, display_address = ADDRESSES[slug]
        print(f"Geocoding: {slug}")
        print(f"  → {query}")

        coords = geocode(query)
        time.sleep(2.0)  # Nominatim rate limit: 1 req/sec (2s for safety)

        if coords is None:
            print(f"  ✗ GEOCODE FAILED")
            failed.append((slug, f"Nominatim returned no result for: {query}"))
            continue

        lat, lng = coords
        print(f"  ✓ {lat:.6f}, {lng:.6f}")

        new_text = insert_location(text, display_address, lat, lng)
        path.write_text(new_text, encoding="utf-8")
        geocoded.append(slug)

    # ── Summary ────────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"✓ Geocoded & saved:  {len(geocoded)}")
    print(f"○ Skipped (no addr): {len(skipped)}")
    print(f"● Already had location: {len(already_done)}")
    print(f"✗ Failed:            {len(failed)}")

    if skipped:
        print(f"\nSkipped (no specific address):")
        for s in skipped:
            print(f"  • {s}")

    if failed:
        print(f"\nFailed — needs manual entry:")
        for slug, reason in failed:
            print(f"  • {slug}")
            print(f"      {reason}")


if __name__ == "__main__":
    main()
