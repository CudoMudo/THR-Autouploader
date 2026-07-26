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

## Sigurnost

Vaši podaci (API ključevi, lozinke) pohranjuju se lokalno u `backend/data` mapi koja je striktno zaštićena `.gitignore` datotekom i **nikada** neće biti poslana na GitHub. Pazite da tu mapu ne dijelite s drugima!
