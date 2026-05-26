package com.dragonsthrone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Dragon's Throne backend.
 *
 * <p>Exposes a small REST API (auth + campaign-progress sync + Battle Royale
 * leaderboard) backed by an in-memory H2 database. Run with
 * {@code mvn spring-boot:run} or {@code java -jar target/dragon-throne-server.jar}.
 */
@SpringBootApplication
public class DragonThroneServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DragonThroneServerApplication.class, args);
    }
}
