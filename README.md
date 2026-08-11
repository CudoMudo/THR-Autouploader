<img width="1202" height="1052" alt="thr_autouploader_SOnlM66Vs2" src="https://github.com/user-attachments/assets/46e3d8ac-87f6-420e-b5f2-58de56f6d377" />

# THR Autouploader
Automatski uploader za TorrentHR s grafičkim (Tauri) sučeljem i Python (PyInstaller) backendom.

## Značajke

- **Potpuno nativna Windows aplikacija** - Nije potrebna instalacija Pythona, Node.js-a niti bilo kakvih dodatnih alata!
- **Grafičko sučelje (GUI)** - Prekrasno, brzo i responzivno sučelje za podešavanje postavki.
- **Odvojeni profili klijenata** - Aplikacija pamti tvoje postavke za **qBittorrent** i **rTorrent** potpuno odvojeno.
- **Podrška za API ključeve** - Unesi THR, Slike THR i TMDB ključeve izravno kroz GUI.
- **Pametni automatski sustav** - Prati mapu, parsira NFO datoteke, skida podatke s TMDB-a i šalje sve direktno na THR.

## Instalacija i Pokretanje (Za Korisnike)

Kao krajnjem korisniku, sve što vam treba nalazi se u sekciji **Releases**.

1. Otiđite na sekciju **Releases** na GitHubu (s desne strane ekrana).
2. Preuzmite najnoviji **`THRuploader_v1.3.5_Portable.zip`**.
3. Otpakirajte mapu bilo gdje na vašem računalu (Desktop, Dokumenti, USB...).
4. Pokrenite **`thr_autouploader.exe`**.

**Važna napomena za rad aplikacije: Kako bi aplikacija uspješno generirala screenshotove iz videa, potrebno je preuzeti ispravan 64-bitni ffmpeg.exe i ubaciti ga direktno u isti folder gdje se nalazi i aplikacija (root folder).

**Napomena oko postavki (gui_settings.json vs config.py):**
Kada prvi put unesete API ključeve i kliknete "Spremi", aplikacija će kreirati dvije datoteke u `backend/data` mapi:
1. `gui_settings.json` - Ovu datoteku GUI koristi kao "predmemoriju" za brzo i pouzdano učitavanje vaših postavki pri svakom paljenju.
2. `config.py` - Ovu datoteku koristi pozadinska (Python) skripta za rad.

Ako želite, uvijek možete ubaciti svoj stari, već podešeni `config.py` u mapu. Ako izbrišete `gui_settings.json`, aplikacija će inteligentno pročitati vaš `config.py` i automatski rekonstruirati sučelje!

## Za Developere (Kompajliranje iz izvornog koda)

Ako želite mijenjati kod i sami kompajlirati aplikaciju, trebat će vam:
- Rust (i Cargo)
- Node.js & Bun
- Python 3.12+

### 1. Kloniranje repozitorija
```bash
git clone https://github.com/CudoMudo/THR-Autouploader.git
cd THR-Autouploader
```

### 2. Kompajliranje Python Backenda
Backend mora biti iskompajliran u neovisni `.exe` pomoću PyInstallera prije nego što kompajlirate frontend.
```bash
cd backend
pip install pyinstaller
pyinstaller --noconfirm --onedir --console --collect-all babelfish --collect-all guessit upload.py
```

### 3. Kompajliranje Tauri Frontenda
```bash
cd frontend
bun install
bun run tauri build
```
Završni `.exe` nalazit će se u `frontend/src-tauri/target/release/thr_autouploader.exe`.

## Povijest Verzija (Changelog)

### v1.3.6 (Trenutna Verzija)
- **Ručni nazivi s razmacima:** Ispravljen `nargs` argument kod parsiranja tako da GUI uredno prosljeđuje i procesuira višerječne naslove umjesto odsijecanja na prvoj riječi.
- **Bypass NameManagera:** Backend sada automatski poštuje ručno upisani naziv (manual name) unesen iz GUI-ja te preskače forsirano generiranje novog naziva iz `guessit` biblioteke.
- **FFmpeg PyInstaller Fix:** Riješen `[WinError 2]` problem kod generiranja screenshotova na Windows operativnom sustavu u portabilnom izdanju; putanja do `ffmpeg.exe` je sada svjesna prekompajliranog (`frozen`) `.exe` okruženja.

