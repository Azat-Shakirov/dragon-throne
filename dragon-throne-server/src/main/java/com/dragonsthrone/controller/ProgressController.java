package com.dragonsthrone.controller;

import com.dragonsthrone.security.AuthInterceptor;
import com.dragonsthrone.service.ProgressService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(ProgressService progressService) {
        this.progressService = progressService;
    }

    /** Returns { completedLevels, settings } for the authenticated user. */
    @GetMapping
    public JsonNode getProgress(@RequestAttribute(AuthInterceptor.USERNAME_ATTRIBUTE) String username) {
        return progressService.getProgress(username);
    }

    /** Overwrites the authenticated user's progress with the request body. */
    @PutMapping
    public ResponseEntity<Void> saveProgress(
            @RequestAttribute(AuthInterceptor.USERNAME_ATTRIBUTE) String username,
            @RequestBody JsonNode body) {
        progressService.saveProgress(username, body);
        return ResponseEntity.ok().build();
    }
}
