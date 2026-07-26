from PIL import Image
import os
import sys

webp_path = r"C:\Users\STRiT\Desktop\thr-core-header-logo.webp"
icons_dir = r"C:\Users\STRiT\Desktop\THRuploader\frontend\src-tauri\icons"

if not os.path.exists(webp_path):
    print(f"Error: Could not find {webp_path}")
    sys.exit(1)

print(f"Opening {webp_path}...")
img = Image.open(webp_path).convert("RGBA")
w, h = img.size
max_dim = max(w, h)

# Add some padding (10%) so it's not touching the edges
pad = int(max_dim * 0.1)
new_dim = max_dim + pad * 2

square = Image.new("RGBA", (new_dim, new_dim), (0, 0, 0, 0))
# center it
square.paste(img, ((new_dim - w) // 2, (new_dim - h) // 2))

# Save all required sizes
sizes = {
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "32x32.png": 32,
    "Square107x107Logo.png": 107,
    "Square142x142Logo.png": 142,
    "Square150x150Logo.png": 150,
    "Square284x284Logo.png": 284,
    "Square30x30Logo.png": 30,
    "Square310x310Logo.png": 310,
    "Square44x44Logo.png": 44,
    "Square71x71Logo.png": 71,
    "Square89x89Logo.png": 89,
    "StoreLogo.png": 50,
    "icon.png": 512
}

print("Generating PNG icons...")
for name, size in sizes.items():
    resized = square.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(os.path.join(icons_dir, name))

print("Generating ICO file...")
# Save ICO
ico_img = square.resize((256, 256), Image.Resampling.LANCZOS)
ico_img.save(os.path.join(icons_dir, "icon.ico"), format="ICO", sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])

print("All icons generated successfully!")
