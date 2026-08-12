import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";

const router = express.Router();

const SALT_ROUNDS = 10;

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const PASSWORD_MIN_LENGTH = 8;

function validateUsername(username) {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters` };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { valid: false, error: `Username must be at most ${USERNAME_MAX_LENGTH} characters` };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: "Username can only contain letters, numbers, and underscores" };
  }
  return { valid: true };
}

function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  return { valid: true };
}

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({
        ok: false,
        error: usernameValidation.error
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        ok: false,
        error: passwordValidation.error
      });
    }

    const existingUserQuery = await pool.query(
      "SELECT id FROM players WHERE username = $1",
      [username]
    );

    if (existingUserQuery.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        error: "Username already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      "INSERT INTO players (username, password_hash) VALUES ($1, $2) RETURNING id, username, money, created_at",
      [username, passwordHash]
    );

    const user = result.rows[0];

    res.status(201).json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        money: user.money,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Username is required"
      });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Password is required"
      });
    }

    const result = await pool.query(
      "SELECT id, username, password_hash, money, created_at FROM players WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        error: "Invalid username or password"
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        ok: false,
        error: "Invalid username or password"
      });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        money: user.money,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error"
    });
  }
});

export default router;