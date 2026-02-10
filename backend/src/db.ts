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

db.run(`
  CREATE TABLE IF NOT EXISTS search_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT,
    source TEXT,
    timestamp DATE DEFAULT (datetime('now', 'localtime'))
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    authors TEXT,
    abstract TEXT,
    url TEXT,
    source TEXT,
    published_date DATE,
    search_job_id INTEGER,
    FOREIGN KEY(search_job_id) REFERENCES search_jobs(id)
  );
`);
