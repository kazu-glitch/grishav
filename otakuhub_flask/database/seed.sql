USE otakuhub;

INSERT INTO users (id, display_name, username, bio, avatar_url, role) VALUES
('user-1', 'Mika Tachibana', 'mika', 'Room host, seasonal tracker, and spoiler-free chat moderator.', '/static/assets/avatar.png', 'admin');

INSERT INTO watch_rooms (id, name, anime, episode, capacity, viewers, status, image_url, reactions) VALUES
('room-1', 'Hidden Leaf Watch Room', 'Naruto', 19, 42, 31, 'Live', 'https://cdn.myanimelist.net/images/anime/1141/142503l.jpg', JSON_OBJECT('Ninja Hype', 24, 'Nen Boost', 6)),
('room-2', 'Grand Line Crew Night', 'One Piece', 1101, 56, 44, 'Scheduled', 'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg', JSON_OBJECT('Pirate Crew', 18, 'Ninja Hype', 7)),
('room-3', 'Survey Corps Sync', 'Attack on Titan', 13, 35, 28, 'Private', 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg', JSON_OBJECT('Titan Shock', 20, 'Pirate Crew', 5));

INSERT INTO anime_lists (id, title, episodes, watched, rating, status, favorite, image_url) VALUES
('anime-1', 'Naruto', 220, 84, 8.0, 'watching', TRUE, 'https://cdn.myanimelist.net/images/anime/1141/142503l.jpg'),
('anime-2', 'One Piece', 1122, 208, 8.7, 'watching', TRUE, 'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg'),
('anime-3', 'Attack on Titan', 25, 25, 8.6, 'completed', TRUE, 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg'),
('anime-4', 'Hunter x Hunter', 148, 36, 9.0, 'watching', TRUE, 'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg');

INSERT INTO comments (id, author, target, message, reaction, created_at_ms) VALUES
('comment-1', 'Mika', 'Naruto', 'The Naruto room needs a Team 7 rewatch after this arc.', 'Ninja Hype', 1779770000000),
('comment-2', 'Ren', 'One Piece', 'Grand Line nights are perfect for long watch parties.', 'Pirate Crew', 1779766000000),
('comment-3', 'Aiko', 'Attack on Titan', 'That reveal deserves a spoiler-free review thread.', 'Titan Shock', 1779760000000);

INSERT INTO schedules (id, title, date, time, type) VALUES
('schedule-1', 'Naruto Ep 85 Watch Party', '2026-05-27', '20:00:00', 'Premiere'),
('schedule-2', 'One Piece Grand Line Room', '2026-05-29', '19:30:00', 'Watch Party'),
('schedule-3', 'Hunter x Hunter Nen Training Night', '2026-06-02', '18:00:00', 'Watch Party');

INSERT INTO notifications (message) VALUES
('Naruto Ep 85 starts tomorrow at 20:00.'),
('Ren bookmarked One Piece Ep 208.'),
('Admin review queue has 3 fresh comments.');
