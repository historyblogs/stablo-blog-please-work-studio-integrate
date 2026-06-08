#!/usr/bin/env python3
"""
Second-pass geocoder for the 10 posts that Nominatim couldn't resolve.
Uses simplified queries (drop direction prefix, drop number, or alt street name).
Falls back to hardcoded approximate coords for truly unknown streets.
"""

import re
import time
import requests
from pathlib import Path

POST_DIR = Path("src/data/post")
NOMINATIM = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "RIPLosAngeles/1.0 (oldbunkerhill@gmail.com)"}

# Simplified queries → try these first. On failure, use FALLBACK_COORDS.
RETRY_ADDRESSES = {
    # "10912 West Blix Street, North Hollywood" failed → drop "West"
    "10912-west-blix-st-no-hollywood": (
        "10912 Blix Street, North Hollywood, CA",
        "10912 Blix Street, North Hollywood, Los Angeles",
    ),
    # "1529 North Winona Boulevard" failed → drop direction
    "1529-n-winona-blvd": (
        "1529 Winona Boulevard, Los Angeles, CA",
        "1529 Winona Boulevard, Los Angeles",
    ),
    # "1531 South Sawtelle Boulevard" failed → drop direction
    "1531-south-sawtelle-bundy-lock-and-key": (
        "1531 Sawtelle Boulevard, Los Angeles, CA",
        "1531 Sawtelle Boulevard, Los Angeles",
    ),
    # "354 North Avenue 53" failed → Highland Park avenue
    "354-north-avenue-53": (
        "354 Avenue 53, Highland Park, Los Angeles, CA",
        "354 Avenue 53, Highland Park, Los Angeles",
    ),
    # "4629 West Maubert Avenue" failed → drop direction
    "4629-4651-w-maubert-ave": (
        "4629 Maubert Avenue, Los Angeles, CA",
        "4629 Maubert Avenue, Los Angeles",
    ),
    # "957 Arapahoe Avenue, Los Angeles" failed → try with Koreatown & Street type
    "957-963-and-967-arapahoe": (
        "957 Arapahoe Street, Los Angeles, CA",
        "957 Arapahoe Street, Los Angeles",
    ),
    # "6315 South Brynhurst Avenue" failed → drop direction
    "the-bungalows-of-hyde-park-must-be-sacrificed": (
        "6315 Brynhurst Avenue, Los Angeles, CA",
        "6315 Brynhurst Avenue, Los Angeles",
    ),
    # "2700 West Francis Avenue, Pico-Union" failed → try without direction
    "the-cranky-preservationist-3-beauties-bite-the-dust-episode-20": (
        "2700 Francis Avenue, Los Angeles, CA",
        "2700 Francis Avenue, Los Angeles",
    ),
    # "1428 North Micheltorena Street" failed → drop direction
    "the-face-of-the-ellis-act": (
        "1428 Micheltorena Street, Los Angeles, CA",
        "1428 Micheltorena Street, Los Angeles",
    ),
    # "3405 North Fryman Road, Studio City" failed → drop "North"
    "trebek-s-house": (
        "3405 Fryman Road, Studio City, CA",
        "3405 Fryman Road, Studio City, Los Angeles",
    ),
}

# Known approximate coords for streets Nominatim simply doesn't have.
# Used when the geocoder still fails after the revised query.
FALLBACK_COORDS = {
    "10912-west-blix-st-no-hollywood":              (34.169500, -118.366200),
    "1529-n-winona-blvd":                           (34.105800, -118.281500),
    "1531-south-sawtelle-bundy-lock-and-key":       (34.028700, -118.458400),
    "354-north-avenue-53":                          (34.107100, -118.196700),
    "4629-4651-w-maubert-ave":                      (34.062500, -118.271000),
    "957-963-and-967-arapahoe":                     (34.060200, -118.303500),
    "the-bungalows-of-hyde-park-must-be-sacrificed":(33.982000, -118.317000),
    "the-cranky-preservationist-3-beauties-bite-the-dust-episode-20": (34.046000, -118.289000),
    "the-face-of-the-ellis-act":                    (34.090500, -118.268000),
    "trebek-s-house":                               (34.143700, -118.383800),
}


def geocode(query: str) -> tuple[float, float] | None:
    backoffs = [30, 60]
    for attempt, wait in enumerate([0] + backoffs):
        if wait:
            print(f"  ⏳ Rate-limited, waiting {wait}s…")
            time.sleep(wait)
        try:
            r = requests.get(
                NOMINATIM,
                params={"q": query, "format": "json", "limit": 1, "countrycodes": "us"},
                headers=HEADERS,
                timeout=15,
            )
            if r.status_code == 429:
                continue
            r.raise_for_status()
            data = r.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
            return None
        except requests.HTTPError as e:
            if "429" in str(e):
                continue
            print(f"  ⚠️  HTTP error: {e}")
            return None
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
            return None
    return None


def has_location(text: str) -> bool:
    fm = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    return bool(fm and re.search(r"^\s*location\s*:", fm.group(1), re.MULTILINE))


def insert_location(text: str, display_address: str, lat: float, lng: float) -> str:
    block = (
        f"location:\n"
        f"  address: \"{display_address}\"\n"
        f"  lat: {lat:.6f}\n"
        f"  lng: {lng:.6f}\n"
    )
    new = re.sub(r"^(metadata\s*:)", block + r"\1", text, count=1, flags=re.MULTILINE)
    if new == text:
        new = re.sub(r"(\n---\s*\n)", f"\n{block.rstrip()}\n\\1", text, count=1)
    return new


def main():
    done, fallback_used, still_failed = [], [], []

    for slug, (query, display_address) in RETRY_ADDRESSES.items():
        path = POST_DIR / f"{slug}.md"
        text = path.read_text(encoding="utf-8")

        if has_location(text):
            print(f"✓ Already done: {slug}")
            done.append(slug)
            continue

        print(f"Geocoding: {slug}")
        print(f"  → {query}")
        coords = geocode(query)
        time.sleep(2.0)

        if coords:
            lat, lng = coords
            print(f"  ✓ {lat:.6f}, {lng:.6f}")
        else:
            # Use hardcoded fallback
            coords = FALLBACK_COORDS.get(slug)
            if coords:
                lat, lng = coords
                print(f"  ⚠️  Using fallback coords: {lat:.6f}, {lng:.6f}")
                fallback_used.append(slug)
            else:
                print(f"  ✗ No fallback available")
                still_failed.append(slug)
                continue

        new_text = insert_location(text, display_address, lat, lng)
        path.write_text(new_text, encoding="utf-8")
        done.append(slug)

    print(f"\n{'='*60}")
    print(f"✓ Written: {len(done)}")
    if fallback_used:
        print(f"  (of which {len(fallback_used)} used approximate fallback coords)")
        for s in fallback_used:
            print(f"    • {s}")
    if still_failed:
        print(f"✗ Still failed: {still_failed}")


if __name__ == "__main__":
    main()
