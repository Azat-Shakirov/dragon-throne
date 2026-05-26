package com.dragonsthrone.service;

import com.dragonsthrone.exception.ApiException;
import com.dragonsthrone.model.CampaignProgress;
import com.dragonsthrone.model.User;
import com.dragonsthrone.repository.CampaignProgressRepository;
import com.dragonsthrone.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stores/loads a user's campaign progress as an opaque JSON blob mirroring the
 * frontend {@code progressStore} shape ({@code { completedLevels, settings }}).
 * The server does not interpret the contents — it round-trips them.
 */
@Service
public class ProgressService {

    private final CampaignProgressRepository progressRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ProgressService(CampaignProgressRepository progressRepository,
                           UserRepository userRepository, ObjectMapper objectMapper) {
        this.progressRepository = progressRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /** Returns the stored progress, or a fresh empty default if none exists yet. */
    @Transactional(readOnly = true)
    public JsonNode getProgress(String username) {
        User user = requireUser(username);
        return progressRepository.findByUser(user)
                .map(this::parse)
                .orElseGet(this::emptyProgress);
    }

    /** Overwrites the user's stored progress with the supplied blob. */
    @Transactional
    public void saveProgress(String username, JsonNode progress) {
        User user = requireUser(username);
        String json = progress == null ? emptyProgress().toString() : progress.toString();
        CampaignProgress record = progressRepository.findByUser(user)
                .orElseGet(() -> new CampaignProgress(user, json, Instant.now()));
        record.setProgressJson(json);
        record.setUpdatedAt(Instant.now());
        progressRepository.save(record);
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Unknown user"));
    }

    private JsonNode parse(CampaignProgress record) {
        try {
            return objectMapper.readTree(record.getProgressJson());
        } catch (Exception ex) {
            // Corrupt stored JSON — fall back to empty rather than 500.
            return emptyProgress();
        }
    }

    private ObjectNode emptyProgress() {
        ObjectNode root = objectMapper.createObjectNode();
        root.set("completedLevels", objectMapper.createObjectNode());
        ObjectNode settings = objectMapper.createObjectNode();
        settings.put("musicVolume", 0.5);
        settings.put("sfxVolume", 0.8);
        root.set("settings", settings);
        return root;
    }
}
