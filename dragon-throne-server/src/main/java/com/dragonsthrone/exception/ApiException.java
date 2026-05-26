package com.dragonsthrone.exception;

import org.springframework.http.HttpStatus;

/** A request error carrying the HTTP status to return with an {@code {error}} body. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
