package com.dragonsthrone.dto;

/** A leaderboard row as shown to the client. */
public record LeaderboardEntryDto(
        int rank,
        String username,
        int score,
        long elapsedMs,
        String difficulty) {
}
