package com.dragonsthrone.dto;

import jakarta.validation.constraints.NotBlank;

/** Login / register request body. */
public record AuthRequest(
        @NotBlank(message = "username is required") String username,
        @NotBlank(message = "password is required") String password) {
}
