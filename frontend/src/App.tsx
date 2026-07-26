import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [qbitUrl, setQbitUrl] = useState("");
  const [qbitUser, setQbitUser] = useState("");
  const [qbitPass, setQbitPass] = useState("");
  const [qbitLocalPath, setQbitLocalPath] = useState("");
  const [qbitRemotePath, setQbitRemotePath] = useState("");

  const [rtorrentUrl, setRtorrentUrl] = useState("");
  const [rtorrentUser, setRtorrentUser] = useState("");
  const [rtorrentPass, setRtorrentPass] = useState("");
  const [rtorrentLocalPath, setRtorrentLocalPath] = useState("");
  const [rtorrentRemotePath, setRtorrentRemotePath] = useState("");

  const [watchFolder, setWatchFolder] = useState("");

  // API Ključevi
  const [thrApiKey, setThrApiKey] = useState("");
  const [tmdbApiKey, setTmdbApiKey] = useState("");
  const [slikeApiKey, setSlikeApiKey] = useState("");
  const [clientType, setClientType] = useState("qbittorrent");

  // Učitavanje postavki pri paljenju
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings: any = await invoke("load_settings");
        if (settings) {
          setQbitUrl(settings.qbit_url || settings.client_url || "");
          setQbitUser(settings.qbit_user || settings.client_user || "");
          setQbitPass(settings.qbit_pass || settings.client_pass || "");
          setQbitLocalPath(settings.qbit_local_path || settings.client_local_path || "");
          setQbitRemotePath(settings.qbit_remote_path || settings.client_remote_path || "");
          
          setRtorrentUrl(settings.rtorrent_url || settings.client_url || "");
          setRtorrentUser(settings.rtorrent_user || settings.client_user || "");
          setRtorrentPass(settings.rtorrent_pass || settings.client_pass || "");
          setRtorrentLocalPath(settings.rtorrent_local_path || settings.client_local_path || "");
          setRtorrentRemotePath(settings.rtorrent_remote_path || settings.client_remote_path || "");
          
          setWatchFolder(settings.watch_folder || "");
          setThrApiKey(settings.thr_api_key || "");
          setTmdbApiKey(settings.tmdb_api_key || "");
          setSlikeApiKey(settings.slike_api_key || "");
          setClientType(settings.client_type || "qbittorrent");
        }
      } catch (e) {
        console.error("Greška pri učitavanju postavki:", e);
      }
    };
    fetchSettings();
  }, []);

  // Upload opcije
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [resolution, setResolution] = useState("");
  const [isAnon, setIsAnon] = useState(false);
  const [skipDupeCheck, setSkipDupeCheck] = useState(false);
  const [keepFolder, setKeepFolder] = useState(false);

  // Nove opcije
  const [manualName, setManualName] = useState("");
  const [apiId, setApiId] = useState(""); // Univerzalni ID
  const [gameInstructions, setGameInstructions] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);

  // Logovi terminala
  const [logs, setLogs] = useState<string[]>([
    "[SISTEM] Aplikacija uspješno pokrenuta. Sve opcije su dostupne kroz GUI.",
    "Čekam unos mape..."
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlisten = listen<string>("upload-log", (event) => {
      let logLine = event.payload;
      
      // Makni originalni python prefix da izbjegnemo [INFO] [INFO]
      let originalLine = logLine;
      if (logLine.startsWith("[INFO] ")) {
          logLine = logLine.substring(7);
      }

      if (originalLine.includes("mkbrr hashing")) {
        return; // Preskacemo mkbrr spam
      }

      // Prijevodi i omekšavanje sirovih Python logova
      if (originalLine.includes("401") && (originalLine.includes("TMDb") || originalLine.includes("search"))) {
        logLine = "[GREŠKA] Odbijen pristup TMDB-u (401). Vaš TMDB API ključ je neispravan. Molimo provjerite postavke!";
      } else if (originalLine.includes("TMDb was unable to find anything from external IDs")) {
        logLine = "[INFO] Pretraga putem vanjskih ID-eva nije uspjela, pokušavam po imenu...";
      } else if (originalLine.includes("Unable to find a matching TMDb entry")) {
        logLine = "[UPOZORENJE] Nije pronađen odgovarajući film/serija na TMDB-u.";
      } else if (originalLine.includes("DEBUG:")) {
        return; // Preskačemo sve debug logove kako bi ekran bio čišći
      } else if (originalLine.includes("Gathering info for")) {
        logLine = originalLine.replace("Gathering info for", "[INFO] Prikupljam informacije za datoteku:");
      } else if (originalLine.includes("Building meta data")) {
        logLine = "[INFO] Generiram metapodatke...";
      } else if (originalLine.includes("Database Info")) {
        logLine = "[INFO] Baza podataka:";
      } else if (originalLine.includes("Processing") && originalLine.includes("for upload")) {
        logLine = originalLine.replace("Processing", "[INFO] Pripremam").replace("for upload", "za upload");
      } else if (originalLine.includes("Searching for existing torrents on:")) {
        logLine = originalLine.replace("Searching for existing torrents on:", "[INFO] Provjeravam postoje li već ovakvi torrenti na trackeru:");
      } else if (originalLine.includes("Potential dupes from")) {
        logLine = originalLine.replace("Potential dupes from", "[UPOZORENJE] Pronađeni mogući duplikati na trackeru:");
      } else if (originalLine.includes("Found potential dupes on:")) {
        logLine = originalLine.replace("Found potential dupes on:", "[INFO] Duplikati pronađeni na trackeru:");
      } else if (originalLine.includes("Trackers passed all checks:")) {
        logLine = originalLine.replace("Trackers passed all checks:", "[INFO] Provjere uspješno završene za tracker:");
      } else if (originalLine.includes("Successfully obtained and uploaded")) {
        logLine = originalLine.replace("Successfully obtained and uploaded", "[INFO] Uspješno preuzete i uploadane slike (ukupno:").replace("images", ")");
      } else if (originalLine.includes("was specified. Using complete folder for torrent creation.")) {
        logLine = "[INFO] Odabrana je opcija 'Zadrži mapu'. Torrent će sadržavati izvornu mapu.";
      } else if (originalLine.includes("Processing uploads to trackers")) {
        logLine = "[INFO] Šaljem torrent datoteku i metapodatke na tracker...";
      } else if (originalLine.includes("--no-seed was passed") || originalLine.includes("Add torrent manually to the client") || originalLine.includes("Killing stuck worker process")) {
        return; // Ove informacije su nebitne korisniku
      } else if (originalLine.includes("All tracker uploads processed")) {
        logLine = "[INFO] Upload proces je završen!";
      } else {
        logLine = originalLine;
      }

      // Ako linija ne počinje sa "[" znači da je sirovi log bez prefiksa (npr. naslov iz baze)
      if (!logLine.startsWith("[") && logLine.trim() !== "") {
        // Dodajemo samo mali razmak radi preglednosti
        logLine = "      " + logLine;
      }

      setLogs((prevLogs) => {
        // Spriječi spamanje iste greške 5 puta zaredom (što Python voli raditi kad vrti retry)
        if (prevLogs.length > 0 && prevLogs[prevLogs.length - 1] === logLine) {
          return prevLogs;
        }
        return [...prevLogs, logLine];
      });
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleDryRun = async (folderPath: string) => {
    if (!folderPath) return;
    
    if (!tmdbApiKey || tmdbApiKey.trim() === "") {
      setLogs((prev) => [...prev, `[SISTEM] TMDB API ključ nije unesen u GUI. Oslanjam se na backend config.py ako postoji.`]);
    }

    setSelectedFolder(folderPath);
    setLogs((prev) => [...prev, `[SISTEM] Analiziram datoteke: ${folderPath}`]);
    
    try {
      const result = await invoke("dry_run_upload", { 
          folderPath: folderPath,
          tmdbApiKey: tmdbApiKey,
          slikeApiKey: slikeApiKey,
          thrApiKey: thrApiKey
      });
      const parsedData = JSON.parse(result as string);
      const meta = parsedData.dry_run_metadata;
      
      setValidationData(meta);
      
      // Auto-popunjavanje forme
      if (meta.category) setCategory(meta.category.toLowerCase());
      if (meta.type) setType(meta.type.toLowerCase());
      if (meta.resolution) setResolution(meta.resolution);
      if (meta.tmdb_id && meta.tmdb_id !== 0) setApiId(meta.tmdb_id.toString());
      if (meta.igdb_id && meta.igdb_id !== 0) setApiId(meta.igdb_id.toString());
      if (meta.discogs_id && meta.discogs_id !== 0) setApiId(meta.discogs_id.toString());
      
      setLogs((prev) => [...prev, `[SISTEM] Analiza završena. Čekam potvrdu korisnika.`]);
      setShowValidation(true);
    } catch (error) {
      let rawError = String(error);
      let cleanError = rawError;
      
      if (rawError.includes("No results found")) {
        cleanError = "Aplikacija nije mogla automatski prepoznati film/seriju iz naziva datoteke. Molimo popunite podatke ručno.";
      } else if (rawError.includes("Upload Assistant does not support no audio media")) {
        cleanError = "Ova datoteka nema audio traku (nepodržan format).";
      } else {
        // Fallback: očisti dugačke logove i prikaži samo bitno
        if (rawError.includes("Configuration validation failed")) {
           cleanError = "Greška u config.py postavkama: " + rawError.split("Configuration validation failed:")[1].substring(0, 150) + "...";
        } else {
           cleanError = "Nisam pronašao metapodatke. Detalji: " + rawError.substring(0, 100);
        }
      }
      
      setLogs((prev) => [...prev, `[UPOZORENJE] ${cleanError}`]);
      // Ako dry-run pukne, svejedno otvaramo modal da korisnik može ručno unijeti
      setShowValidation(true);
    }
  };

  const handleUpload = async (isDryRun: boolean = false) => {
    if (!selectedFolder) return;

    if (!thrApiKey || thrApiKey.trim() === "" || !slikeApiKey || slikeApiKey.trim() === "") {
      setLogs((prev) => [...prev, `[SISTEM] THR ili Slike.THR ključ nije unesen u GUI. Oslanjam se na backend config.py ako postoji.`]);
    }

    if (!apiId || apiId.trim() === "") {
      if (!validationData || !validationData.title) {
        setLogs((prev) => [...prev, `[ERROR] Automatsko prepoznavanje nije uspjelo! Morate ručno unijeti API ID (IMDb ili TMDb ID).`]);
        return;
      }
    }

    setShowValidation(false);
    setLogs((prev) => [...prev, `[SISTEM] Pokrećem ${isDryRun ? 'simulaciju (Dry-Run)' : 'konačni upload'} za: ${selectedFolder}`]);
    
    try {
      await invoke("start_upload", {
        payload: {
          thr_api_key: thrApiKey,
          tmdb_api_key: tmdbApiKey,
          slike_api_key: slikeApiKey,
          client_type: clientType,
          qbit_url: qbitUrl,
          qbit_user: qbitUser,
          qbit_pass: qbitPass,
          qbit_local_path: qbitLocalPath,
          qbit_remote_path: qbitRemotePath,
          rtorrent_url: rtorrentUrl,
          rtorrent_user: rtorrentUser,
          rtorrent_pass: rtorrentPass,
          rtorrent_local_path: rtorrentLocalPath,
          rtorrent_remote_path: rtorrentRemotePath,
          watch_folder: watchFolder,
          folder_path: selectedFolder,
          category: category,
          type_val: type, // named type_val in rust due to 'type' keyword
          resolution: resolution,
          tmdb_id: apiId,
          is_anon: isAnon,
          skip_dupe_check: skipDupeCheck,
          keep_folder: keepFolder,
          manual_name: manualName,
          is_dry_run: isDryRun
        }
      });
    } catch (error) {
      setLogs((prev) => [...prev, `[ERROR] Greška pri pokretanju uploada: ${error}`]);
    }
  };

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === 'drop') {
        const paths = (event.payload as any).paths;
        if (paths && paths.length > 0) {
          setIsDragging(false);
          handleDryRun(paths[0]);
        }
      } else if (event.payload.type === 'enter') {
        setIsDragging(true);
      } else if (event.payload.type === 'leave') {
        setIsDragging(false);
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [tmdbApiKey, slikeApiKey, thrApiKey]);

  if (showSettings) {
    return (
      <div className="container">
        <header className="header">
          <h1>⚙️ Postavke</h1>
          <p className="subtitle">Unesi API ključeve i podatke svog Seedboxa</p>
        </header>
        
        <div className="settings-form">
          <div className="form-group">
            <label>THR API Key</label>
            <input type="password" value={thrApiKey} onChange={(e) => setThrApiKey(e.target.value)} placeholder="Zalijepi THR ključ..." />
          </div>
          <div className="form-group">
            <label>Slike.THR API Key</label>
            <input type="password" value={slikeApiKey} onChange={(e) => setSlikeApiKey(e.target.value)} placeholder="chv_wnD_..." />
          </div>
          <div className="form-group">
            <label>TMDB API Key</label>
            <input type="password" value={tmdbApiKey} onChange={(e) => setTmdbApiKey(e.target.value)} placeholder="Zalijepi TMDB ključ..." />
          </div>
          
          <div className="divider"></div>
          
          <div className="form-group">
            <label>Vrsta Torrent Klijenta (Seedbox / Lokalno)</label>
            <select value={clientType} onChange={(e) => setClientType(e.target.value)}>
              <option value="none">Ne šalji klijentu (samo skini .torrent)</option>
              <option value="qbittorrent">qBittorrent (WebUI)</option>
              <option value="rtorrent">ruTorrent / rTorrent</option>
              <option value="watch">Watch Folder (Lokalni ili mapirani)</option>
            </select>
          </div>

          {clientType === "qbittorrent" && (
            <>
              <div className="form-group">
                <label>WebUI URL (npr. http://moj-seedbox.com:8080)</label>
                <input type="text" value={qbitUrl} onChange={(e) => setQbitUrl(e.target.value)} placeholder="URL klijenta..." />
              </div>
              <div className="form-group">
                <label>Korisničko ime</label>
                <input type="text" value={qbitUser} onChange={(e) => setQbitUser(e.target.value)} placeholder="Username" />
              </div>
              <div className="form-group">
                <label>Lozinka</label>
                <input type="password" value={qbitPass} onChange={(e) => setQbitPass(e.target.value)} placeholder="Password" />
              </div>
              <div className="form-group">
                <label>Lokalna putanja (npr. T:\torrenti)</label>
                <input type="text" value={qbitLocalPath} onChange={(e) => setQbitLocalPath(e.target.value)} placeholder="T:\torrenti" />
              </div>
              <div className="form-group">
                <label>Seedbox putanja (npr. /home/user/torrenti)</label>
                <input type="text" value={qbitRemotePath} onChange={(e) => setQbitRemotePath(e.target.value)} placeholder="/home/user/torrenti" />
              </div>
            </>
          )}

          {clientType === "rtorrent" && (
            <>
              <div className="form-group">
                <label>XMLRPC URL (npr. https://seedbox.com/rutorrent/)</label>
                <input type="text" value={rtorrentUrl} onChange={(e) => setRtorrentUrl(e.target.value)} placeholder="URL klijenta..." />
              </div>
              <div className="form-group">
                <label>Korisničko ime</label>
                <input type="text" value={rtorrentUser} onChange={(e) => setRtorrentUser(e.target.value)} placeholder="Username" />
              </div>
              <div className="form-group">
                <label>Lozinka</label>
                <input type="password" value={rtorrentPass} onChange={(e) => setRtorrentPass(e.target.value)} placeholder="Password" />
              </div>
              <div className="form-group">
                <label>Lokalna putanja (npr. T:\torrenti)</label>
                <input type="text" value={rtorrentLocalPath} onChange={(e) => setRtorrentLocalPath(e.target.value)} placeholder="T:\torrenti" />
              </div>
              <div className="form-group">
                <label>Seedbox putanja (npr. /home/user/torrenti)</label>
                <input type="text" value={rtorrentRemotePath} onChange={(e) => setRtorrentRemotePath(e.target.value)} placeholder="/home/user/torrenti" />
              </div>
            </>
          )}

          {clientType === "watch" && (
            <div className="form-group">
              <label>Putanja do Watch foldera</label>
              <input type="text" value={watchFolder} onChange={(e) => setWatchFolder(e.target.value)} placeholder="npr. Z:\watch" />
            </div>
          )}
          <button className="btn-upload" style={{marginTop: '1rem'}} onClick={async () => {
            try {
              await invoke("save_settings", { 
                settings: {
                  thr_api_key: thrApiKey,
                  tmdb_api_key: tmdbApiKey,
                  slike_api_key: slikeApiKey,
                  client_type: clientType,
                  qbit_url: qbitUrl,
                  qbit_user: qbitUser,
                  qbit_pass: qbitPass,
                  qbit_local_path: qbitLocalPath,
                  qbit_remote_path: qbitRemotePath,
                  rtorrent_url: rtorrentUrl,
                  rtorrent_user: rtorrentUser,
                  rtorrent_pass: rtorrentPass,
                  rtorrent_local_path: rtorrentLocalPath,
                  rtorrent_remote_path: rtorrentRemotePath,
                  watch_folder: watchFolder
                }
              });
            } catch (e) {
              console.error("Greška pri spremanju postavki:", e);
            }
            setShowSettings(false);
          }}>Spremi i Nazad</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <button className="btn-settings" onClick={() => setShowSettings(true)}>⚙️</button>
      <header className="header">
        <h1>THR Autouploader</h1>
        <p className="subtitle">Sve opcije na dlanu, bez terminala</p>
      </header>

      <div className={`drop-zone ${isDragging ? "dragging" : ""}`}>
        {selectedFolder ? (
          <div className="folder-selected">
            <h3>📁 Odabrano:</h3>
            <p>{selectedFolder}</p>
            <button className="btn-clear" onClick={() => setSelectedFolder(null)}>Očisti</button>
          </div>
        ) : (
          <div className="folder-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="upload-icon">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p>Ovdje povuci folder s filmom ili serijom</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', marginBottom: '1.5rem', width: '100%' }}>
        <input 
          type="text" 
          value={selectedFolder || ""} 
          onChange={(e) => setSelectedFolder(e.target.value)} 
          placeholder="Ili zalijepi apsolutnu putanju ručno (npr. C:\Filmovi\Avatar)" 
          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0d0d12', border: '1px solid #333', color: '#f5f5f5', borderRadius: '6px' }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem', width: '100%' }}>
        <input 
          type="text" 
          value={manualName} 
          onChange={(e) => setManualName(e.target.value)} 
          placeholder="Ručni naziv torrenta (Opcionalno - ostavi prazno za Auto)" 
          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0d0d12', border: '1px solid #333', color: '#f5f5f5', borderRadius: '6px' }}
        />
      </div>

      <div className="upload-options">
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Kategorija (Auto)</option>
          <option value="movie">Film</option>
          <option value="tv">Serija</option>
        </select>

        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="">Tip (Auto)</option>
          <option value="remux">Remux</option>
          <option value="encode">Encode</option>
          <option value="webdl">WEB-DL</option>
          <option value="webrip">WEBRip</option>
          <option value="hdtv">HDTV</option>
          <option value="dvdrip">DVDRip</option>
          <option value="disc">Disc / ISO</option>
          <option value="other">Ostalo (Other)</option>
        </select>

        <select value={resolution} onChange={e => setResolution(e.target.value)}>
          <option value="">Rezolucija (Auto)</option>
          <option value="2160p">2160p (4K)</option>
          <option value="1080p">1080p</option>
          <option value="1080i">1080i</option>
          <option value="720p">720p</option>
          <option value="576p">576p</option>
          <option value="576i">576i</option>
          <option value="480p">480p</option>
          <option value="480i">480i</option>
          <option value="other">Ostalo (Other)</option>
        </select>
        
        <input 
          type="text" 
          placeholder="API ID (IMDb/TMDb) - Opcionalno" 
          value={apiId}
          onChange={(e) => setApiId(e.target.value)}
          style={{ width: '250px', textAlign: 'center', margin: '0 auto', display: 'block' }}
        />
      </div>

      {showValidation && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#1a1a24', border: '1px solid #4ade80', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#4ade80' }}>✓ Prepoznato: {validationData?.title || 'Nepoznato'}</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem' }}>
            Kategorija: {validationData?.category || category} | 
            Rezolucija: {validationData?.resolution || resolution}
          </p>
          
          {category === 'game' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Upute za instalaciju (Obavezno za igre!)</label>
              <textarea 
                value={gameInstructions} 
                onChange={e => setGameInstructions(e.target.value)}
                placeholder="1. Mountaj ISO\n2. Instaliraj\n3. Kopiraj Crack\n4. Igraj"
                style={{ width: '100%', minHeight: '80px', padding: '8px', backgroundColor: '#0d0d12', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}
              />
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', color: '#ccc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="anonCheck"
            checked={isAnon}
            onChange={e => setIsAnon(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="anonCheck" style={{ cursor: 'pointer' }}>Anoniman Upload</label>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="dupeCheck"
            checked={skipDupeCheck}
            onChange={e => setSkipDupeCheck(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
          />
          <label htmlFor="dupeCheck" style={{ cursor: 'pointer', color: '#ef4444' }}>Ignoriraj duplikate (Force Upload)</label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="keepFolderCheck"
            checked={keepFolder}
            onChange={e => setKeepFolder(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="keepFolderCheck" style={{ cursor: 'pointer' }}>Zadrži mapu (Uključi titlove)</label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn-upload" style={{ backgroundColor: '#2563eb' }} onClick={() => handleUpload(true)} disabled={!selectedFolder}>
          Simuliraj Upload (Dry-Run)
        </button>
        <button className="btn-upload" onClick={() => handleUpload(false)} disabled={!selectedFolder}>
          Započni Upload na THR
        </button>
      </div>

      <div className="terminal-log">
        {logs.map((log, index) => (
          <div key={index} className={`log-line ${log.startsWith("[ERROR]") ? "error" : log.startsWith("[SISTEM]") ? "success" : ""}`}>
            {log}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
      
      <div className="status-bar">
        Spremno za rad
      </div>
    </div>
  );
}

export default App;
