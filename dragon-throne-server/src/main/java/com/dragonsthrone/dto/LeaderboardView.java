package com.dragonsthrone.dto;

import java.util.List;

/**
 * GET /api/leaderboard/{mapId} response: the top-10 rows plus this user's
 * personal best (null if they have no entry, or omitted-as-null when their
 * best is already among the top 10).
 */
public record LeaderboardView(
        List<LeaderboardEntryDto> entries,
        LeaderboardEntryDto myBest) {
}
