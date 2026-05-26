# Dragon's Throne — Backend Server

A small Spring Boot (Java 17) backend that adds three things to the otherwise
fully client-side game:

1. **User accounts** — register / login with BCrypt-hashed passwords.
2. **Campaign progress sync** — a player's completed-levels record is stored
   server-side and loaded on login (instead of `localStorage`).
3. **Battle Royale leaderboards** — a per-map top-10 score table.

Data lives in an **in-memory H2 database** (no external DB; reset on restart).
Auth uses a simple in-memory UUID **session token** (no JWT) sent as
`Authorization: Bearer <token>`.

## Requirements

- JDK 17+
- Maven 3.9+

## Build & run

```bash
# from this directory (dragon-throne-server/)
mvn clean package                      # → target/dragon-throne-server.jar
java -jar target/dragon-throne-server.jar
# …or for development:
mvn spring-boot:run
```

The server listens on **http://localhost:8080**. CORS is enabled for the Vite
dev origin **http://localhost:5173** only.

The H2 web console is at **http://localhost:8080/h2-console**
(JDBC URL `jdbc:h2:mem:dragonthrone`, user `sa`, empty password).

## REST API

| Method | Path                          | Auth | Body / Returns |
|--------|-------------------------------|------|----------------|
| POST   | `/api/auth/register`          | —    | `{username,password}` → `{token,username}` |
| POST   | `/api/auth/login`             | —    | `{username,password}` → `{token,username}` |
| POST   | `/api/auth/logout`            | ✓    | → `200` (revokes the token) |
| GET    | `/api/progress`               | ✓    | → `{completedLevels,settings}` |
| PUT    | `/api/progress`               | ✓    | `{completedLevels,settings}` → `200` |
| GET    | `/api/leaderboard/{mapId}`    | ✓    | → `{entries:[…top10], myBest}` |
| POST   | `/api/leaderboard/{mapId}`    | ✓    | `{score,elapsedMs,difficulty}` → `{entry,rank}` |

Errors return `{ "error": "..." }` with an appropriate HTTP status.

### Battle Royale score formula

The score is computed **client-side** and submitted on every BR game end:

```
loss  → score = 0
win   → score = round(1000 - elapsedSeconds * difficultyMultiplier)
        difficultyMultiplier = easy 2 / normal 1.5 / hard 1
        (a negative result floors to a fixed 100 — any win beats a loss)
```

Higher is better; an easier AI subtracts more per second, so beating a harder
AI preserves more points (and a faster win scores higher). The server stores
whatever score the client submits.

## Project layout

```
src/main/java/com/dragonsthrone/
  DragonThroneServerApplication.java   entry point
  config/        SecurityConfig (BCrypt + permissive chain + CORS), WebConfig (interceptor)
  controller/    AuthController, ProgressController, LeaderboardController
  service/       AuthService, ProgressService, LeaderboardService
  repository/    Spring Data JPA repositories
  model/         User, CampaignProgress, LeaderboardEntry (JPA entities)
  dto/           request/response records
  security/      TokenService (UUID token store), AuthInterceptor (Bearer check)
  exception/     ApiException + GlobalExceptionHandler
src/main/resources/application.properties
```
