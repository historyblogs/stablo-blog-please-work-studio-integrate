#!/usr/bin/env python3
"""Insert missing excerpts into post frontmatter."""

import re
from pathlib import Path

POST_DIR = Path("src/data/post")

EXCERPTS = {
    "1321-bates-ave": "A wooded 1907 cottage on Bates Avenue — the kind of house a kid walks past on the way to Thomas Starr King — has a demolition permit and nowhere to go.",
    "1346-and-1332-north-fairfax": "Three 1919 storybook cottages on North Fairfax — the kind that could have stepped out of a fairy tale — are coming down to make way for something considerably less enchanting.",
    "1412-n-mariposa": "The forthcoming development at 1412 North Mariposa is, for once, actually affordable housing — but that doesn't make watching a century-old East Hollywood street lose its character any easier.",
    "1449-51-echo-park-ave": "Charles Wiggers built 1449–51 Echo Park Avenue in early 1914. A century later, a giant view-blocking rectangle is slated to land dead-center in a block of irreplaceable vintage charm.",
    "1531-south-sawtelle-bundy-lock-and-key": "Bundy's Lock & Key has called South Sawtelle home since 1947 — and the building itself predates 1905. Both the beloved business and its pre-Victorian structure are headed to the landfill.",
    "1809-n-van-ness": "An elegant 1911 home on North Van Ness, on a street replete with gorgeously maintained vintage houses, falls to the logic of Senator Wiener's anti-homeowner legislation.",
    "1820-north-berendo-must-die": "In the stately pines of Los Feliz sits an elegant 1907 home at 1820 North Berendo. Single-family homes, of course, must be destroyed — so says the City of Los Angeles.",
    "208-n-crescent-dr-beverly-hills": "A modest, vaguely storybook, half-timbered house in Beverly Hills — the kind of graceful understatement money used to buy — is headed out. Beverly Hills isn't what it used to be.",
    "2656-s-magnolia": "The 2600 block of South Magnolia is a festival of two-story Edwardians, each more magnificent than the last — a rare surviving streetscape of old Los Angeles. For now.",
    "926-932-938-so-kingsley": "Three vintage homes at 926, 932, and 938 South Kingsley Drive — a snapshot of what Old Los Angeles looked like, as recently as last year. Take a look while you still can.",
    "957-963-and-967-arapahoe": "The City's Determination has come down for 957, 963, and 967 Arapahoe in Koreatown. Three vintage structures shall become one large beige nothing. Without further ado.",
    "art-deco-pico": "Pico Palace, a 1939 Art Deco bowling alley designed by master architect William Douglas Lee, sits just west of Crescent Heights at 6081 West Pico — and it's about to hit the landfill.",
    "fire-on-east-fourth": "Not all historic structures fall to demolition permits. On East Fourth Street, a pattern of fires — linked to negligence, misfeasance, and one very litigious building owner — is doing the job instead.",
    "la-cienega-motel-1725-so-la-cienega": "It makes Nathan sad when any 1946 motel is demolished. The La Cienega Motel may have been remodeled away from its original glory, but it's still a piece of postwar Los Angeles — and it's still going down.",
    "marilyn-s-house": "An update on the ownership mystery surrounding Marilyn Monroe's former Brentwood home — a striking 1929 Spanish house at 12305 Fifth Helena Drive with a demolition permit and a very secretive new owner.",
    "meet-553-north-heliotrope": "553 North Heliotrope has been minding her own business since 1914, when Albert Beach Crist designed and built her. Meet her now, before Los Angeles decides she's in the way.",
    "old-glendale": "Two craftsman bungalows on Glendale Avenue were incorporated into the Glendale Studios compound rather than demolished — until now. In their place: a beige studio development by New York's East End Capital.",
    "orion-housing-even-worse": "A follow-up to the Tripalink post: Orion Housing markets to Chinese nationals, has been cited by HUD for discrimination, and produces developments that somehow make Tripalink look tasteful.",
    "remembering-santa-monica": "Remember when Santa Monica was cute? Quaint, charming, full of old-world delight? Good thing voters elected Queen Anne-hating cultural terrorists, or someone might have had to look at a charming old building.",
    "say-goodbye-to-old-westwood": "A 1936 Hollywood Regency home in Westwood — graceful, elegant, irreplaceable — is being erased for a 56-foot, 11-unit multifamily. Senator Wiener assures us this is better for the environment.",
    "the-bungalows-of-hyde-park-must-be-sacrificed": "A 1912 California bungalow at 6315 South Brynhurst in Hyde Park — front porch, heritage trees, backyard for an orange tree — is exactly the kind of house a YIMBY loves to hate. And demolish.",
    "the-fairfax-has-fallen": "The renderings are in for what replaces 849 North Detroit, Jules George Koppel's 1928 Spanish house in the Fairfax district. They are, as predicted, soul-crushingly, unrelentingly awful.",
    "the-fairfax-must-fall": "849 North Detroit is a 1928 Spanish Colonial Revival home built by Mrs. Catherine Mason — one of the little houses that lends the Fairfax district its grace and charm. Emphasis on 'stood.'",
    "the-first-new-post-in-a-very-long-time": "Nathan Marsak returns to RIP Los Angeles after an absence — having been 'abducted by evil developers' — to find the destruction of Los Angeles's architectural heritage very much ongoing.",
    "the-house-at-1408-w-35th-st-and-then-some": "Here's a house at 1408 West 35th Street. It was built in 1907. And then some — because there's always more to the story when a century-old home lands in a developer's crosshairs.",
    "the-jardinette-apartments-will-they-return-from-the-dead": "The Jardinette Apartments at 5128 Marathon Street are among the most architecturally significant structures in Los Angeles — a 1928 Neutra masterpiece, emptied seven years ago and left to rot.",
    "the-lost-art-deco-of-baldwin-hills": "Before the Victorians of West Adams get all the attention, someone should record the Art Deco structures that once dotted Baldwin Hills — those cool old buildings you'd spot from the car and say 'hey, that's neat.' Used to.",
    "thirty-posts-in-thirty-days": "RIP Los Angeles returns after an 18-month absence — the demolitions didn't stop, the City didn't develop a sane policy, and Nathan is back with thirty posts in thirty days to prove it.",
    "thirty-posts-now-what": "Thirty posts in thirty days: done. The destruction of Los Angeles's architectural heritage continues, of course. Nathan will too — just at a pace that allows him to finish his next book.",
    "trebek-s-house": "Alex Trebek's former home — the 1923 Walter P. Story estate at 3405 Fryman Road in Studio City, a masterwork of Spanish architecture with genuine historical pedigree — was demolished while nobody was looking.",
    "tripalink-worst-thing-ever": "Tripalink builds housing marketed exclusively to Chinese nationals, has been cited by HUD for discrimination, and produces interiors of staggering awfulness. Nathan lets the pictures do the talking.",
}


