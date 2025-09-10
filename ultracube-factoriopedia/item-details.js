/**
 * Item details page logic
 */

class ItemDetailsApp {
    constructor() {
        this.itemId = this.getItemIdFromUrl();
        this.item = null;

        this.initializeElements();
        this.loadData();
    }

    initializeElements() {
        this.loading = document.getElementById('loading');
        this.itemDetails = document.getElementById('item-details');
        this.itemName = document.getElementById('item-name');
        this.itemType = document.getElementById('item-type');
        this.itemIdEl = document.getElementById('item-id');
        this.howToMakeSection = document.getElementById('how-to-make');
        this.usedInSection = document.getElementById('used-in');
        this.canCraftSection = document.getElementById('can-craft');
        this.recipesThatMake = document.getElementById('recipes-that-make');
        this.recipesThatUse = document.getElementById('recipes-that-use');
        this.recipesCanCraft = document.getElementById('recipes-can-craft');
        this.unlockTechSection = document.getElementById('unlock-tech');
        this.unlockTechName = document.getElementById('unlock-tech-name');
        this.itemHeaderIcon = document.getElementById('item-header-icon');
        this.itemHeaderIconPlaceholder = document.getElementById('item-header-icon-placeholder');
    }

    getItemIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    async loadData() {
        if (!this.itemId) {
            this.showError('No item ID provided');
            return;
        }

        const success = await window.dataProcessor.loadData();
        if (success) {
            this.loadItemDetails();
        } else {
            this.showError('Error loading data');
        }
    }

    loadItemDetails() {
        this.item = window.dataProcessor.getItem(this.itemId);

        if (!this.item) {
            this.showError('Item not found');
            return;
        }

        this.displayItemHeader();
        this.displayRecipesThatMake();
        this.displayRecipesThatUse();
        this.displayCraftingCapabilities();

        this.hideLoading();
    }

    displayItemHeader() {
        this.itemName.textContent = this.item.displayName;
        this.itemType.textContent = this.item.type;

        // Display large header icon
        const iconFilename = window.dataProcessor.getItemIcon(this.itemId);
        if (iconFilename) {
            this.itemHeaderIcon.src = `icons/${iconFilename}`;
            this.itemHeaderIcon.style.display = 'block';
            this.itemHeaderIconPlaceholder.style.display = 'none';
        } else {
            this.itemHeaderIcon.style.display = 'none';
            this.itemHeaderIconPlaceholder.style.display = 'flex';
        }

        // Display technology that unlocks this item
        const unlockingTech = window.dataProcessor.getTechnologyThatUnlocks(this.itemId);
        if (unlockingTech) {
            this.unlockTechName.textContent = unlockingTech.cleaned_name || unlockingTech.name;
            this.unlockTechSection.style.display = 'block';
        } else {
            this.unlockTechSection.style.display = 'none';
        }
    }

    displayRecipesThatMake() {
        const recipes = window.dataProcessor.getRecipesThatMake(this.itemId);

        if (recipes.length === 0) {
            this.howToMakeSection.style.display = 'none';
            return;
        }

        this.howToMakeSection.style.display = 'block';
        this.recipesThatMake.innerHTML = '';

        recipes.forEach(recipe => {
            const recipeEl = this.createRecipeElement(recipe);
            this.recipesThatMake.appendChild(recipeEl);
        });
    }

    displayRecipesThatUse() {
        const recipes = window.dataProcessor.getRecipesThatUse(this.itemId);

        if (recipes.length === 0) {
            this.usedInSection.style.display = 'none';
            return;
        }

        this.usedInSection.style.display = 'block';
        this.recipesThatUse.innerHTML = '';

        recipes.forEach(recipe => {
            const recipeEl = this.createRecipeElement(recipe);
            this.recipesThatUse.appendChild(recipeEl);
        });
    }

    displayCraftingCapabilities() {
        // Check if this item is a crafting entity
        const craftingEntity = window.dataProcessor.getCraftingEntity(this.itemId);

        if (!craftingEntity) {
            this.canCraftSection.style.display = 'none';
            return;
        }

        const recipes = window.dataProcessor.getRecipesCraftableBy(this.itemId);

        if (recipes.length === 0) {
            this.canCraftSection.style.display = 'none';
            return;
        }

        this.canCraftSection.style.display = 'block';
        this.recipesCanCraft.innerHTML = '';

        recipes.forEach(recipe => {
            const recipeEl = this.createRecipeElement(recipe, false); // Don't show entity info for crafting capabilities
            this.recipesCanCraft.appendChild(recipeEl);
        });
    }

