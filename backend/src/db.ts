import { Database } from "bun:sqlite";

export const db = new Database("db.sqlite", { create: true });

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    role TEXT
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

console.log("Database initialized");
