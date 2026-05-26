package com.dragonsthrone.config;

import com.dragonsthrone.security.AuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the token {@link AuthInterceptor} on the protected routes.
 * {@code /api/auth/**} (register/login) is intentionally NOT intercepted —
 * those mint the token. CORS is configured centrally in {@link SecurityConfig}.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    public WebConfig(AuthInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/progress/**", "/api/leaderboard/**", "/api/auth/logout");
    }
}
