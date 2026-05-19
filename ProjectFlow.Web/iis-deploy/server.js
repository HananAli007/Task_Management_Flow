// ================================================================
//  ProjectFlow – Production Smart Proxy Server
// ================================================================

process.env.NODE_ENV = 'production';
const iisPort = process.env.PORT || 3000;

// Use environment variable from IIS/web.config or fallback
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const http = require('http');
const path = require('path');
const net = require('net');
const NextServer = require('next/dist/server/next-server').default;

// Load Next.js config
const config = require(path.join(__dirname, '.next', 'required-server-files.json')).config;
const nextServer = new NextServer({
    hostname: 'localhost',
    port: 3000,
    dir: __dirname,
    dev: false,
    conf: config
});
const handle = nextServer.getRequestHandler();

// Helper to resolve backend paths
function getTargetPath(url) {
    // Check for general API proxy path
    if (url.startsWith('/backend-api/')) {
        return url.replace('/backend-api/', '/api/');
    }
    // Check for SignalR Hubs proxy path
    if (url.startsWith('/hubs/')) {
        return url; // Keep /hubs/ as it matches backend
    }
    return null;
}

const server = http.createServer(async (req, res) => {
    const targetPath = getTargetPath(req.url);

    if (targetPath) {
        const finalUrl = `${BACKEND_BASE}${targetPath}`;
        console.log(`[Proxy] ${req.url} -> ${finalUrl}`);
        
        const proxyReq = http.request(finalUrl, {
            method: req.method,
            headers: req.headers
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error(`[Proxy Error] ${req.url} -> ${err.message}`);
            res.statusCode = 502;
            res.end(`Backend Unavailable: ${err.message}`);
        });

        req.pipe(proxyReq);
        return;
    }

    // Default Next.js handling
    try {
        await handle(req, res);
    } catch (err) {
        console.error(`[Next.js Error] ${err.message}`);
        res.statusCode = 500;
        res.end('Internal Server Error');
    }
});

// ------------------------------------------------------------
// ROBUST WEBSOCKET PROXY (SignalR)
// ------------------------------------------------------------
server.on('upgrade', (req, socket, head) => {
    const targetPath = getTargetPath(req.url);

    if (targetPath) {
        console.log(`[WS Upgrade] Proxying ${req.url} -> ${targetPath}`);
        
        const targetUrl = new URL(BACKEND_BASE);
        const proxySocket = net.connect(targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80), targetUrl.hostname, () => {
            // Send the raw upgrade request to backend
            proxySocket.write(
                `${req.method} ${targetPath}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''} HTTP/1.1\r\n` +
                Object.keys(req.headers)
                    .map(h => `${h}: ${req.headers[h]}`)
                    .join('\r\n') +
                '\r\n\r\n'
            );
            proxySocket.write(head);

            // Establish bi-directional pipe
            proxySocket.pipe(socket);
            socket.pipe(proxySocket);
        });

        proxySocket.on('error', (err) => {
            console.error(`[WS Proxy Error] ${err.message}`);
            socket.destroy();
        });
        
        socket.on('error', () => proxySocket.destroy());
    } else {
        // Not a proxied path, let Next.js handle it if it supports upgrades, 
        // otherwise destroy if it's unexpected.
        socket.destroy();
    }
});

server.listen(iisPort, () => {
    console.log(`[ProjectFlow] ✓ Server running on port ${iisPort}`);
    console.log(`[ProjectFlow] ✓ Environment: ${process.env.NODE_ENV}`);
    console.log(`[ProjectFlow] ✓ Backend URL: ${BACKEND_BASE}`);
});