def has_excerpt(text: str) -> bool:
    fm = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    return bool(fm and re.search(r"^excerpt:", fm.group(1), re.MULTILINE))


def insert_excerpt(text: str, excerpt: str) -> str:
    # Escape any special chars for YAML inline string
    safe = excerpt.replace('"', '\\"')
    excerpt_line = f'excerpt: "{safe}"\n'
    # Insert after the `author:` line
    new = re.sub(r"(^author:.*\n)", r"\1" + excerpt_line, text, count=1, flags=re.MULTILINE)
    if new == text:
        # Fallback: insert before `metadata:`
        new = re.sub(r"^(metadata:)", excerpt_line + r"\1", text, count=1, flags=re.MULTILINE)
    return new


def main():
    inserted, skipped = [], []
    for slug, excerpt in EXCERPTS.items():
        path = POST_DIR / f"{slug}.md"
        text = path.read_text(encoding="utf-8")
        if has_excerpt(text):
            skipped.append(slug)
            continue
        new_text = insert_excerpt(text, excerpt)
        path.write_text(new_text, encoding="utf-8")
        inserted.append(slug)
        print(f"✓ {slug}")

    print(f"\nInserted: {len(inserted)}  |  Already had excerpt: {len(skipped)}")


if __name__ == "__main__":
    main()
