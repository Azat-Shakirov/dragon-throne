package com.dragonsthrone.repository;

import com.dragonsthrone.model.LeaderboardEntry;
import com.dragonsthrone.model.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeaderboardEntryRepository extends JpaRepository<LeaderboardEntry, Long> {

    /** All entries for a map, highest score first (ties: faster time, then earlier). */
    List<LeaderboardEntry> findByMapIdOrderByScoreDescElapsedMsAscAchievedAtAsc(String mapId);

    /** A user's entries for a map, best score first — element 0 is their personal best. */
    List<LeaderboardEntry> findByMapIdAndUserOrderByScoreDescElapsedMsAscAchievedAtAsc(
            String mapId, User user);
}
