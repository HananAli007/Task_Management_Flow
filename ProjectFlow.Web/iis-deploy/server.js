// ================================================================
//  ProjectFlow – Production Smart Proxy Server
// ================================================================

process.env.NODE_ENV = 'production';
const iisPort = process.env.PORT || 3000;
const BACKEND_BASE = 'http://192.168.18.69:8080';

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
    if (url.startsWith('/backend-api/')) {
        return url.replace('/backend-api/', '/api/');
    }
    if (url.startsWith('/backend-hubs/')) {
        return url.replace('/backend-hubs/', '/hubs/');
    }
    return null;
}

const server = http.createServer(async (req, res) => {
    const targetPath = getTargetPath(req.url);

    if (targetPath) {
        const finalUrl = `${BACKEND_BASE}${targetPath}`;
        
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
            res.end('Backend Unavailable');
        });

        req.pipe(proxyReq);
        return;
    }

    // Default Next.js handling
    try {
        await handle(req, res);
    } catch (err) {
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
        
        const url = new URL(BACKEND_BASE);
        const proxySocket = net.connect(url.port || 80, url.hostname, () => {
            // Send the raw upgrade request to backend
            proxySocket.write(
                `${req.method} ${targetPath} HTTP/1.1\r\n` +
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
        socket.destroy();
    }
});

server.listen(iisPort, () => {
    console.log(`[ProjectFlow] ✓ Server running on port ${iisPort}`);
    console.log(`[ProjectFlow] ✓ Proxying to ${BACKEND_BASE}`);
});