### v1.3.5
- **Fix MediaInfo PTPImg zastavica:** Uklonjeni slomljeni `[img]` linkovi PTPImg zastavica iz MediaInfo parsera za titlove i zvuk; titlovi i jezici se sada u opisu prikazuju kao čisti, uredni i čitljivi tekst (npr. `German (DE), English (US), Spanish (ES)...`).

### v1.3.4
- **Pametno čitanje postavki:** Tauri backend (Rust) sada koristi napredniji Regex za potpuno i točno prepoznavanje API ključeva direktno iz `config.py` datoteke, bez obzira jesu li definirani unutar dictionaryja ili kao override na dnu datoteke.
- **Sinergija konfiguracija:** GUI uredno pada nazad na čitanje `config.py` datoteke ukoliko nedostaje `gui_settings.json`, čineći prenosivost vaših starih postavki bezbolnom.

### v1.3.3
- **GUI Poliranja:** Riješeni problemi s `localhost` portovima za qBittorrent, ispravljeno skrivanje lozinki i osigurano pravilno prosljeđivanje argumenata za TMDB/THR ključeve iz GUI-ja u pozadinsku skriptu.

### v1.3.2
- **UTF-8 Podrška (Fix):** Potpuno riješeno nestajanje hrvatskih znakova (č, ć, š, ž) na Windows konzoli.
- **TMDB Validacija:** Aplikacija sada uredno upozorava ako TMDB API ključ nedostaje umjesto tihog pucanja.
- **Tauri GUI:** Poboljšano parsiranje (regex) upozorenja i pogrešaka za jasniji prikaz u sučelju.
- **Optimizacija Pakiranja:** Značajno ubrzan proces generiranja *Portable* izdanja korištenjem nativne `tar` skripte (nekoliko sekundi umjesto minute).

### v1.2.0
- **Potpuna Prijenosnost (Portable):** Uklonjene sve apsolutne putanje iz koda; aplikacija radi iz bilo kojeg foldera/diska bez instalacije.
- **Čisto Izdanje:** Optimiziran distribucijski ZIP smanjen s ~134MB na ~12MB (uklonjeni development i cache fajlovi).
- **Sigurno Raspakiravanje:** ZIP sada sadrži root mapu kako bi se izbjeglo razbacivanje datoteka prilikom ekstrakcije.

### v1.1 (Hotfix)
- **Simuliraj Upload (Dry-Run):** Vraćena puna podrška za simulaciju procesa, omogućujući testiranje uploada bez slanja na tracker.

### v1.0
- **Inicijalno Izdanje:** Prva nativna Windows (`.exe`) verzija THRuploader-a s modernim grafičkim sučeljem i odvojenim klijent profilima (Split Personality).

## Sigurnost

Vaši podaci (API ključevi, lozinke) pohranjuju se lokalno u `backend/data` mapi koja je striktno zaštićena `.gitignore` datotekom i **nikada** neće biti poslana na GitHub. Pazite da tu mapu ne dijelite s drugima!

## Zahvale (Credits)

Ovaj projekt ne bi bio moguć bez fantastičnog open-source rada na pozadinskoj logici alata. Veliko hvala sljedećim autorima:
- [L4GSP1KE](https://github.com/L4GSP1KE/Upload-Assistant) - Originalni autor i kreator glavne arhitekture Upload-Assistant projekta.
- [Audionut](https://github.com/Audionut/Upload-Assistant) - Aktivni održavatelj koda i autor forkane verzije koja pogoni ovaj backend. 

Zahvaljujući njihovom temelju, mogli smo izgraditi ovo nativno Windows iskustvo prilagođeno za THR!
