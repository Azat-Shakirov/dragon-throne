package com.dragonsthrone.dto;

/** Consistent error shape: {@code { "error": "..." }}. */
public record ErrorResponse(String error) {
}
