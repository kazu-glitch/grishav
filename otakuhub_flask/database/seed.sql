USE otakuhub;

INSERT INTO users (id, display_name, username, bio, avatar_url, role) VALUES
('user-1', 'Mika Tachibana', 'mika', 'Room host, seasonal tracker, and spoiler-free chat moderator.', '/static/assets/avatar.png', 'admin');

INSERT INTO watch_rooms (id, name, anime, episode, capacity, viewers, status, reactions) VALUES
('room-1', 'Friday Shonen Night', 'Jujutsu Kaisen', 18, 42, 31, 'Live', JSON_OBJECT('🔥', 24, '✨', 12, '😭', 4)),
('room-2', 'Cozy Isekai Cafe', 'Frieren: Beyond Journey''s End', 11, 28, 18, 'Scheduled', JSON_OBJECT('👏', 10, '💯', 6)),
('room-3', 'Midnight Mecha Sync', 'Gundam: Iron Bloom', 6, 20, 14, 'Private', JSON_OBJECT('🔥', 8, '✨', 7));

INSERT INTO anime_lists (id, title, episodes, watched, rating, status, favorite) VALUES
('anime-1', 'Jujutsu Kaisen', 24, 18, 9.4, 'watching', TRUE),
('anime-2', 'Frieren: Beyond Journey''s End', 28, 11, 9.7, 'watching', TRUE),
('anime-3', 'Solo Leveling', 12, 12, 8.8, 'completed', FALSE),
('anime-4', 'Dandadan', 12, 0, 8.6, 'planned', TRUE);

INSERT INTO comments (id, author, target, message, reaction, created_at_ms) VALUES
('comment-1', 'Mika', 'Friday Shonen Night', 'No spoilers in chat and the sync timer worked perfectly.', '✨', 1779770000000),
('comment-2', 'Ren', 'Frieren: Beyond Journey''s End', 'Episode 11 needs a bookmark at the campfire scene.', '😭', 1779766000000),
('comment-3', 'Aiko', 'Solo Leveling', 'That raid arc deserves a rewatch party this weekend.', '🔥', 1779760000000);

INSERT INTO schedules (id, title, date, time, type) VALUES
('schedule-1', 'Jujutsu Kaisen Ep 19', '2026-05-27', '20:00:00', 'Premiere'),
('schedule-2', 'Frieren Rewatch Room', '2026-05-29', '19:30:00', 'Watch Party'),
('schedule-3', 'Summer Season Preview', '2026-06-02', '18:00:00', 'News Drop');

INSERT INTO notifications (message) VALUES
('Jujutsu Kaisen Ep 19 starts tomorrow at 20:00.'),
('Ren bookmarked Frieren Ep 11.'),
('Admin review queue has 3 fresh comments.');
