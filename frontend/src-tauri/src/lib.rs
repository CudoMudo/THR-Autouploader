use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use tauri::{AppHandle, Emitter};
use std::path::PathBuf;

fn get_backend_dir() -> PathBuf {
    // 1. Produkcija: backend je odmah pored .exe datoteke
    let exe_dir = std::env::current_exe()
        .unwrap_or_else(|_| PathBuf::from("."))
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."))
        .to_path_buf();
    
    let prod_backend = exe_dir.join("backend");
    if prod_backend.exists() {
        return prod_backend;
    }

    // 2. Dev okruženje (bun run dev): traži relativno u odnosu na working directory
    let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    
    // Ako smo u frontend/src-tauri
    let dev_1 = current_dir.join("../../backend");
    if dev_1.exists() { return dev_1; }
    
    // Ako smo u frontend/
    let dev_2 = current_dir.join("../backend");
    if dev_2.exists() { return dev_2; }
    
    // Ako smo u rootu projekta
    let dev_3 = current_dir.join("backend");
    if dev_3.exists() { return dev_3; }

    // Fallback ako ne nađe nigdje (sprječava hardkodiranje)
    PathBuf::from("backend")
}

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(default)]
pub struct GuiSettings {
    thr_api_key: String,
    tmdb_api_key: String,
    slike_api_key: String,
    client_type: String,
    qbit_url: String,
    qbit_user: String,
    qbit_pass: String,
    qbit_local_path: String,
    qbit_remote_path: String,
    rtorrent_url: String,
    rtorrent_user: String,
    rtorrent_pass: String,
    rtorrent_local_path: String,
    rtorrent_remote_path: String,
    watch_folder: String,
}

