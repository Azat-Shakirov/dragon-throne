package com.dragonsthrone.dto;

/** POST /api/leaderboard/{mapId} response: the stored entry and its rank. */
public record LeaderboardSubmitResponse(
        LeaderboardEntryDto entry,
        int rank) {
}
