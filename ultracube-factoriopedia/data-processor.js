/**
 * Data processing utilities for the Ultracube Factoriopedia
 * Loads and processes the JSON data to create useful lookup structures
 */

class UltracubeDataProcessor {
    constructor() {
        this.data = null;
        this.recipes = [];
        this.items = [];
        this.craftingEntities = [];
        this.recipeLookup = new Map();
        this.itemLookup = new Map();
        this.craftingLookup = new Map();
        this.iconMapping = {};
    }

    async loadData() {
        try {
            const response = await fetch('ultracube_organized_data.json');
            this.data = await response.json();

            const iconResponse = await fetch('icons/icon_mapping.json');
            this.iconMapping = await iconResponse.json();

            this.processData();
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }

    processData() {
        // Extract and index items (including fluids, technology, science, etc.)
        this.items = [];

        const itemTypes = ['item', 'fluid', 'science', 'armor', 'module', 'capsule', 'repair-tool', 'item-with-entity-data', 'rail-planner'];
        itemTypes.forEach(type => {
            if (this.data[type]) {
                const typeItems = this.data[type].map(item => ({
                    ...item,
                    displayName: item.cleaned_name || item.name,
                    id: item.name,
                    type: type
                }));
                this.items.push(...typeItems);

                typeItems.forEach(item => {
                    this.itemLookup.set(item.name, item);
                });
            }
        });

        // Extract and process recipes
        if (this.data.recipe) {
            this.recipes = this.data.recipe.map(recipe => {
                const processed = {
                    ...recipe,
                    displayName: recipe.cleaned_name || recipe.name,
                    id: recipe.name,
                    ingredients: this.extractItems(recipe.ingredients),
                    results: this.extractItems(recipe.results),
                    craftingEntity: this.findCraftingEntity(recipe.category)
                };
                return processed;
            });

            this.recipes.forEach(recipe => {
                this.recipeLookup.set(recipe.name, recipe);
            });
        }

        // Extract crafting entities (assembling machines, furnaces, etc.)
        const entityTypes = ['assembling-machine', 'furnace', 'mining-drill', 'lab'];
        this.craftingEntities = [];

        entityTypes.forEach(type => {
            if (this.data[type]) {
                this.data[type].forEach(entity => {
                    const crafting = {
                        ...entity,
                        displayName: entity.cleaned_name || entity.name,
                        id: entity.name,
                        type: type,
                        categories: this.extractCategories(entity.crafting_categories)
                    };
                    this.craftingEntities.push(crafting);
                    this.craftingLookup.set(entity.name, crafting);
                });
            }
        });

        console.log('Data processed:', {
            items: this.items.length,
            recipes: this.recipes.length,
            craftingEntities: this.craftingEntities.length
        });
    }

    extractItems(itemsData) {
        if (!itemsData) return [];

        if (Array.isArray(itemsData)) {
            return itemsData;
        }

        if (itemsData._array_items) {
            return itemsData._array_items;
        }

        return [];
    }

    extractCategories(categoriesData) {
        if (!categoriesData) return [];

        if (Array.isArray(categoriesData)) {
            return categoriesData;
        }

        if (categoriesData._array_items) {
            return categoriesData._array_items;
        }

        return [];
    }

    findCraftingEntity(category) {
        if (!category) return null;

        // Find crafting entity that can handle this recipe category
        const entity = this.craftingEntities.find(e =>
            e.categories && e.categories.includes(category)
        );

        if (entity) {
            return {
                name: entity.displayName,
                id: entity.id,
                type: entity.type
            };
        }

        // Fallback: try to match by category name
        const categoryMappings = {
            'crafting': 'Assembling Machine',
            'smelting': 'Furnace',
            'chemistry': 'Chemical Plant',
            'oil-processing': 'Oil Refinery',
            'rocket-building': 'Rocket Silo'
        };

        return {
            name: categoryMappings[category] || category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            id: category,
            type: 'category'
        };
    }

    getRecipesThatMake(itemName) {
        return this.recipes.filter(recipe =>
            recipe.results.some(result => result.name === itemName)
        );
    }

    getRecipesThatUse(itemName) {
        return this.recipes.filter(recipe =>
            recipe.ingredients.some(ingredient => ingredient.name === itemName)
        );
    }

    getRecipesCraftableBy(entityName) {
        const entity = this.craftingLookup.get(entityName);
        if (!entity || !entity.categories) return [];

        return this.recipes.filter(recipe =>
            entity.categories.includes(recipe.category)
        );
    }

    getAllItems() {
        return this.items;
    }

    getAllRecipes() {
        return this.recipes;
    }

    getItem(itemName) {
        return this.itemLookup.get(itemName);
    }

    getRecipe(recipeName) {
        return this.recipeLookup.get(recipeName);
    }

    getCraftingEntity(entityName) {
        return this.craftingLookup.get(entityName);
    }

    getItemTypes() {
        const types = new Set(['item']);

        // Add other relevant types that might be interesting to browse
        Object.keys(this.data).forEach(key => {
            if (['fluid', 'science', 'armor', 'module', 'capsule', 'repair-tool', 'item-with-entity-data', 'rail-planner'].includes(key)) {
                types.add(key);
            }
        });

        return Array.from(types).sort();
    }

    searchItems(query, typeFilter = '') {
        let filteredItems = this.items;

        // Apply type filter
        if (typeFilter) {
            filteredItems = filteredItems.filter(item => item.type === typeFilter);
        }

        // Apply search query
        if (query) {
            const lowerQuery = query.toLowerCase();
            filteredItems = filteredItems.filter(item =>
                item.displayName.toLowerCase().includes(lowerQuery) ||
                item.name.toLowerCase().includes(lowerQuery)
            );
        }

        return filteredItems;
    }

    getItemIcon(itemName) {
        return this.iconMapping[itemName] || null;
    }

    getTechnologyThatUnlocks(itemName) {
        if (!this.data.technology) return null;

        return this.data.technology.find(tech => {
            if (!tech.effects) return false;

            const effects = this.extractItems(tech.effects);
            return effects.some(effect => {
                // Check for recipe unlock effects
                if (effect.type === 'unlock-recipe') {
                    const recipe = this.getRecipe(effect.recipe);
                    if (recipe) {
                        // Check if this recipe produces the item we're looking for
                        return recipe.results.some(result => result.name === itemName);
                    }
                }
                return false;
            });
        });
    }
}

// Create global instance
window.dataProcessor = new UltracubeDataProcessor();