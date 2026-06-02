# OtakuHub Database ERD

This diagram shows the current MySQL tables used by the Flask backend.

```mermaid
erDiagram
  USERS {
    varchar id PK
    varchar display_name
    varchar username
    text bio
    varchar avatar_url
    enum role
    timestamp created_at
  }

  WATCH_ROOMS {
    varchar id PK
    varchar name
    varchar anime
    int episode
    int capacity
    int viewers
    enum status
    varchar image_url
    json reactions
    timestamp created_at
    timestamp updated_at
  }

  ANIME_LISTS {
    varchar id PK
    varchar title
    int episodes
    int watched
    decimal rating
    enum status
    boolean favorite
    varchar genre
    varchar studio
    varchar image_url
    timestamp created_at
    timestamp updated_at
  }

  COMMENTS {
    varchar id PK
    varchar author
    varchar target
    text message
    varchar reaction
    bigint created_at_ms
  }

  SCHEDULES {
    varchar id PK
    varchar title
    date date
    time time
    enum type
    timestamp created_at
  }

  NOTIFICATIONS {
    int id PK
    varchar message
    timestamp created_at
  }
```

## Notes

- `watch_rooms.reactions` stores anime-themed reaction counts as JSON.
- `anime_lists` stores tracking information such as total episodes, watched episodes, rating, favorite status, genre, studio, and poster URL.
- `comments.target` can refer to an anime title or watch room name.
- `schedules` powers the upcoming anime calendar and countdown tracker.
- `users` currently stores the demo profile and can support future login/signup work.
