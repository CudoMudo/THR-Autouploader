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
- **v1.3.7:**
  - `NoneType object has no attribute closed` error: Riješen problem gdje se pri završetku rada (bez konzole iz GUI-ja) rušio PyInstaller jer je pokušavao ugasiti prazne (None) terminal streamove (`sys.stdin`, `stdout`, `stderr`).
  - `IMDb API 403 Forbidden`: Riješen problem s dohvaćanjem podataka s IMDb GraphQL API-ja dodavanjem potrebnih HTTP zaglavlja.
  - `tags.json error`: Implementirana 'silent' provjera (preskakanje) ako datoteka `tags.json` ne postoji na korisnikovom računalu (`src/tags.py`).
  - `ffmpeg.exe`: Dodan statički ffmpeg binar u `backend/bin` kako bi portable verzija odmah radila s obradom medija bez potrebe za vanjskim alatima.
  - `processLimit`: Smanjen zadani limit (default fallback) u konfiguraciji s 10 na 1.

- **v1.3.8:**
  - **Failsafe Zastavice:** Dodane ručne kvačice za 'Hrvatski titl' i 'Osobni rls' (Personal Release) u GUI.
  - **Arhitektonska Lekcija:** Svi backend (Live) sustavi već automatski parsiraju MediaInfo za hrvatske titlove. Autouploader samo prosljeđuje failsafe vrijednosti, ne duplicira tu logiku unutar sebe.

- **v1.3.9:**
  - **Kompletne Video Kategorije:** U GUI dropdown dodana puna lista video kategorija s TorrentHR-a: Crtani Filmovi (18), Dokumentarni Filmovi (12), Anime (31), Filmovi HD (17), Filmovi SD (4), Filmovi DVD (14), Filmovi BD (40), Serije HD (34), Serije SD (7).
  - **Backend Parser & Tracker Mapiranje:** U `backend/src/args.py` uklonjena restrikcija na `-c` argument, a u `backend/src/trackers/THR.py` ugrađeno direktno mapiranje numeričkih ID-eva i precizno grananje kategorija.
  - **Arhitektonska Lekcija (Interni tip vs. Tracker KatID):** Interni `meta['category']` MORA uvijek ostati `MOVIE` ili `TV` jer o tome ovise TMDb pretraga i generator punog naziva torrenta (`get_name.py`). Tracker kategorije (18, 12, 31, itd.) se mapiraju isključivo na tracker razini (`category_id`).
  - **Pravilo o "Auto" poljima:** Sva polja koja korisnik u GUI-ju ostavi na "Auto" (prazno) moraju 100% prepustiti odluku ugrađenoj automatici i MediaInfo analizi. Ručni unos služi samo kao izolirani override.

- **v1.4.0:**
  - **Batch / Queue Upload Sustav:**
    - Ugrađen vizualni Batch Queue Manager u Tauri GUI (`App.tsx`, `App.css`).
    - Podržan simultani unos više mapa odjednom (drag & drop i ručni unos).
    - Status bedževi u redu čekanja: `Analiziram...`, `Spremno` (s prepoznatim nazivom i rezolucijom), `Učitavam...`, `✓ Uploadan` i `✕ Greška`.
    - Dvostrana sinkronizacija postavki: klikom na stavku u redu, ona se učitava u formu i sve izmjene se u stvarnom vremenu spremaju za tu stavku.
    - Sekvencijalni batch upload: `start_upload` u Rustu emitira `upload-finished` događaj s `item_id` kako bi frontend pouzdano čekao završetak svakog torrenta prije prelaska na sljedeći.
  - **Cover Art & Slike.THR Integracija:**
    - Nativni Rust uploader (`upload_image_to_slike`) preko `reqwest` multipart forme šalje sliku na `https://slike.torrenthr.org/api/1/upload`.
    - U traci iznad opisa dodan gumb "🖼️ Dodaj cover sliku" + podrška za drag & drop slike u textarea.
    - Automatsko ubacivanje `[img=350]URL[/img]` na vrh opisa i prikaz thumbnail pretpregleda.
  - **Markdown u BBCode Konverter:**
    - Implementiran `frontend/src/utils/bbcode.ts` koji pretvara standardni Markdown (`#`, `##`, `**bold**`, `*italic*`, `[text](url)`, `![alt](url)`, blockquotes, code blokove, liste) u TorrentHR kompatibilan BBCode.
  - **Čisti Torrent Payload (Excludes):**
    - U `backend/src/torrentcreate.py` implementirano isključivanje sporednih datoteka (`.nfo`, `.jpg`, `.jpeg`, `.png`, `.m3u`, `.m3u8`) iz stvaranja torrenta (osim ako je zadano `--keep-nfo`).
  - **Glazbeni MediaInfo Fix:**
    - U `backend/src/get_desc.py` filtrirano pojedinačno trajanje pjesme i naziv pojedinačne datoteke na vrhu MediaInfo bloka za albume s više pjesama.
  - **Formatiranje Naziva & Codec Razmaci:**
    - U `backend/src/trackers/THR.py` i `frontend/src/utils/formatters.ts` dodano pametno formatiranje: očuvanje tehničkih točaka (`H.264`, `H.265`, `5.1`, `7.1`, `2.0`, `v1.0`) i razmak ispred audio codeca (`DDP 5.1`, `AAC 2.0`).
    - Prošireno mapiranje kategorija: Glazba/FLAC (29), Glazba/MP3 (3), Igre/PC (5), Aplikacije (1), E-books (25), Stripovi (30), Koncerti (11).
  - **Tauri Build Pravilo:**
    - Produkcijski `.exe` se MORA graditi pozivom `bun run tauri build --no-bundle` (ili `bun run tauri build`), a NE čistim `cargo build --release`, kako bi se frontend dist asseti ugradili u `.exe` preko `tauri.localhost` protokola umjesto dev servera `localhost:1420`.