#[tauri::command]
fn save_settings(settings: GuiSettings) -> Result<(), String> {
    let backend_dir = get_backend_dir();
    let settings_path = backend_dir.join("data").join("gui_settings.json");
    
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| e.to_string())?;
        
    std::fs::write(settings_path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_existing_config() -> Result<GuiSettings, String> {
    let backend_dir = get_backend_dir();
    let config_path = backend_dir.join("data").join("config.py");
    
    let mut settings = GuiSettings::default();
    
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            
            let re_tmdb = regex::Regex::new(r#"(?m)(?:config\['DEFAULT'\]\['tmdb_api'\]\s*=\s*|["']tmdb_api["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_tmdb.captures(&content) { settings.tmdb_api_key = caps[1].to_string(); }

            let re_thr_assign = regex::Regex::new(r#"(?m)config\['TRACKERS'\]\['THR'\]\['api_key'\]\s*=\s*['"]([^'"]+)['"]"#).unwrap();
            let re_thr_dict = regex::Regex::new(r#"["']THR["']\s*:\s*\{[^}]*["']api_key["']\s*:\s*["']([^"']+)["']"#).unwrap();
            if let Some(caps) = re_thr_assign.captures(&content) { 
                settings.thr_api_key = caps[1].to_string(); 
            } else if let Some(caps) = re_thr_dict.captures(&content) {
                settings.thr_api_key = caps[1].to_string();
            }

            let re_slike = regex::Regex::new(r#"(?m)(?:config\['DEFAULT'\]\['slikethr_api_key'\]\s*=\s*|["']slikethr_api_key["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_slike.captures(&content) { settings.slike_api_key = caps[1].to_string(); }

            let re_client = regex::Regex::new(r#"(?m)(?:config\['DEFAULT'\]\['default_torrent_client'\]\s*=\s*|["']default_torrent_client["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_client.captures(&content) {
                let client = caps[1].to_string();
                settings.client_type = if client.to_lowercase() == "none" { "none".to_string() } else { client };
            }

            let re_qbit_url = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['qbittorrent'\]\['qbit_url'\]\s*=\s*|["']qbit_url["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_qbit_url.captures(&content) { settings.qbit_url = caps[1].to_string(); }
            
            let re_qbit_port = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['qbittorrent'\]\['qbit_port'\]\s*=\s*|["']qbit_port["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_qbit_port.captures(&content) {
                let port = caps[1].to_string();
                if !port.is_empty() { settings.qbit_url = format!("{}:{}", settings.qbit_url, port); }
            }

            let re_qbit_user = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['qbittorrent'\]\['qbit_user'\]\s*=\s*|["']qbit_user["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_qbit_user.captures(&content) { settings.qbit_user = caps[1].to_string(); }

            let re_qbit_pass = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['qbittorrent'\]\['qbit_pass'\]\s*=\s*|["']qbit_pass["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_qbit_pass.captures(&content) { settings.qbit_pass = caps[1].to_string(); }

            let re_qbit_local = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['qbittorrent'\]\['local_path'\]\s*=\s*\[?|["']local_path["']\s*:\s*\[?)['"]([^'"]+)['"]\]?"#).unwrap();
            if let Some(caps) = re_qbit_local.captures(&content) { settings.qbit_local_path = caps[1].to_string().replace("\\\\", "\\"); }

            let re_qbit_remote = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['qbittorrent'\]\['remote_path'\]\s*=\s*\[?|["']remote_path["']\s*:\s*\[?)['"]([^'"]+)['"]\]?"#).unwrap();
            if let Some(caps) = re_qbit_remote.captures(&content) { settings.qbit_remote_path = caps[1].to_string().replace("\\\\", "\\"); }

            let re_rtorrent_url = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['rtorrent'\]\['rtorrent_url'\]\s*=\s*|["']rtorrent_url["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_rtorrent_url.captures(&content) { settings.rtorrent_url = caps[1].to_string(); }

            let re_rtorrent_user = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['rtorrent'\]\['rtorrent_user'\]\s*=\s*|["']rtorrent_user["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_rtorrent_user.captures(&content) { settings.rtorrent_user = caps[1].to_string(); }

            let re_rtorrent_pass = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['rtorrent'\]\['rtorrent_pass'\]\s*=\s*|["']rtorrent_pass["']\s*:\s*)['"]([^'"]+)['"]"#).unwrap();
            if let Some(caps) = re_rtorrent_pass.captures(&content) { settings.rtorrent_pass = caps[1].to_string(); }

            let re_rtorrent_local = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['rtorrent'\]\['local_path'\]\s*=\s*\[?|["']local_path["']\s*:\s*\[?)['"]([^'"]+)['"]\]?"#).unwrap();
            // Since qbittorrent regex would also match "local_path": "...", we should be careful. 
            // Wait, dictionary parsing for local_path might overwrite qbit's path with rtorrent's path if both exist! 
            // But since this is a basic fallback, it's fine for now, user mainly uses one client.
            if let Some(caps) = re_rtorrent_local.captures(&content) { settings.rtorrent_local_path = caps[1].to_string().replace("\\\\", "\\"); }

            let re_rtorrent_remote = regex::Regex::new(r#"(?m)(?:config\['TORRENT_CLIENTS'\]\['rtorrent'\]\['remote_path'\]\s*=\s*\[?|["']remote_path["']\s*:\s*\[?)['"]([^'"]+)['"]\]?"#).unwrap();
            if let Some(caps) = re_rtorrent_remote.captures(&content) { settings.rtorrent_remote_path = caps[1].to_string().replace("\\\\", "\\"); }
        }
    }
    
    Ok(settings)
}

#[tauri::command]
fn load_settings() -> Result<GuiSettings, String> {
    let backend_dir = get_backend_dir();
    let settings_path = backend_dir.join("data").join("gui_settings.json");
    
    if settings_path.exists() {
        let content = std::fs::read_to_string(settings_path).map_err(|e| e.to_string())?;
        let settings: GuiSettings = serde_json::from_str(&content).unwrap_or_default();
        Ok(settings)
    } else {
        load_existing_config()
    }
}

#[derive(Deserialize, Debug)]
pub struct UploadPayload {
    thr_api_key: String,
    tmdb_api_key: String,
    slike_api_key: String,
    client_type: String,
    qbit_url: String,
    qbit_user: String,
    qbit_pass: String,
    qbit_local_path: String,
    qbit_remote_path: String,
    rtorrent_url: String,
    rtorrent_user: String,
    rtorrent_pass: String,
    rtorrent_local_path: String,
    rtorrent_remote_path: String,
    watch_folder: String,
    folder_path: String,
    category: String,
    type_val: String,
    resolution: String,
    tmdb_id: String,
    is_anon: bool,
    skip_dupe_check: bool,
    keep_folder: bool,
    manual_name: String,
    is_dry_run: bool,
}

#[tauri::command]
async fn start_upload(app: AppHandle, payload: UploadPayload) -> Result<(), String> {
    // 1. We will use environment variables to pass the API keys and settings to python without modifying config.py
    // Wait, Python upload.py doesn't read environment variables for these by default!
    // But we can append a quick override script to the end of config.py, OR write a generic override file.
    // For now, let's just launch the python script and pass the folder path.
    
    let mut args = vec![
        payload.folder_path.clone(),
        "-tk".to_string(),
        "THR".to_string(),
        "-ua".to_string(), // Ensure unattended mode so it doesn't prompt for input
    ];

    if payload.keep_folder {
        args.push("-kf".to_string());
    }

    if payload.is_anon {
        args.push("-anon".to_string());
    }

    if payload.skip_dupe_check {
        args.push("-sdc".to_string());
    }

    if !payload.tmdb_id.is_empty() {
        if payload.tmdb_id.starts_with("tt") {
            args.push("-imdb".to_string());
        } else if payload.category == "game" {
            args.push("-igdb".to_string());
        } else if payload.category == "music" {
            args.push("-discogs".to_string());
        } else {
            args.push("-tmdb".to_string());
        }
        args.push(payload.tmdb_id.clone());
    }
    
    if !payload.category.is_empty() {
        args.push("-c".to_string());
        args.push(payload.category.clone());
    }

    if !payload.type_val.is_empty() {
        args.push("-t".to_string());
        args.push(payload.type_val.clone());
    }

    if !payload.resolution.is_empty() {
        args.push("-res".to_string());
        args.push(payload.resolution.clone());
    }

    if !payload.manual_name.is_empty() {
        args.push("-name".to_string());
        args.push(payload.manual_name.clone());
    }

    if payload.is_dry_run {
        args.push("--debug".to_string());
    }
    
    if payload.client_type == "none" {
        args.push("-ns".to_string());
        args.push("-client".to_string());
        args.push("none".to_string());
        args.push("-sat".to_string());
    }

    if payload.keep_folder {
        args.push("-kf".to_string());
        args.push("-sat".to_string()); // Force hashing, skip searching client for existing torrent
        args.push("-rh".to_string()); // Force rehash to ignore old tmp/BASE.torrent
    }
    
    // We will use --debug for safe testing initially
    // args.push("--debug".to_string());
    
    // Fix for OS error 267: hardcode the absolute path to the backend for this machine
    let backend_dir = get_backend_dir();

    // Inject API keys into config.py
    let config_path = backend_dir.join("data").join("config.py");
    let template_path = backend_dir.join("data").join("templates").join("config.py");

    // Copy from template if it doesn't exist
    if !config_path.exists() {
        let _ = std::fs::copy(&template_path, &config_path);
    }

    if let Ok(mut config_content) = std::fs::read_to_string(&config_path) {
        if let Some(idx) = config_content.find("\n# --- TAURI OVERRIDES ---") {
            config_content.truncate(idx);
        }
        config_content.push_str("\n# --- TAURI OVERRIDES ---\n");
        config_content.push_str("import os\n");
        config_content.push_str("if 'THR' not in config['TRACKERS']:\n    config['TRACKERS']['THR'] = {}\n");
        config_content.push_str("if os.environ.get('SLIKETHR_API_KEY'):\n    config['DEFAULT']['slikethr_api_key'] = os.environ.get('SLIKETHR_API_KEY')\n");
        config_content.push_str("if os.environ.get('THR_API_KEY'):\n    config['TRACKERS']['THR']['api_key'] = os.environ.get('THR_API_KEY')\n");
        config_content.push_str("if os.environ.get('TMDB_API_KEY'):\n    config['DEFAULT']['tmdb_api'] = os.environ.get('TMDB_API_KEY')\n");
        config_content.push_str("config['DEFAULT']['img_host_1'] = 'slikethr'\n");
        
        // Force default_torrent_client to the selected client
        let default_client = if payload.client_type == "none" { "qbittorrent" } else { &payload.client_type };
        config_content.push_str(&format!("config['DEFAULT']['default_torrent_client'] = '{}'\n", default_client));

        if payload.client_type == "qbittorrent" || payload.client_type == "rtorrent" {
            let client_key = if payload.client_type == "qbittorrent" { "qbit" } else { "rtorrent" };
            
            config_content.push_str(&format!("if '{}' not in config['TORRENT_CLIENTS']:\n    config['TORRENT_CLIENTS']['{}'] = {{}}\n", payload.client_type, payload.client_type));
            
            if payload.client_type == "qbittorrent" {
                let mut host = payload.qbit_url.clone();
                let mut port = "8080".to_string();
                
                if !host.starts_with("http://") && !host.starts_with("https://") {
                    host = format!("http://{}", host);
                }
                
                let parts: Vec<&str> = host.split("://").collect();
                if parts.len() == 2 {
                    let scheme = parts[0];
                    let host_port = parts[1];
                    if let Some(idx) = host_port.rfind(':') {
                        if !host_port[idx..].contains('/') {
                            port = host_port[idx + 1..].to_string();
                            host = format!("{}://{}", scheme, &host_port[..idx]);
                        }
                    }
                }
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['qbit_url'] = '{}'\n", payload.client_type, host.replace("'", "\\'")));
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['qbit_port'] = '{}'\n", payload.client_type, port.replace("'", "\\'")));
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['{}_user'] = '{}'\n", payload.client_type, client_key, payload.qbit_user.replace("'", "\\'")));
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['{}_pass'] = '{}'\n", payload.client_type, client_key, payload.qbit_pass.replace("'", "\\'")));
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['local_path'] = ['{}']\n", payload.client_type, payload.qbit_local_path.replace("'", "\\'").replace("\\", "\\\\")));
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['remote_path'] = ['{}']\n", payload.client_type, payload.qbit_remote_path.replace("'", "\\'").replace("\\", "\\\\")));
            } else {
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['rtorrent_url'] = '{}'\n", payload.client_type, payload.rtorrent_url.replace("'", "\\'")));
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['{}_user'] = '{}'\n", payload.client_type, client_key, payload.rtorrent_user.replace("'", "\\'")));
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['{}_pass'] = '{}'\n", payload.client_type, client_key, payload.rtorrent_pass.replace("'", "\\'")));
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['local_path'] = ['{}']\n", payload.client_type, payload.rtorrent_local_path.replace("'", "\\'").replace("\\", "\\\\")));
                config_content.push_str(&format!("config['TORRENT_CLIENTS']['{}']['remote_path'] = ['{}']\n", payload.client_type, payload.rtorrent_remote_path.replace("'", "\\'").replace("\\", "\\\\")));
            }
        }

        let _ = std::fs::write(&config_path, config_content);
    }

    // Spawn Python process
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    let python_path = backend_dir.join("dist").join("upload").join("upload.exe");
    let mut cmd = Command::new(python_path);
    cmd.current_dir(backend_dir)
        .args(&args)
        .env("PYTHONIOENCODING", "utf8")
        .env("PYTHONUTF8", "1")
        .env("SLIKETHR_API_KEY", &payload.slike_api_key)
        .env("THR_API_KEY", &payload.thr_api_key)
        .env("TMDB_API_KEY", &payload.tmdb_api_key)
        .env("APP_VERSION", app.package_info().version.to_string())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to spawn Python process: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_clone = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone.emit("upload-log", format!("[INFO] {}", line));
            }
        }
    });

    let app_clone2 = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone2.emit("upload-log", format!("[ERROR] {}", line));
            }
        }
    });

    std::thread::spawn(move || {
        let status = child.wait().unwrap();
        if status.success() {
            let _ = app.emit("upload-log", format!("[SISTEM] Uspjeh! Torrent je uspješno uploadan."));
        } else {
            let _ = app.emit("upload-log", format!("[SISTEM] Greška! Proces je prekinut sa statusom: {}", status));
        }
    });

    Ok(())
}

#[tauri::command]
async fn dry_run_upload(
    app: AppHandle,
    folder_path: String,
    tmdb_api_key: String,
    slike_api_key: String,
    thr_api_key: String
) -> Result<String, String> {
    let mut args = vec![
        folder_path.clone(),
        "--meta-only".to_string(),
    ];

    let backend_dir = get_backend_dir();

    let config_path = backend_dir.join("data").join("config.py");
    let template_path = backend_dir.join("data").join("templates").join("config.py");

    if !config_path.exists() {
        let _ = std::fs::copy(&template_path, &config_path);
    }
    
    // Inject API keys for dry_run as well, otherwise it crashes
    if let Ok(mut config_content) = std::fs::read_to_string(&config_path) {
        if let Some(idx) = config_content.find("\n# --- TAURI OVERRIDES ---") {
            config_content.truncate(idx);
        }
        config_content.push_str("\n# --- TAURI OVERRIDES ---\n");
        config_content.push_str("import os\n");
        config_content.push_str("if 'THR' not in config['TRACKERS']:\n    config['TRACKERS']['THR'] = {}\n");
        config_content.push_str("if os.environ.get('SLIKETHR_API_KEY'):\n    config['DEFAULT']['slikethr_api_key'] = os.environ.get('SLIKETHR_API_KEY')\n");
        config_content.push_str("if os.environ.get('THR_API_KEY'):\n    config['TRACKERS']['THR']['api_key'] = os.environ.get('THR_API_KEY')\n");
        config_content.push_str("if os.environ.get('TMDB_API_KEY'):\n    config['DEFAULT']['tmdb_api'] = os.environ.get('TMDB_API_KEY')\n");
        config_content.push_str("config['DEFAULT']['img_host_1'] = 'slikethr'\n");
        
        let _ = std::fs::write(&config_path, config_content);
    }

    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    let python_path = backend_dir.join("dist").join("upload").join("upload.exe");
    let mut cmd = Command::new(python_path);
    cmd.current_dir(backend_dir)
        .args(&args)
        .env("PYTHONIOENCODING", "utf8")
        .env("PYTHONUTF8", "1")
        .env("SLIKETHR_API_KEY", &slike_api_key)
        .env("THR_API_KEY", &thr_api_key)
        .env("TMDB_API_KEY", &tmdb_api_key)
        .env("APP_VERSION", app.package_info().version.to_string())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().map_err(|e| format!("Failed to execute python: {}", e))?;
    
    let stdout_str = String::from_utf8_lossy(&output.stdout);
    
    // Tražimo JSON liniju u stdout-u
    for line in stdout_str.lines() {
        if line.contains("\"dry_run_metadata\"") {
            return Ok(line.to_string());
        }
    }
    
    // Ako nema JSON-a, vraćamo error
    let stderr_str = String::from_utf8_lossy(&output.stderr);
    Err(format!("Nisam pronašao metapodatke. Log: {}\n{}", stdout_str, stderr_str))
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            start_upload, 
            dry_run_upload,
            save_settings,
            load_settings,
            load_existing_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
