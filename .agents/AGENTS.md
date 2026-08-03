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

**IMPLEMENTIRANI FEATURES I ZAŠTITE:**
1. **DUMMY PROOF ŠTIT (API & FFmpeg):** 
   - Aplikacija NE SMIJE proslijediti komandu Python backendu ako nisu ispunjeni apsolutni preduvjeti. 
   - Provjere se vrše isključivo u React frontendu prije poziva Rust invoke komandi (API ključevi ne smiju biti prazni, i FFmpeg mora biti pronađen u sustavu).
   - Ako nedostaje ključ ili FFmpeg, korisniku se prikazuje prilagođeni "custom React modal" (crveni štit nasred ekrana), dok se originalni Windows `alert()` nikad ne smije koristiti zbog ružnog `tauri.localhost says` naslova.
2. **PAMETNI RUST FALLBACK ZA DEV OKRUŽENJE:**
   - Kako bismo podržali lokalni rad i testiranje bez ručnog PyInstaller bildanja svaki put, Rust funkcije (`start_upload` i `dry_run_upload`) posjeduju ugrađenu provjeru.
   - Ako postoji `upload.exe` (zapakirana produkcija) -> poziva se on.
   - Ako ne postoji `upload.exe` -> sustav to prepoznaje kao DEV rad i automatski izvršava `python upload.py` sa skriptom u source obliku, čime sprječavamo zloglasni `os error 3`.
3. **ČISTI (DUMMY) UI I ZAMJENA TERMINALA:**
   - Potpuno je izbačen raw terminalski ispis u glavnom React sučelju (`App.tsx`). Cilj aplikacije je da izgleda elegantno ("dummy-friendly") bez da plaši korisnika hakerskim ispisom iz Pythona.
   - Implementiran je strogi allow-list sustav na Rust eventima (`upload-log`). Samo vrlo specifični procesi prolaze u UI i automatski se prevode na hrvatski (npr. "Prikupljam podatke...", "Šaljem podatke na tracker...").
   - Za vrijeme `dry-run` i klasičnog uploada, korisnik umjesto terminala gleda samo moderni *Loading Spinner* s tom jednom kratkom rečenicom. Kad završi, ispisuje se konačni rezultat i Validation Card.
