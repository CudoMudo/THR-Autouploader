# Upload Assistant - Discogs metadata searcher
import json
import re
import urllib.parse
from typing import Any, Optional
import httpx
from src.console import console

USER_AGENT = "THR-Autouploader/1.4.2"


def extract_discogs_id_from_str(s: str) -> Optional[int]:
    """Extract numeric Discogs ID from URL or raw ID string."""
    if not s:
        return None
    s = s.strip()
    # Match URL like /release/123456 or /master/123456
    m = re.search(r'/(?:release|master)/(\d+)', s)
    if m:
        return int(m.group(1))
    # Match prefix like discogs:123456 or r123456
    m = re.search(r'(?:discogs:|[rm])?(\d+)', s, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


def parse_music_folder_name(folder_name: str) -> dict[str, str]:
    """
    Extracts artist, title, year, label, and catalog number from scene-style folder names.
    E.g. 'VA - Afterhours, Vol. 1 (2022) [Future Avenue - FA022LP] [WEB - FLAC] - Bon82'
    """
    # 1. Year (e.g. (2022))
    year = ""
    ym = re.search(r'\((\d{4})\)', folder_name)
    if ym:
        year = ym.group(1)

    # 2. Bracket contents
    brackets = re.findall(r'\[(.*?)\]', folder_name)
    catno = ""
    label = ""
    format_info = ""
    for b in brackets:
        b_clean = b.strip()
        if any(w in b_clean.upper() for w in ['FLAC', 'MP3', 'WEB', 'CD', 'VINYL', 'SACD', 'WAV', 'APE']):
            format_info = b_clean
        elif ' - ' in b_clean:
            parts = b_clean.split(' - ', 1)
            label = parts[0].strip()
            catno = parts[1].strip()
        elif re.match(r'^[A-Z0-9\-]{3,}$', b_clean):
            catno = b_clean

    # 3. Clean string for artist/title
    clean = re.sub(r'\[.*?\]', '', folder_name)
    clean = re.sub(r'\(\d{4}\)', '', clean)
    clean = re.sub(r'\s*-\s*[A-Za-z0-9_]+$', '', clean)  # trailing ripper/group tag
    clean = re.sub(r'\s+', ' ', clean).strip()

    artist = ""
    title = clean
    if ' - ' in clean:
        parts = clean.split(' - ', 1)
        artist = parts[0].strip()
        title = parts[1].strip()

    return {
        "artist": artist,
        "title": title,
        "year": year,
        "catno": catno,
        "label": label,
        "format": format_info,
    }


async def fetch_discogs_release_details(release_id: int, client: httpx.AsyncClient) -> dict[str, Any]:
    """Fetch full details for a Discogs release."""
    url = f"https://api.discogs.com/releases/{release_id}"
    resp = await client.get(url, headers={"User-Agent": USER_AGENT})
    if resp.status_code != 200:
        return {}

    data = resp.json()
    cover_url = ""
    images = data.get("images", [])
    if images and isinstance(images, list):
        cover_url = images[0].get("uri", "") or images[0].get("resource_url", "")

    artist_str = ""
    artists = data.get("artists", [])
    if artists:
        artist_str = ", ".join(a.get("name", "") for a in artists if a.get("name"))

    return {
        "discogs_id": release_id,
        "title": data.get("title", ""),
        "artist": artist_str,
        "year": str(data.get("year", "") or ""),
        "genres": data.get("genres", []),
        "styles": data.get("styles", []),
        "cover_url": cover_url,
    }


async def search_discogs_metadata(folder_name: str, discogs_manual: Optional[str] = None, debug: bool = False) -> dict[str, Any]:
    """Search Discogs or fetch release by manual ID/URL."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Case 1: Manual ID or URL
        if discogs_manual:
            extracted_id = extract_discogs_id_from_str(str(discogs_manual))
            if extracted_id:
                if debug:
                    console.print(f"[cyan]Dohvaćam Discogs detalje za ID: {extracted_id}[/cyan]")
                try:
                    details = await fetch_discogs_release_details(extracted_id, client)
                    if details:
                        return details
                except Exception as e:
                    if debug:
                        console.print(f"[yellow]Discogs fetch error: {e}[/yellow]")
                return {"discogs_id": extracted_id}

        # Case 2: Automatic search from parsed folder name
        parsed = parse_music_folder_name(folder_name)
        if debug:
            console.print(f"[cyan]Discogs raščlanjivanje: {parsed}[/cyan]")

        # 2a. Try search by Catalog Number (highest precision)
        if parsed.get("catno"):
            catno = parsed["catno"]
            try:
                params = {"catno": catno}
                url = f"https://api.discogs.com/database/search?{urllib.parse.urlencode(params)}"
                resp = await client.get(url, headers={"User-Agent": USER_AGENT})
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    if results:
                        best = results[0]
                        rel_id = best.get("id")
                        if rel_id:
                            if debug:
                                console.print(f"[green]Discogs pronađen po CatNo ({catno}): ID {rel_id} - {best.get('title')}[/green]")
                            details = await fetch_discogs_release_details(rel_id, client)
                            if details:
                                return details
                            return {
                                "discogs_id": rel_id,
                                "title": best.get("title", ""),
                                "year": str(best.get("year", "") or ""),
                                "cover_url": best.get("cover_image", ""),
                            }
            except Exception as e:
                if debug:
                    console.print(f"[yellow]Discogs CatNo search error: {e}[/yellow]")

        # 2b. Try search by release_title (+ optional artist/year)
        if parsed.get("title"):
            try:
                params = {"release_title": parsed["title"]}
                if parsed.get("year"):
                    params["year"] = parsed["year"]
                if parsed.get("artist") and parsed["artist"].upper() not in ("VA", "VARIOUS", "VARIOUS ARTISTS"):
                    params["artist"] = parsed["artist"]

                url = f"https://api.discogs.com/database/search?{urllib.parse.urlencode(params)}"
                resp = await client.get(url, headers={"User-Agent": USER_AGENT})
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    if results:
                        best = results[0]
                        rel_id = best.get("id")
                        if rel_id:
                            if debug:
                                console.print(f"[green]Discogs pronađen po naslovu: ID {rel_id} - {best.get('title')}[/green]")
                            details = await fetch_discogs_release_details(rel_id, client)
                            if details:
                                return details
                            return {
                                "discogs_id": rel_id,
                                "title": best.get("title", ""),
                                "year": str(best.get("year", "") or ""),
                                "cover_url": best.get("cover_image", ""),
                            }
            except Exception as e:
                if debug:
                    console.print(f"[yellow]Discogs title search error: {e}[/yellow]")

        # 2c. Generic fallback search
        clean_title = parsed.get("title") or folder_name
        try:
            url = f"https://api.discogs.com/database/search?{urllib.parse.urlencode({'q': clean_title, 'type': 'release'})}"
            resp = await client.get(url, headers={"User-Agent": USER_AGENT})
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    best = results[0]
                    rel_id = best.get("id")
                    if rel_id:
                        if debug:
                            console.print(f"[green]Discogs pronađen po generic search: ID {rel_id} - {best.get('title')}[/green]")
                        return {
                            "discogs_id": rel_id,
                            "title": best.get("title", ""),
                            "year": str(best.get("year", "") or ""),
                            "cover_url": best.get("cover_image", ""),
                        }
        except Exception as e:
            if debug:
                console.print(f"[yellow]Discogs generic search error: {e}[/yellow]")

    return {}
