# Galaxy Flight Duration Patcher for OGame Ninja

Adapts the [Galaxy Flight Duration](https://openuserjs.org/scripts/LukaNebo/Galaxy_Flight_Duration) userscript (by LukaNebo) to work with [OGame Ninja](https://github.com/ogame-ninja)

## Overview

This patcher automatically downloads the official Galaxy Flight Duration userscript and applies 8 patches to make it compatible with OGame Ninja's architecture. The script displays flight duration inside the Galaxy view.

### Why a Patcher?

The original script partially supports OGame Ninja (has `@match` patterns for Ninja URLs) but the internal code still depends on OGame official structures:
- Reads language from `oglocale` cookie (doesn't exist in Ninja)
- Uses hardcoded `/game/index.php` paths (Ninja uses different paths)
- API URLs point to `https://s261-en.ogame.gameforge.com/api/...` (Ninja proxies through its own host)
- localStorage keys are global (conflicts in multi-account scenarios)

---

## Features

### Patcher (Python v1.0)
```python
#!/usr/bin/env python3
"""
Galaxy Flight Duration Patcher - Adapts GFD for OGame Ninja
Version: 1.0 - For GFD 1.5.2
"""

# Self-contained, standalone implementation
# Downloads, validates SHA256, applies 8 patches, generates output
```

---

## The 8 Patches

All patches handle differences between OGame Official and OGame Ninja environments:

| # | Patch | Description |
|---|-------|-------------|
| 1 | Script Name | Renamed to "Galaxy Flight Duration Ninja (CellMaster's Patcher)" |
| 2 | @match URL | Universal pattern for Ninja URL structure |
| 3 | Auto-update | Removed @updateURL/@downloadURL (prevents overwriting) |
| 4 | Environment Vars | Injected UNIVERSE, PROTOCOL, HOST, PLAYER_ID with error handling |
| 5 | serverData.xml URL | Dynamic API URL with `/api/sXXX/lang/` format |
| 6 | Language Source | Cookie `oglocale` → extracted from URL |
| 7 | checkTarget URL | `/game/index.php` → `window.location.pathname` |
| 8 | localStorage Keys | Prefixed with UNIVERSE/PLAYER_ID for multi-account isolation |

### Patch Details

#### Patch 1: Script Rename
```javascript
// Before
@name         Galaxy Flight Duration

// After
@name         Galaxy Flight Duration Ninja (CellMaster's Patcher)
```

#### Patch 2: Universal @match Pattern
```javascript
// Before (3 patterns - official + partial Ninja)
// @match        https://*.ogame.gameforge.com/game/*
// @match        *127.0.0.1*/bots/*/browser/html/*?page=*
// @match        *.ogame.ninja/bots/*/browser/html/*?page=*

// After (1 universal pattern - covers all Ninja instances)
// @match        *://*/bots/*/browser/html/*?page=*
```

#### Patch 3: Remove Auto-Update
```javascript
// Removed (prevents overwriting patched version)
// @updateURL    https://openuserjs.org/meta/LukaNebo/galaxy_flight_duration.meta.js
// @downloadURL  https://openuserjs.org/install/LukaNebo/galaxy_flight_duration.user.js
```

#### Patch 4: Environment Variables Injection (with Error Handling)
```javascript
// Injected after ==/UserScript==
const urlMatch = /browser\/html\/s(\d+)-(\w+)/.exec(window.location.href);
if(!urlMatch) {
    console.error('[GFD Ninja] Invalid URL - expected format: browser/html/sXXX-xx');
    throw new Error('Invalid OGame Ninja URL format');
}
const universeNum = urlMatch[1];
const langNinja = urlMatch[2];
const UNIVERSE = "s" + universeNum + "-" + langNinja;
const PROTOCOL = window.location.protocol;
const HOST = window.location.host;
const PLAYER_ID = document.querySelector("meta[name=ogame-player-id]").content;
```

#### Patch 5: serverData.xml API URL
```javascript
// Before (uses meta tag ogame-universe which returns "s261-en.ogame.gameforge.com")
let serverId = document.querySelector("meta[name=ogame-universe]").content;
url: "https://" + serverId + "/api/serverData.xml",

// After (uses Ninja proxy path)
url: PROTOCOL + "//" + HOST + "/api/s" + universeNum + "/" + langNinja + "/serverData.xml",
```

#### Patch 6: Language Detection
```javascript
// Before (cookie doesn't exist in Ninja)
const cookieMatch = document.cookie.match(/oglocale=([^;]+)/);
let lang = cookieMatch ? cookieMatch[1] : "en";

// After (extracted from URL in Patch 4)
let lang = langNinja;
```

#### Patch 7: checkTarget Fetch URL
```javascript
// Before (hardcoded OGame path)
const response = await fetch("/game/index.php?page=ingame&component=fleetdispatch&action=checkTarget&ajax=1&asJson=1", {

// After (dynamic Ninja path)
const response = await fetch(window.location.pathname + "?page=ingame&component=fleetdispatch&action=checkTarget&ajax=1&asJson=1", {
```

#### Patch 8: Full localStorage Isolation
```javascript
// Before (global keys - conflicts in multi-account)
const SERVER_DATA_LOCAL_STORAGE_KEY = "GFD_serverData";
const PLAYER_INFO_LOCAL_STORAGE_KEY = "GFD_playerInfo";
const PLAYER_SETTINGS_LOCAL_STORAGE_KEY = "GFD_playerSettings";

// After (prefixed - isolated per universe/account)
const SERVER_DATA_LOCAL_STORAGE_KEY = UNIVERSE + "-GFD_serverData";
const PLAYER_INFO_LOCAL_STORAGE_KEY = UNIVERSE + "-" + PLAYER_ID + "-GFD_playerInfo";
const PLAYER_SETTINGS_LOCAL_STORAGE_KEY = UNIVERSE + "-" + PLAYER_ID + "-GFD_playerSettings";
```

**Isolation strategy:**

| Key | Prefix | Why |
|-----|--------|-----|
| `GFD_serverData` | `UNIVERSE` | Server data is the same for all accounts in a universe |
| `GFD_playerInfo` | `UNIVERSE + PLAYER_ID` | Ship speeds are individual per account |
| `GFD_playerSettings` | `UNIVERSE + PLAYER_ID` | UI preferences are individual per account |

---

## OGame Ninja vs Official Architecture

| Item | OGame Official | OGame Ninja |
|------|--------------|-------------|
| **URL** | `s123-pt.ogame.gameforge.com/game/index.php` | `127.0.0.1/bots/bot1/browser/html/s123-pt` |
| **API** | `https://s123-pt.ogame.gameforge.com/api/serverData.xml` | `{host}/api/s123/pt/serverData.xml` |
| **Language** | Cookie `oglocale=pt` | Extracted from URL `/s123-pt` |
| **Player ID** | Cookie `prsess_123456` | Meta tag `ogame-player-id` |
| **Game Path** | `/game/index.php?page=...` | `{pathname}?page=...` |

---

## Installation & Usage

### Requirements
```bash
pip install requests
```

### Running the Patcher
```bash
python patcher.py
```

### Expected Output
```
============================================================
Galaxy Flight Duration Patcher - OGame Ninja Edition v1.0
Supported GFD version: 1.5.2 (8 patches)
============================================================

[*] Downloading file from: https://openuserjs.org/src/scripts/LukaNebo/Galaxy_Flight_Duration.user.js
[+] Download completed!
[*] Expected SHA256: e373eb538e200432fc31243a844d8df646f4d0d7f02aaf67af22f70ee12f1030
[*] Current SHA256:  e373eb538e200432fc31243a844d8df646f4d0d7f02aaf67af22f70ee12f1030
[+] SHA256 validated successfully!

[*] Applying patches...
  [+] Patch 1/8: Script name changed
  [+] Patch 2/8: @match replaced with universal Ninja pattern
  [+] Patch 3/8: Auto-update URLs removed
  [+] Patch 4/8: Environment variables injected (with error handling)
  [+] Patch 5/8: serverData.xml URL fixed for Ninja
  [+] Patch 6/8: Language detection fixed (URL instead of cookie)
  [+] Patch 7/8: checkTarget URL fixed for Ninja
  [+] Patch 8/8: localStorage keys prefixed for multi-account isolation
    - GFD_serverData: UNIVERSE prefix (shared per universe)
    - GFD_playerInfo: UNIVERSE+PLAYER_ID prefix (per account)
    - GFD_playerSettings: UNIVERSE+PLAYER_ID prefix (per account)
[+] All 8 patches applied successfully!

[*] Saving file: GFD_Ninja.user.js
[+] File saved successfully!

============================================================
Process completed successfully!
Generated file: GFD_Ninja.user.js
============================================================
```

### Installing the Generated Script
1. Open OGame Ninja browser
2. Install Tampermonkey extension
3. Click "Create new script"
4. Paste contents of `GFD_Ninja.user.js`
5. Save and refresh OGame Ninja page

---

## Contributing

If Galaxy Flight Duration updates require new patches:

1. Update `EXPECTED_SHA256` to new file hash
2. Add new replacement logic to `apply_patches()`
3. Increment patch counter in print statements
4. Test thoroughly before committing

---

## Version History

### v1.0 (Current)
- Initial release with 8 patches
- Supports Galaxy Flight Duration 1.5.2

---

## Credits

- **Original Script**: [LukaNebo](https://openuserjs.org/users/LukaNebo) - Galaxy Flight Duration
- **Patcher**: CellMaster
- **OGame Ninja**: [ogame-ninja](https://github.com/ogame-ninja)

---

## Links

- [Galaxy Flight Duration (OpenUserJS)](https://openuserjs.org/scripts/LukaNebo/Galaxy_Flight_Duration)
- [OGame Ninja](https://github.com/ogame-ninja)
