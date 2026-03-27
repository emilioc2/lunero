package com.lunero.user;

import com.lunero.common.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<UserProfileResponse> getProfile() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        return ResponseEntity.ok(UserProfileResponse.from(user));
    }

    @PatchMapping
    public ResponseEntity<UserProfileResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        UserEntity updated = userService.updateProfile(user.getId(), request);
        return ResponseEntity.ok(UserProfileResponse.from(updated));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteProfile() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        userService.deleteUser(user.getId());
        return ResponseEntity.noContent().build();
    }
}
