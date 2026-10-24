<img width="1200" height="1020" alt="thr_autouploader_ht2o2Xstmf" src="https://github.com/user-attachments/assets/d8d13d51-328b-43f3-98b6-de30539b8796" />

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
2. Preuzmite najnoviji **`THRuploader_v1.5.1_Portable.zip`**.
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

### v1.5.1 (Trenutna Verzija)
* **Fix - Eliminacija Lažnog Uspjeha kod Greške Uploada (sys.exit(0) u inally bloku):**
  - Riješen kritični bug u ackend/upload.py gdje je inally: blok na kraju izvršavanja imao fiksni sys.exit(0) koji je tiho gazio sys.exit(1) iz except bloka, zbog čega je GUI čak i nakon neuspjelog slikanja screenshotova ili odbijanja od strane trackera prikazivao lažnu poruku [SISTEM] Uspjeh! Torrent je uspješno uploadan..
  - U ackend/src/trackerhandle.py i ackend/upload.py dodano praćenje stvarnog statusa uploada (meta['upload_failed']) tako da svaka pogreška rezultira povratnim kodom 1 i crvenom oznakom greške u GUI-ju.
* **Fix - Isključivanje rame_overlay Teksta na Slikama i Prikaz Stvarnih FFmpeg Grešaka:**
  - Postavka rame_overlay postavljena je na False u ackend/data/templates/config.py i forsirana kroz Tauri bridge (lib.rs), čime su uklonjene lažne Fontconfig error: Cannot load default config file poruke na Windowsu te neželjeno utiskivanje teksta broja frejma na THR screenshotove.
  - U ackend/src/takescreens.py razina FFmpeg logiranja promijenjena je iz quiet u error uz ispis stvarnog uzroka greške dekodiranja (npr. kada je video datoteka oštećena ili kriptirana) umjesto skrivanja stvarnog problema.
