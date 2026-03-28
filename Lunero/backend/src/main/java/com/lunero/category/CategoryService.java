package com.lunero.category;

import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.BusinessRuleException;
import com.lunero.common.exception.ConflictException;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.entry.EntryRepository;
import com.lunero.projection.CategoryProjectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final EntryRepository entryRepository;
    private final AuditLogService auditLogService;
    private final CategoryProjectionRepository projectionRepository;

    @Transactional(readOnly = true)
    public List<CategoryEntity> getCategories(UUID userId) {
        return categoryRepository.findAllByUserIdOrderBySortOrderAsc(userId);
    }

    @Transactional
    public CategoryEntity createCategory(UUID userId, CreateCategoryRequest dto) {
        int nextSortOrder = (int) categoryRepository.countByUserIdAndEntryType(userId, dto.entryType());

        CategoryEntity category = CategoryEntity.builder()
                .userId(userId)
                .name(dto.name())
                .entryType(dto.entryType())
                .isDefault(false)
                .sortOrder(nextSortOrder)
                .build();

        CategoryEntity saved = categoryRepository.save(category);
        auditLogService.log(userId.toString(), "category", saved.getId().toString(), AuditAction.CREATE);
        log.info("Created category id={} type={} for userId={}", saved.getId(), saved.getEntryType(), userId);
        return saved;
    }

    /**
     * Updates name and/or sortOrder only. entryType changes are rejected (Property 8).
     */
    @Transactional
    public CategoryEntity updateCategory(UUID userId, UUID categoryId, UpdateCategoryRequest dto) {
        CategoryEntity category = getOwnedCategory(userId, categoryId);

        if (dto.name() != null) category.setName(dto.name());
        if (dto.sortOrder() != null) category.setSortOrder(dto.sortOrder());

        CategoryEntity saved = categoryRepository.save(category);
        auditLogService.log(userId.toString(), "category", categoryId.toString(), AuditAction.UPDATE);
        return saved;
    }

    /**
     * Deletes a category. Returns 409 if entries are assigned and no reassignment target is provided (Property 10).
     */
    @Transactional
    public void deleteCategory(UUID userId, UUID categoryId) {
        CategoryEntity category = getOwnedCategory(userId, categoryId);

        if (entryRepository.existsByCategoryAndIsDeletedFalse(category.getName())) {
            throw new ConflictException(
                    "Category has assigned entries. Reassign entries before deleting, or use the reassign endpoint.");
        }

        // Remove all projections for this category across all FlowSheets (Req 22.10)
        projectionRepository.deleteAllByCategoryId(categoryId);

        categoryRepository.delete(category);
        auditLogService.log(userId.toString(), "category", categoryId.toString(), AuditAction.DELETE);
        log.info("Deleted category id={} for userId={}", categoryId, userId);
    }

    /**
     * Reassigns all entries from {@code fromId} to {@code toId}, then deletes {@code fromId}.
     * Target category must exist, belong to the same user, and have the same entryType.
     */
    @Transactional
    public void reassignEntries(UUID userId, UUID fromId, UUID toId) {
        CategoryEntity source = getOwnedCategory(userId, fromId);
        CategoryEntity target = getOwnedCategory(userId, toId);

        if (!source.getEntryType().equals(target.getEntryType())) {
            throw new BusinessRuleException(
                    "Cannot reassign entries to a category of a different type. " +
                    "Source type: " + source.getEntryType() + ", target type: " + target.getEntryType());
        }

        int reassigned = entryRepository.reassignEntries(userId, source.getName(), target.getName());
        log.info("Reassigned {} entries from categoryId={} to categoryId={}", reassigned, fromId, toId);

        // Remove projections for the deleted category (Req 22.10)
        projectionRepository.deleteAllByCategoryId(fromId);

        categoryRepository.delete(source);
        auditLogService.log(userId.toString(), "category", fromId.toString(), AuditAction.DELETE);
    }

    /**
     * Seeds default categories for a newly created user.
     * Called from UserService on first user creation.
     */
    @Transactional
    public void seedDefaultCategories(UUID userId) {
        List<CategoryEntity> defaults = List.of(
                buildDefault(userId, "Salary",   "income",  0),
                buildDefault(userId, "General",  "expense", 0),
                buildDefault(userId, "Savings",  "savings", 0)
        );
        categoryRepository.saveAll(defaults);
        log.info("Seeded default categories for userId={}", userId);
    }

    // --- helpers ---

    private CategoryEntity getOwnedCategory(UUID userId, UUID categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Category", categoryId));
    }

    private CategoryEntity buildDefault(UUID userId, String name, String entryType, int sortOrder) {
        return CategoryEntity.builder()
                .userId(userId)
                .name(name)
                .entryType(entryType)
                .isDefault(true)
                .sortOrder(sortOrder)
                .build();
    }
}
