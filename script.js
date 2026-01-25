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
        this.selectionToolbar = document.getElementById('selection-toolbar');
        this.selectionColorPicker = document.getElementById('selection-color-picker');
        this.appContainer = document.querySelector('.app-container');
        this.formatToolbar = document.getElementById('format-toolbar');
        this.installBtn = document.getElementById('pwa-install-btn');
        this.infoBtn = document.getElementById('info-btn');
        this.infoModal = document.getElementById('info-modal');
        this.closeInfoBtn = document.getElementById('close-info-btn');
        this.deferredPrompt = null;

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

        // PWA Install Logic
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.installBtn.style.display = 'flex';
        });

        this.installBtn.addEventListener('click', async () => {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.installBtn.style.display = 'none';
                }
                this.deferredPrompt = null;
            }
        });

        window.addEventListener('appinstalled', () => {
            this.installBtn.style.display = 'none';
            this.deferredPrompt = null;
        });

        // Info Modal Logic
        this.infoBtn.onclick = () => {
            this.infoModal.hidden = false;
            this.infoModal.classList.remove('hidden');
        };
        this.closeInfoBtn.onclick = () => {
            this.infoModal.hidden = true;
            this.infoModal.classList.add('hidden');
        };
        this.infoModal.onclick = (e) => {
            if (e.target === this.infoModal) {
                this.infoModal.hidden = true;
                this.infoModal.classList.add('hidden');
            }
        };

        this.emojiBtn.onclick = (e) => { e.stopPropagation(); this.toggleEmojiPicker(); };

        document.addEventListener('click', (e) => {
            if (this.emojiPicker) this.emojiPicker.hidden = true;
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
            this.updatePlaceholderState();
        };
        this.noteContentInput.onpaste = (e) => this.handlePaste(e);

        this.noteTitleInput.onblur = () => this.updatePlaceholderState();
        this.noteContentInput.onblur = () => this.updatePlaceholderState();

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

        // Feedback Listeners
        this.initFeedback();
    }

    async initFeedback() {
        const likeBtn = document.getElementById('like-btn');
        const dislikeBtn = document.getElementById('dislike-btn');

        // 1. Limpiar estados visuales por defecto (aseguramos que empiece limpio)
        likeBtn.classList.remove('voted');
        dislikeBtn.classList.remove('voted');

        // 2. Cargar conteos globales del servidor
        this.refreshCounts();

        // 3. Restaurar selección SOLO si el usuario ya votó de verdad
        const hasVoted = localStorage.getItem('novanotes_voted');
        if (hasVoted) {
            if (hasVoted === 'like') {
                likeBtn.classList.add('voted');
            } else if (hasVoted === 'dislike') {
                dislikeBtn.classList.add('voted');
            }
        }

        likeBtn.onclick = () => this.handleVote('likes', likeBtn);
        dislikeBtn.onclick = () => this.handleVote('dislikes', dislikeBtn);
    }

    async refreshCounts() {
        // Usamos un ID que no parezca un contador para evitar AdBlockers
        const UID = 'nstar_data_v10';
        try {
            const [r1, r2] = await Promise.all([
                fetch(`https://api.counterapi.dev/v1/${UID}/lks`),
                fetch(`https://api.counterapi.dev/v1/${UID}/dks`)
            ]);

            let l = 0;
            let d = 0;

            if (r1.ok) {
                const data = await r1.json();
                l = data.count || 0;
            }
            if (r2.ok) {
                const data = await r2.json();
                d = data.count || 0;
            }

            document.getElementById('like-count').textContent = l;
            document.getElementById('dislike-count').textContent = d;

            localStorage.setItem('nstar_l', l);
            localStorage.setItem('nstar_d', d);
        } catch (e) {
            // Fallback silencioso si el navegador bloquea la API
            document.getElementById('like-count').textContent = localStorage.getItem('nstar_l') || 0;
            document.getElementById('dislike-count').textContent = localStorage.getItem('nstar_d') || 0;
        }
    }

    async handleVote(type, btn) {
        const UID = 'nstar_data_v10';
        const key = type === 'likes' ? 'lks' : 'dks';
        const otherKey = type === 'likes' ? 'dks' : 'lks';
        const current = localStorage.getItem('nv_v');
        const vType = type === 'likes' ? 'l' : 'd';

        if (btn.classList.contains('voting-locked')) return;
        btn.classList.add('voting-locked');

        const span = document.getElementById(type === 'likes' ? 'like-count' : 'dislike-count');
        const oSpan = document.getElementById(type === 'likes' ? 'dislike-count' : 'like-count');
        const oBtn = document.getElementById(type === 'likes' ? 'dislike-btn' : 'like-btn');

        let val = parseInt(span.textContent) || 0;
        let oVal = parseInt(oSpan.textContent) || 0;

        try {
            if (current === vType) {
                // Quitar
                span.textContent = Math.max(0, val - 1);
                btn.classList.remove('voted');
                localStorage.removeItem('nv_v');
                fetch(`https://api.counterapi.dev/v1/${UID}/${key}/down`).catch(() => { });
            } else {
                // Nuevo o cambio
                if (current) {
                    oSpan.textContent = Math.max(0, oVal - 1);
                    oBtn.classList.remove('voted');
                    fetch(`https://api.counterapi.dev/v1/${UID}/${otherKey}/down`).catch(() => { });
                }
                span.textContent = val + 1;
                btn.classList.add('voted');
                btn.classList.add('vote-success');
                setTimeout(() => btn.classList.remove('vote-success'), 1000);
                localStorage.setItem('nv_v', vType);
                fetch(`https://api.counterapi.dev/v1/${UID}/${key}/up`).catch(() => { });
            }
        } catch (e) {
            // Error de red - el cambio visual ya se hizo (Optimista)
        } finally {
            setTimeout(() => btn.classList.remove('voting-locked'), 400);
            // Sincronizar un poco después para confirmar
            setTimeout(() => this.refreshCounts(), 2000);
        }
    }

    handleSelection() {
        const selection = window.getSelection();
        const isInContent = this.noteContentInput.contains(selection.anchorNode);
        const isInTitle = this.noteTitleInput.contains(selection.anchorNode);

        if (selection.rangeCount > 0 && selection.toString().trim().length > 0 && (isInContent || isInTitle)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Ajuste para móviles: si el rect está muy arriba, mostrar abajo
            let top = rect.top + window.scrollY - 70;
            if (top < 10) top = rect.bottom + window.scrollY + 20;

            requestAnimationFrame(() => {
                this.selectionToolbar.hidden = false;
                this.selectionToolbar.style.top = `${top}px`;
                this.selectionToolbar.style.left = `${Math.max(10, Math.min(window.innerWidth - 180, rect.left + window.scrollX))}px`;
            });
        } else {
            this.selectionToolbar.hidden = true;
        }
    }

    applySelectionColor(color) {
        document.execCommand('foreColor', false, color);
        this.debouncedSaveAndRender();
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

            // Gestionar placeholders
            this.updatePlaceholderState();

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

        // Optimizamos: solo re-renderizar la lista si es necesario (ej: mover al tope)
        // pero lo hacemos con un debounce mayor o solo si ha pasado tiempo
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

    // Versión optimizada de extracción de texto sin crear elementos DOM pesados
    getRawText(html) {
        if (!html) return 'Sin contenido...';
        // Regex simple para quitar etiquetas HTML rápidamente
        const text = html.replace(/<[^>]*>?/gm, ' ');
        return text.substring(0, 45).trim() || 'Sin contenido...';
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

    updatePlaceholderState() {
        // Verificar si el título está vacío
        const titleEmpty = !this.noteTitleInput.innerText.trim();
        this.noteTitleInput.classList.toggle('is-empty', titleEmpty);

        // Verificar si el contenido está vacío
        const contentEmpty = !this.noteContentInput.innerText.trim();
        this.noteContentInput.classList.toggle('is-empty', contentEmpty);
    }
}

const app = new NoteApp();
window.app = app;

// Registrar el motor de la App para Google (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('novaStarPro lista para instalar'))
            .catch(err => console.log('Error al registrar App:', err));
    });
}
