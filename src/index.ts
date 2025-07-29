import express from 'express';
import authRoutes from './routes/auth.routes';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { joinRoom } from './controllers/auth.controller';
import { dataBaseConnection } from './config/db';

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS for Flutter app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'], // Ensure both transports are available
  pingTimeout: 60000,
  pingInterval: 25000
});

app.set("io", io);
// Setup socket connection handling
joinRoom(io);

// Add middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Quizify Server is running');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = httpServer.listen(PORT, async () => {
  try {
    console.log(`Connected to DB`);
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Failed to connect to DB:', err);
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Close socket.io server
    io.close(() => {
      console.log('Socket.IO server closed');
    });
    
    // Close database connections
    try {
      await dataBaseConnection.closePool();
      console.log('Database connections closed');
    } catch (err) {
      console.error('Error closing database connections:', err);
    }
    
    console.log('Graceful shutdown complete');
    process.exit(0);
  });
  
  // Force exit after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});