const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const session = require('express-session');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  }
});

const port = 4000;

app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(session({
  secret: "trading_platform_secret",
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 },
}));

// ROOT ROUTE
app.get('/', (req, res) => {
  res.json({ message: 'Trading Backend API is running' });
});

// ROUTES
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/stocks'));
app.use('/', require('./routes/trading'));
app.use('/', require('./routes/portfolio'));
app.use('/', require('./routes/orders'));
app.use('/', require('./routes/quant'));

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// Start price updater service
require('./services/priceUpdater')(io);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = { app, server, io };