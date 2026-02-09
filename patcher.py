# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""
Galaxy Flight Duration Patcher - Adapts GFD for OGame Ninja
=============================================================

Version: 1.0
Author: CellMaster
License: MIT
Source GFD: https://openuserjs.org/scripts/LukaNebo/galaxy_flight_duration

Description:
    This script downloads the official Galaxy Flight Duration userscript and
    applies patches to make it fully compatible with OGame Ninja environment.
    The patches handle differences in URL structure, API endpoints, cookie
    absence, and localStorage isolation for multi-account support.

Supported GFD Version: 1.5.2

Usage:
    python patcher.py

Output:
    GFD_Ninja.user.js - Ready to install in Tampermonkey/Greasemonkey

Patches Applied (8 total):
    1.  Script name changed to "Galaxy Flight Duration Ninja"
    2.  @match pattern updated for Ninja URL structure
    3.  Auto-update URLs removed (prevents overwriting)
    4.  Environment variables injected with error handling (UNIVERSE, PLAYER_ID, etc.)
    5.  serverData.xml API URL fixed for Ninja proxy routing
    6.  Language detection fixed (URL extraction instead of cookie)
    7.  checkTarget fetch URL fixed for Ninja path structure
    8.  localStorage keys prefixed for multi-account isolation
        - GFD_serverData: prefixed with UNIVERSE (shared per universe)
        - GFD_playerInfo: prefixed with UNIVERSE+PLAYER_ID (per account)
        - GFD_playerSettings: prefixed with UNIVERSE+PLAYER_ID (per account)

CHANGELOG:
----------
v1.0 - Initial release with 8 patches
"""

import hashlib
import os
import sys
import requests

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WEBSTORE_URL = "https://openuserjs.org/src/scripts/LukaNebo/Galaxy_Flight_Duration.user.js"
EXPECTED_SHA256 = "e373eb538e200432fc31243a844d8df646f4d0d7f02aaf67af22f70ee12f1030"
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "GFD_Ninja.user.js")

def download_file(url):
    """Downloads the file from URL"""
    print(f"[*] Downloading file from: {url}")
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        print("[+] Download completed!")
        return response.content
    except requests.exceptions.RequestException as e:
        print(f"[!] Error downloading file: {e}")
        sys.exit(1)

def validate_sha256(content, expected_sha):
    """Validates the file's SHA256"""
    actual_sha = hashlib.sha256(content).hexdigest()
    print(f"[*] Expected SHA256: {expected_sha}")
    print(f"[*] Current SHA256:  {actual_sha}")

    if actual_sha != expected_sha:
        print("[!] SHA256 mismatch! The file has been modified or there's a new version.")
        print("[!] Update EXPECTED_SHA256 if the change is intentional.")
        sys.exit(1)

    print("[+] SHA256 validated successfully!")

