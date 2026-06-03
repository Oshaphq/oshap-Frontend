import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 5175 });

let sharedState = null;

wss.on('connection', (ws) => {
  console.log('[WS Relay] Client connected');
  
  // Send the current shared state to the new client
  if (sharedState) {
    ws.send(JSON.stringify({ type: 'SYNC_STATE', payload: sharedState }));
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'UPDATE_STATE') {
        sharedState = data.payload;
        // Broadcast the state update to all OTHER clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(message.toString());
          }
        });
      } else {
        // Broadcast SSE event to all OTHER clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(message.toString());
          }
        });
      }
    } catch (err) {
      console.error('[WS Relay] Invalid message:', err);
    }
  });

  ws.on('close', () => {
    console.log('[WS Relay] Client disconnected');
  });
});

console.log('✅ Mock SSE + State Relay Server running on ws://localhost:5175');
