# Upload Assistant © 2025 Audionut & wastaken7 — Licensed under UAPL v1.0
import re
from typing import Any, Optional

from src.trackers.COMMON import COMMON
from src.trackers.UNIT3D import UNIT3D

Meta = dict[str, Any]
Config = dict[str, Any]


class THR(UNIT3D):
    def __init__(self, config: Config) -> None:
        super().__init__(config, tracker_name='THR')
        self.config = config
        self.common = COMMON(config)
        self.tracker = 'THR'
        self.base_url = 'https://www.torrenthr.org'
        self.id_url = f'{self.base_url}/api/torrents/'
        self.upload_url = f'{self.base_url}/api/torrents/upload'
        self.requests_url = f'{self.base_url}/api/requests/filter'  # If the site supports requests via API, otherwise remove this line
        self.search_url = f'{self.base_url}/api/torrents/filter'
        self.torrent_url = f'{self.base_url}/torrents/'
        self.banned_groups = [""]
        pass

    # The section below can be deleted if no changes are needed, as everything else is handled in UNIT3D.py
    # If advanced changes are required, copy the necessary functions from UNIT3D.py here
    # For example, if you need to modify the description, copy and paste the 'get_description' function and adjust it accordingly

    # If default UNIT3D categories, remove this function
    async def get_category_id(
        self,
        meta: Meta,
        category: Optional[str] = None,
        reverse: bool = False,
        mapping_only: bool = False,
    ) -> dict[str, str]:
        _ = (category, reverse, mapping_only)
        
        # 1. Eksplicitni ručni odabir specifične kategorije
        raw_manual = str(meta.get('manual_category') or '').strip().upper()
        if raw_manual in ('18', 'CRTICI', 'CRTIĆI', 'ANIMATION', 'CARTOON', 'CARTOONS'):
            return {'category_id': '18'}
        elif raw_manual in ('12', 'DOCU', 'DOCUMENTARY', 'DOKUMENTARCI', 'DOKUMENTARNI', 'DOKU'):
            return {'category_id': '12'}
        elif raw_manual in ('31', 'ANIME'):
            return {'category_id': '31'}
        elif raw_manual in ('17', 'MOVIE_HD'):
            return {'category_id': '17'}
        elif raw_manual in ('4', 'MOVIE_SD'):
            return {'category_id': '4'}
        elif raw_manual in ('14', 'MOVIE_DVD'):
            return {'category_id': '14'}
        elif raw_manual in ('40', 'MOVIE_BD'):
            return {'category_id': '40'}
        elif raw_manual in ('34', 'TV_HD'):
            return {'category_id': '34'}
        elif raw_manual in ('7', 'TV_SD'):
            return {'category_id': '7'}
        elif raw_manual in ('29', 'MUSIC_FLAC', 'FLAC'):
            return {'category_id': '29'}
        elif raw_manual in ('3', 'MUSIC_MP3', 'MP3', 'MUSIC'):
            return {'category_id': '3'}
        elif raw_manual in ('5', 'GAME', 'GAMES', 'PC_GAME'):
            return {'category_id': '5'}
        elif raw_manual in ('1', 'APP', 'APPS', 'APLIKACIJE'):
            return {'category_id': '1'}
        elif raw_manual in ('25', 'EBOOK', 'EBOOKS', 'E-BOOKS'):
            return {'category_id': '25'}
        elif raw_manual in ('30', 'STRIP', 'STRIPOVI', 'COMICS'):
            return {'category_id': '30'}
        elif raw_manual in ('11', 'CONCERT', 'KONCERTI', 'SPOTOVI'):
            return {'category_id': '11'}
        elif raw_manual.isdigit() and int(raw_manual) > 0:
            return {'category_id': raw_manual}

        # 2. Automatsko određivanje THR kategorije na temelju detektiranog formata, rezolucije i medija
        cat_id = '0'
        res = str(meta.get('resolution', ''))
        is_hd = res in ('1080p', '1080i', '720p', '2160p', '4320p')
        is_disc = meta.get('type') == 'DISC'
        internal_cat = str(meta.get('category', '')).upper()

        if internal_cat == 'MOVIE':
            if is_disc:
                cat_id = '40' if is_hd else '14'
            else:
                cat_id = '17' if is_hd else '4'
        elif internal_cat == 'TV':
            cat_id = '34' if is_hd else '7'
        elif internal_cat == 'MUSIC':
            audio_info = str(meta.get('audio', '')).upper()
            title_info = str(meta.get('name', '')).upper()
            if 'FLAC' in audio_info or 'FLAC' in title_info:
                cat_id = '29'
            else:
                cat_id = '3'
        elif internal_cat == 'GAME':
            cat_id = '5'

        return {'category_id': cat_id}

    # If default UNIT3D types, remove this function
    async def get_type_id(
        self,
        meta: Meta,
        type: Optional[str] = None,
        reverse: bool = False,
        mapping_only: bool = False,
    ) -> dict[str, str]:
        _ = (type, reverse, mapping_only)
        type_id = {
            'DISC': '1',
            'REMUX': '2',
            'WEBDL': '4',
            'WEBRIP': '5',
            'HDTV': '6',
            'ENCODE': '3'
        }.get(meta['type'], '0')
        return {'type_id': type_id}

    # If default UNIT3D resolutions, remove this function
    async def get_resolution_id(
        self,
        meta: Meta,
        resolution: Optional[str] = None,
        reverse: bool = False,
        mapping_only: bool = False,
    ) -> dict[str, str]:
        _ = (resolution, reverse, mapping_only)
        resolution_id = {
            '8640p': '10',
            '4320p': '1',
            '2160p': '2',
            '1440p': '3',
            '1080p': '3',
            '1080i': '4',
            '720p': '5',
            '576p': '6',
            '576i': '7',
            '480p': '8',
            '480i': '9'
        }.get(meta['resolution'], '10')
        return {'resolution_id': resolution_id}

    # If there are tracker specific checks to be done before upload, add them here
    # Is it a movie only tracker? Are concerts banned? Etc.
    # If no checks are necessary, remove this function
    async def get_additional_checks(self, _meta: Meta) -> bool:
        should_continue = True
        return should_continue

    # If the tracker has modq in the api, otherwise remove this function
    # If no additional data is required, remove this function
    async def get_additional_data(self, meta: Meta) -> dict[str, Any]:
        data = {
            'mod_queue_opt_in': await self.get_flag(meta, 'modq'),
            'hrvatski_titl': 1 if meta.get('hr_titl') else 0,
            'personal_release': 1 if meta.get('personalrelease') else 0,
        }

        return data

    @staticmethod
    def format_thr_name(name: str) -> str:
        if not name:
            return ""
        # 1. Spacing before audio codecs & channels (e.g. DDP5.1 -> DDP 5.1, AAC2.0 -> AAC 2.0, DDP.5.1 -> DDP 5.1)
        s = re.sub(
            r'\b(DDP|DD\+|DD|AAC|AC3|EAC3|DTS(?:-HD(?: MA)?)?|TrueHD|FLAC|LPCM)[.\-_]?([1-9]\.[0-2])\b',
            r'\1 \2',
            name,
            flags=re.IGNORECASE
        )
        
        # 2. Protect special tokens with dots:
        # H.264 / H.265 / x.264 / x.265
        s = re.sub(r'\b([HhXx])\.(26[45])\b', r'\1@@DOT@@\2', s)
        # Audio channel counts (e.g. 5.1, 7.1, 2.0, 1.0, 2.1, 6.1)
        s = re.sub(r'\b(\d)\.(\d)\b', r'\1@@DOT@@\2', s)
        # Version strings (e.g. v1.0, v2.1)
        s = re.sub(r'\b(v\d+)\.(\d+)\b', r'\1@@DOT@@\2', s, flags=re.IGNORECASE)
        
        # 3. Replace remaining dots with spaces
        s = s.replace('.', ' ')
        
        # 4. Restore protected dots
        s = s.replace('@@DOT@@', '.')
        
        # 5. Clean up multiple spaces
        return re.sub(r'\s+', ' ', s).strip()

    # If the tracker has specific naming conventions, add them here; otherwise, remove this function
    async def get_name(self, meta: Meta) -> dict[str, str]:
        raw_name = meta.get('manual_name') or meta.get('name') or ''
        formatted_name = self.format_thr_name(str(raw_name))
        return {'name': formatted_name}

