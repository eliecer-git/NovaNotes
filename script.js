class NoteApp {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('novanotes_data')) || [];
        this.activeNoteId = null;
        this.searchTerm = '';

        this.DEFAULT_STYLES = {
            titleFont: "Outfit, sans-serif",
            titleSize: "2.5rem",
            titleColor: "#f8fafc",
            contentFont: "Inter, sans-serif",
            contentSize: "1.15rem",
            textColor: "#94a3b8"
        };

        // DOM Elements
        this.notesList = document.getElementById('notes-list');
        this.newNoteBtn = document.getElementById('new-note-btn');
        this.deleteNoteBtn = document.getElementById('delete-note-btn');
        this.saveNoteBtn = document.getElementById('save-note-btn');
        this.searchInput = document.getElementById('search-input');
        this.noteTitleInput = document.getElementById('note-title');
        this.noteContentInput = document.getElementById('note-content');
        this.lastEditedText = document.getElementById('last-edited');
        this.noteCountText = document.getElementById('note-count');
        this.editorView = document.getElementById('editor-view');
        this.editorFields = document.querySelector('.editor-fields');
        this.emptyState = document.querySelector('.empty-state');
        this.titleFontSelect = document.getElementById('title-font-select');
        this.titleSizeSelect = document.getElementById('title-size-select');
        this.titleColorPicker = document.getElementById('title-color-picker');
        this.contentFontSelect = document.getElementById('content-font-select');
        this.contentSizeSelect = document.getElementById('content-size-select');
        this.textColorPicker = document.getElementById('text-color-picker');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.emojiBtn = document.getElementById('emoji-btn');
        this.emojiPicker = document.getElementById('emoji-picker');
        this.iaBtn = document.getElementById('ia-btn');
        this.iaPanel = document.getElementById('novavision-panel');
        this.iaSearchInput = document.getElementById('ia-search-input');
        this.iaSearchBtn = document.getElementById('ia-search-btn');
        this.iaResults = document.getElementById('ia-results');
        this.closeIaBtn = document.getElementById('close-ia');
        this.selectionToolbar = document.getElementById('selection-toolbar');
        this.selectionColorPicker = document.getElementById('selection-color-picker');
        this.appContainer = document.querySelector('.app-container');
        this.formatToolbar = document.getElementById('format-toolbar');

        // Optimized Debouncing
        this.debouncedSaveAndRender = this.debounce(() => this.autoSave(true), 1500);
        this.debouncedSelection = this.debounce(() => this.handleSelection(), 100);

        this.init();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    init() {
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.deleteNoteBtn.onclick = (e) => { e.preventDefault(); this.deleteNote(); };
        this.saveNoteBtn.onclick = () => this.saveActiveNote();
        this.searchInput.oninput = (e) => this.handleSearch(e.target.value);
        this.fullscreenBtn.onclick = () => this.toggleFullscreen();

        this.emojiBtn.onclick = (e) => { e.stopPropagation(); this.toggleEmojiPicker(); };
        this.iaBtn.onclick = (e) => { e.stopPropagation(); this.toggleIaPanel(); };
        this.closeIaBtn.onclick = () => this.iaPanel.hidden = true;
        this.iaSearchBtn.onclick = () => this.searchImages();
        this.iaSearchInput.onkeypress = (e) => { if (e.key === 'Enter') this.searchImages(); };

        document.addEventListener('click', (e) => {
            if (this.emojiPicker) this.emojiPicker.hidden = true;
            if (this.iaPanel && !this.iaPanel.contains(e.target) && e.target !== this.iaBtn) {
                this.iaPanel.hidden = true;
            }
        });

        // Content Editable Events
        this.noteTitleInput.oninput = () => {
            this.updateSidebarCardPreview();
            this.debouncedSaveAndRender();
        };
        // Prevent enter key in title
        this.noteTitleInput.onkeydown = (e) => { if (e.key === 'Enter') e.preventDefault(); };

        this.noteContentInput.oninput = () => {
            this.updateSidebarCardPreview();
            this.debouncedSaveAndRender();
        };
        this.noteContentInput.onpaste = (e) => this.handlePaste(e);

        document.addEventListener('selectionchange', () => this.debouncedSelection());
        this.selectionColorPicker.oninput = (e) => this.applySelectionColor(e.target.value);

        this.renderNotesList();
        this.updateStats();
        this.initEmojiPicker();

        // Format listeners
        this.titleFontSelect.onchange = (e) => this.updateFormat('titleFont', e.target.value);
        this.titleSizeSelect.onchange = (e) => this.updateFormat('titleSize', e.target.value);
        this.titleColorPicker.oninput = (e) => this.updateFormat('titleColor', e.target.value);
        this.contentFontSelect.onchange = (e) => this.updateFormat('contentFont', e.target.value);
        this.contentSizeSelect.onchange = (e) => this.updateFormat('contentSize', e.target.value);
        this.textColorPicker.oninput = (e) => this.updateFormat('textColor', e.target.value);
    }

    handleSelection() {
        const selection = window.getSelection();
        const isInContent = this.noteContentInput.contains(selection.anchorNode);
        const isInTitle = this.noteTitleInput.contains(selection.anchorNode);

        if (selection.rangeCount > 0 && selection.toString().trim().length > 0 && (isInContent || isInTitle)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            requestAnimationFrame(() => {
                this.selectionToolbar.hidden = false;
                this.selectionToolbar.style.top = `${rect.top + window.scrollY - 60}px`;
                this.selectionToolbar.style.left = `${rect.left + window.scrollX}px`;
            });
        } else {
            this.selectionToolbar.hidden = true;
        }
    }

    applySelectionColor(color) {
        document.execCommand('foreColor', false, color);
        this.debouncedSaveAndRender();
    }

    toggleIaPanel() {
        this.iaPanel.hidden = !this.iaPanel.hidden;
        if (!this.iaPanel.hidden) this.iaSearchInput.focus();
    }

    async searchImages() {
        const query = this.iaSearchInput.value.trim();
        if (!query) return;

        this.iaResults.innerHTML = '';
        const loader = document.createElement('div');
        loader.className = 'ia-loader';
        loader.textContent = 'Invocando al motor de visiones...';
        this.iaResults.appendChild(loader);

        try {
            // Añadir modificadores de calidad automáticos para mejores resultados
            const artisticModifiers = ", photorealistic, masterpiece, highly detailed, cinematic lighting, ultra-vivid, 8k";
            const encodedPrompt = encodeURIComponent(query + artisticModifiers);

            const containers = [];
            for (let i = 0; i < 5; i++) {
                const div = document.createElement('div');
                div.className = 'ia-img-container';
                div.innerHTML = '<div class="ia-loader-mini"></div>';
                this.iaResults.appendChild(div);
                containers.push(div);
            }

            loader.remove();

            // Garantizar unicidad absoluta con Triple Semilla (Tiempo + Random Gigante + Índice)
            for (let i = 0; i < 5; i++) {
                // Generamos un ID de variación único para este request
                const variationId = Math.random().toString(36).substring(2, 9);
                const randomSeed = Math.floor(Math.random() * 10000000);

                // Mutamos ligeramente el prompt para CADA imagen. Esto garantiza que no se repitan jamás.
                const mutatedPrompt = `${query}${artisticModifiers}, style variation ${variationId}`;
                const encodedMutation = encodeURIComponent(mutatedPrompt);

                const img = document.createElement('img');
                img.className = 'ia-img';
                img.loading = 'lazy';

                // Añadimos un parámetro 'no-cache' y usamos la mutación en el prompt
                const url = `https://image.pollinations.ai/prompt/${encodedMutation}?width=800&height=600&nologo=true&seed=${randomSeed}&model=flux&enhance=true&v=${variationId}`;

                img.src = url;
                img.onload = () => {
                    containers[i].innerHTML = '';
                    containers[i].appendChild(img);
                };
                img.onclick = () => this.insertImage(img.src);
                img.onerror = () => { containers[i].innerHTML = '<div class="ia-error">IA Ocupada</div>'; };

                // Pausa de 350ms para asegurar unicidad y evitar bloqueos
                await new Promise(r => setTimeout(r, 350));
            }

        } catch (error) {
            this.iaResults.innerHTML = '<p style="color:var(--accent)">La red de visiones está saturada. Intenta de nuevo.</p>';
        }
    }

    insertImage(src) {
        const imgHtml = `<img src="${src}" style="max-width: 100%; border-radius: 15px; margin: 15px 0; display: block; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">`;
        this.noteContentInput.focus();
        document.execCommand('insertHTML', false, imgHtml + '<div><br></div>');
        this.debouncedSaveAndRender();
    }

    initEmojiPicker() {
        const emojis = ['😀', '🥰', '🔥', '✨', '🚀', '💡', '🎨', '📝', '💻', '📱', '📸', '✅', '📍', '📅'];
        this.emojiPicker.innerHTML = emojis.map(emoji => `<span class="emoji-item">${emoji}</span>`).join('');
        this.emojiPicker.querySelectorAll('.emoji-item').forEach(item => {
            item.onclick = (e) => { e.stopPropagation(); this.insertTextAtCursor(item.textContent); };
        });
    }

    toggleEmojiPicker() {
        this.emojiPicker.hidden = !this.emojiPicker.hidden;
    }

    insertTextAtCursor(text) {
        document.execCommand('insertText', false, text);
        this.debouncedSaveAndRender();
        this.emojiPicker.hidden = true;
    }

    updateFormat(key, value) {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note) {
            if (!note.styles) note.styles = { ...this.DEFAULT_STYLES };
            note.styles[key] = value;
            this.applyFormat(note.styles);
            this.saveToStorage();
        }
    }

    applyFormat(styles) {
        const s = styles || this.DEFAULT_STYLES;
        requestAnimationFrame(() => {
            this.noteTitleInput.style.fontFamily = s.titleFont || this.DEFAULT_STYLES.titleFont;
            this.noteTitleInput.style.fontSize = s.titleSize || this.DEFAULT_STYLES.titleSize;
            this.noteTitleInput.style.color = s.titleColor || this.DEFAULT_STYLES.titleColor;
            this.noteContentInput.style.fontFamily = s.contentFont || this.DEFAULT_STYLES.contentFont;
            this.noteContentInput.style.fontSize = s.contentSize || this.DEFAULT_STYLES.contentSize;
            this.noteContentInput.style.color = s.textColor || this.DEFAULT_STYLES.textColor;
        });

        this.syncSelect(this.titleFontSelect, s.titleFont || this.DEFAULT_STYLES.titleFont);
        this.syncSelect(this.titleSizeSelect, s.titleSize || this.DEFAULT_STYLES.titleSize);
        this.titleColorPicker.value = s.titleColor || this.DEFAULT_STYLES.titleColor;
        this.syncSelect(this.contentFontSelect, s.contentFont || this.DEFAULT_STYLES.contentFont);
        this.syncSelect(this.contentSizeSelect, s.contentSize || this.DEFAULT_STYLES.contentSize);
        this.textColorPicker.value = s.textColor || this.DEFAULT_STYLES.textColor;
    }

    syncSelect(select, value) { if (select.value !== value) select.value = value; }

    toggleFullscreen() {
        this.appContainer.classList.toggle('fullscreen');
        this.fullscreenBtn.classList.toggle('fullscreen-active');
    }

    createNewNote() {
        const newNote = {
            id: Date.now().toString(),
            title: '',
            content: '',
            updatedAt: new Date().toISOString(),
            styles: { ...this.DEFAULT_STYLES }
        };
        this.notes.unshift(newNote);
        this.saveToStorage();
        this.setActiveNote(newNote.id);
        this.renderNotesList();
        this.updateStats();
        this.noteTitleInput.focus();
    }

    setActiveNote(id) {
        if (this.activeNoteId === id && id !== null) return;
        this.activeNoteId = id;
        const note = this.notes.find(n => n.id === id);

        if (note) {
            this.noteTitleInput.innerHTML = note.title;
            this.noteContentInput.innerHTML = note.content;
            this.lastEditedText.textContent = `Editado: ${this.formatDate(note.updatedAt)}`;
            this.applyFormat(note.styles);

            this.editorView.classList.remove('empty');
            this.editorFields.hidden = false;
            this.emptyState.hidden = true;
            this.deleteNoteBtn.hidden = false;
            this.saveNoteBtn.hidden = false;
            this.formatToolbar.hidden = false;
        } else {
            this.activeNoteId = null;
            this.noteTitleInput.innerHTML = '';
            this.noteContentInput.innerHTML = '';
            this.editorView.classList.add('empty');
            this.editorFields.hidden = true;
            this.emptyState.hidden = false;
            this.deleteNoteBtn.hidden = true;
            this.saveNoteBtn.hidden = true;
            this.formatToolbar.hidden = true;
            this.lastEditedText.textContent = 'Selecciona una nota para comenzar';
        }
        this.updateActiveNoteInList();
    }

    updateActiveNoteInList() {
        const items = this.notesList.querySelectorAll('.note-item');
        items.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-id') === this.activeNoteId);
        });
    }

    updateSidebarCardPreview() {
        if (!this.activeNoteId) return;
        const card = this.notesList.querySelector(`.note-item[data-id="${this.activeNoteId}"]`);
        if (card) {
            card.querySelector('h3').textContent = this.noteTitleInput.innerText || 'Nota sin título';
            card.querySelector('p').textContent = this.noteContentInput.innerText.substring(0, 50) || 'Sin contenido...';
        }
    }

    autoSave(shouldRefreshList = false) {
        if (!this.activeNoteId) return;
        const index = this.notes.findIndex(n => n.id === this.activeNoteId);
        if (index === -1) return;

        const note = this.notes[index];
        note.title = this.noteTitleInput.innerHTML;
        note.content = this.noteContentInput.innerHTML;
        note.updatedAt = new Date().toISOString();

        this.saveToStorage();
        this.lastEditedText.textContent = `Editado: ${this.formatDate(note.updatedAt)}`;

        if (shouldRefreshList && index > 0) {
            const [movedNote] = this.notes.splice(index, 1);
            this.notes.unshift(movedNote);
            this.saveToStorage();
            this.renderNotesList();
        }
    }

    saveActiveNote() {
        this.autoSave(true);
        this.saveNoteBtn.textContent = '¡Guardado!';
        setTimeout(() => this.saveNoteBtn.textContent = 'Guardar', 1500);
    }

    deleteNote() {
        if (!this.activeNoteId) return;
        if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
            this.notes = this.notes.filter(n => n.id !== this.activeNoteId);
            this.saveToStorage();
            this.setActiveNote(null);
            this.renderNotesList();
            this.updateStats();
        }
    }

    handleSearch(query) {
        this.searchTerm = query.toLowerCase();
        this.renderNotesList();
    }

    renderNotesList() {
        const filtered = this.notes.filter(n =>
            n.title.toLowerCase().includes(this.searchTerm) ||
            n.content.toLowerCase().includes(this.searchTerm)
        );

        let html = '';
        filtered.forEach(note => {
            html += `
                <li class="note-item ${note.id === this.activeNoteId ? 'active' : ''}" 
                    data-id="${note.id}" 
                    onclick="app.setActiveNote('${note.id}')">
                    <h3>${this.getRawText(note.title) || 'Nota sin título'}</h3>
                    <p>${this.getRawText(note.content)}</p>
                    <small>${this.formatDate(note.updatedAt)}</small>
                </li>
            `;
        });
        this.notesList.innerHTML = html;
    }

    getRawText(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.innerText.substring(0, 45) || 'Sin contenido...';
    }

    escapeHTML(str) {
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }

    updateStats() {
        const count = this.notes.length;
        this.noteCountText.textContent = `${count} ${count === 1 ? 'nota' : 'notas'}`;
    }

    saveToStorage() { localStorage.setItem('novanotes_data', JSON.stringify(this.notes)); }

    formatDate(iso) {
        const d = new Date(iso);
        return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(d);
    }

    handlePaste(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.insertImage(event.target.result);
                };
                reader.readAsDataURL(blob);
            }
        }
    }
}

const app = new NoteApp();
window.app = app;
