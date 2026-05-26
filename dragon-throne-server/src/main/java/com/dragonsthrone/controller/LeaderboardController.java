package com.dragonsthrone.controller;

import com.dragonsthrone.dto.LeaderboardSubmitRequest;
import com.dragonsthrone.dto.LeaderboardSubmitResponse;
import com.dragonsthrone.dto.LeaderboardView;
import com.dragonsthrone.security.AuthInterceptor;
import com.dragonsthrone.service.LeaderboardService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    /** Top-10 rows for a map plus the caller's personal best (if below top 10). */
    @GetMapping("/{mapId}")
    public LeaderboardView getLeaderboard(
            @RequestAttribute(AuthInterceptor.USERNAME_ATTRIBUTE) String username,
            @PathVariable String mapId) {
        return leaderboardService.getLeaderboard(username, mapId);
    }

    /** Submit a Battle Royale result; returns the stored entry and its rank. */
    @PostMapping("/{mapId}")
    public LeaderboardSubmitResponse submit(
            @RequestAttribute(AuthInterceptor.USERNAME_ATTRIBUTE) String username,
            @PathVariable String mapId,
            @Valid @RequestBody LeaderboardSubmitRequest request) {
        return leaderboardService.submit(username, mapId, request);
    }
}
