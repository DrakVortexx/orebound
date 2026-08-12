import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { testDatabase } from "./db.js";
import authRoutes from "./routes/auth.js";

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: true
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);

/*
 * Health check
 */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    game: "OREBOUND",
    server: "online"
  });
});

/*
 * Database health check
 */
app.get("/api/health/database", async (req, res) => {
  try {
    await testDatabase();

    res.json({
      ok: true,
      database: "connected"
    });
  } catch (error) {
    console.error("Database error:", error);

    res.status(500).json({
      ok: false,
      database: "error"
    });
  }
});

// 404 handler for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      ok: false,
      error: "Endpoint not found"
    });
  } else {
    next();
  }
});

/*
 * WebSocket server
 */
const wss = new WebSocketServer({
  server: httpServer
});

wss.on("connection", (socket) => {
  console.log("Player connected");

  socket.send(
    JSON.stringify({
      type: "server_ready",
      game: "OREBOUND"
    })
  );

  socket.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      console.log("Received:", data);

      // Gameplay networking will be added later.
    } catch {
      console.log("Invalid WebSocket message");
    }
  });

  socket.on("close", () => {
    console.log("Player disconnected");
  });

  socket.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

/*
 * Start server
 */
httpServer.listen(PORT, async () => {
  console.log("================================");
  console.log("        OREBOUND SERVER");
  console.log("================================");
  console.log(`HTTP server: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);

  try {
    await testDatabase();
  } catch (error) {
    console.error("Database connection failed:");
    console.error(error.message);
  }
});