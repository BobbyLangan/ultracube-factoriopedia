/**
 * Main application logic for the homepage
 */

class UltracubeApp {
    constructor() {
        this.currentItems = [];
        this.currentQuery = '';
        this.currentTypeFilter = '';
        this.currentSort = 'name';
        
        this.initializeElements();
        this.bindEvents();
        this.loadData();
    }

    initializeElements() {
        this.searchInput = document.getElementById('search-input');
        this.typeFilter = document.getElementById('type-filter');
        this.sortSelect = document.getElementById('sort-select');
        this.itemsGrid = document.getElementById('items-grid');
        this.loading = document.getElementById('loading');
        this.itemCount = document.getElementById('item-count');
    }

    bindEvents() {
        this.searchInput.addEventListener('input', this.handleSearch.bind(this));
        this.typeFilter.addEventListener('change', this.handleFilterChange.bind(this));
        this.sortSelect.addEventListener('change', this.handleSortChange.bind(this));
    }

    async loadData() {
        const success = await window.dataProcessor.loadData();
        if (success) {
            this.populateFilters();
            this.displayItems();
            this.hideLoading();
        } else {
            this.showError();
        }
    }

    populateFilters() {
        const types = window.dataProcessor.getItemTypes();
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            this.typeFilter.appendChild(option);
        });
    }

    displayItems() {
        this.currentItems = window.dataProcessor.searchItems(
            this.currentQuery, 
            this.currentTypeFilter
        );
        
        this.sortItems();
        this.renderItems();
        this.updateItemCount();
    }

    sortItems() {
        this.currentItems.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.displayName.localeCompare(b.displayName);
                case 'type':
                    return a.type.localeCompare(b.type) || a.displayName.localeCompare(b.displayName);
                default:
                    return 0;
            }
        });
    }

    renderItems() {
        this.itemsGrid.innerHTML = '';
        
        if (this.currentItems.length === 0) {
            this.itemsGrid.innerHTML = '<div class=\"no-data\">No items found matching your criteria.</div>';
            return;
        }

        this.currentItems.forEach(item => {
            const card = this.createItemCard(item);
            this.itemsGrid.appendChild(card);
        });
    }

    createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.onclick = () => this.navigateToItem(item.id);
        
        const iconFilename = window.dataProcessor.getItemIcon(item.id);
        const iconHtml = iconFilename 
            ? `<img src=\"icons/${iconFilename}\" alt=\"${item.displayName}\" class=\"item-icon\" onerror=\"this.style.display='none'\">`
            : '<div class=\"item-icon-placeholder\"></div>';
        
        card.innerHTML = `
            ${iconHtml}
            <h3>${this.escapeHtml(item.displayName)}</h3>
            <div class=\"item-type\">${this.escapeHtml(item.type)}</div>
        `;
        
        return card;
    }

    navigateToItem(itemId) {
        window.location.href = `item.html?id=${encodeURIComponent(itemId)}`;
    }

    handleSearch(event) {
        this.currentQuery = event.target.value;
        this.displayItems();
    }

    handleFilterChange(event) {
        this.currentTypeFilter = event.target.value;
        this.displayItems();
    }

    handleSortChange(event) {
        this.currentSort = event.target.value;
        this.displayItems();
    }

    updateItemCount() {
        const total = window.dataProcessor.getAllItems().length;
        const filtered = this.currentItems.length;
        
        if (this.currentQuery || this.currentTypeFilter) {
            this.itemCount.textContent = `Showing ${filtered} of ${total} items`;
        } else {
            this.itemCount.textContent = `${total} items total`;
        }
    }

    hideLoading() {
        this.loading.style.display = 'none';
        this.itemsGrid.style.display = 'grid';
    }

    showError() {
        this.loading.textContent = 'Error loading data. Please make sure the data file is available.';
    }

    escapeHtml(text) {
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
    new UltracubeApp();
});