    createRecipeElement(recipe, showEntity = true) {
        const div = document.createElement('div');
        div.className = 'recipe-card';

        // Compose crafting entity and time info
        let metaHtml = '';
        if (showEntity && recipe.craftingEntity) {
            metaHtml += this.createCraftingEntityHtml(recipe.craftingEntity);
        }
        if (recipe.energy_required) {
            metaHtml += ` <span class="recipe-time">(${recipe.energy_required}s)</span>`;
        }
        if (metaHtml) {
            metaHtml = `<span style="display: flex; align-items: center; gap: 0.5em;">${metaHtml}</span>`;
        }

        const headerHtml = `
            <div class="recipe-header" style="display: flex; align-items: center; justify-content: flex-start; gap: 0.5em;">
                <span class="recipe-name">${this.escapeHtml(recipe.displayName)}</span>${metaHtml}
            </div>
        `;

        const flowHtml = `
            <div class="recipe-flow" style="position: relative;">
                <div class="ingredients">
                    <div class="ingredients-label">Ingredients</div>
                    ${recipe.ingredients.map(ing => this.createIngredientHtml(ing)).join('')}
                </div>
                <div class="arrow">→</div>
                <div class="results">
                    <div class="results-label">Results</div>
                    ${recipe.results.map(res => this.createResultHtml(res)).join('')}
                </div>
            </div>
        `;

        div.innerHTML = headerHtml + flowHtml;
        return div;
    }

    createCraftingEntityHtml(entity) {
        const ICON_SIZE = 48;
        const iconFilename = window.dataProcessor.getItemIcon(entity.id);
        const iconHtml = iconFilename
            ? `<img src="icons/${iconFilename}" alt="${entity.name}" class="entity-icon" width="${ICON_SIZE}" height="${ICON_SIZE}" onerror="this.style.display='none'">`
            : `<div class="entity-icon-placeholder" style="width:${ICON_SIZE}px;height:${ICON_SIZE}px;">🏭</div>`;

        // Remove "Cube" or "Handcraft" from the entity name
        let displayName = entity.name.replace(/\b(Cube|Handcraft)\b/g, '').trim();

        return `
            <span class="crafting-entity" style="display: flex; flex-direction: row; align-items: center; gap: 0.5em;">
                <span>${this.escapeHtml(displayName)}</span>
                ${iconHtml}
            </span>
        `;
    }


    createIngredientHtml(ingredient) {
        const ICON_SIZE = 48;
        const item = window.dataProcessor.getItem(ingredient.name);
        const displayName = item ? item.displayName : ingredient.name;
        const iconFilename = window.dataProcessor.getItemIcon(ingredient.name);
        const iconHtml = iconFilename
            ? `<img src="icons/${iconFilename}" alt="${displayName}" class="item-icon-small" width="${ICON_SIZE}" height="${ICON_SIZE}" onerror="this.style.display='none'">`
            : `<div class="item-icon-small-placeholder" style="width:${ICON_SIZE}px;height:${ICON_SIZE}px;"></div>`;

        return `
            <div class="ingredient-item" style="display: flex; align-items: center;">
                ${iconHtml}
                <div class="item-info-small" style="text-align: left;">
                    <a href="item.html?id=${encodeURIComponent(ingredient.name)}" class="item-name-link">
                        ${ingredient.amount || 1} × ${this.escapeHtml(displayName)}
                    </a>
                </div>
            </div>
        `;
    }

    createResultHtml(result) {
        const ICON_SIZE = 48;
        const item = window.dataProcessor.getItem(result.name);
        const displayName = item ? item.displayName : result.name;
        const iconFilename = window.dataProcessor.getItemIcon(result.name);
        const iconHtml = iconFilename
            ? `<img src="icons/${iconFilename}" alt="${displayName}" class="item-icon-small" width="${ICON_SIZE}" height="${ICON_SIZE}" onerror="this.style.display='none'">`
            : `<div class="item-icon-small-placeholder" style="width:${ICON_SIZE}px;height:${ICON_SIZE}px;"></div>`;

        return `
            <div class="result-item" style="display: flex; align-items: center;">
                ${iconHtml}
                <div class="item-info-small" style="text-align: left; margin-left: 0.5em;">
                    <a href="item.html?id=${encodeURIComponent(result.name)}" class="item-name-link">
                        ${result.amount || 1} × ${this.escapeHtml(displayName)}
                    </a>
                </div>
            </div>
        `;
    }


    hideLoading() {
        this.loading.style.display = 'none';
        this.itemDetails.style.display = 'block';
    }

    showError(message) {
        this.loading.textContent = message;
        this.itemDetails.style.display = 'none';
    }

    escapeHtml(text) {
        if (typeof text !== 'string') text = String(text);
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ItemDetailsApp();
});