* **UI/Branding - Novi THR Logo u Zaglavlju i Maksimalno Uvećana Windows Ikona:**
  - U glavnom zaglavlju aplikacije tekstualna riječ THR zamijenjena je novim vektoriziranim THR grafičkim logotipom visoke oštrine ([THR logo] Autouploader v1.5.1).
  - Ažurirane su sve Windows ikone aplikacije (icon.ico u svim rezolucijama 16px–256px te icons/*.png) s uklonjenim praznim rubom (98% popunjenosti kvadrata) radi maksimalne vidljivosti u Windows Exploreru, taskbaru i zaglavlju prozora.

### v1.5.0
* **Fix - Eliminacija Lažne Detekcije Filmova i Serija kao Glazbe (`FLAC`, `MP3`, `"ost"`):**
  - Riješen kritični propust u `formatters.ts` gdje je sirova provjera podstringova (`lower.includes("ost")`, `lower.includes("flac")`, `lower.includes("mp3")`) pogrešno svrstavala filmove i serije s riječima poput *Ghost*, *Ghostbusters*, *Lost*, *Host*, *Boston*, *Almost* ili video izdanja s FLAC/MP3 zvukom u glazbene kategorije (`29` / `3`) i brisala im rezoluciju u `"other"`.
  - U `App.tsx` uklonjen "lock-in" uvjet koji je zadržavao krivo pogođenu glazbenu kategoriju čak i nakon što je Python backend skeniranjem `.mkv` datoteke utvrdio da se radi o filmu ili seriji (`MOVIE` / `TV`).
* **Fix - Točno Prepoznavanje Tipa Izdanja (`ENCODE` vs `DISC` vs `WEBDL`):**
  - Ispravljen redoslijed provjera u `formatters.ts` zbog kojeg je svaki `BluRay x264/x265` encode bio pogrešno označen kao puni `Disc / ISO` (`Filmovi / BD`) jer se `bluray` provjeravao prije video kodeka (`x264`, `x265`, `HEVC`, `H.264`).
  - Dodano prepoznavanje scene `.WEB.` izdanja (npr. `.WEB.H264` / `.WEB.x265`) kao `WEBDL` u frontendu i backendu (`video.py`), te provjera naziva nadređenog foldera uz naziv samog video fajla.
  - Uvedene striktne granice riječi (`\b`) za detekciju sezona (`S01E01`, `S01`–`S99`) u `formatters.ts` i `prep.py`, čime su spriječene lažne TV detekcije kod filmova čiji naslov ili grupa sadrže slovo `s` i broj.
* **Fix - Kompletna Nadogradnja Sustava za Glazbu (Discogs, Nazivi, Cover & `mkbrr`):**
  - **Izvođač i format u nazivu torrenta:** `prep.py`, `discogs.py` i `get_name.py` sada čuvaju puni naziv `Izvođač - Album (Godina) [Format]` (npr. `Pink Floyd - The Dark Side of the Moon (1973) [FLAC]`) i čiste Discogs numeričke sufikse iz imena izvođača (`Artist (2)` -> `Artist`).
  - **Automatski Cover Art u opisu:** Cover slika dohvaćena s Discogsa sada se automatski ubacuje kao `[img=350]...[/img]` u opis glazbenog torrenta.
  - **Očuvanje omota i `.cue`/`.log`/`.nfo` u `mkbrr`:** `build_mkbrr_exclude_string` u `torrentcreate.py` više ne izbacuje `.jpg`, `.png`, `.nfo` i `.m3u` datoteke kada kreira glazbeni torrent.
  - **UNIT3D Dupe Check po nazivu:** Kada je `tmdbId=0` (glazba i izdanja bez TMDb ID-a), `UNIT3D.py` pretražuje duplikate po nazivu izdanja umjesto dohvaćanja 100 nepovezanih torrenata.
* **Cleanup - Uklanjanje Nepodržanih Kategorija (Igre / Aplikacije):** Iz sučelja i parsera uklonjene su kategorije PC igara i softvera kako korisnike ne bi dovodile u zabludu, čime je fokus aplikacije 100% na podržanim Video i Audio kategorijama.

### v1.4.9
* **Fix - Izolacija Auto-Scrolla Logova (Frontend):** Uklonjen globalni `scrollIntoView` poziv koji je pri svakom pristiglom retku loga prisilno bacao cijeli prozor aplikacije (red čekanja i formu) na samo dno. Auto-scroll je sada strogo vezan za unutarnji scrollbar terminala (`scrollTop`), čime glavni prozor ostaje potpuno miran.
* **Fix - Normalizacija Naslova u TMDb Pretrazi (Punctuation & "The" prefix):** `normalize_title` sada automatski čisti interpunkcijske znakove (dvotočke `:`, crtice `-`, navodnike, točke) i višestruke razmake. Dodano prepoznavanje prefiksa `"The "` / `"A "` i tolerancija godine (±1). Naslovi poput `Ice Road: Vengeance` (2025) sada se odmah 100% podudaraju s TMDb bazom bez potrebe za ručnim unosom.
* **Feature - Vizualna Sugestija za TMDb ID (Frontend):** Ako automatika za film ili seriju ne pronađe TMDb ID, stavka dobiva žutu značku `⚠️ Unesi TMDb ID`, meta oznaku `• ⚠️ Preporučeno unijeti TMDb ID`, a polje za unos u editoru je vizualno istaknuto žutim obrubom i korisnim savjetom. Unos nije kruto blokirajući, čime se zadržava puna sloboda i za kategorije koje ne ovise o TMDb-u.
* **Fix - Revizija Cjevovoda za Glazbu i Koncerte (Discogs, get_name & THR):**
  - U `get_name.py` dodana grana za kategorije `MUSIC` i `CONCERT` (kao i generički fallback), čime je riješen kritični bug gdje je naziv torenta ostajao prazan string.
  - U `trackers/THR.py` uvedena zaštita točaka i izvornih naziva za Glazbu (FLAC 29, MP3 3), Koncerte (11) i aplikacije/igre, sprječavajući neželjeno brisanje točaka u nazivima izvođača i albuma (npr. `Dr. Dre`, `Vol. 1`).
  - U `discogs.py` integrirano čitanje opcionalnog `DISCOGS_TOKEN` za veći API limit i prošireno usmjeravanje Discogs linkova i za kategoriju koncerata.
* **Fix - Lažno Prepoznavanje Igara za Video Repackove (Kategorija: GAME):** Riješen uzrok zbog kojeg je filmski ili serijski REPACK (npr. *Ice Road Vengeance... REPACK UHD BluRay 2160p...*) bio automatski svrstan u kategoriju PC igara (`GAME`) i tražio IGDB ID. Uklonjen je `\bRepack\b` iz regex uzoraka za igre u backendu (`prep.py`) i frontendu (`formatters.ts`), a dodana je prethodna provjera video oznaka (`UHD`, `BluRay`, `2160p`, `REMUX` itd.) i stvarnih video datoteka na disku.
* **Feature - Prikaz Verzije u Headeru Aplikacije:** U glavni header aplikacije i zaglavlje postavki dodana je diskretna plava značka s brojem verzije (`v1.4.9`).
* **Fix - KeyError 'title' & Fallback Metapodataka (Backend):** U `uphelper.py` i `prep.py` implementirano sigurno čitanje `title` i `year` uz fallback na očišćeni naziv datoteke ili foldera, eliminirajući fatalno rušenje kada video nema pronađene podatke u bazi.
* **Fix - Eliminacija Lažnog Uspjeha (False Positive):** U `upload.py` dodan `sys.exit(1)` u korijenski `except Exception` blok, osiguravajući da se pri svakoj neočekivanoj greški u GUI-ju točno registrira status neuspjeha (`✕ Greška`) umjesto lažne zelene poruke o uspjehu.

### v1.4.8
* **Fix - Mapiranje Rezolucije na Trackeru (`1080p` umjesto "Ostalo"):** Riješen bug u `backend/src/trackers/THR.py` gdje se naziv rezolucije nepotrebno pretvarao u velika slova (`1080P`) u rječniku s malim slovima (`1080p`), zbog čega je svaka video rezolucija padala na fallback ID `10` i na TorrentHR-u završavala označena kao "Ostalo". Uvedena sigurna case-insensitive normalizacija i puna podrška za sve standardne rezolucije (1080p -> ID 3, 2160p -> ID 2, 720p -> ID 5 itd.).

### v1.4.7
* **Fix - IMDb API & Blu-ray.com Enkodiranje (`UnicodeDecodeError`):** Riješeno rušenje `IMDb API call failed: 'utf-8' codec can't decode byte...`. Uklonjen forsirani `Accept-Encoding: gzip, deflate, br` iz zaglavlja, čime se sprječava da serveri pošalju Brotli komprimirani sadržaj koji Python ne može dekomprimirati bez vanjske biblioteke. Uvedena sigurna obrada neočekivanih grešaka parsiranja.
* **Feature - Gumb "Primijeni opcije na sve u redu":** U desnom panelu s opcijama (Anoniman upload, Hrvatski titl, Osobni RLS, Ignoriraj duplikate, Zadrži mapu) dodan gumb `📋 Primijeni ove opcije na sve u redu` koji omogućuje brzo i namjerno propagiranje odabranih flagova na sve stavke u queueu jednim klikom, bez narušavanja individualnih postavki različitih tipova torenta.

### v1.4.6
* **Fix - Anoniman Upload (`--anon`):** Ispravljeno slanje zastavice za anonimni upload iz Tauri mosta (`--anon` umjesto jedne crtice `-anon`), a u Python parser dodan alias `-anon` radi potpune otpornosti.
* **Fix - Zadrži Mapu (`keepFolder: false`):** Zadani odabir za čuvanje mape foldera vraćen je na `false` po defaultu kako se struktura torenta ne bi nepotrebno opterećivala folderom kod pojedinačnih video datoteka. Uklonjen dupli `-kf` u Rust argumentima.
* **Fix - Čišćenje Keša i Zaostalih Privremenih Podataka:** U `start_upload` i `dry_run_upload` osigurano čišćenje privremenih mapa i `meta.json` prije svake analize i uploada kako se stari ili pogrešni metapodaci ne bi stopili u novi upload.
* **Fix - Prepoznavanje Filmova i Automatski Naziv (`The African Queen (1951)`):** Uklonjeno prisilno slanje sirovog imena foldera kao `-name` parametra na tracker. Vraćeno automatsko generiranje scene naziva torenta po specifikacijama trackera ako korisnik ostavi polje za ručni naziv praznim. Proširena lista video formata u `video.py` s `.avi`, `.m2ts`, `.wmv` i dodana podrška za prepoznavanje naslova sa zagradama i godinom.

### v1.4.5
* **Fix - Cross-seed i Torf Kompatibilnost (`creation_date: not bytes`):** Riješena greška `Cross-seed handling failed for THR: Must be None, int or datetime object, not bytes: b'1775559027'`. UNIT3D tracker u preuzetom `.torrent` fajlu šalje `creation date` kao byte string umjesto cjelobrojnog broja. Implementiran je automatski patch za `torf` biblioteku koji sigurno pretvara byte stringove u Unix timestamp, omogućujući nesmetano automatsko ubacivanje torenta u klijent (cross-seed).

### v1.4.4
* **Fix - Argument Parser za Broj Slika (`invalid literal for int(): 'creens'`):** Ispravljen argument za broj screenshotova u GUI-ju s nevažećeg `-screens` na `-s` (argparse je tumačio `-screens` kao kratku opciju `-s` s vrijednošću `'creens'`). U `args.py` dodan i `-screens` alias radi robusnosti.

### v1.4.3
* **Fix - Preskakanje Uploada Slika za Glazbu:** Riješena greška `Exception: No images uploaded. Configure additional image hosts or use a different -ih`. Za glazbena izdanja (FLAC/MP3) automatski se forsira `skip_imghost_upload = True` i `screens = 0` (kroz backend i GUI), te je ugrađen sigurnosni mehanizam u `uploadscreens.py` koji sprječava rušenje kada nema screenshotova za upload.

### v1.4.2
* **Fix - Siguran Prikaz Metapodataka (`KeyError: 'overview'`):** U `uphelper.py` implementiran siguran pristup za polja `overview`, `genres` i sve numeričke ID-eve (`_safe_int`), rješavajući pucanje skripte kod prikaza potvrde uploada glazbe.
* **Fix - Preskakanje Glazbe na Trackeru:** U `trackerstatus.py` uvjet `needs_imdb` ograničen isključivo na filmove i serije, čime je spriječeno neželjeno preskakanje uploada glazbe na THR u unattended modu (`skipped = True`).
* **Fix - Ispravan Tip za Glazbu na THR:** U `trackers/THR.py` mapiran `type_id` za "Ostalo" na ID `8` umjesto nepostojećeg `0` (rješava UNIT3D grešku *"Odabrano polje type id nije ispravno"*). Fallback rezolucije postavljen na `'10'`.
* **Fix - Čist Opis Glazbenih Torrenata:** U `get_desc.py` isključena generacija screenshot blokova za glazbu (`multi_screens = 0`), eliminirajući nehotično ubacivanje naziva prve pjesme u opis torenta.
* **Fix - Zaobilaženje Validacije MediaInfo:** U `prep.py` inicijalizirani defaulti za glazbu i zaobiđena nepotrebna validacija video streamova.

### v1.4.1
* **Feature - Discogs Integracija za Glazbu:** Novi modul `backend/src/discogs.py` automatski prepoznaje glazbena izdanja (izvođač, album, godina, izdavač, kataloški broj) iz naziva foldera i pretražuje javni Discogs API. Podržan je i ručni unos Discogs ID-a ili punog URL-a u sučelju.
* **Feature - Preuzimanje Cover Arta za Glazbu:** Automatsko preuzimanje i prikaz cover slike s Discogsa visoke rezolucije unutar forme i generiranih metapodataka.
* **Fix - Glazba Tip i Rezolucija u GUI:** Automatsko postavljanje tipa i rezolucije na *Ostalo (Other)* za kategorije Glazba / FLAC (29) i Glazba / MP3 (3), bez prosljeđivanja nevažećih video rezolucija na UNIT3D tracker.
* **Fix - Otklanjanje `name 'exit' is not defined`:** Uklonjen fatalan poziv `exit()` u video skripti koji je rušio obradu audio foldera.
* **Fix - Pouzdana Detekcija Grešaka & Status:** Backend skripta sada signalizira neuspjeh s exit kodom `1`, sprječavajući lažne "Uspjeh! Torrent je uspješno uploadan" poruke kada se dogodi pogreška.
* **Fix - Glazbene Datoteke u Torrentu:** Osigurano uključivanje svih glazbenih formata (.flac, .mp3, .wav, .m4a, .ape, .cue, .log) i popratnih slika unutar kreiranog torrenta.

### v1.4.0
* **Feature - Batch / Queue Upload:** Podrška za višestruki drag & drop unos mapa, vizualni panel reda čekanja (Queue), dvostrana sinkronizacija postavki po stavci i sekvencijalni batch upload.
* **Feature - Cover Art & Slike.THR:** Gumb za direktni upload slika na Slike.THR i ubacivanje BBCode oznake `[img=350]` s thumbnail pretpregledom.
* **Feature - Markdown u BBCode:** Alatna traka za automatsku konverziju Markdown zapisa u BBCode format prilagođen TorrentHR-u.
* **Feature - Pametno Formatiranje Naziva:** Očuvanje tehničkih točaka (`H.264`, `H.265`, `5.1`, `7.1`, `2.0`, `v1.0`) i automatsko dodavanje razmaka ispred audio codeca (`DDP 5.1`, `AAC 2.0`).
* **Feature - Čisti Torrenti:** Automatsko isključivanje sporednih datoteka (`.nfo`, `.jpg`, `.jpeg`, `.png`, `.m3u`, `.m3u8`) iz kreiranja torrent datoteka.
* **Feature - Glazbeni MediaInfo Fix:** Uklonjeni artefakti pojedinačnog trajanja pjesme i imena pojedinačne datoteke iz opisa glazbenih albuma.

### v1.3.9
* **Feature**: Proširen odabir kategorija u GUI-ju s kompletnim video kategorijama s TorrentHR-a: Crtani Filmovi (18), Dokumentarni Filmovi (12), Anime (31), Filmovi HD (17), Filmovi SD (4), Filmovi DVD (14), Filmovi BD (40), Serije HD (34) i Serije SD (7).
* **Feature**: Poboljšan backend argument parser (`-c` / `--category`) i tracker mapper (`THR.py`) za direktno prosljeđivanje specifičnih ID-eva i precizno grananje.

### v1.3.8
* **Feature**: Dodana ručna kvačica "Hrvatski titl" u GUI (korisno kao *failsafe* kada automatski parser ne uspije pročitati jezik iz foldera ili MediaInfoa).
* **Feature**: Dodana ručna kvačica "Osobni rls" (Personal Release) u GUI. Obje kvačice su sada ispravno povezane s Live Tracker API-jem koji ih uredno obrađuje i ispisuje uz torrente i na IRC-u.

### v1.3.7
* **Fix**: Riješen problem s PyInstaller crashiranjem (`NoneType object has no attribute closed`).
* **Fix**: Riješen problem s IMDb API `403 Forbidden` greškom ubacivanjem ispravnih HTTP zaglavlja.
* **Fix**: Riješen problem prikaza pogreške kod nedostajuće `tags.json` datoteke.
* **Feature**: `ffmpeg.exe` je sada standardno uključen u `backend/bin` i stiže u paketu (Portable verzija).
* **Konfiguracija**: Zadani `processLimit` smanjen s 10 na 1 u `example-config.py`.

### v1.3.6
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
