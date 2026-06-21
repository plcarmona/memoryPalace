#!/usr/bin/env python3
"""
Major System Word Finder
========================

Finds words matching a given number using the Major System mnemonic code.

Sources:
  - English    (~370k words, dwyl/english-words)
  - Spanish    (~636k words, words/an-array-of-spanish-words)
  - Pokemon    (PokeAPI, all 1000+ species)
  - PopCulture (embedded list: SW, Marvel, anime, video games, brands, music)

Usage:
    # Interactive REPL
    python3 major_system.py

    # One-shot CLI search
    python3 major_system.py 34              # exact matches for 34
    python3 major_system.py all:34          # words that CONTAIN 34 anywhere
    python3 major_system.py 9234 --limit 20 # limit results per source

    # Encode a word into its digit string (sanity check)
    python3 major_system.py --encode mirror

    # Export results for a number to a text file
    python3 major_system.py 34 --export /home/z/my-project/download/major_34.txt
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

EN_FILE = DATA_DIR / "english_words.txt"
ES_FILE = DATA_DIR / "spanish_words.json"
POKE_FILE = DATA_DIR / "pokemon_raw.json"

# ---------------------------------------------------------------------------
# Major System encoding
# ---------------------------------------------------------------------------

# Letters that don't encode any digit (vowels + silent letters + Spanish y/h)
FREE_LETTERS = set("aeiouhwy")

# Direct letter → digit mapping for letters that don't have soft/hard variants
LETTER_DIGITS = {
    "s": "0", "z": "0", "c": None,  # c handled contextually (soft=0, hard=7)
    "t": "1", "d": "1",
    "n": "2",
    "m": "3",
    "r": "4",
    "l": "5",
    "g": None,                      # g handled contextually (soft=6, hard=7)
    "j": "6",
    "k": "7", "q": "7",
    "f": "8", "v": "8",
    "p": "9", "b": "9",
    "x": "70",                      # x ≈ ks
    "ñ": "2",                       # Spanish eñe → n-sound
}


def _is_soft(letter: str, nxt: str | None) -> bool:
    """Return True if 'c' or 'g' is "soft" (followed by e/i/y)."""
    return nxt is not None and nxt.lower() in "eiy"


def word_to_digits(word: str) -> str:
    """
    Convert a word into its Major System digit string.

    - Vowels, h, w, y are skipped (free letters).
    - Digraphs sh/ch/ph are merged into single digits (6/6/8).
    - c is soft (0) before e/i/y, hard (7) elsewhere.
    - g is soft (6) before e/i/y, hard (7) elsewhere.
    - x is treated as 'ks' (70).
    - ñ (Spanish) is treated as n (2).
    - All other letters use the direct map above.
    """
    w = word.lower()
    out: List[str] = []
    i = 0
    n = len(w)
    while i < n:
        ch = w[i]
        nxt = w[i + 1] if i + 1 < n else None

        # Digraphs first
        if ch == "s" and nxt == "h":
            out.append("6")  # sh
            i += 2
            continue
        if ch == "c" and nxt == "h":
            out.append("6")  # ch
            i += 2
            continue
        if ch == "p" and nxt == "h":
            out.append("8")  # ph
            i += 2
            continue

        if ch == "c":
            out.append("0" if _is_soft(ch, nxt) else "7")
            i += 1
            continue
        if ch == "g":
            out.append("6" if _is_soft(ch, nxt) else "7")
            i += 1
            continue

        d = LETTER_DIGITS.get(ch)
        if d is not None:
            out.append(d)
        # FREE_LETTERS and any unknown chars are skipped silently
        i += 1
    return "".join(out)


# ---------------------------------------------------------------------------
# Embedded Pop-Culture word list
# ---------------------------------------------------------------------------
POP_CULTURE_WORDS = """
Luke Leia Han Solo Vader Yoda Chewbacca Rey Finn Kylo Ren Obiwan Anakin Padme
Gandalf Frodo Bilbo Samwise Aragorn Legolas Gimli Gollum Sauron Saruman Boromir
Elrond Galadriel
Harry Hermione Ron Dumbledore Voldemort Snape Hagrid Malfoy Sirius Lupin Dobby
Hedwig Nagini
Neo Trinity Morpheus Smith Oracle Tank Dozer
Indiana Jones Marion Belloq
Marty McFly Doc Brown Biff Tannen Emmett
Ripley Bishop Hicks Burke
Sarah Connor John Kyle Reese Skynet
Tony Stark Pepper Potts Happy Hogan Rhodey
Steve Rogers Bucky Barnes Sam Wilson Sharon
Bruce Banner Hulk Natasha Romanoff Clint Barton
Thor Odinson Loki Laufeyson Odin Frigga Heimdall
Peter Parker May MJ Ned Flash Gwen Stacy
Stephen Strange Wong Wanda Maximoff Vision Pietro
Tchalla Shuri Killmonger Okoye Nakia
Carol Danvers Nick Fury Maria Hill Phil Coulson
Star Lord Gamora Drax Rocket Groot Nebula Mantis Yondu Kraglin
Goku Vegeta Gohan Goten Trunks Piccolo Krillin Bulma ChiChi Frieza Cell Buu
Beerus Whis
Naruto Sasuke Sakura Kakashi Hinata Shikamaru Itachi Madara Obito Pain
Jiraiya Tsunade Orochimaru
Luffy Zoro Nami Sanji Usopp Chopper Robin Franky Brook Jinbei Ace Sabo Shanks
Blackbeard
Ichigo Rukia Renji Uryu Orihime Chad Aizen
Eren Mikasa Armin Levi Erwin Hange Reiner Bertholdt Annie Zeke Historia
Light Yagami Misa Ryuk Rem Near Mello
Tanjiro Nezuko Zenitsu Inosuke Giyu Rengoku Shinobu Tengen Mitsuri Muichiro
Gyomei Sanemi
Deku Bakugo Todoroki AllMight Uraraka Iida Tsuyu Kirishima Kaminari Tokoyami
Shoji Sero Mineta Momo Aizawa Shigaraki Toga Dabi Twice
Mario Luigi Peach Daisy Bowser Yoshi Toad Wario Waluigi Rosalina Koopa Goomba
Piranha Boo Shy
Link Zelda Ganondorf Impa Sheik Riju Teba Mipha Daruk Revali Urbosa Naboris
Rudania Medoh Ruta Navi Midna Fi Tatl Tael Ezlo Ciela
Samus Ridley Kraid Mother Brain Metroid Phazon
Kirby Dedede Meta Knight Waddle Dee Bandana
Donkey Kong Diddy Dixie Cranky Funky Candy
Falcon Captain Fox McCloud Falco Slippy Peppy Wolf Leon Panther Krystal
Cloud Strife Sephiroth Aerith Tifa Barret Red Cid Yuffie Vincent Cait Sith
Zack Fair
Squall Rinoa Zell Quistis Irvine Selphie Seifer Laguna Kiros Ward Edea Ultimecia
Tidus Yuna Auron Wakka Lulu Kimahri Rikku Seymour Jecht Braska Sin
Noctis Prompto Ignis Gladiolus Lunafreya Ardyn
Byleth Edelgard Dimitri Claude Rhea Sothis
Chrom Robin Lucina Frederick Lissa Marth
Alear Veyle Alfred Celine Diamant Alcryst
Nike Adidas Puma Reebok Under Armour Converse
Apple Microsoft Google Amazon Meta Tesla Nvidia Sony Samsung LG Intel AMD
Cisco Oracle SAP IBM Dell HP Lenovo Asus Acer MSI Razer
Coca Cola Pepsi Sprite Fanta DrPepper Mountain Dew Gatorade RedBull Monster
Rockstar
McDonalds Burger King Wendys KFC Taco Bell Pizza Hut Dominos Subway Starbucks
Dunkin
Disney Pixar Marvel DCComics Warner Universal Paramount Columbia Fox
Lionsgate MGM DreamWorks
Netflix Hulu HBO Showtime Starz AMC
Beatles Stones Queen Zeppelin Floyd Bowie Elvis Michael Jackson Madonna
Prince Whitney Mariah Beyonce JayZ Rihanna Drake Kanye Eminem Kendrick
Adele Taylor Swift Ed Sheeran Bruno Mars Bieber Shawn Mendes Ariana Grande
Dua Lipa Billie Eilish Olivia Rodrigo
Tatooine Hoth Endor Naboo Coruscant Kamino Mustafar Geonosis Dagobah Jakku
Exegol
Mordor Gondor Rohan Shire Rivendell Moria Isengard Helms Deep Minas Tirith
Osgiliath
Hogwarts Gringotts Azkaban Hogsmeade Diagon Alley Forbidden Forest Quidditch
Patronus
Narnia Wakanda Asgard Vormir Titan Xandar Knowhere Sakaar Jotunheim Vanaheim
Alfheim Svartalfheim Niflheim Muspelheim Midgard
Tardis Gallifrey Dalek Cyberman Weeping Angel Skaro Sontaran
Totoro Chihiro Haku NoFace Yubaba Kamaji Lin Ponyo Sosuke Lisa Koichi
Granmamare Fujimoto
Sophie Howl Calcifer Witch Waste Markl
Nausicaa Asbel Kushana Yupa Mito Teto
Sheeta Pazu Dola Muska Laputa
Ashitaka San Eboshi Yakul Kodama Forest
Kiki Jiji Tombo Osono Ursula Baker
Goku Krillin Piccolo Raditz Nappa
Sasori Deidara Kisame Itachi Hidan Kakuzu
""".split()


# ---------------------------------------------------------------------------
# Word loaders
# ---------------------------------------------------------------------------

ENGLISH_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"
SPANISH_URL = "https://raw.githubusercontent.com/words/an-array-of-spanish-words/master/index.json"
POKE_URL = "https://pokeapi.co/api/v2/pokemon?limit=2000"


def _fetch(url: str, dest: Path) -> bool:
    try:
        print(f"  Downloading {url}...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        dest.write_bytes(data)
        print(f"  Saved → {dest} ({len(data):,} bytes)")
        return True
    except Exception as e:
        print(f"  Failed to download: {e}")
        return False


def load_english() -> set[str]:
    if not EN_FILE.exists():
        _fetch(ENGLISH_URL, EN_FILE)
    if not EN_FILE.exists():
        return set()
    out: set[str] = set()
    with EN_FILE.open(encoding="utf-8", errors="ignore") as f:
        for line in f:
            w = line.strip().lower()
            if w and w.isalpha() and 2 <= len(w) <= 20:
                out.add(w)
    return out


def load_spanish() -> set[str]:
    if not ES_FILE.exists():
        _fetch(SPANISH_URL, ES_FILE)
    if not ES_FILE.exists():
        return set()
    try:
        data = json.loads(ES_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  Could not parse Spanish JSON: {e}")
        return set()
    out: set[str] = set()
    for w in data:
        w = w.strip().lower()
        # Allow ñ and accented vowels by stripping accents but keeping ñ
        norm = w.replace("á", "a").replace("é", "e").replace("í", "i").replace(
            "ó", "o").replace("ú", "u").replace("ü", "u")
        if norm and norm.replace("ñ", "n").isalpha() and 2 <= len(norm) <= 20:
            out.add(norm)
    return out


def load_pokemon() -> set[str]:
    if not POKE_FILE.exists():
        _fetch(POKE_URL, POKE_FILE)
    if not POKE_FILE.exists():
        return set()
    try:
        data = json.loads(POKE_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  Could not parse Pokemon JSON: {e}")
        return set()
    out: set[str] = set()
    for entry in data.get("results", []):
        name = entry.get("name", "").strip().lower()
        name = name.replace("-", "").replace(".", "").replace(" ", "")
        if name and name.isalpha():
            out.add(name)
    return out


def load_pop_culture() -> set[str]:
    out: set[str] = set()
    for w in POP_CULTURE_WORDS:
        w = w.strip().lower().replace(" ", "").replace("_", "").replace("-", "")
        if w and w.isalpha() and len(w) >= 3:
            out.add(w)
    return out


# ---------------------------------------------------------------------------
# Precompute + search
# ---------------------------------------------------------------------------

# Precomputed structure: source_name → list of (word, digit_string)
WordDB = Dict[str, List[Tuple[str, str]]]


def build_db(sources: Dict[str, set[str]]) -> WordDB:
    db: WordDB = {}
    for name, words in sources.items():
        db[name] = [(w, word_to_digits(w)) for w in sorted(words)]
        print(f"  Encoded {name}: {len(db[name]):,} entries")
    return db


def search(
    db: WordDB,
    number: str,
    exact: bool = True,
    limit_per_source: int = 50,
) -> Dict[str, List[str]]:
    if not number.isdigit():
        raise ValueError(f"Not a valid number: {number!r}")
    results: Dict[str, List[str]] = {}
    for name, entries in db.items():
        hits: List[str] = []
        for word, digits in entries:
            if (digits == number) if exact else (number in digits):
                hits.append(word)
                if len(hits) >= limit_per_source:
                    break
        results[name] = hits
    return results


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def print_results(number: str, results: Dict[str, List[str]], exact: bool) -> int:
    mode = "EXACT" if exact else "CONTAINS"
    print()
    print(f"  Search: {number}  ({mode} match)  →  sources: {len(results)}")
    print("  " + "─" * 56)
    total = 0
    for name, hits in results.items():
        if hits:
            print(f"  [{name}] {len(hits)} match(es):")
            for i in range(0, len(hits), 4):
                row = hits[i:i + 4]
                print("    " + "  ".join(f"{w:<18}" for w in row))
            total += len(hits)
        else:
            print(f"  [{name}] no matches")
    print("  " + "─" * 56)
    print(f"  Total: {total} matches")
    print()
    return total


def export_results(
    number: str,
    results: Dict[str, List[str]],
    exact: bool,
    path: Path,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = "EXACT" if exact else "CONTAINS"
    with path.open("w", encoding="utf-8") as f:
        f.write(f"Major System Word Finder — Results\n")
        f.write(f"Number: {number}\n")
        f.write(f"Mode:   {mode}\n")
        f.write("=" * 60 + "\n\n")
        total = 0
        for name, hits in results.items():
            f.write(f"[{name}] ({len(hits)} matches)\n")
            for w in hits:
                f.write(f"  {w}\n")
            f.write("\n")
            total += len(hits)
        f.write("=" * 60 + "\n")
        f.write(f"Total: {total} matches\n")
    print(f"  Exported → {path}")


# ---------------------------------------------------------------------------
# Interactive REPL
# ---------------------------------------------------------------------------

HELP_TEXT = """
Commands:
  <number>            Find words that EXACTLY encode this number
                      e.g. 34 → mare, Mary, mirror... (only m-r words)
  all:<number>        Find words that CONTAIN this number anywhere
                      e.g. all:34 → mare, mirRor, MaRy, MiRRor...
  encode <word>       Show the digit string for a single word
  help                Show this help
  quit / exit         Leave
