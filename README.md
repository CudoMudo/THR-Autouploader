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

1. Otiđite na Releases stranicu na GitHubu.
2. Preuzmite najnoviji **THRuploader_vX.X_Release.zip**.
3. Otpakirajte mapu bilo gdje na vašem računalu (Desktop, Dokumenti, USB...).
4. Pokrenite **	hr_autouploader.exe**.

**Napomena:** Aplikacija dolazi bez pred-kreiranih konfiguracijskih datoteka. Kad prvi put unesete API ključeve i kliknete "Spremi", aplikacija će automatski generirati vaš config.py unutar ackend/data mape.

## Za Developere (Kompajliranje iz izvornog koda)

Ako želite mijenjati kod i sami kompajlirati aplikaciju, trebat će vam:
- Rust (i Cargo)
- Node.js & Bun
- Python 3.12+

### 1. Kloniranje repozitorija
`ash
git clone https://github.com/CudoMudo/THR-Autouploader.git
cd THR-Autouploader
`

### 2. Kompajliranje Python Backenda
Backend mora biti iskompajliran u neovisni .exe pomoću PyInstallera prije nego što kompajlirate frontend.
`ash
cd backend
pip install pyinstaller
pyinstaller --noconfirm --onedir --console upload.py
`

### 3. Kompajliranje Tauri Frontenda
`ash
cd frontend
bun install
bun run tauri build
`
Završni .exe nalazit će se u rontend/src-tauri/target/release/thr_autouploader.exe.

## Sigurnost

Vaši podaci (API ključevi, lozinke) pohranjuju se lokalno u ackend/data mapi koja je striktno zaštićena .gitignore datotekom i **nikada** neće biti poslana na GitHub. Pazite da tu mapu ne dijelite s drugima!
