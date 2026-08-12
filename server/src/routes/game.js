import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "./auth.js";

const router = express.Router();

// Leaderboard endpoint
router.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, money FROM players ORDER BY money DESC LIMIT 50"
    );

    const leaderboard = result.rows.map((player, index) => ({
      username: player.username,
      money: parseInt(player.money),
      rank: index + 1
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
});

// Servers endpoint
router.get("/servers", async (req, res) => {
  try {
    // For now, return a simple server structure
    // In a real implementation, this would query a servers table
    const servers = [
      {
        id: 'server-1',
        name: 'US East',
        region: 'North America',
        playerCount: 0,
        maxPlayers: 50,
        status: 'online',
        ping: 25
      },
      {
        id: 'server-2', 
        name: 'US West',
        region: 'North America',
        playerCount: 0,
        maxPlayers: 50,
        status: 'online',
        ping: 45
      },
      {
        id: 'server-3',
        name: 'Europe Central',
        region: 'Europe',
        playerCount: 0,
        maxPlayers: 50,
        status: 'online',
        ping: 75
      }
    ];

    res.json(servers);
  } catch (error) {
    console.error("Servers error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
});

// User activity endpoint
router.get("/activity", authenticateToken, async (req, res) => {
  try {
    // For now, return empty activity since we don't have an activity table
    // In a real implementation, this would query an activity table
    const activities = [];

    res.json(activities);
  } catch (error) {
    console.error("Activity error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
});

// User data endpoint
router.get("/user", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, money, created_at FROM players WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "User not found"
      });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      username: user.username,
      money: parseInt(user.money),
      created_at: user.created_at
    });
  } catch (error) {
    console.error("User data error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
});

export default router;