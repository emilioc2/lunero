package com.lunero.category;

import com.lunero.common.SecurityUtils;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getCategories() {
        UUID userId = resolveUserId();
        List<CategoryResponse> categories = categoryService.getCategories(userId)
                .stream()
                .map(CategoryResponse::from)
                .toList();
        return ResponseEntity.ok(categories);
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        UUID userId = resolveUserId();
        CategoryEntity created = categoryService.createCategory(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(CategoryResponse.from(created));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCategoryRequest request) {
        UUID userId = resolveUserId();
        CategoryEntity updated = categoryService.updateCategory(userId, id, request);
        return ResponseEntity.ok(CategoryResponse.from(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        categoryService.deleteCategory(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reassign")
    public ResponseEntity<Void> reassignEntries(
            @PathVariable UUID id,
            @Valid @RequestBody ReassignCategoryRequest request) {
        UUID userId = resolveUserId();
        categoryService.reassignEntries(userId, id, request.targetCategoryId());
        return ResponseEntity.noContent().build();
    }

    private UUID resolveUserId() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        return user.getId();
    }
}
