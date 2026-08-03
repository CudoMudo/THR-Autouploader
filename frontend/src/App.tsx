import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
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

  // Status obrade
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [dupeText, setDupeText] = useState<string>("");
  const isDupeContext = useRef(false);
  const wasSkippedContext = useRef(false);

  useEffect(() => {
    const unlisten = listen<string>("upload-log", (event) => {
      let logLine = event.payload;
      let originalLine = logLine;
      if (logLine.startsWith("[INFO] ")) {
          logLine = logLine.substring(7);
      }

      if (originalLine.includes("mkbrr hashing")) return;
      if (originalLine.includes("DEBUG:")) return;
      
      if (originalLine.includes("[SISTEM] Uspjeh!")) {
        if (!wasSkippedContext.current) {
            setSuccessMessage("Završeno! Provjerite logove.");
            setErrorMessage("");
        } else {
            setErrorMessage("Prekinuto: Pronađen je duplikat! (Završeno bez uploada)");
        }
        setIsProcessing(false);
        isDupeContext.current = false;
        return;
      } else if (originalLine.includes("[SISTEM] Greška!")) {
        setErrorMessage(prev => prev ? prev : "Proces je završio s greškom.");
        setIsProcessing(false);
        isDupeContext.current = false;
        return;
      }

      if (originalLine.includes("401") && (originalLine.includes("TMDb") || originalLine.includes("search"))) {
        setErrorMessage("Odbijen pristup TMDB-u. Vaš TMDB API ključ je neispravan.");
      } else if (originalLine.includes("Unable to find a matching TMDb entry")) {
        setErrorMessage("Nije pronađen odgovarajući film/serija na TMDB-u.");
      } else if (originalLine.includes("Gathering info for")) {
        setProcessingMessage("Prikupljam informacije o datoteci...");
      } else if (originalLine.includes("Building meta data")) {
        setProcessingMessage("Povezujem se s filmskim bazama...");
      } else if (originalLine.includes("Searching for existing torrents on:")) {
        setProcessingMessage("Provjeravam duplikate na trackeru...");
      } else if (originalLine.includes("Potential dupes from")) {
        setErrorMessage("Pronađen je mogući duplikat na trackeru! (Oprez)");
        isDupeContext.current = true;
      } else if (originalLine.includes("Skipping") && originalLine.includes("due to dupes")) {
        wasSkippedContext.current = true;
      } else if (isDupeContext.current) {
        if (originalLine.trim() === "" || originalLine.startsWith("[INFO]") || originalLine.startsWith("[ERROR]") || logLine.includes("Gathering info") || logLine.includes("Building meta") || logLine.includes("Upload failed") || logLine.includes("Uploading to")) {
          // Keep capturing if it's just a formatted text block (not starting with [INFO] usually, but if it does, check its contents)
          if (!originalLine.includes("Gathering info") && !originalLine.includes("Building meta") && !originalLine.includes("Upload failed") && !originalLine.includes("Uploading to") && !originalLine.includes("Processing uploads")) {
             setDupeText(prev => prev + logLine.trim() + "\n");
          } else {
             isDupeContext.current = false;
          }
        } else {
          setDupeText(prev => prev + logLine.trim() + "\n");
        }
      } else if (originalLine.includes("Successfully obtained and uploaded")) {
        setProcessingMessage("Uploadani screenshotovi na Slike.THR...");
      } else if (originalLine.includes("Processing uploads to trackers")) {
        setProcessingMessage("Šaljem podatke na tracker...");
        setErrorMessage(""); // clear dupe warning if we proceed
      } else if (originalLine.includes("torrenthr.org/torrents/")) {
        // Tracker output is [INFO] https://www.torrenthr.org/torrents/12345
        const urlPart = originalLine.split("[INFO] ")[1];
        if (urlPart) {
          setUploadedUrl(urlPart.trim());
        }
      } else if (originalLine.includes("Uploaded to") && originalLine.includes("->")) {
        const url = originalLine.split("->")[1].trim();
        setUploadedUrl(url);
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleDryRun = async (folderPath: string, isAutoScan: boolean = false) => {
    if (!folderPath) return;

    // Dummy proof: API Keys
    if (!thrApiKey || thrApiKey.trim() === "" || !tmdbApiKey || tmdbApiKey.trim() === "" || !slikeApiKey || slikeApiKey.trim() === "") {
      setErrorMessage("Nedostaju API ključevi! Molimo kliknite na kotačić (Postavke) gore desno i unesite THR, TMDB i Slike.THR ključeve prije uploada.");
      return;
    }

    // Dummy proof: FFmpeg
    const hasFfmpeg = await invoke("check_ffmpeg_exists");
    if (!hasFfmpeg) {
      setErrorMessage("Ffmpeg.exe nije pronađen! Molimo preuzmite FFmpeg (samo ffmpeg.exe) i stavite ga u isti folder gdje se nalazi aplikacija (ili u sistemski PATH).");
      return;
    }

    setSelectedFolder(folderPath);
    setIsProcessing(true);
    setProcessingMessage(isAutoScan ? "Započinjem analizu datoteke..." : "Pripremam opis i simuliram upload...");
    setErrorMessage("");
    setSuccessMessage("");
    setIsProcessing(true);
    setProcessingMessage("Analiziram podatke...");
    setShowValidation(false);
    setDupeText("");
    
    try {
      const result = await invoke("dry_run_upload", { 
          folderPath: folderPath,
          tmdbApiKey: tmdbApiKey,
          slikeApiKey: slikeApiKey,
          thrApiKey: thrApiKey,
          isAutoScan: isAutoScan,
          tmdbId: isAutoScan ? "" : apiId,
          category: isAutoScan ? "" : category,
          typeVal: isAutoScan ? "" : type,
          resolution: isAutoScan ? "" : resolution,
          manualName: isAutoScan ? "" : manualName
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
      
      setSuccessMessage("Torrent će biti uspješno uploadan!");
      setShowValidation(true);
    } catch (error) {
      let rawError = String(error);
      let cleanError = rawError;
      
      if (rawError.includes("No results found")) {
        cleanError = "Nisam mogao automatski prepoznati film/seriju. Molimo popunite podatke ručno.";
      } else if (rawError.includes("Upload Assistant does not support no audio media")) {
        cleanError = "Ova datoteka nema audio traku (nepodržan format).";
      } else {
        if (rawError.includes("Configuration validation failed") || rawError.includes("Validacija konfiguracije nije uspjela")) {
           const splitKey = rawError.includes("Configuration validation failed") ? "Configuration validation failed:" : "Validacija konfiguracije nije uspjela:";
           cleanError = "Greška u postavkama: " + rawError.split(splitKey)[1].substring(0, 150) + "...";
        } else {
           cleanError = "Greška tijekom analize: " + rawError.substring(0, 100);
        }
      }
      
      setErrorMessage(cleanError);
      setShowValidation(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async (isDryRun: boolean = false) => {
    if (!selectedFolder) return;

    // Dummy proof: API Keys
    if (!thrApiKey || thrApiKey.trim() === "" || !tmdbApiKey || tmdbApiKey.trim() === "" || !slikeApiKey || slikeApiKey.trim() === "") {
      setErrorMessage("Nedostaju API ključevi! Molimo kliknite na kotačić (Postavke) gore desno i unesite THR, TMDB i Slike.THR ključeve prije uploada.");
      return;
    }

    // Dummy proof: FFmpeg
    const hasFfmpeg = await invoke("check_ffmpeg_exists");
    if (!hasFfmpeg) {
      setErrorMessage("Ffmpeg.exe nije pronađen! Molimo preuzmite FFmpeg (samo ffmpeg.exe) i stavite ga u isti folder gdje se nalazi aplikacija (ili u sistemski PATH).");
      return;
    }

    if (!apiId || apiId.trim() === "") {
      if (!validationData || !validationData.title) {
        setErrorMessage("Automatsko prepoznavanje nije uspjelo! Morate ručno unijeti API ID (IMDb ili TMDb ID).");
        return;
      }
    }

    setShowValidation(false);
    setIsProcessing(true);
    setProcessingMessage(isDryRun ? "Simuliram upload..." : "Šaljem torrent...");
    setErrorMessage("");
    setSuccessMessage("");
    setUploadedUrl("");
    setDupeText("");
    wasSkippedContext.current = false;
    
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
          is_dry_run: isDryRun,
          custom_bbcode: validationData?.bbcode_description || ""
        }
      });
      // Do NOT set isProcessing(false) or SuccessMessage here! 
      // start_upload returns immediately because it spawns a background thread.
      // The process ending will emit [SISTEM] Uspjeh/Greška to upload-log, which will turn off the spinner.
    } catch (error) {
      setErrorMessage(`Greška pri pokretanju uploada: ${error}`);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === 'drop') {
        const paths = (event.payload as any).paths;
        if (paths && paths.length > 0) {
          setIsDragging(false);
          handleDryRun(paths[0], true);
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
          <div className="folder-selected" style={{ width: '100%', textAlign: 'center', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
            <h3>📁 Odabrano:</h3>
            <p style={{ wordBreak: 'break-all', overflowWrap: 'anywhere', margin: '0.5rem 0 1rem 0', fontSize: '0.9rem', color: '#e0e0e0', lineHeight: '1.4' }}>{selectedFolder}</p>
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
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          backgroundColor: '#1a1a24', 
          border: `1px solid ${validationData?.title ? '#4ade80' : '#f59e0b'}`, 
          borderRadius: '8px' 
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: validationData?.title ? '#4ade80' : '#f59e0b' }}>
            {validationData?.title ? `✓ Prepoznato: ${validationData.title}` : '⚠️ Nije prepoznato automatski'}
          </h3>
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

          {/* BBCode Preview is intentionally removed per user request for dummy-friendly UX */}
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

      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', alignItems: 'center', marginTop: '1rem' }}>
        <button className="btn-upload" style={{ backgroundColor: '#10b981', width: '100%', fontSize: '1.2rem', padding: '1rem' }} onClick={() => handleUpload(false)} disabled={!selectedFolder || isProcessing}>
          Započni Upload na THR
        </button>
      </div>

      {isProcessing && (
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: '#1a1a24',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <div className="spinner" style={{
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderLeftColor: '#2563eb',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <p style={{ color: '#fff', fontSize: '1.1rem' }}>{processingMessage || "Molimo pričekajte..."}</p>
        </div>
      )}

      {errorMessage && !isProcessing && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#451a1a', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5' }}>
          <strong>Greška:</strong> {errorMessage}
          {dupeText && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '4px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {dupeText}
            </div>
          )}
        </div>
      )}

      {successMessage && !isProcessing && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#14532d', border: '1px solid #22c55e', borderRadius: '8px', color: '#bbf7d0', textAlign: 'center' }}>
          <strong>Uspjeh!</strong> {successMessage}
          {uploadedUrl && (
            <div style={{ marginTop: '1rem' }}>
              <a href={uploadedUrl} onClick={(e) => { e.preventDefault(); openUrl(uploadedUrl).catch(err => setErrorMessage("Ne mogu otvoriti link: " + String(err))); }} style={{ color: '#4ade80', textDecoration: 'underline', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>
                Klikni ovdje za pregled torrenta
              </a>
            </div>
          )}
        </div>
      )}
      
      <div className="status-bar">
        Spremno za rad
      </div>
    </div>
  );
}

export default App;
