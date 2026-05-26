package com.dragonsthrone.security;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Dead-simple in-memory session tokens (no JWT). On login we mint a random
 * UUID mapped to the username; protected endpoints validate the
 * {@code Authorization: Bearer <token>} header against this map. Tokens are
 * lost on server restart — fine for a demo project.
 */
@Service
public class TokenService {

    private final Map<String, String> tokenToUsername = new ConcurrentHashMap<>();

    /** Issue a fresh token for a username. */
    public String issue(String username) {
        String token = UUID.randomUUID().toString();
        tokenToUsername.put(token, username);
        return token;
    }

    /** Resolve a token to its username, or null if unknown/invalid. */
    public String resolve(String token) {
        if (token == null) {
            return null;
        }
        return tokenToUsername.get(token);
    }

    /** Invalidate a token (logout). No-op if it isn't present. */
    public void revoke(String token) {
        if (token != null) {
            tokenToUsername.remove(token);
        }
    }
}