"""


def interactive(db: WordDB) -> None:
    print("=" * 60)
    print("  MAJOR SYSTEM WORD FINDER")
    print("=" * 60)
    print()
    print("Sources loaded:")
    for name, entries in db.items():
        print(f"  - {name:<12} {len(entries):>8,} words")
    print()
    print(HELP_TEXT)
    while True:
        try:
            user = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not user:
            continue
        if user.lower() in ("quit", "exit", "q"):
            break
        if user.lower() in ("help", "h", "?"):
            print(HELP_TEXT)
            continue
        if user.lower().startswith("encode "):
            word = user[7:].strip()
            if not word:
                print("  Usage: encode <word>")
                continue
            digits = word_to_digits(word)
            print(f"  '{word}' → {digits if digits else '(empty — all free letters)'}")
            continue

        partial = user.startswith("all:")
        num = user[4:].strip() if partial else user
        if not num.isdigit():
            print(f"  '{num}' is not a number. Type 'help' for usage.")
            continue
        results = search(db, num, exact=not partial, limit_per_source=50)
        print_results(num, results, exact=not partial)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: List[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Major System word finder (English, Spanish, Pokemon, PopCulture).")
    p.add_argument("number", nargs="?",
                   help="Number to search for. Prefix with 'all:' for partial matches.")
    p.add_argument("--limit", type=int, default=50,
                   help="Max results per source (default: 50).")
    p.add_argument("--encode", metavar="WORD",
                   help="Print the Major System digit string for a single word.")
    p.add_argument("--export", metavar="PATH",
                   help="Export results to a text file.")
    p.add_argument("--no-spanish", action="store_true",
                   help="Skip Spanish dictionary (faster startup).")
    p.add_argument("--no-english", action="store_true",
                   help="Skip English dictionary (faster startup).")
    args = p.parse_args(argv)

    # Single encode mode (no DB needed)
    if args.encode:
        print(f"{args.encode} → {word_to_digits(args.encode)}")
        return 0

    print("Loading word sources...")
    sources: Dict[str, set[str]] = {}
    if not args.no_english:
        en = load_english()
        if en:
            sources["English"] = en
            print(f"  English:    {len(en):>8,} words")
    if not args.no_spanish:
        es = load_spanish()
        if es:
            sources["Spanish"] = es
            print(f"  Spanish:    {len(es):>8,} words")
    sources["Pokemon"] = load_pokemon()
    sources["PopCulture"] = load_pop_culture()
    print(f"  Pokemon:    {len(sources['Pokemon']):>8,} words")
    print(f"  PopCulture: {len(sources['PopCulture']):>8,} words")
    print()

    print("Encoding all words (one-time precompute)...")
    db = build_db(sources)
    print()

    # No number → interactive
    if not args.number:
        interactive(db)
        return 0

    partial = args.number.startswith("all:")
    num = args.number[4:] if partial else args.number
    if not num.isdigit():
        print(f"Error: '{num}' is not a valid number.")
        return 1

    results = search(db, num, exact=not partial, limit_per_source=args.limit)
    print_results(num, results, exact=not partial)

    if args.export:
        export_results(num, results, exact=not partial, path=Path(args.export))
    return 0


if __name__ == "__main__":
    sys.exit(main())
