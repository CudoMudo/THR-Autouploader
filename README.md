<img width="1198" height="998" alt="thr_autouploader_EYbzcsCPC8" src="https://github.com/user-attachments/assets/0f50ebc5-b3a5-44c8-9993-653f8cbf13a1" />

# THRuploader
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
2. Preuzmite najnoviji **`THRuploader_v1.0_Release.zip`**.
3. Otpakirajte mapu bilo gdje na vašem računalu (Desktop, Dokumenti, USB...).
4. Pokrenite **`thr_autouploader.exe`**.

**Napomena:** Aplikacija dolazi bez pred-kreiranih konfiguracijskih datoteka. Kad prvi put unesete API ključeve i kliknete "Spremi", aplikacija će automatski generirati vaš `config.py` unutar `backend/data` mape.

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
pyinstaller --noconfirm --onedir --console upload.py
```

### 3. Kompajliranje Tauri Frontenda
```bash
cd frontend
bun install
bun run tauri build
```
Završni `.exe` nalazit će se u `frontend/src-tauri/target/release/thr_autouploader.exe`.

## Povijest Verzija (Changelog)

### v1.3.2 (Trenutna Verzija)
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
