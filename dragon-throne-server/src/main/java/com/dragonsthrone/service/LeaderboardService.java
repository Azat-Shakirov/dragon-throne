package com.dragonsthrone.service;

import com.dragonsthrone.dto.LeaderboardEntryDto;
import com.dragonsthrone.dto.LeaderboardSubmitRequest;
import com.dragonsthrone.dto.LeaderboardSubmitResponse;
import com.dragonsthrone.dto.LeaderboardView;
import com.dragonsthrone.exception.ApiException;
import com.dragonsthrone.model.LeaderboardEntry;
import com.dragonsthrone.model.User;
import com.dragonsthrone.repository.LeaderboardEntryRepository;
import com.dragonsthrone.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Per-map Battle Royale leaderboards. Every submission is stored as its own
 * row; queries rank rows by score (ties broken by faster time, then earlier
 * achievement). The score itself is computed client-side and submitted —
 * the server trusts and stores it (acceptable for a demo, not anti-cheat).
 */
@Service
public class LeaderboardService {

    private static final int TOP_N = 10;

    private final LeaderboardEntryRepository leaderboardRepository;
    private final UserRepository userRepository;

    public LeaderboardService(LeaderboardEntryRepository leaderboardRepository,
                              UserRepository userRepository) {
        this.leaderboardRepository = leaderboardRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public LeaderboardSubmitResponse submit(String username, String mapId,
                                            LeaderboardSubmitRequest request) {
        User user = requireUser(username);
        LeaderboardEntry saved = leaderboardRepository.save(new LeaderboardEntry(
                user, mapId, request.score(), request.elapsedMs(), request.difficulty(), Instant.now()));

        List<LeaderboardEntry> ranked =
                leaderboardRepository.findByMapIdOrderByScoreDescElapsedMsAscAchievedAtAsc(mapId);
        int rank = rankOf(ranked, saved);
        return new LeaderboardSubmitResponse(toDto(saved, rank), rank);
    }

    @Transactional(readOnly = true)
    public LeaderboardView getLeaderboard(String username, String mapId) {
        User user = requireUser(username);
        List<LeaderboardEntry> ranked =
                leaderboardRepository.findByMapIdOrderByScoreDescElapsedMsAscAchievedAtAsc(mapId);

        List<LeaderboardEntryDto> top = new ArrayList<>();
        for (int i = 0; i < Math.min(TOP_N, ranked.size()); i++) {
            top.add(toDto(ranked.get(i), i + 1));
        }

        // Personal best: the user's highest entry. Surface it below the top 10
        // only when it isn't already inside the top 10.
        LeaderboardEntryDto myBest = null;
        List<LeaderboardEntry> mine =
                leaderboardRepository.findByMapIdAndUserOrderByScoreDescElapsedMsAscAchievedAtAsc(mapId, user);
        if (!mine.isEmpty()) {
            LeaderboardEntry best = mine.get(0);
            int rank = rankOf(ranked, best);
            if (rank > TOP_N) {
                myBest = toDto(best, rank);
            }
        }
        return new LeaderboardView(top, myBest);
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Unknown user"));
    }

    /** 1-based position of an entry within the ranked list (by id identity). */
    private int rankOf(List<LeaderboardEntry> ranked, LeaderboardEntry entry) {
        for (int i = 0; i < ranked.size(); i++) {
            if (ranked.get(i).getId().equals(entry.getId())) {
                return i + 1;
            }
        }
        return ranked.size() + 1; // shouldn't happen, but stay defined
    }

    private LeaderboardEntryDto toDto(LeaderboardEntry entry, int rank) {
        return new LeaderboardEntryDto(
                rank,
                entry.getUser().getUsername(),
                entry.getScore(),
                entry.getElapsedMs(),
                entry.getDifficulty());
    }
}
