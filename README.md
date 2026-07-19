# Mirage — location-based AR PWA starter

A digital layer over the real world. Animated 3D artifacts (portals, crystals,
beacons, or your own glTF models) are anchored to GPS coordinates. Travelers
open a link — no app store — and see them through their phone camera or a
WebXR headset/glasses.

## How it works

- `world.json` — your world database. Every anchor = one 3D animation at a real lat/lng.
- `js/geo.js` — GPS tracking and lat/lng → scene-meters math.
- `js/assets.js` — the 3D objects (three.js). Add new types here.
- `js/main.js` — mode detection + placement + HUD.
- `js/mode-camera.js` — iPhone-friendly fallback (camera feed + motion sensors).
- `sw.js` + `manifest.webmanifest` — makes it an installable, offline-capable PWA.

Two entry modes, detected automatically:

| Device | Mode | Quality |
|---|---|---|
| Quest, Vision Pro, Galaxy XR, Xreal | WebXR immersive-ar | True world tracking (showroom demo — headsets have no GPS) |
| Android Chrome | Camera fallback (WebXR upgrade possible later) | GPS + compass placement |
| iPhone Safari | Camera fallback | GPS + compass placement |

## Deploy in ~5 minutes

1. **Push to GitHub.** In VS Code: open this folder, then in the terminal:
   ```bash
   git init
   git add .
   git commit -m "Mirage v0"
   ```
   Create a new repo on github.com, then follow its "push an existing
   repository" commands.

2. **Import to Vercel.** On vercel.com → Add New → Project → import your repo.
   Framework preset: **Other**. No build command, no output directory — it's a
   static site. Click Deploy.

3. **Open the URL on your phone.** Vercel serves HTTPS automatically, which is
   required for camera + GPS access. Tap "Enter with phone camera", allow
   motion, camera, and location permissions.

Every `git push` after this auto-deploys. That's your whole pipeline.

## Testing tips

- **First run anywhere:** if no anchor is within 500 m, the app auto-places a
  "Welcome portal" 20 m north of you so you always see something. Walk toward
  it.
- **Add an anchor at your home:** long-press your location in Google Maps to
  copy lat/lng, add an entry to `world.json`, push, refresh.
- **GPS accuracy is 5–20 m outdoors** and worse indoors. Test outside. Objects
  will drift — that's the known limit of GPS-only web AR; design large,
  dramatic assets (this is why the starter ships portals and beacons, not
  teacups).
- **Compass:** on iPhone, calibrate by waving the phone in a figure-8 if
  headings look wrong. Some Android browsers give non-absolute headings —
  objects stay world-stable but north may be offset.
- **Headset test:** open the same URL in the Quest Browser / Vision Pro Safari
  and the "glasses / headset" button activates.

## Adding your own 3D animations

Export from Blender as `.glb` (with animation baked in), put the file in this
repo (or any CDN), then add to `world.json`:

```json
{
  "id": "my-dragon",
  "name": "River dragon",
  "type": "model",
  "url": "/models/dragon.glb",
  "scale": 2,
  "lat": 13.7437,
  "lng": 100.4889
}
```

Keep models under ~5 MB (use Draco/Meshopt compression — `gltf-transform
optimize in.glb out.glb` does this in one command) so travelers on roaming
data aren't stuck loading.

## Growth path (when you outgrow the starter)

1. **Real backend:** replace `world.json` with an API + database. Index anchors
   with geohash or H3 so "what's near me?" stays fast at worldwide scale. Only
   `js/registry.js` needs to change.
2. **Creator tools:** a map page where users drop assets onto the world — this
   becomes your "digital asset meets real asset" marketplace.
3. **Precision upgrade:** swap the camera fallback for 8th Wall (VPS +
   SLAM) when revenue justifies $700/project/month. `assets.js`,
   `world.json`, and your backend all carry over unchanged.
4. **Ownership layer:** add accounts and an `owner` field on anchors; later,
   trading/economy mechanics if that's your model.
