CREATE DATABASE IF NOT EXISTS otakuhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE otakuhub;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS anime_videos;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS anime_lists;
DROP TABLE IF EXISTS watch_rooms;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar_url VARCHAR(255),
  role ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL DEFAULT NULL
);

CREATE TABLE watch_rooms (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  anime VARCHAR(160) NOT NULL,
  episode INT NOT NULL,
  capacity INT NOT NULL,
  viewers INT NOT NULL DEFAULT 0,
  status ENUM('Live', 'Scheduled', 'Private') NOT NULL DEFAULT 'Scheduled',
  image_url VARCHAR(500),
  reactions JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE anime_lists (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  episodes INT NOT NULL,
  watched INT NOT NULL DEFAULT 0,
  rating DECIMAL(3, 1) NOT NULL DEFAULT 0.0,
  status ENUM('watching', 'planned', 'completed') NOT NULL DEFAULT 'planned',
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  genre VARCHAR(100) NOT NULL DEFAULT 'Shonen',
  studio VARCHAR(120) NOT NULL DEFAULT 'Studio TBA',
  image_url VARCHAR(500),
  trailer_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE anime_videos (
  id VARCHAR(64) PRIMARY KEY,
  anime_title VARCHAR(180) NOT NULL,
  title VARCHAR(180) NOT NULL,
  episode INT,
  video_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
  id VARCHAR(64) PRIMARY KEY,
  author VARCHAR(120) NOT NULL,
  target VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  reaction VARCHAR(40) NOT NULL DEFAULT 'Ninja Hype',
  created_at_ms BIGINT NOT NULL
);

CREATE TABLE schedules (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  type ENUM('Premiere', 'Watch Party', 'Finale', 'News Drop') NOT NULL DEFAULT 'Premiere',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- These indexes match the sort and filtering paths used by the API.
CREATE INDEX idx_watch_rooms_status_created ON watch_rooms (status, created_at);
CREATE INDEX idx_anime_lists_status_favorite ON anime_lists (status, favorite);
CREATE INDEX idx_anime_videos_title_created ON anime_videos (anime_title, created_at);
CREATE INDEX idx_comments_target_created ON comments (target, created_at_ms);
CREATE INDEX idx_schedules_date_time ON schedules (date, time);
CREATE INDEX idx_notifications_created ON notifications (created_at);
