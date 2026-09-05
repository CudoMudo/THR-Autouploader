import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { markdownToBbcode } from "./utils/bbcode";
import { formatCleanTitle, parseFolderMetadata } from "./utils/formatters";
import "./App.css";

export interface QueueItem {
  id: string;
  folderPath: string;
  folderName: string;
  cleanTitle: string;
  manualName?: string;
  category: string;
  type: string;
  resolution: string;
  apiId: string;
  customDescription: string;
  coverUrl?: string;
  hrvatskiTitl: boolean;
  personalRls: boolean;
  isAnon: boolean;
  skipDupeCheck: boolean;
  keepFolder: boolean;
  status: "idle" | "analyzing" | "ready" | "uploading" | "success" | "error";
  statusBadgeText?: string;
  validationData?: any;
}

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [manualPathInput, setManualPathInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Settings
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
  const [thrApiKey, setThrApiKey] = useState("");
  const [tmdbApiKey, setTmdbApiKey] = useState("");
  const [slikeApiKey, setSlikeApiKey] = useState("");
  const [clientType, setClientType] = useState("qbittorrent");

  // Queue State
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // Hidden cover image file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logs
  const [logs, setLogs] = useState<string[]>([
    "[SISTEM] Aplikacija uspješno pokrenuta. Sve opcije su dostupne kroz GUI.",
    "Čekam unos mape..."
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Helper to update specific item in queue
  const updateQueueItem = (id: string, updater: (item: QueueItem) => QueueItem) => {
    setQueue((prevQueue) =>
      prevQueue.map((it) => (it.id === id ? updater(it) : it))
    );
  };

  const selectedItem = queue.find((it) => it.id === selectedItemId) || null;

  // Load Settings on start
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

  // Upload Log Listener
  useEffect(() => {
    const unlisten = listen<string>("upload-log", (event) => {
      let logLine = event.payload;
      let originalLine = logLine;
      if (logLine.startsWith("[INFO] ")) {
        logLine = logLine.substring(7);
      }

      if (originalLine.includes("mkbrr hashing")) return;

      if (originalLine.includes("401") && (originalLine.includes("TMDb") || originalLine.includes("search"))) {
        logLine = "[GREŠKA] Odbijen pristup TMDB-u (401). Vaš TMDB API ključ je neispravan. Molimo provjerite postavke!";
      } else if (originalLine.includes("TMDb was unable to find anything from external IDs")) {
        logLine = "[INFO] Pretraga putem vanjskih ID-eva nije uspjela, pokušavam po imenu...";
      } else if (originalLine.includes("Unable to find a matching TMDb entry")) {
        logLine = "[UPOZORENJE] Nije pronađen odgovarajući film/serija na TMDB-u.";
      } else if (originalLine.includes("DEBUG:")) {
        return;
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
        return;
      } else if (originalLine.includes("All tracker uploads processed")) {
        logLine = "[INFO] Upload proces je završen!";
      } else {
        logLine = originalLine;
      }

      if (!logLine.startsWith("[") && logLine.trim() !== "") {
        logLine = "      " + logLine;
      }

      setLogs((prevLogs) => {
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

  // Analyze an individual item via dry-run metadata
  const analyzeQueueItem = async (item: QueueItem): Promise<void> => {
    updateQueueItem(item.id, (it) => ({ ...it, status: "analyzing" }));
    setLogs((prev) => [...prev, `[SISTEM] Analiziram stavku: ${item.cleanTitle || item.folderName}...`]);

    try {
      const result = await invoke("dry_run_upload", {
        folderPath: item.folderPath,
        tmdbApiKey: tmdbApiKey,
        slikeApiKey: slikeApiKey,
        thrApiKey: thrApiKey,
      });

      const parsedData = JSON.parse(result as string);
      const meta = parsedData.dry_run_metadata;

      const recognizedTitle = meta.title || item.cleanTitle;
      const recognizedRes = meta.resolution || item.resolution;
      const recognizedCat = (meta.category || item.category || "").toLowerCase();
      const recognizedType = (meta.type || item.type || "").toLowerCase();

      let detectedId = item.apiId;
      if (meta.tmdb_id && meta.tmdb_id !== 0) detectedId = meta.tmdb_id.toString();
      else if (meta.imdb_id) detectedId = meta.imdb_id.toString();
      else if (meta.igdb_id && meta.igdb_id !== 0) detectedId = meta.igdb_id.toString();
      else if (meta.discogs_id && meta.discogs_id !== 0) detectedId = meta.discogs_id.toString();

      const isMusic = recognizedCat === "music" || recognizedCat === "29" || recognizedCat === "3" || item.category === "29" || item.category === "3";
      const finalCat = isMusic ? (item.category === "3" ? "3" : "29") : (recognizedCat || item.category);
      const finalRes = isMusic ? "other" : (recognizedRes || item.resolution);
      const finalType = isMusic ? "other" : (recognizedType || item.type);

      let badgeText = "Spremno";
      if (recognizedTitle) {
        if (isMusic) {
          badgeText = `${recognizedTitle} (${finalCat === "3" ? "MP3" : "FLAC"})`;
        } else {
          badgeText = `${recognizedTitle} (${finalRes || "HD"})`;
        }
      }

      updateQueueItem(item.id, (it) => ({
        ...it,
        status: "ready",
        statusBadgeText: badgeText,
        validationData: meta,
        apiId: detectedId,
        category: finalCat,
        type: finalType,
        resolution: finalRes,
        cleanTitle: recognizedTitle || it.cleanTitle,
        coverUrl: it.coverUrl || meta.cover_url,
      }));

      setLogs((prev) => [
        ...prev,
        `[SISTEM] ✓ Analiza završena: ${recognizedTitle || item.folderName}`,
      ]);
    } catch (error) {
      updateQueueItem(item.id, (it) => ({
        ...it,
        status: "ready",
        statusBadgeText: "Spremno",
      }));
      setLogs((prev) => [
        ...prev,
        `[UPOZORENJE] Nije moguće automatski dohvatiti metapodatke za ${item.folderName}. Podaci se mogu unijeti ručno.`,
      ]);
    }
  };

  // Add paths to queue
  const addFoldersToQueue = async (paths: string[]) => {
    if (!paths || paths.length === 0) return;

    const newItems: QueueItem[] = [];

    for (const folderPath of paths) {
      if (!folderPath || folderPath.trim() === "") continue;
      const normalizedPath = folderPath.trim();
      const folderName =
        normalizedPath.replace(/\\/g, "/").split("/").filter(Boolean).pop() ||
        normalizedPath;

      const parsed = parseFolderMetadata(normalizedPath);
      const cleanTitle = formatCleanTitle(folderName);
      const isMusic = parsed.category === "29" || parsed.category === "3";

      const newItem: QueueItem = {
        id: "item_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        folderPath: normalizedPath,
        folderName: folderName,
        cleanTitle: parsed.cleanTitle || cleanTitle,
        manualName: "",
        category: parsed.category || "movie",
        type: isMusic ? "other" : (parsed.type || "webdl"),
        resolution: isMusic ? "other" : (parsed.resolution || "1080p"),
        apiId: "",
        customDescription: "",
        hrvatskiTitl: false,
        personalRls: false,
        isAnon: false,
        skipDupeCheck: false,
        keepFolder: false,
        status: "analyzing",
        statusBadgeText: "Analiziram...",
      };

      newItems.push(newItem);
    }

    if (newItems.length === 0) return;

    setQueue((prev) => [...prev, ...newItems]);
    if (!selectedItemId) {
      setSelectedItemId(newItems[0].id);
    }

    setLogs((prev) => [
      ...prev,
      `[SISTEM] Dodano ${newItems.length} stavki u Queue. Pokrećem analizu...`,
    ]);

    // Sequentially analyze new items in background
    for (const it of newItems) {
      await analyzeQueueItem(it);
    }
  };

  // Drag and Drop Listener for Tauri
  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        const paths = (event.payload as any).paths;
        if (paths && paths.length > 0) {
          setIsDragging(false);
          addFoldersToQueue(paths);
        }
      } else if (event.payload.type === "enter") {
        setIsDragging(true);
      } else if (event.payload.type === "leave") {
        setIsDragging(false);
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [tmdbApiKey, slikeApiKey, thrApiKey, selectedItemId]);

  // Handle Manual Path Submission
  const handleAddManualPath = () => {
    if (!manualPathInput.trim()) return;
    addFoldersToQueue([manualPathInput.trim()]);
    setManualPathInput("");
  };

  // Remove individual item from queue
  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((it) => it.id !== id));
    if (selectedItemId === id) {
      const remaining = queue.filter((it) => it.id !== id);
      setSelectedItemId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Clear entire queue
  const handleClearQueue = () => {
    setQueue([]);
    setSelectedItemId(null);
    setLogs((prev) => [...prev, "[SISTEM] Red čekanja je očišćen."]);
  };

  // Image Upload to Slike.THR
  const handleImageUpload = (file: File) => {
    if (!slikeApiKey || slikeApiKey.trim() === "") {
      setLogs((prev) => [
        ...prev,
        "[GREŠKA] Slike.THR API ključ nije unesen u Postavkama (⚙️).",
      ]);
      return;
    }

    setLogs((prev) => [
      ...prev,
      `[SISTEM] Šaljem sliku '${file.name}' na Slike.THR...`,
    ]);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const uploadedUrl: string = await invoke("upload_image_to_slike", {
          apiKey: slikeApiKey,
          base64Data: base64Data,
          filename: file.name,
        });

        setLogs((prev) => [
          ...prev,
          `[SISTEM] ✓ Slika uspješno uploadana: ${uploadedUrl}`,
        ]);

        if (selectedItemId) {
          updateQueueItem(selectedItemId, (it) => {
            const bbcodeImg = `[img=350]${uploadedUrl}[/img]`;
            const updatedDesc = it.customDescription
              ? `${bbcodeImg}\n\n${it.customDescription}`
              : bbcodeImg;
            return {
              ...it,
              customDescription: updatedDesc,
              coverUrl: uploadedUrl,
            };
          });
        }
      } catch (err) {
        setLogs((prev) => [
          ...prev,
          `[GREŠKA] Upload slike na Slike.THR nije uspio: ${err}`,
        ]);
      }
    };
    reader.readAsDataURL(file);
  };

  // Markdown to BBCode Conversion
  const handleConvertBbcode = () => {
    if (!selectedItemId || !selectedItem) return;
    const bbcode = markdownToBbcode(selectedItem.customDescription);
    updateQueueItem(selectedItemId, (it) => ({
      ...it,
      customDescription: bbcode,
    }));
    setLogs((prev) => [
      ...prev,
      "[SISTEM] Opis uspješno pretvoren iz Markdowna u BBCode.",
    ]);
  };

  // Single upload worker Promise that awaits "upload-finished"
  const runSingleUpload = (item: QueueItem, isDryRun: boolean = false): Promise<boolean> => {
    return new Promise(async (resolve) => {
      let unlistenFn: (() => void) | null = null;

      unlistenFn = await listen<any>("upload-finished", (event) => {
        const payload = event.payload;
        if (!payload.item_id || payload.item_id === item.id) {
          if (unlistenFn) unlistenFn();
          resolve(payload.success);
        }
      });

      try {
        await invoke("start_upload", {
          payload: {
            item_id: item.id,
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
            folder_path: item.folderPath,
            category: item.category,
            type_val: item.type,
            resolution: item.resolution,
            tmdb_id: item.apiId,
            is_anon: item.isAnon,
            skip_dupe_check: item.skipDupeCheck,
            keep_folder: item.keepFolder,
            manual_name: item.manualName ? item.manualName.trim() : "",
            is_dry_run: isDryRun,
            hrvatski_titl: item.hrvatskiTitl,
            personal_release: item.personalRls,
            custom_description: item.customDescription,
          },
        });
      } catch (error) {
        if (unlistenFn) unlistenFn();
        setLogs((prev) => [
          ...prev,
          `[ERROR] Greška pri pokretanju uploada za ${item.folderName}: ${error}`,
        ]);
        resolve(false);
      }
    });
  };

  // Batch Upload Execution
  const handleBatchUpload = async (isDryRun: boolean = false) => {
    if (isBatchRunning || queue.length === 0) return;
    setIsBatchRunning(true);
    setLogs((prev) => [
      ...prev,
      `[SISTEM] Pokrećem ${isDryRun ? "Batch Simulaciju" : "Batch Upload"} za ${queue.length} stavki...`,
    ]);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === "success") continue;

      setSelectedItemId(item.id);
      updateQueueItem(item.id, (it) => ({ ...it, status: "uploading" }));
      setLogs((prev) => [
        ...prev,
        `[SISTEM] [${i + 1}/${queue.length}] ${isDryRun ? "Simuliram" : "Učitavam"}: ${item.cleanTitle || item.folderName}`,
      ]);

      const success = await runSingleUpload(item, isDryRun);
      updateQueueItem(item.id, (it) => ({
        ...it,
        status: success ? "success" : "error",
        statusBadgeText: success ? "✓ Uploadan" : "✕ Greška",
      }));

      // Small cooldown between batch uploads
      await new Promise((r) => setTimeout(r, 1200));
    }

    setIsBatchRunning(false);
    setLogs((prev) => [
      ...prev,
      `[SISTEM] Batch obrada je u potpunosti završena.`,
    ]);
  };

  // Upload Selected Item Only
  const handleUploadSingleItem = async (isDryRun: boolean = false) => {
    if (!selectedItem || isBatchRunning) return;
    setIsBatchRunning(true);
    updateQueueItem(selectedItem.id, (it) => ({ ...it, status: "uploading" }));
    setLogs((prev) => [
      ...prev,
      `[SISTEM] Pokrećem ${isDryRun ? "simulaciju" : "upload"} za: ${selectedItem.cleanTitle || selectedItem.folderName}`,
    ]);

    const success = await runSingleUpload(selectedItem, isDryRun);
    updateQueueItem(selectedItem.id, (it) => ({
      ...it,
      status: success ? "success" : "error",
      statusBadgeText: success ? "✓ Uploadan" : "✕ Greška",
    }));

    setIsBatchRunning(false);
  };

  // Ready counter
  const readyCount = queue.filter(
    (it) => it.status === "ready" || it.status === "success"
  ).length;

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
            <input
              type="password"
              value={thrApiKey}
              onChange={(e) => setThrApiKey(e.target.value)}
              placeholder="Zalijepi THR ključ..."
            />
          </div>
          <div className="form-group">
            <label>Slike.THR API Key</label>
            <input
              type="password"
              value={slikeApiKey}
              onChange={(e) => setSlikeApiKey(e.target.value)}
              placeholder="chv_wnD_..."
            />
          </div>
          <div className="form-group">
            <label>TMDB API Key</label>
            <input
              type="password"
              value={tmdbApiKey}
              onChange={(e) => setTmdbApiKey(e.target.value)}
              placeholder="Zalijepi TMDB ključ..."
            />
          </div>

          <div className="divider"></div>

          <div className="form-group">
            <label>Vrsta Torrent Klijenta (Seedbox / Lokalno)</label>
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
            >
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
                <input
                  type="text"
                  value={qbitUrl}
                  onChange={(e) => setQbitUrl(e.target.value)}
                  placeholder="URL klijenta..."
                />
              </div>
              <div className="form-group">
                <label>Korisničko ime</label>
                <input
                  type="text"
                  value={qbitUser}
                  onChange={(e) => setQbitUser(e.target.value)}
                  placeholder="Username"
                />
              </div>
              <div className="form-group">
                <label>Lozinka</label>
                <input
                  type="password"
                  value={qbitPass}
                  onChange={(e) => setQbitPass(e.target.value)}
                  placeholder="Password"
                />
              </div>
              <div className="form-group">
                <label>Lokalna putanja (npr. T:\torrenti)</label>
                <input
                  type="text"
                  value={qbitLocalPath}
                  onChange={(e) => setQbitLocalPath(e.target.value)}
                  placeholder="T:\torrenti"
                />
              </div>
              <div className="form-group">
                <label>Seedbox putanja (npr. /home/user/torrenti)</label>
                <input
                  type="text"
                  value={qbitRemotePath}
                  onChange={(e) => setQbitRemotePath(e.target.value)}
                  placeholder="/home/user/torrenti"
                />
              </div>
            </>
          )}

          {clientType === "rtorrent" && (
            <>
              <div className="form-group">
                <label>XMLRPC URL (npr. https://seedbox.com/rutorrent/)</label>
                <input
                  type="text"
                  value={rtorrentUrl}
                  onChange={(e) => setRtorrentUrl(e.target.value)}
                  placeholder="URL klijenta..."
                />
              </div>
              <div className="form-group">
                <label>Korisničko ime</label>
                <input
                  type="text"
                  value={rtorrentUser}
                  onChange={(e) => setRtorrentUser(e.target.value)}
                  placeholder="Username"
                />
              </div>
              <div className="form-group">
                <label>Lozinka</label>
                <input
                  type="password"
                  value={rtorrentPass}
                  onChange={(e) => setRtorrentPass(e.target.value)}
                  placeholder="Password"
                />
              </div>
              <div className="form-group">
                <label>Lokalna putanja (npr. T:\torrenti)</label>
                <input
                  type="text"
                  value={rtorrentLocalPath}
                  onChange={(e) => setRtorrentLocalPath(e.target.value)}
                  placeholder="T:\torrenti"
                />
              </div>
              <div className="form-group">
                <label>Seedbox putanja (npr. /home/user/torrenti)</label>
                <input
                  type="text"
                  value={rtorrentRemotePath}
                  onChange={(e) => setRtorrentRemotePath(e.target.value)}
                  placeholder="/home/user/torrenti"
                />
              </div>
            </>
          )}

          {clientType === "watch" && (
            <div className="form-group">
              <label>Putanja do Watch foldera</label>
              <input
                type="text"
                value={watchFolder}
                onChange={(e) => setWatchFolder(e.target.value)}
                placeholder="npr. Z:\watch"
              />
            </div>
          )}

          <button
            className="btn-upload"
            style={{ marginTop: "1rem" }}
            onClick={async () => {
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
                    watch_folder: watchFolder,
                  },
                });
              } catch (e) {
                console.error("Greška pri spremanju postavki:", e);
              }
              setShowSettings(false);
            }}
          >
            Spremi i Nazad
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <button className="btn-settings" onClick={() => setShowSettings(true)}>
        ⚙️
      </button>

      <header className="header">
        <h1>THR Autouploader</h1>
        <p className="subtitle">Sve opcije na dlanu, bez terminala</p>
      </header>

      {/* Hidden input for cover upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
          }
        }}
      />

      {/* Drop Zone */}
      <div className={`drop-zone ${isDragging ? "active" : ""}`}>
        <div className="folder-empty">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="upload-icon"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p style={{ fontWeight: 600, fontSize: "1rem", color: "#f5f5f5", marginBottom: "0.25rem" }}>
            Povuci još foldera za dodavanje u red čekanja
          </p>
          <p style={{ fontSize: "0.85rem", color: "#999" }}>
            Podržan istovremeni Batch unos više foldera odjednom
          </p>
        </div>
      </div>

      {/* Manual Path Input + Add Button */}
      <div className="manual-input-row">
        <input
          type="text"
          value={manualPathInput}
          onChange={(e) => setManualPathInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddManualPath();
          }}
          placeholder="N:\PLEX MOVIES 2\Son 2021"
          className="manual-path-input"
        />
        <button className="btn-add-queue" onClick={handleAddManualPath}>
          + Dodaj u red
        </button>
      </div>

      {/* Batch Queue Panel */}
      {queue.length > 0 && (
        <div className="queue-panel">
          <div className="queue-header">
            <div className="queue-title">
              📋 Red čekanja / Batch Queue ({queue.length})
            </div>
            <button className="btn-clear-queue" onClick={handleClearQueue}>
              🗑️ Očisti red
            </button>
          </div>

          <div className="queue-list">
            {queue.map((item, index) => {
              const isSelected = item.id === selectedItemId;
              return (
                <div
                  key={item.id}
                  className={`queue-item ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <div className="queue-item-left">
                    <div className="queue-item-index">
                      #{index + 1} {isSelected && <span className="pencil-icon">✏️</span>}
                    </div>
                    <div className="queue-item-info">
                      <div className="queue-item-title">
                        {item.cleanTitle || item.folderName}
                      </div>
                      <div className="queue-item-meta">
                        <span>{item.category}</span>
                        <span>• {item.resolution}</span>
                        {item.apiId && <span>• ID: {item.apiId}</span>}
                        {item.hrvatskiTitl && (
                          <span className="badge-tag-hr">• HR Titl</span>
                        )}
                        {item.personalRls && (
                          <span className="badge-tag-personal">• Osobni RLS</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="queue-item-right">
                    <span className={`status-pill pill-${item.status}`}>
                      {item.statusBadgeText || (item.status === "analyzing" ? "Analiziram..." : "Spremno")}
                    </span>
                    <button
                      className="btn-item-remove"
                      title="Ukloni iz reda"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(item.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="queue-footer">
            <span className="queue-hint">
              💡 Klikni na stavku u listi za uređivanje naziva, opisa, ID-a ili covera prije uploada.
            </span>
            <span className="queue-ready-counter">
              Spremno: {readyCount} / {queue.length}
            </span>
          </div>
        </div>
      )}

      {/* Active Queue Item Form Editor */}
      {selectedItem && (
        <div className="item-editor-card">
          <div className="editor-banner">
            <div className="editor-banner-left">
              ✏️ Uređuješ: <strong>{selectedItem.cleanTitle || selectedItem.folderName}</strong>
            </div>
            <div className="editor-banner-right">
              Promjene se automatski spremaju za ovu stavku u redu
            </div>
          </div>

          {/* Title Editor */}
          <div className="editor-field" style={{ marginTop: "1rem" }}>
            <input
              type="text"
              value={selectedItem.manualName ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                updateQueueItem(selectedItem.id, (it) => ({ ...it, manualName: val }));
              }}
              placeholder={
                selectedItem.cleanTitle
                  ? `Ručni naziv torrenta (Prazno = Auto: ${selectedItem.cleanTitle})`
                  : "Ručni naziv torrenta (Opcionalno - ostavi prazno za Auto)"
              }
              className="editor-input"
            />
          </div>

          {/* Description Section */}
          <div className="description-section">
            <div className="description-header">
              <label>Dodatni info / opis (tekst, linkovi, bold):</label>
              <div className="desc-toolbar">
                <button
                  type="button"
                  className="btn-desc-tool"
                  onClick={() => fileInputRef.current?.click()}
                  title="Uploadaj sliku na Slike.THR i ubaci [img]"
                >
                  🖼️ Dodaj cover sliku
                </button>
                <button
                  type="button"
                  className="btn-desc-tool"
                  onClick={handleConvertBbcode}
                  title="Pretvori Markdown oznake u BBCode"
                >
                  📝 Markdown u BBCode
                </button>
              </div>
            </div>

            <textarea
              value={selectedItem.customDescription}
              onChange={(e) => {
                const val = e.target.value;
                updateQueueItem(selectedItem.id, (it) => ({ ...it, customDescription: val }));
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const file = e.dataTransfer.files[0];
                  if (file.type.startsWith("image/")) {
                    handleImageUpload(file);
                  }
                }
              }}
              placeholder="Dodatni info (Opcionalno - tekst, linkovi, bold slova, prikazuje se iznad slika). Možeš ovdje dovući cover sliku (jpg/png)!"
              className="description-textarea"
            />

            {selectedItem.coverUrl && (
              <div className="cover-preview-box">
                <span className="cover-label">Cover slika:</span>
                <img src={selectedItem.coverUrl} alt="Cover Preview" className="cover-img-preview" />
                <button
                  className="btn-remove-cover"
                  onClick={() => updateQueueItem(selectedItem.id, (it) => ({ ...it, coverUrl: undefined }))}
                  title="Ukloni cover"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Category, Type, Resolution Selectors */}
          <div className="selectors-row">
            <select
              value={selectedItem.category}
              onChange={(e) => {
                const val = e.target.value;
                const isMusic = val === "29" || val === "3" || val === "music";
                updateQueueItem(selectedItem.id, (it) => ({
                  ...it,
                  category: val,
                  ...(isMusic ? { type: "other", resolution: "other" } : {}),
                }));
              }}
              className="selector-select"
            >
              <option value="">Kategorija (Auto)</option>
              <option value="movie">Filmovi (Auto SD/HD/BD/DVD)</option>
              <option value="tv">Serije (Auto SD/HD)</option>
              <option value="18">Crtani Filmovi (18)</option>
              <option value="12">Dokumentarni Filmovi (12)</option>
              <option value="31">Anime (31)</option>
              <option value="17">Filmovi / HD (17)</option>
              <option value="4">Filmovi / SD (4)</option>
              <option value="14">Filmovi / DVD (14)</option>
              <option value="40">Filmovi / BD (40)</option>
              <option value="34">Serije / HD (34)</option>
              <option value="7">Serije / SD (7)</option>
              <option value="29">Glazba / FLAC (29)</option>
              <option value="3">Glazba / MP3 (3)</option>
              <option value="5">Igre / PC (5)</option>
              <option value="1">Aplikacije (1)</option>
              <option value="25">E-books (25)</option>
              <option value="30">Stripovi (30)</option>
              <option value="11">Koncerti / Spotovi (11)</option>
            </select>

            <select
              value={selectedItem.type}
              onChange={(e) => {
                const val = e.target.value;
                updateQueueItem(selectedItem.id, (it) => ({ ...it, type: val }));
              }}
              className="selector-select"
            >
              <option value="">Tip (Auto)</option>
              <option value="webdl">WEB-DL</option>
              <option value="remux">Remux</option>
              <option value="encode">Encode</option>
              <option value="webrip">WEBRip</option>
              <option value="hdtv">HDTV</option>
              <option value="dvdrip">DVDRip</option>
              <option value="disc">Disc / ISO</option>
              <option value="other">Ostalo (Other)</option>
            </select>

            <select
              value={selectedItem.resolution}
              onChange={(e) => {
                const val = e.target.value;
                updateQueueItem(selectedItem.id, (it) => ({ ...it, resolution: val }));
              }}
              className="selector-select"
            >
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
          </div>

          {/* API ID Input */}
          <div className="api-id-row">
            <input
              type="text"
              value={selectedItem.apiId}
              onChange={(e) => {
                const val = e.target.value;
                updateQueueItem(selectedItem.id, (it) => ({ ...it, apiId: val }));
              }}
              placeholder={
                selectedItem.category === "29" || selectedItem.category === "3" || selectedItem.category === "music"
                  ? "Discogs ID ili link (npr. 33441884 ili https://www.discogs.com/release/...)"
                  : selectedItem.category === "5" || selectedItem.category === "game"
                  ? "IGDB ID ili link - Opcionalno"
                  : "API ID (TMDb / IMDb) - Opcionalno"
              }
              className="api-id-input"
            />
          </div>

          {/* Prepoznato Box */}
          {selectedItem.validationData?.title && (
            <div className="recognized-box">
              <h4 className="recognized-title">
                ✓ Prepoznato: {selectedItem.validationData.title}
              </h4>
              <p className="recognized-sub">
                {selectedItem.category === "29" || selectedItem.category === "3"
                  ? `Kategorija: ${selectedItem.category === "3" ? "GLAZBA (MP3)" : "GLAZBA (FLAC)"} | Baza: Discogs (${selectedItem.apiId || "Auto"})`
                  : `Kategorija: ${selectedItem.category.toUpperCase()} | Rezolucija: ${selectedItem.resolution}`
                }
              </p>
            </div>
          )}

          {/* Checkbox Flags */}
          <div className="flags-row">
            <div className="flag-item">
              <input
                type="checkbox"
                id="hrTitlCheck"
                checked={selectedItem.hrvatskiTitl}
                onChange={(e) => {
                  const val = e.target.checked;
                  updateQueueItem(selectedItem.id, (it) => ({ ...it, hrvatskiTitl: val }));
                }}
                className="checkbox-blue"
              />
              <label htmlFor="hrTitlCheck" className="label-blue">
                Hrvatski titl
              </label>
            </div>

            <div className="flag-item">
              <input
                type="checkbox"
                id="personalCheck"
                checked={selectedItem.personalRls}
                onChange={(e) => {
                  const val = e.target.checked;
                  updateQueueItem(selectedItem.id, (it) => ({ ...it, personalRls: val }));
                }}
                className="checkbox-purple"
              />
              <label htmlFor="personalCheck" className="label-purple">
                Osobni RLS (Personal RLS)
              </label>
            </div>

            <div className="flag-item">
              <input
                type="checkbox"
                id="anonCheck"
                checked={selectedItem.isAnon}
                onChange={(e) => {
                  const val = e.target.checked;
                  updateQueueItem(selectedItem.id, (it) => ({ ...it, isAnon: val }));
                }}
              />
              <label htmlFor="anonCheck">Anoniman Upload</label>
            </div>

            <div className="flag-item">
              <input
                type="checkbox"
                id="dupeCheck"
                checked={selectedItem.skipDupeCheck}
                onChange={(e) => {
                  const val = e.target.checked;
                  updateQueueItem(selectedItem.id, (it) => ({ ...it, skipDupeCheck: val }));
                }}
                className="checkbox-red"
              />
              <label htmlFor="dupeCheck" className="label-red">
                Ignoriraj duplikate (Force Upload)
              </label>
            </div>

            <div className="flag-item">
              <input
                type="checkbox"
                id="keepFolderCheck"
                checked={selectedItem.keepFolder}
                onChange={(e) => {
                  const val = e.target.checked;
                  updateQueueItem(selectedItem.id, (it) => ({ ...it, keepFolder: val }));
                }}
              />
              <label htmlFor="keepFolderCheck">Zadrži mapu</label>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons-container">
        <div className="batch-buttons-row">
          <button
            className="btn-batch-start"
            onClick={() => handleBatchUpload(false)}
            disabled={queue.length === 0 || isBatchRunning}
          >
            🚀 Pokreni Batch Upload ({queue.length} {queue.length === 1 ? "stavka" : "stavki"})
          </button>

          <button
            className="btn-batch-sim"
            onClick={() => handleBatchUpload(true)}
            disabled={queue.length === 0 || isBatchRunning}
          >
            🧪 Simuliraj Batch (Dry-Run)
          </button>
        </div>

        {selectedItem && (
          <button
            className="btn-single-upload"
            onClick={() => handleUploadSingleItem(false)}
            disabled={isBatchRunning}
          >
            📤 Uploadaj samo trenutno odabranu stavku
          </button>
        )}
      </div>

      {/* Terminal Logs */}
      <div className="terminal-log">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`log-line ${
              log.startsWith("[ERROR]") || log.startsWith("[GREŠKA]")
                ? "error"
                : log.startsWith("[SISTEM]")
                ? "success"
                : log.startsWith("[UPOZORENJE]")
                ? "warning"
                : ""
            }`}
          >
            {log}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      <div className="status-bar">
        {isBatchRunning ? "Batch obrada u tijeku..." : "Spremno za rad"}
      </div>
    </div>
  );
}

export default App;
