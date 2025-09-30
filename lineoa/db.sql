CREATE DATABASE IF NOT EXISTS line_travel_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE line_travel_bot;

-- Table for storing user information
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    line_user_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for logging user search queries
CREATE TABLE search_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    query TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table for user reviews of places
CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    place_id VARCHAR(255),
    review_text TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Table for admin-managed events and promotions
CREATE TABLE admin_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATETIME,
    end_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
