-- Run this once if your otakuhub database already exists.
ALTER TABLE anime_lists
  ADD COLUMN trailer_url VARCHAR(500) NULL AFTER image_url;
