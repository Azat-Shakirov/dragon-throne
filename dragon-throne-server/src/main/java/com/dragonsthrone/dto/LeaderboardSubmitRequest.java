package com.dragonsthrone.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

/** POST body for submitting a Battle Royale result. */
public record LeaderboardSubmitRequest(
        @NotNull(message = "score is required") @PositiveOrZero Integer score,
        @NotNull(message = "elapsedMs is required") @PositiveOrZero Long elapsedMs,
        @NotNull(message = "difficulty is required")
        @Pattern(regexp = "easy|normal|hard", message = "difficulty must be easy, normal, or hard")
        String difficulty) {
}
