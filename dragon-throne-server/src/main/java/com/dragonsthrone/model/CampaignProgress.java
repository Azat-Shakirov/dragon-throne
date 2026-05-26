package com.dragonsthrone.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A player's saved campaign progress, stored as a JSON blob mirroring the
 * frontend's {@code progressStore} shape ({@code { completedLevels, settings }}).
 * One row per user.
 */
@Entity
@Table(name = "campaign_progress")
public class CampaignProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    /** The full progress object as a JSON string (CLOB). */
    @Lob
    @Column(nullable = false)
    private String progressJson;

    @Column(nullable = false)
    private Instant updatedAt;

    protected CampaignProgress() {
        // JPA requires a no-arg constructor.
    }

    public CampaignProgress(User user, String progressJson, Instant updatedAt) {
        this.user = user;
        this.progressJson = progressJson;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getProgressJson() {
        return progressJson;
    }

    public void setProgressJson(String progressJson) {
        this.progressJson = progressJson;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
