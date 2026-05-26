package com.dragonsthrone.dto;

/** Returned on successful register / login. */
public record AuthResponse(String token, String username) {
}
