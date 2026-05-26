package com.dragonsthrone.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A single Battle Royale score submission. Many entries may exist per user and
 * per map; the leaderboard query ranks them by score.
 */
@Entity
@Table(name = "leaderboard_entry")
public class LeaderboardEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** The level id of the Battle Royale map (e.g. "41"). */
    @Column(nullable = false)
    private String mapId;

    @Column(nullable = false)
    private Integer score;

    @Column(nullable = false)
    private Long elapsedMs;

    /** "easy" | "normal" | "hard". */
    @Column(nullable = false)
    private String difficulty;

    @Column(nullable = false)
    private Instant achievedAt;

    protected LeaderboardEntry() {
        // JPA requires a no-arg constructor.
    }

    public LeaderboardEntry(User user, String mapId, Integer score, Long elapsedMs,
                            String difficulty, Instant achievedAt) {
        this.user = user;
        this.mapId = mapId;
        this.score = score;
        this.elapsedMs = elapsedMs;
        this.difficulty = difficulty;
        this.achievedAt = achievedAt;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getMapId() {
        return mapId;
    }

    public Integer getScore() {
        return score;
    }

    public Long getElapsedMs() {
        return elapsedMs;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public Instant getAchievedAt() {
        return achievedAt;
    }
}
