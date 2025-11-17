addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

addEventListener('websocket', event => {
  event.waitUntil(handleWS(event));
});

let clients = new Map(); // Store connected players

async function handleRequest(req) {
  if (req.headers.get('Upgrade') === 'websocket') {
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    handleWSConnection(server);
    return new Response(null, { status: 101, webSocket: client });
  } else {
    return fetch(req); // Serve static files via Pages or KV
  }
}

async function handleWS(event) {
  const ws = event.webSocket;
  ws.accept();

  const id = crypto.randomUUID();
  clients.set(id, { ws, player: {} });

  ws.addEventListener('message', e => {
    const data = JSON.parse(e.data);
    clients.get(id).player = data;

    // Broadcast to all clients
    const allPlayers = {};
    for (const [cid, c] of clients) allPlayers[cid] = c.player;
    for (const [cid, c] of clients) c.ws.send(JSON.stringify(allPlayers));
  });

  ws.addEventListener('close', () => {
    clients.delete(id);
  });
}
document.onload(){document.title=Math.random()}
