package com.dragonsthrone.repository;

import com.dragonsthrone.model.CampaignProgress;
import com.dragonsthrone.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampaignProgressRepository extends JpaRepository<CampaignProgress, Long> {
    Optional<CampaignProgress> findByUser(User user);
}
