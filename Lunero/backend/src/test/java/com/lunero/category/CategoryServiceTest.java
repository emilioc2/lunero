package com.lunero.category;

import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.BusinessRuleException;
import com.lunero.common.exception.ConflictException;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.entry.EntryRepository;
import com.lunero.projection.CategoryProjectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock private CategoryRepository categoryRepository;
    @Mock private EntryRepository entryRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private CategoryProjectionRepository projectionRepository;

    private CategoryService categoryService;

    private final UUID userId = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        categoryService = new CategoryService(categoryRepository, entryRepository, auditLogService, projectionRepository);
    }

    // --- getCategories ---

    @Test
    void getCategories_returnsOrderedList() {
        List<CategoryEntity> cats = List.of(
                buildCategory(UUID.randomUUID(), userId, "Salary", "income", 0),
                buildCategory(UUID.randomUUID(), userId, "Rent",   "expense", 0)
        );
        when(categoryRepository.findAllByUserIdOrderBySortOrderAsc(userId)).thenReturn(cats);

        List<CategoryEntity> result = categoryService.getCategories(userId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("Salary");
    }

    // --- createCategory ---

    @Test
    void createCategory_persistsAndAudits() {
        when(categoryRepository.countByUserIdAndEntryType(userId, "expense")).thenReturn(2L);
        CategoryEntity saved = buildCategory(categoryId, userId, "Groceries", "expense", 2);
        when(categoryRepository.save(any())).thenReturn(saved);

        CategoryEntity result = categoryService.createCategory(userId, new CreateCategoryRequest("Groceries", "expense"));

        assertThat(result.getName()).isEqualTo("Groceries");
        assertThat(result.getEntryType()).isEqualTo("expense");
        assertThat(result.getSortOrder()).isEqualTo(2);
        verify(auditLogService).log(any(), eq("category"), any(), eq(AuditAction.CREATE));
    }

    @Test
    void createCategory_setsIsDefaultFalse() {
        when(categoryRepository.countByUserIdAndEntryType(any(), any())).thenReturn(0L);
        when(categoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CategoryEntity result = categoryService.createCategory(userId, new CreateCategoryRequest("Bonus", "income"));

        assertThat(result.isDefault()).isFalse();
    }

    // --- updateCategory ---

    @Test
    void updateCategory_updatesNameAndSortOrder() {
        CategoryEntity existing = buildCategory(categoryId, userId, "Old Name", "expense", 1);
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(existing));
        when(categoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CategoryEntity result = categoryService.updateCategory(userId, categoryId,
                new UpdateCategoryRequest("New Name", 5));

        assertThat(result.getName()).isEqualTo("New Name");
        assertThat(result.getSortOrder()).isEqualTo(5);
        verify(auditLogService).log(any(), eq("category"), any(), eq(AuditAction.UPDATE));
    }

    @Test
    void updateCategory_ignoresNullFields() {
        CategoryEntity existing = buildCategory(categoryId, userId, "Salary", "income", 0);
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(existing));
        when(categoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CategoryEntity result = categoryService.updateCategory(userId, categoryId,
                new UpdateCategoryRequest(null, null));

        assertThat(result.getName()).isEqualTo("Salary");
        assertThat(result.getSortOrder()).isEqualTo(0);
    }

    @Test
    void updateCategory_throws404_whenNotOwned() {
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.updateCategory(userId, categoryId,
                new UpdateCategoryRequest("X", null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // --- deleteCategory ---

    @Test
    void deleteCategory_deletesWhenNoEntries() {
        CategoryEntity cat = buildCategory(categoryId, userId, "Empty", "expense", 0);
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(cat));
        when(entryRepository.existsByCategoryIdAndIsDeletedFalse(categoryId)).thenReturn(false);

        categoryService.deleteCategory(userId, categoryId);

        verify(categoryRepository).delete(cat);
        verify(projectionRepository).deleteAllByCategoryId(categoryId);
        verify(auditLogService).log(any(), eq("category"), any(), eq(AuditAction.DELETE));
    }

    @Test
    void deleteCategory_throws409_whenEntriesExist() {
        CategoryEntity cat = buildCategory(categoryId, userId, "Used", "expense", 0);
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(cat));
        when(entryRepository.existsByCategoryIdAndIsDeletedFalse(categoryId)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.deleteCategory(userId, categoryId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("entries");

        verify(categoryRepository, never()).delete(any());
        verify(projectionRepository, never()).deleteAllByCategoryId(any());
    }

    @Test
    void deleteCategory_throws404_whenNotOwned() {
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.deleteCategory(userId, categoryId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // --- reassignEntries ---

    @Test
    void reassignEntries_reassignsAndDeletesSource() {
        UUID fromId = UUID.randomUUID();
        UUID toId = UUID.randomUUID();
        CategoryEntity source = buildCategory(fromId, userId, "Old", "expense", 0);
        CategoryEntity target = buildCategory(toId,   userId, "New", "expense", 1);

        when(categoryRepository.findByIdAndUserId(fromId, userId)).thenReturn(Optional.of(source));
        when(categoryRepository.findByIdAndUserId(toId,   userId)).thenReturn(Optional.of(target));
        when(entryRepository.reassignEntries(userId, fromId, toId)).thenReturn(3);

        categoryService.reassignEntries(userId, fromId, toId);

        verify(entryRepository).reassignEntries(userId, fromId, toId);
        verify(projectionRepository).deleteAllByCategoryId(fromId);
        verify(categoryRepository).delete(source);
        verify(auditLogService).log(any(), eq("category"), eq(fromId.toString()), eq(AuditAction.DELETE));
    }

    @Test
    void reassignEntries_throwsBusinessRule_whenTypeMismatch() {
        UUID fromId = UUID.randomUUID();
        UUID toId = UUID.randomUUID();
        CategoryEntity source = buildCategory(fromId, userId, "Salary", "income",  0);
        CategoryEntity target = buildCategory(toId,   userId, "Rent",   "expense", 0);

        when(categoryRepository.findByIdAndUserId(fromId, userId)).thenReturn(Optional.of(source));
        when(categoryRepository.findByIdAndUserId(toId,   userId)).thenReturn(Optional.of(target));

        assertThatThrownBy(() -> categoryService.reassignEntries(userId, fromId, toId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("different type");

        verify(entryRepository, never()).reassignEntries(any(), any(), any());
        verify(categoryRepository, never()).delete(any());
    }

    @Test
    void reassignEntries_throws404_whenSourceNotOwned() {
        UUID fromId = UUID.randomUUID();
        UUID toId = UUID.randomUUID();
        when(categoryRepository.findByIdAndUserId(fromId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.reassignEntries(userId, fromId, toId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // --- seedDefaultCategories ---

    @Test
    void seedDefaultCategories_savesThreeDefaults() {
        when(categoryRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        categoryService.seedDefaultCategories(userId);

        ArgumentCaptor<List<CategoryEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(categoryRepository).saveAll(captor.capture());

        List<CategoryEntity> saved = captor.getValue();
        assertThat(saved).hasSize(3);
        assertThat(saved).extracting(CategoryEntity::getEntryType)
                .containsExactlyInAnyOrder("income", "expense", "savings");
        assertThat(saved).allMatch(CategoryEntity::isDefault);
    }

    // --- helpers ---

    private CategoryEntity buildCategory(UUID id, UUID ownerId, String name, String type, int sortOrder) {
        return CategoryEntity.builder()
                .id(id)
                .userId(ownerId)
                .name(name)
                .entryType(type)
                .isDefault(false)
                .sortOrder(sortOrder)
                .createdAt(Instant.now())
                .build();
    }
}
