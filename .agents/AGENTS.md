# THRuploader - Arhitektura i Pravila za Agente (SIDE PROJEKT)

**VAŽNA NAPOMENA O GITU:**
Ovo je **SIDE PROJEKT** (lokalna desktop aplikacija), a NE glavni TorrentHR (VM/Live) projekt! 
- **Ovdje je Git apsolutni izvor istine (Source of Truth).**
- Sav napredak, source kod i commitovi se prate ovdje na Gitu. (Logika je potpuno suprotna od glavnog web projekta gdje je Live produkcija jedini izvor istine, a Git samo backup).
- Kad završiš neki feature za ovaj Autouploader, kod se normalno commita i pusha u ovaj repozitorij.

**ARHITEKTURA I RELEASE:**
1. **PORTABLE APLIKACIJA:** Ovo je prijenosna (portable) aplikacija. To znači da se `config.py` i svi korisnički podaci spremaju ISKLJUČIVO u folder u kojem se aplikacija nalazi. Ne smiješ mijenjati kod da sprema podatke u `%APPDATA%` ili Windows Registry.
2. **STRUKTURA IZDANJA (RELEASE):** Korisnici dobivaju samo `.zip` arhivu koja sadrži isključivo izvršnu datoteku (`thr_autouploader.exe`) i pripadajući `backend` folder.
3. **ZABRANA ZIPPANJA SVEGA:** NIKADA ne smiješ zippati cijeli repozitorij (source kod) kao finalni release! To je ogromna greška.
4. **ČIŠĆENJE OSOBNIH PODATAKA I SMEĆA:** Prilikom kreiranja ZIP izdanja, STROGO se mora:
   - Izbaciti `backend/data/config.py` te `gui_settings.json` (osobni ključevi).
   - Izbaciti `backend/dist`, `backend/build` (zaostali PyInstaller buildovi).
   - Isprazniti `backend/tmp` i `backend/Torrents` (lokalni testni fajlovi poput filmova).
   Za sigurno pakiranje releasea koristi se skripta `Pack-PortableRelease.ps1` iz root foldera koja to sve radi automatski (i skida veličinu ZIP-a sa 150MB na 12MB).

**LOG RADOVA / CHANGELOG (Za Agente):**
- **v1.3.6 Hotfixes:**
  - `NoneType object has no attribute closed` error: Riješen problem gdje se pri završetku rada (bez konzole iz GUI-ja) rušio PyInstaller jer je pokušavao ugasiti prazne (None) terminal streamove (`sys.stdin`, `stdout`, `stderr`).
  - `IMDb API 403 Forbidden`: Riješen problem s dohvaćanjem podataka s IMDb GraphQL API-ja dodavanjem potrebnog `User-Agent` zaglavlja u `src/imdb.py`.
  - `tags.json error`: Implementirana 'silent' provjera (preskakanje) ako datoteka `tags.json` ne postoji na korisnikovom računalu (`src/tags.py`).
