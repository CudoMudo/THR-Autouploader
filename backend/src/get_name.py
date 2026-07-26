# Upload Assistant © 2025 Audionut & wastaken7 — Licensed under UAPL v1.0
import os
import re
import sys
from collections.abc import MutableMapping, Sequence
from typing import Any, Callable, Optional, cast

import anitopy
import cli_ui
import guessit
from typing_extensions import TypeAlias

from src.cleanup import cleanup_manager
from src.console import console
from src.trackers.COMMON import COMMON

guessit_module: Any = cast(Any, guessit)
GuessitFn = Callable[[str, Optional[dict[str, Any]]], dict[str, Any]]


def guessit_fn(value: str, options: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    return cast(dict[str, Any], guessit_module.guessit(value, options))

TRACKER_DISC_REQUIREMENTS = {
    'ULCX': {'region': 'mandatory', 'distributor': 'mandatory'},
    'SHRI': {'region': 'mandatory', 'distributor': 'optional'},
    'OTW': {'region': 'mandatory', 'distributor': 'optional'},
}

Meta: TypeAlias = MutableMapping[str, Any]


class NameManager:
    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.common = COMMON(config=config)

    async def get_name(self, meta: Meta) -> tuple[str, str, str, list[str]]:
        active_trackers: list[str] = [
            tracker for tracker in TRACKER_DISC_REQUIREMENTS
            if tracker in meta.get('trackers', [])
        ]
        if active_trackers:
            region, distributor, trackers_to_remove = await self.missing_disc_info(meta, active_trackers)
            for tracker in trackers_to_remove:
                if tracker in meta['trackers']:
                    if meta.get('unattended', False):
                        console.print()
                        console.print(f"[yellow]Removing tracker {tracker} due to missing distributor/region info.[/yellow]")
                    meta['trackers'].remove(tracker)
            if distributor and 'SKIPPED' not in distributor:
                meta['distributor'] = distributor
            if region and 'SKIPPED' not in region:
                meta['region'] = region
        type = str(meta.get('type', "")).upper()
        title = str(meta.get('title', ""))
        alt_title = str(meta.get('aka', ""))
        year = str(meta.get('year', ""))
        manual_year_value = meta.get('manual_year')
        if manual_year_value is not None and int(manual_year_value) > 0:
            year = str(manual_year_value)
        resolution = str(meta.get('resolution', ""))
        if resolution == "OTHER":
            resolution = ""
        audio = str(meta.get('audio', ""))
        service = str(meta.get('service', ""))
        season = str(meta.get('season', ""))
        episode = str(meta.get('episode', ""))
        part = str(meta.get('part', ""))
        repack = str(meta.get('repack', ""))
        three_d = str(meta.get('3D', ""))
        tag = str(meta.get('tag', ""))
        source = str(meta.get('source', ""))
        uhd = str(meta.get('uhd', ""))
        hdr = str(meta.get('hdr', ""))
        hybrid = 'Hybrid' if meta.get('webdv', "") else ""
        if meta.get('manual_episode_title'):
            episode_title = str(meta.get('manual_episode_title', ""))
        elif meta.get('daily_episode_title'):
            episode_title = str(meta.get('daily_episode_title', ""))
        else:
            episode_title = ""
        video_codec = ""
        video_encode = ""
        region = ""
        dvd_size = ""
        if meta.get('is_disc', "") == "BDMV":  # Disk
            video_codec = str(meta.get('video_codec', ""))
            region = str(meta.get('region', "") or "")
        elif meta.get('is_disc', "") == "DVD":
            region = str(meta.get('region', "") or "")
            dvd_size = str(meta.get('dvd_size', ""))
        else:
            video_codec = str(meta.get('video_codec', ""))
            video_encode = str(meta.get('video_encode', ""))
        edition = str(meta.get('edition', ""))
        if 'hybrid' in edition.upper():
            edition = edition.replace('Hybrid', '').strip()

        if meta['category'] == "TV":
            year = meta['year'] if meta['search_year'] != "" else ""
            if meta.get('manual_date'):
                # Ignore season and year for --daily flagged shows, just use manual date stored in episode_name
                season = ''
                episode = ''
        if meta.get('no_season', False) is True:
            season = ''
        if meta.get('no_year', False) is True:
            year = ''
        if meta.get('no_aka', False) is True:
            alt_title = ''
        if meta['debug']:
            console.log("[cyan]get_name cat/type")
            console.log(f"CATEGORY: {meta['category']}")
            console.log(f"TYPE: {meta['type']}")
            console.log("[cyan]get_name meta:")
            # console.log(meta)

        # YAY NAMING FUN
        name = ""
        potential_missing: list[str] = []
        if meta['category'] == "MOVIE":  # MOVIE SPECIFIC
            if type == "DISC":  # Disk
                if meta['is_disc'] == 'BDMV':
                    name = f"{title} {alt_title} {year} {three_d} {edition} {hybrid} {repack} {resolution} {region} {uhd} {source} {hdr} {video_codec} {audio}"
                    potential_missing = ['edition', 'region', 'distributor']
                elif meta['is_disc'] == 'DVD':
                    name = f"{title} {alt_title} {year} {repack} {edition} {region} {source} {dvd_size} {audio}"
                    potential_missing = ['edition', 'distributor']
                elif meta['is_disc'] == 'HDDVD':
                    name = f"{title} {alt_title} {year} {edition} {repack} {resolution} {source} {video_codec} {audio}"
                    potential_missing = ['edition', 'region', 'distributor']
            elif type == "REMUX" and source in ("BluRay", "HDDVD"):  # BluRay/HDDVD Remux
                name = f"{title} {alt_title} {year} {three_d} {edition} {hybrid} {repack} {resolution} {uhd} {source} REMUX {hdr} {video_codec} {audio}"
                potential_missing = ['edition', 'description']
            elif type == "REMUX" and source in ("PAL DVD", "NTSC DVD", "DVD"):  # DVD Remux
                name = f"{title} {alt_title} {year} {edition} {repack} {source} REMUX  {audio}"
                potential_missing = ['edition', 'description']
            elif type == "ENCODE":  # Encode
                name = f"{title} {alt_title} {year} {edition} {hybrid} {repack} {resolution} {uhd} {source} {audio} {hdr} {video_encode}"
                potential_missing = ['edition', 'description']
            elif type == "WEBDL":  # WEB-DL
                name = f"{title} {alt_title} {year} {edition} {hybrid} {repack} {resolution} {uhd} {service} WEB-DL {audio} {hdr} {video_encode}"
                potential_missing = ['edition', 'service']
            elif type == "WEBRIP":  # WEBRip
                name = f"{title} {alt_title} {year} {edition} {hybrid} {repack} {resolution} {uhd} {service} WEBRip {audio} {hdr} {video_encode}"
                potential_missing = ['edition', 'service']
            elif type == "HDTV":  # HDTV
                name = f"{title} {alt_title} {year} {edition} {repack} {resolution} {source} {audio} {video_encode}"
                potential_missing = []
            elif type == "DVDRIP":
                name = f"{title} {alt_title} {year} {source} {video_encode} DVDRip {audio}"
                potential_missing = []
        elif meta['category'] == "TV":  # TV SPECIFIC
            if type == "DISC":  # Disk
                if meta['is_disc'] == 'BDMV':
                    name = f"{title} {year} {alt_title} {season}{episode} {three_d} {edition} {hybrid} {repack} {resolution} {region} {uhd} {source} {hdr} {video_codec} {audio}"
                    potential_missing = ['edition', 'region', 'distributor']
                if meta['is_disc'] == 'DVD':
                    name = f"{title} {year} {alt_title} {season}{episode}{three_d} {repack} {edition} {region} {source} {dvd_size} {audio}"
                    potential_missing = ['edition', 'distributor']
                elif meta['is_disc'] == 'HDDVD':
                    name = f"{title} {alt_title} {year} {edition} {repack} {resolution} {source} {video_codec} {audio}"
                    potential_missing = ['edition', 'region', 'distributor']
            elif type == "REMUX" and source in ("BluRay", "HDDVD"):  # BluRay Remux
                name = f"{title} {year} {alt_title} {season}{episode} {episode_title} {part} {three_d} {edition} {hybrid} {repack} {resolution} {uhd} {source} REMUX {hdr} {video_codec} {audio}"  # SOURCE
                potential_missing = ['edition', 'description']
            elif type == "REMUX" and source in ("PAL DVD", "NTSC DVD", "DVD"):  # DVD Remux
                name = f"{title} {year} {alt_title} {season}{episode} {episode_title} {part} {edition} {repack} {source} REMUX {audio}"  # SOURCE
                potential_missing = ['edition', 'description']
            elif type == "ENCODE":  # Encode
                name = f"{title} {year} {alt_title} {season}{episode} {episode_title} {part} {edition} {hybrid} {repack} {resolution} {uhd} {source} {audio} {hdr} {video_encode}"  # SOURCE
                potential_missing = ['edition', 'description']
            elif type == "WEBDL":  # WEB-DL
                name = f"{title} {year} {alt_title} {season}{episode} {episode_title} {part} {edition} {hybrid} {repack} {resolution} {uhd} {service} WEB-DL {audio} {hdr} {video_encode}"
                potential_missing = ['edition', 'service']
            elif type == "WEBRIP":  # WEBRip
                name = f"{title} {year} {alt_title} {season}{episode} {episode_title} {part} {edition} {hybrid} {repack} {resolution} {uhd} {service} WEBRip {audio} {hdr} {video_encode}"
                potential_missing = ['edition', 'service']
            elif type == "HDTV":  # HDTV
                name = f"{title} {year} {alt_title} {season}{episode} {episode_title} {part} {edition} {repack} {resolution} {source} {audio} {video_encode}"
                potential_missing = []
            elif type == "DVDRIP":
                name = f"{title} {year} {alt_title} {season} {source} DVDRip {audio} {video_encode}"
                potential_missing = []

        try:
            name = ' '.join(name.split())
        except Exception:
            console.print("[bold red]Unable to generate name. Please re-run and correct any of the following args if needed.")
            console.print(f"--category [yellow]{meta['category']}")
            console.print(f"--type [yellow]{meta['type']}")
            console.print(f"--source [yellow]{meta['source']}")
            console.print("[bold green]If you specified type, try also specifying source")

            exit()
        name_notag = name
        name = name_notag + tag
        clean_name = await self.clean_filename(name)
        return name_notag, name, clean_name, potential_missing

    async def clean_filename(self, name: str) -> str:
        invalid = '<>:"/\\|?*'
        for char in invalid:
            name = name.replace(char, '-')
        return name

    async def extract_title_and_year(self, meta: Meta, filename: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
        basename = os.path.basename(filename)
        basename = os.path.splitext(basename)[0]

        secondary_title: Optional[str] = None
        year: Optional[str] = None

        # Check for AKA patterns first
        aka_patterns = [' AKA ', '.aka.', ' aka ', '.AKA.']
        for pattern in aka_patterns:
            if pattern in basename:
                aka_parts = basename.split(pattern, 1)
                if len(aka_parts) > 1:
                    primary_title = aka_parts[0].strip()
                    secondary_part = aka_parts[1].strip()

                    # Look for a year in the primary title
                    year_match_primary = re.search(r'\b(19|20)\d{2}\b', primary_title)
                    if year_match_primary:
                        year = year_match_primary.group(0)

                    # Process secondary title
                    secondary_match = re.match(r"^(\d+)", secondary_part)
                    if secondary_match:
                        secondary_title = secondary_match.group(1)
                    else:
                        # Catch everything after AKA until it hits a year or release info
                        year_or_release_match = re.search(r'\b(19|20)\d{2}\b|\bBluRay\b|\bREMUX\b|\b\d+p\b|\bDTS-HD\b|\bAVC\b', secondary_part)
                        if year_or_release_match and re.match(r'\b(19|20)\d{2}\b', year_or_release_match.group(0)) and not year:
                            # If no year was found in primary title, or we want to override
                            year = year_or_release_match.group(0)

                            secondary_title = secondary_part[:year_or_release_match.start()].strip()
                        else:
                            secondary_title = secondary_part

                    primary_title = primary_title.replace('.', ' ')
                    if secondary_title is not None:
                        secondary_title = secondary_title.replace('.', ' ')
                    return primary_title, secondary_title, year

        basename = os.path.basename(str(meta.get('uuid', ''))) if meta.get('uuid') else ""
        if meta['debug']:
            console.print(f"[cyan]Extracting title and year from folder name: {basename}[/cyan]")

        guess_data = guessit_fn(basename)
        
        title = guess_data.get('title')
        if not title:
            # Fallback if guessit fails completely
            title = basename
            
        actual_year = str(guess_data.get('year')) if guess_data.get('year') else None
        
        return str(title), None, actual_year

    async def multi_replace(self, text: str, replacements: dict[str, str]) -> str:
        for old, new in replacements.items():
            text = re.sub(re.escape(old), new, text, flags=re.IGNORECASE)
        return text

    async def missing_disc_info(self, meta: Meta, active_trackers: Sequence[str]) -> tuple[str, str, list[str]]:
        distributor_id = await self.common.unit3d_distributor_ids(str(meta.get('distributor', "")))
        region_id = await self.common.unit3d_region_ids(str(meta.get('region', "")))
        region_name = str(meta.get('region', ""))
        distributor_name = str(meta.get('distributor', ""))
        trackers_to_remove: list[str] = []

        if meta.get('is_disc') == "BDMV":
            strictest = {'region': 'optional', 'distributor': 'optional'}
            for tracker in active_trackers:
                requirements = TRACKER_DISC_REQUIREMENTS.get(tracker, {})
                if requirements.get('region') == 'mandatory':
                    strictest['region'] = 'mandatory'
                if requirements.get('distributor') == 'mandatory':
                    strictest['distributor'] = 'mandatory'
            if not region_id:
                region_name = await self._prompt_for_field(meta, "Region code", strictest['region'] == 'mandatory')
                if region_name and region_name != "SKIPPED":
                    region_id = await self.common.unit3d_region_ids(region_name)
            if not distributor_id:
                distributor_name = await self._prompt_for_field(meta, "Distributor", strictest['distributor'] == 'mandatory')
                if distributor_name and distributor_name != "SKIPPED":
                    console.print(f"Looking up distributor ID for: {distributor_name}")
                    distributor_id = await self.common.unit3d_distributor_ids(distributor_name)
                    console.print(f"Found distributor ID: {distributor_id}")

            for tracker in active_trackers:
                requirements = TRACKER_DISC_REQUIREMENTS.get(tracker, {})
                if ((requirements.get('region') == 'mandatory' and region_name == "SKIPPED") or
                        (requirements.get('distributor') == 'mandatory' and distributor_name == "SKIPPED")):
                    trackers_to_remove.append(tracker)

        return region_name, distributor_name, trackers_to_remove

    async def _prompt_for_field(self, meta: Meta, field_name: str, is_mandatory: bool) -> str:
        """Prompt user for disc field with appropriate mandatory/optional text."""
        if meta['unattended'] and not meta.get('unattended_confirm', False):
            return "SKIPPED"
        suffix = " (MANDATORY): " if is_mandatory else " (optional, press Enter to skip): "
        prompt = f"{field_name} not found for disc. Please enter it manually{suffix}"
        try:
            value = cli_ui.ask_string(prompt)
            return value.upper() if value else "SKIPPED"
        except EOFError:
            console.print("\n[red]Exiting on user request (Ctrl+C)[/red]")
            await cleanup_manager.cleanup()
            cleanup_manager.reset_terminal()
            sys.exit(1)
