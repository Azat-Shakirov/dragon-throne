package com.dragonsthrone.service;

import com.dragonsthrone.dto.AuthRequest;
import com.dragonsthrone.dto.AuthResponse;
import com.dragonsthrone.exception.ApiException;
import com.dragonsthrone.model.User;
import com.dragonsthrone.repository.UserRepository;
import com.dragonsthrone.security.TokenService;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Registration, login, and logout. Passwords are stored only as BCrypt hashes. */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       TokenService tokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    @Transactional
    public AuthResponse register(AuthRequest request) {
        String username = request.username().trim();
        if (username.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "username is required");
        }
        if (userRepository.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username already taken");
        }
        User user = new User(username, passwordEncoder.encode(request.password()), Instant.now());
        userRepository.save(user);
        return new AuthResponse(tokenService.issue(user.getUsername()), user.getUsername());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
        return new AuthResponse(tokenService.issue(user.getUsername()), user.getUsername());
    }

    public void logout(String token) {
        tokenService.revoke(token);
    }
}
