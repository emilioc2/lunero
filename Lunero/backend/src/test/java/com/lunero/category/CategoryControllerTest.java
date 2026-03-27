package com.lunero.category;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunero.common.GlobalExceptionHandler;
import com.lunero.common.exception.ConflictException;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.security.ClerkAuthentication;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    @Mock private CategoryService categoryService;
    @Mock private UserService userService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private final String clerkUserId = "clerk_cat_test";
    private final UUID userId = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        CategoryController controller = new CategoryController(categoryService, userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();

        ClerkAuthentication auth = new ClerkAuthentication(clerkUserId, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        UserEntity user = UserEntity.builder().id(userId).clerkUserId(clerkUserId).displayName("Test").build();
        when(userService.getOrCreateUser(clerkUserId)).thenReturn(user);
    }

    // --- GET /api/v1/categories ---

    @Test
    void getCategories_returns200WithList() throws Exception {
        CategoryEntity cat = buildCategory(categoryId, "Salary", "income");
        when(categoryService.getCategories(userId)).thenReturn(List.of(cat));

        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(categoryId.toString()))
                .andExpect(jsonPath("$[0].name").value("Salary"))
                .andExpect(jsonPath("$[0].entryType").value("income"));
    }

    @Test
    void getCategories_returnsEmptyList_whenNone() throws Exception {
        when(categoryService.getCategories(userId)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // --- POST /api/v1/categories ---

    @Test
    void createCategory_returns201() throws Exception {
        CategoryEntity saved = buildCategory(categoryId, "Groceries", "expense");
        when(categoryService.createCategory(eq(userId), any())).thenReturn(saved);

        String body = """
                {"name": "Groceries", "entryType": "expense"}
                """;

        mockMvc.perform(post("/api/v1/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Groceries"))
                .andExpect(jsonPath("$.entryType").value("expense"));
    }

    @Test
    void createCategory_returns400_whenNameBlank() throws Exception {
        String body = """
                {"name": "", "entryType": "expense"}
                """;

        mockMvc.perform(post("/api/v1/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createCategory_returns400_whenEntryTypeInvalid() throws Exception {
        String body = """
                {"name": "Test", "entryType": "investment"}
                """;

        mockMvc.perform(post("/api/v1/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createCategory_returns400_whenEntryTypeMissing() throws Exception {
        String body = """
                {"name": "Test"}
                """;

        mockMvc.perform(post("/api/v1/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // --- PATCH /api/v1/categories/:id ---

    @Test
    void updateCategory_returns200() throws Exception {
        CategoryEntity updated = buildCategory(categoryId, "Renamed", "income");
        when(categoryService.updateCategory(eq(userId), eq(categoryId), any())).thenReturn(updated);

        String body = """
                {"name": "Renamed"}
                """;

        mockMvc.perform(patch("/api/v1/categories/" + categoryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed"));
    }

    @Test
    void updateCategory_returns404_whenNotFound() throws Exception {
        when(categoryService.updateCategory(eq(userId), eq(categoryId), any()))
                .thenThrow(new EntityNotFoundException("Category", categoryId));

        String body = """
                {"name": "X"}
                """;

        mockMvc.perform(patch("/api/v1/categories/" + categoryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    // --- DELETE /api/v1/categories/:id ---

    @Test
    void deleteCategory_returns204() throws Exception {
        doNothing().when(categoryService).deleteCategory(userId, categoryId);

        mockMvc.perform(delete("/api/v1/categories/" + categoryId))
                .andExpect(status().isNoContent());

        verify(categoryService).deleteCategory(userId, categoryId);
    }

    @Test
    void deleteCategory_returns409_whenEntriesExist() throws Exception {
        doThrow(new ConflictException("Category has assigned entries."))
                .when(categoryService).deleteCategory(userId, categoryId);

        mockMvc.perform(delete("/api/v1/categories/" + categoryId))
                .andExpect(status().isConflict());
    }

    @Test
    void deleteCategory_returns404_whenNotFound() throws Exception {
        doThrow(new EntityNotFoundException("Category", categoryId))
                .when(categoryService).deleteCategory(userId, categoryId);

        mockMvc.perform(delete("/api/v1/categories/" + categoryId))
                .andExpect(status().isNotFound());
    }

    // --- PATCH /api/v1/categories/:id/reassign ---

    @Test
    void reassignEntries_returns204() throws Exception {
        UUID targetId = UUID.randomUUID();
        doNothing().when(categoryService).reassignEntries(userId, categoryId, targetId);

        String body = String.format("""
                {"targetCategoryId": "%s"}
                """, targetId);

        mockMvc.perform(patch("/api/v1/categories/" + categoryId + "/reassign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());

        verify(categoryService).reassignEntries(userId, categoryId, targetId);
    }

    @Test
    void reassignEntries_returns400_whenTargetIdMissing() throws Exception {
        mockMvc.perform(patch("/api/v1/categories/" + categoryId + "/reassign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // --- helpers ---

    private CategoryEntity buildCategory(UUID id, String name, String type) {
        return CategoryEntity.builder()
                .id(id)
                .userId(userId)
                .name(name)
                .entryType(type)
                .isDefault(false)
                .sortOrder(0)
                .createdAt(Instant.now())
                .build();
    }
}
