// Content Saver Application
class ContentSaver {
    constructor() {
        this.contents = JSON.parse(localStorage.getItem('savedContents')) || [];
        this.currentFilter = '';
        this.currentSort = 'newest';
        
        this.initializeEventListeners();
        this.renderContents();
        this.updateContentCount();
    }

    initializeEventListeners() {
        // Form submission
        document.getElementById('contentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addContent();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.currentFilter = e.target.value.toLowerCase();
            this.renderContents();
        });

        // Sort functionality
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderContents();
        });

        // Clear all button
        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAllContents();
        });

        // Auto-fill title from URL
        document.getElementById('contentUrl').addEventListener('blur', (e) => {
            this.autoFillTitle(e.target.value);
        });
    }

    addContent() {
        const url = document.getElementById('contentUrl').value.trim();
        const title = document.getElementById('contentTitle').value.trim();
        const description = document.getElementById('contentDescription').value.trim();
        const tags = document.getElementById('contentTags').value.trim();

        if (!url) {
            this.showNotification('Please enter a URL or content', 'error');
            return;
        }

        const content = {
            id: Date.now(),
            url: url,
            title: title || this.extractTitleFromUrl(url),
            description: description,
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            dateAdded: new Date().toISOString(),
            isUrl: this.isValidUrl(url)
        };

        this.contents.unshift(content);
        this.saveToLocalStorage();
        this.renderContents();
        this.updateContentCount();
        this.clearForm();
        this.showNotification('Content saved successfully!', 'success');
    }

    extractTitleFromUrl(url) {
        try {
            if (this.isValidUrl(url)) {
                const urlObj = new URL(url);
                return urlObj.hostname.replace('www.', '') + ' - ' + urlObj.pathname;
            }
            return url.substring(0, 50) + (url.length > 50 ? '...' : '');
        } catch {
            return url.substring(0, 50) + (url.length > 50 ? '...' : '');
        }
    }

    async autoFillTitle(url) {
        const titleInput = document.getElementById('contentTitle');
        if (titleInput.value.trim() || !this.isValidUrl(url)) return;

        // Simple title extraction - in a real app, you might use a service
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '').replace(/\.[^.]+$/, '');
            const suggestedTitle = this.capitalizeWords(domain);
            // Only set if the input is still empty to avoid overwriting user input
            if (!titleInput.value.trim()) {
                titleInput.value = suggestedTitle;
            }
        } catch {
            // Invalid URL, skip auto-fill
        }
    }

    capitalizeWords(str) {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    }

    deleteContent(id) {
        if (confirm('Are you sure you want to delete this content?')) {
            this.contents = this.contents.filter(content => content.id !== id);
            this.saveToLocalStorage();
            this.renderContents();
            this.updateContentCount();
            this.showNotification('Content deleted', 'info');
        }
    }

    editContent(id) {
        const content = this.contents.find(c => c.id === id);
        if (!content) return;

        // Fill form with existing data
        document.getElementById('contentUrl').value = content.url;
        document.getElementById('contentTitle').value = content.title;
        document.getElementById('contentDescription').value = content.description;
        document.getElementById('contentTags').value = content.tags.join(', ');

        // Delete the old content
        this.contents = this.contents.filter(c => c.id !== id);
        this.saveToLocalStorage();
        this.renderContents();
        this.updateContentCount();

        // Scroll to form
        document.querySelector('.add-content-section').scrollIntoView({ behavior: 'smooth' });
        this.showNotification('Content loaded for editing', 'info');
    }

    clearAllContents() {
        if (this.contents.length === 0) {
            this.showNotification('No content to clear', 'info');
            return;
        }

        if (confirm(`Are you sure you want to delete all ${this.contents.length} saved items? This action cannot be undone.`)) {
            this.contents = [];
            this.saveToLocalStorage();
            this.renderContents();
            this.updateContentCount();
            this.showNotification('All content cleared', 'info');
        }
    }

    filterContents() {
        if (!this.currentFilter) return this.contents;

        return this.contents.filter(content => 
            content.title.toLowerCase().includes(this.currentFilter) ||
            content.description.toLowerCase().includes(this.currentFilter) ||
            content.url.toLowerCase().includes(this.currentFilter) ||
            content.tags.some(tag => tag.toLowerCase().includes(this.currentFilter))
        );
    }

    sortContents(contents) {
        const sorted = [...contents];
        
        switch (this.currentSort) {
            case 'oldest':
                return sorted.reverse();
            case 'title':
                return sorted.sort((a, b) => a.title.localeCompare(b.title));
            case 'newest':
            default:
                return sorted;
        }
    }

    renderContents() {
        const filteredContents = this.filterContents();
        const sortedContents = this.sortContents(filteredContents);
        const contentList = document.getElementById('contentList');
        const emptyState = document.getElementById('emptyState');

        if (sortedContents.length === 0) {
            contentList.innerHTML = '';
            emptyState.classList.remove('hidden');
            if (this.currentFilter && this.contents.length > 0) {
                emptyState.innerHTML = `
                    <i class="fas fa-search"></i>
                    <h3>No matching content found</h3>
                    <p>Try adjusting your search terms</p>
                `;
            } else {
                emptyState.innerHTML = `
                    <i class="fas fa-bookmark"></i>
                    <h3>No content saved yet</h3>
                    <p>Start by adding your first URL or content above</p>
                `;
            }
            return;
        }

        emptyState.classList.add('hidden');
        contentList.innerHTML = sortedContents.map(content => this.createContentItemHTML(content)).join('');
    }

    createContentItemHTML(content) {
        const formattedDate = new Date(content.dateAdded).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const tagsHTML = content.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('');
        
        const urlDisplay = content.isUrl ? 
            `<a href="${content.url}" target="_blank" rel="noopener noreferrer" class="content-url">${this.escapeHtml(content.url)}</a>` :
            `<span class="content-url">${this.escapeHtml(content.url)}</span>`;

        return `
            <div class="content-item" data-id="${content.id}">
                <div class="content-item-header">
                    <div>
                        <h3 class="content-title">${this.escapeHtml(content.title)}</h3>
                        ${urlDisplay}
                    </div>
                    <div class="content-actions">
                        <button class="btn btn-secondary" onclick="contentSaver.editContent(${content.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="contentSaver.deleteContent(${content.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${content.description ? `<p class="content-description">${this.escapeHtml(content.description)}</p>` : ''}
                <div class="content-meta">
                    <div class="content-tags">
                        ${tagsHTML}
                    </div>
                    <span class="content-date">${formattedDate}</span>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateContentCount() {
        const count = this.contents.length;
        const countElement = document.getElementById('contentCount');
        countElement.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }

    clearForm() {
        document.getElementById('contentForm').reset();
    }

    saveToLocalStorage() {
        localStorage.setItem('savedContents', JSON.stringify(this.contents));
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;

        // Add animation styles
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#17a2b8',
            warning: '#ffc107'
        };
        return colors[type] || '#17a2b8';
    }

    // Export data
    exportData() {
        const dataStr = JSON.stringify(this.contents, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'content-saver-backup.json';
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully!', 'success');
    }

    // Import data
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    this.contents = importedData;
                    this.saveToLocalStorage();
                    this.renderContents();
                    this.updateContentCount();
                    this.showNotification('Data imported successfully!', 'success');
                } else {
                    this.showNotification('Invalid file format', 'error');
                }
            } catch (error) {
                this.showNotification('Error reading file', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contentSaver = new ContentSaver();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    
    // Ctrl/Cmd + N to focus add content
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('contentUrl').focus();
    }
});

// Service Worker Registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}