def apply_patches(content):
    """Applies all patches to the content"""
    print("\n[*] Applying patches...")

    # Convert bytes to string and normalize line endings to LF
    text = content.decode('utf-8').replace('\r\n', '\n')

    # Patch 1: Rename script
    text = text.replace(
        '@name         Galaxy Flight Duration',
        "@name         Galaxy Flight Duration Ninja (CellMaster's Patcher)",
        1
    )
    print("  [+] Patch 1/8: Script name changed")

    # Patch 2: Replace @match with universal Ninja pattern
    text = text.replace(
        '// @match        https://*.ogame.gameforge.com/game/*\n',
        '// @match        *://*/bots/*/browser/html/*?page=*\n',
        1
    )
    # Also remove extra Ninja @match lines if present (some versions include them)
    text = text.replace('// @match        *127.0.0.1*/bots/*/browser/html/*?page=*\n', '')
    text = text.replace('// @match        *.ogame.ninja/bots/*/browser/html/*?page=*\n', '')
    print("  [+] Patch 2/8: @match replaced with universal Ninja pattern")

    # Patch 3: Remove auto-update URLs (prevents overwriting patched version)
    text = text.replace(
        '// @updateURL    https://openuserjs.org/meta/LukaNebo/galaxy_flight_duration.meta.js\n',
        '',
        1
    )
    text = text.replace(
        '// @downloadURL  https://openuserjs.org/install/LukaNebo/galaxy_flight_duration.user.js\n',
        '',
        1
    )
    print("  [+] Patch 3/8: Auto-update URLs removed")

    # Patch 4: Inject environment variables with error handling
    userscript_injection = r'''// ==/UserScript==

	const urlMatch = /browser\/html\/s(\d+)-(\w+)/.exec(window.location.href);
	if(!urlMatch) { console.error('[GFD Ninja] Invalid URL - expected format: browser/html/sXXX-xx'); throw new Error('Invalid OGame Ninja URL format'); }
	const universeNum = urlMatch[1];
	const langNinja = urlMatch[2];
	const UNIVERSE = "s" + universeNum + "-" + langNinja;
	const PROTOCOL = window.location.protocol;
	const HOST = window.location.host;
	const PLAYER_ID = document.querySelector("meta[name=ogame-player-id]").content;
'''
    text = text.replace('// ==/UserScript==', userscript_injection, 1)
    print("  [+] Patch 4/8: Environment variables injected (with error handling)")

    # Patch 5: Fix serverData.xml API URL for Ninja proxy routing
    text = text.replace(
        'url: "https://" + serverId + "/api/serverData.xml",',
        'url: PROTOCOL + "//" + HOST + "/api/s" + universeNum + "/" + langNinja + "/serverData.xml",',
        1
    )
    print("  [+] Patch 5/8: serverData.xml URL fixed for Ninja")

    # Patch 6: Fix language detection (cookie doesn't exist in Ninja)
    text = text.replace(
        "const cookieMatch = document.cookie.match(/oglocale=([^;]+)/);\n"
        '    let lang = cookieMatch ? cookieMatch[1] : "en";',
        'let lang = langNinja;',
        1
    )
    print("  [+] Patch 6/8: Language detection fixed (URL instead of cookie)")

    # Patch 7: Fix checkTarget fetch URL for Ninja path structure
    text = text.replace(
        '"/game/index.php?page=ingame&component=fleetdispatch&action=checkTarget&ajax=1&asJson=1"',
        'window.location.pathname + "?page=ingame&component=fleetdispatch&action=checkTarget&ajax=1&asJson=1"',
        1
    )
    print("  [+] Patch 7/8: checkTarget URL fixed for Ninja")

    # Patch 8: Prefix localStorage keys for multi-account isolation
    # 8a: GFD_serverData - shared per universe (server data is the same for all accounts)
    text = text.replace(
        'const SERVER_DATA_LOCAL_STORAGE_KEY = "GFD_serverData";',
        'const SERVER_DATA_LOCAL_STORAGE_KEY = UNIVERSE + "-GFD_serverData";',
        1
    )
    # 8b: GFD_playerInfo - per account (ship speeds are individual)
    text = text.replace(
        'const PLAYER_INFO_LOCAL_STORAGE_KEY = "GFD_playerInfo";',
        'const PLAYER_INFO_LOCAL_STORAGE_KEY = UNIVERSE + "-" + PLAYER_ID + "-GFD_playerInfo";',
        1
    )
    # 8c: GFD_playerSettings - per account (UI preferences are individual)
    text = text.replace(
        'const PLAYER_SETTINGS_LOCAL_STORAGE_KEY = "GFD_playerSettings";',
        'const PLAYER_SETTINGS_LOCAL_STORAGE_KEY = UNIVERSE + "-" + PLAYER_ID + "-GFD_playerSettings";',
        1
    )
    print("  [+] Patch 8/8: localStorage keys prefixed for multi-account isolation")
    print("    - GFD_serverData: UNIVERSE prefix (shared per universe)")
    print("    - GFD_playerInfo: UNIVERSE+PLAYER_ID prefix (per account)")
    print("    - GFD_playerSettings: UNIVERSE+PLAYER_ID prefix (per account)")

    print("[+] All 8 patches applied successfully!\n")

    return text.encode('utf-8')

def save_file(content, filename):
    """Saves the patched file"""
    print(f"[*] Saving file: {filename}")
    try:
        with open(filename, 'wb') as f:
            f.write(content)
        print(f"[+] File saved successfully!")
    except Exception as e:
        print(f"[!] Error saving file: {e}")
        sys.exit(1)

def main():
    print("=" * 60)
    print("Galaxy Flight Duration Patcher - OGame Ninja Edition v1.0")
    print("Supported GFD version: 1.5.2 (8 patches)")
    print("=" * 60)
    print()

    # 1. Download file
    content = download_file(WEBSTORE_URL)

    # 2. Validate SHA256
    validate_sha256(content, EXPECTED_SHA256)

    # 3. Apply patches
    patched_content = apply_patches(content)

    # 4. Save file
    save_file(patched_content, OUTPUT_FILE)

    print()
    print("=" * 60)
    print("Process completed successfully!")
    print(f"Generated file: {OUTPUT_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    main()
