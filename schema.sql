
-- Drop tables if they exist (for clean slate dev)
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS user_profiles; -- Drop child first
DROP TABLE IF EXISTS users;         -- Drop parent second
DROP TABLE IF EXISTS snippets;
DROP TABLE IF EXISTS game_records;
DROP TABLE IF EXISTS login_logs;

-- 1. Core Users Table (Auth & System Status)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    password TEXT,
    role TEXT DEFAULT 'user',   -- admin | user
    status TEXT DEFAULT 'active', -- active | inactive
    created_at TEXT, 
    updated_at INTEGER 
);

CREATE INDEX idx_users_username ON users(username);

-- 1.1 User Profiles Table (Extended Info)
CREATE TABLE user_profiles (
    user_id TEXT PRIMARY KEY,
    nickname TEXT,
    avatar TEXT,
    points INTEGER DEFAULT 0,
    last_check_in TEXT,
    cover_images TEXT, -- JSON Array of strings
    bio TEXT,
    tags TEXT, -- JSON Array of strings
    socials TEXT, -- JSON Object
    updated_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_profiles_points ON user_profiles(points DESC);

-- 2. Photos Table
CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    url TEXT, -- Stores Base64 or URL
    title TEXT,
    description TEXT,
    category TEXT,
    width INTEGER,
    height INTEGER,
    created_at INTEGER,
    updated_at INTEGER -- Timestamp for sync
);

CREATE INDEX idx_photos_category ON photos(category);

-- 3. Activity Logs Table
CREATE TABLE activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT,
    details TEXT,
    timestamp TEXT, -- ISO Date String
    updated_at INTEGER, -- Timestamp for sync
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_activities_user_id ON activity_logs(user_id);
CREATE INDEX idx_activities_timestamp ON activity_logs(timestamp DESC);

-- 4. Snippets Table
CREATE TABLE snippets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- JSON Array String
    created_at INTEGER,
    updated_at INTEGER
);

CREATE INDEX idx_snippets_language ON snippets(language);
CREATE INDEX idx_snippets_created ON snippets(created_at DESC);

-- 5. Game Records Table
CREATE TABLE game_records (
    id TEXT PRIMARY KEY,
    winner_id TEXT,
    players_json TEXT, -- JSON array of participants
    pot_size INTEGER,
    hand_type TEXT, -- Winning hand type
    created_at INTEGER
);

-- 6. Login Audit Logs Table
CREATE TABLE login_logs (
    id TEXT PRIMARY KEY, -- Session ID
    user_id TEXT,
    username TEXT,
    avatar TEXT,
    rank_title TEXT, -- Stored snapshot of rank at login time
    ip TEXT,
    location TEXT, -- Region · City
    isp TEXT, -- ISP / Organization (New)
    os TEXT,
    browser TEXT,
    login_time TEXT, -- ISO Date String
    last_accessed TEXT, -- ISO Date String (New for session tracking)
    duration_ms INTEGER DEFAULT 0, -- Session Duration in Milliseconds (New)
    created_at INTEGER
);

CREATE INDEX idx_login_logs_time ON login_logs(created_at DESC);
CREATE INDEX idx_login_logs_user ON login_logs(user_id);
