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
        this.categorySelect = document.getElementById('category-select');
        this.themeSelect = document.getElementById('theme-select');
        this.lockNoteBtn = document.getElementById('lock-note-btn');
        this.passwordModal = document.getElementById('password-modal');
        this.pwdInput = document.getElementById('note-password-input');
        this.confirmPwdBtn = document.getElementById('confirm-password-btn');
        this.closePwdBtn = document.getElementById('close-pwd-btn');
        this.pwdError = document.getElementById('pwd-error');
        this.bgColorPicker = document.getElementById('bg-color-picker');
        this.categoryModal = document.getElementById('category-modal');
        this.customCategoryInput = document.getElementById('custom-category-input');
        this.saveCustomCatBtn = document.getElementById('save-custom-cat-btn');
        this.closeCatBtn = document.getElementById('close-cat-btn');
        this.installBtn = document.getElementById('pwa-install-btn');
        this.infoBtn = document.getElementById('info-btn');
        this.infoModal = document.getElementById('info-modal');
        this.closeInfoBtn = document.getElementById('close-info-btn');
        this.filterPublicBtn = document.getElementById('filter-public-btn');
        this.filterPrivateBtn = document.getElementById('filter-private-btn');
        this.masterLockModal = document.getElementById('master-lock-modal');
        this.masterPwdInput = document.getElementById('master-password-input');
        this.unlockVaultBtn = document.getElementById('unlock-vault-btn');
        this.closeVaultViewBtn = document.getElementById('close-vault-view-btn');
        this.masterPwdError = document.getElementById('master-pwd-error');
        this.masterLockText = document.getElementById('master-lock-text');
        this.toggleVaultPwdBtn = document.getElementById('toggle-vault-pwd');

        this.currentNoteFilter = 'public'; // 'public' o 'private'
        this.isVaultUnlocked = false; // Estado de desbloqueo sesión actual
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
        this.categorySelect.onchange = (e) => {
            if (!this.activeNoteId) return;
            if (e.target.value === 'custom') {
                this.categoryModal.hidden = false;
                this.customCategoryInput.value = '';
                this.customCategoryInput.focus();
                return;
            }
            const note = this.notes.find(n => n.id === this.activeNoteId);
            if (note) {
                note.category = e.target.value;
                note.customCategory = null;
                this.saveToStorage();
                this.renderNotesList();
            }
        };

        this.saveCustomCatBtn.onclick = () => this.saveCustomCategory();
        this.closeCatBtn.onclick = () => {
            this.categoryModal.hidden = true;
            // Restaurar valor previo si cancela
            const note = this.notes.find(n => n.id === this.activeNoteId);
            this.categorySelect.value = note.category || 'personal';
        };

        this.themeSelect.onchange = (e) => {
            if (!this.activeNoteId) return;
            const note = this.notes.find(n => n.id === this.activeNoteId);
            if (note) {
                note.theme = e.target.value;
                if (e.target.value === 'custom') {
                    this.bgColorPicker.style.display = 'block';
                    this.bgColorPicker.click();
                } else {
                    this.bgColorPicker.style.display = 'none';
                }
                this.applyTheme(note.theme, note.customBgColor);
                this.saveToStorage();
            }
        };

        this.bgColorPicker.oninput = (e) => {
            if (!this.activeNoteId) return;
            const note = this.notes.find(n => n.id === this.activeNoteId);
            if (note) {
                note.customBgColor = e.target.value;
                this.applyTheme('custom', note.customBgColor);
                this.saveToStorage();
            }
        };

        this.lockNoteBtn.onclick = () => this.handleLockClick();
        this.confirmPwdBtn.onclick = () => this.verifyPassword();
        this.closePwdBtn.onclick = () => this.passwordModal.hidden = true;

        // Bóveda Maestra Listeners
        this.unlockVaultBtn.onclick = () => this.verifyMasterPassword();
        this.closeVaultViewBtn.onclick = () => {
            this.masterLockModal.hidden = true;
            this.setFilter('public');
        };

        this.toggleVaultPwdBtn.onclick = () => {
            const isPwd = this.masterPwdInput.type === 'password';
            this.masterPwdInput.type = isPwd ? 'text' : 'password';
            this.toggleVaultPwdBtn.textContent = isPwd ? '🙈' : '👁️';
        };

        this.filterPublicBtn.onclick = () => this.setFilter('public');
        this.filterPrivateBtn.onclick = () => this.enterPrivateVault();

        // Bloqueo de Enter en password maestro
        this.masterPwdInput.onkeydown = (e) => { if (e.key === 'Enter') this.verifyMasterPassword(); };

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
        localStorage.removeItem('nv_v'); // Limpiar clave antigua que causaba conflictos
        const hasVoted = localStorage.getItem('novanotes_voted');
        if (hasVoted === 'likes') {
            likeBtn.classList.add('voted');
        } else if (hasVoted === 'dislikes') {
            dislikeBtn.classList.add('voted');
        }

        likeBtn.onclick = () => this.handleVote('likes', likeBtn);
        dislikeBtn.onclick = () => this.handleVote('dislikes', dislikeBtn);
    }

    async refreshCounts() {
        const NS = 'novastar_final_resilient_v5';

        const tryFetch = async (url) => {
            const turl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
            // Cadena de proxies resiliente
            const proxies = [
                turl, // Directo
                `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(turl)}`,
                `https://corsproxy.io/?${encodeURIComponent(turl)}`,
                `https://api.allorigins.win/get?url=${encodeURIComponent(turl)}`
            ];

            for (const p of proxies) {
                try {
                    const res = await fetch(p);
                    if (!res.ok) continue;
                    let data = await res.json();
                    if (p.includes('allorigins')) data = JSON.parse(data.contents);
                    if (data && data.count !== undefined) return data;
                } catch (e) { }
            }
            throw new Error('Sync failed after all attempts');
        };

        try {
            const [lData, dData] = await Promise.all([
                tryFetch(`https://api.counterapi.dev/v1/${NS}/likes`),
                tryFetch(`https://api.counterapi.dev/v1/${NS}/dislikes`)
            ]);

            const lCount = parseInt(lData.count) || 0;
            const dCount = parseInt(dData.count) || 0;

            document.getElementById('like-count').textContent = lCount;
            document.getElementById('dislike-count').textContent = dCount;
            document.getElementById('stat-likes-count').textContent = `${lCount} votos`;
            document.getElementById('stat-dislikes-count').textContent = `${dCount} reportes`;

            localStorage.setItem('nstar_l', lCount);
            localStorage.setItem('nstar_d', dCount);
            console.log(`✅ Sincronizado: L:${lCount} D:${dCount}`);
        } catch (e) {
            console.warn('Backup local:', e);
            const l = localStorage.getItem('nstar_l') || 0;
            const d = localStorage.getItem('nstar_d') || 0;
            document.getElementById('like-count').textContent = l;
            document.getElementById('dislike-count').textContent = d;
            document.getElementById('stat-likes-count').textContent = `${l} votos`;
            document.getElementById('stat-dislikes-count').textContent = `${d} reportes`;
        }
    }

    async handleVote(type, btn) {
        const UID = 'novastar_final_resilient_v5';
        const currentSelection = localStorage.getItem('novanotes_voted');

        if (btn.classList.contains('voting-locked')) return;
        btn.classList.add('voting-locked');

        const execVote = async (action, voteType) => {
            const url = `https://api.counterapi.dev/v1/${UID}/${voteType}/${action}?t=${Date.now()}`;
            const proxies = [
                url,
                `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(url)}`,
                `https://corsproxy.io/?${encodeURIComponent(url)}`
            ];
            for (const p of proxies) {
                try {
                    const r = await fetch(p);
                    if (r.ok) return true;
                } catch (e) { }
            }
            return false;
        };

        try {
            if (currentSelection === type) {
                // DESELECT
                localStorage.removeItem('novanotes_voted');
                await execVote('down', type);
            } else {
                // CHANGE OR NEW
                if (currentSelection) {
                    await execVote('down', currentSelection);
                }
                await execVote('up', type);
                localStorage.setItem('novanotes_voted', type);
                btn.classList.add('vote-success');
                setTimeout(() => btn.classList.remove('vote-success'), 1000);
            }
        } catch (e) {
            console.log('Error al votar');
        } finally {
            await this.refreshCounts();
            const finalSelection = localStorage.getItem('novanotes_voted');
            document.getElementById('like-btn').classList.toggle('voted', finalSelection === 'likes');
            document.getElementById('dislike-btn').classList.toggle('voted', finalSelection === 'dislikes');
            setTimeout(() => btn.classList.remove('voting-locked'), 400);
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
            category: 'personal',
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
        if (!id) {
            this.activeNoteId = null;
            this.editorFields.hidden = true;
            this.emptyState.hidden = false;
            this.editorView.classList.add('empty');
            this.formatToolbar.hidden = true;
            this.deleteNoteBtn.hidden = true;
            this.saveNoteBtn.hidden = true;
            this.lastEditedText.textContent = 'Selecciona una nota para comenzar';
            return;
        }

        const note = this.notes.find(n => n.id === id);
        if (note) {
            // No permitir abrir notas privadas si el filtro es público (Seguridad extra)
            if (note.password && this.currentNoteFilter === 'public') return;

            this.activeNoteId = id;
            this.noteTitleInput.innerHTML = note.title;
            this.noteContentInput.innerHTML = note.content;
            this.categorySelect.value = note.category || 'personal';
            this.themeSelect.value = note.theme || 'none';
            this.bgColorPicker.style.display = note.theme === 'custom' ? 'block' : 'none';
            if (note.customBgColor) this.bgColorPicker.value = note.customBgColor;

            this.applyTheme(note.theme || 'none', note.customBgColor);
            this.lockNoteBtn.classList.toggle('locked-active', !!note.password);

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
            this.setActiveNote(null);
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
        note.category = this.categorySelect.value;
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
        const query = this.searchTerm.toLowerCase();
        const filteredBySearch = this.notes.filter(n =>
            n.title.toLowerCase().includes(query) ||
            n.content.toLowerCase().includes(query)
        );

        // FILTRO MAESTRO: Mostrar solo lo que toca según la pestaña activa
        const filtered = filteredBySearch.filter(n => {
            const isLocked = !!n.password;
            if (this.currentNoteFilter === 'private') return isLocked;
            return !isLocked;
        });

        let html = '';
        filtered.forEach(note => {
            const cat = note.category || 'personal';
            const catLabels = {
                personal: '📝 Personal',
                ideas: '💡 Idea',
                proyectos: '🚀 Proyecto',
                tareas: '✅ Tarea',
                custom: `✨ ${note.customCategory || 'Otro'}`
            };

            html += `
                <li class="note-item ${note.id === this.activeNoteId ? 'active' : ''}" 
                    data-id="${note.id}" 
                    onclick="app.setActiveNote('${note.id}')">
                    <div class="note-item-header">
                        <h3>${this.getRawText(note.title, 25) || 'Nota sin título'}</h3>
                        <span class="category-badge cat-${cat}">${catLabels[cat]}</span>
                    </div>
                    <p>${this.getRawText(note.content, 45)}</p>
                    <small>${this.formatDate(note.updatedAt)}</small>
                </li>
            `;
        });
        this.notesList.innerHTML = html;
    }

    // Versión optimizada de extracción de texto sin crear elementos DOM pesados
    getRawText(html, limit = 45) {
        if (!html) return '';
        // Regex simple para quitar etiquetas HTML rápidamente
        const text = html.replace(/<[^>]*>?/gm, ' ');
        return text.substring(0, limit).trim();
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

    applyTheme(theme, customColor) {
        // Remover todos los temas previos
        this.editorView.classList.forEach(cls => {
            if (cls.startsWith('theme-')) this.editorView.classList.remove(cls);
        });
        if (theme && theme !== 'none') {
            this.editorView.classList.add(`theme-${theme}`);
            if (theme === 'custom' && customColor) {
                this.editorView.style.setProperty('--custom-bg-color', customColor);
            } else {
                this.editorView.style.removeProperty('--custom-bg-color');
            }
        } else {
            this.editorView.style.removeProperty('--custom-bg-color');
        }
    }

    saveCustomCategory() {
        const value = this.customCategoryInput.value.trim();
        if (!value || !this.activeNoteId) return;

        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note) {
            note.category = 'custom';
            note.customCategory = value;
            this.categoryModal.hidden = true;
            this.saveToStorage();
            this.renderNotesList();
        }
    }

    handleLockClick() {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);
        const masterSaved = localStorage.getItem('nova_master_pwd');

        if (note.password) {
            if (confirm('¿Quieres quitar la protección de esta nota?')) {
                note.password = null;
                this.lockNoteBtn.classList.remove('locked-active');
                this.saveToStorage();
                this.renderNotesList(); // Mover a pestaña pública
                this.setActiveNote(null);
            }
        } else {
            // Si ya existe contraseña maestra, usarla directo
            if (masterSaved) {
                note.password = masterSaved;
                this.lockNoteBtn.classList.add('locked-active');
                this.saveToStorage();
                this.renderNotesList();
                this.setActiveNote(null);
            } else {
                // Crear contraseña maestra por primera vez
                this.pendingNoteId = this.activeNoteId;
                this.masterLockText.textContent = "Crea una CONTRASEÑA MAESTRA. Esta protegerá TODAS tus notas privadas.";
                this.masterPwdInput.placeholder = "Nueva contraseña...";
                this.masterLockModal.hidden = false;
                this.masterPwdInput.value = '';
                this.masterPwdInput.focus();
                this.masterPwdError.style.display = 'none';
            }
        }
    }

    setFilter(filter) {
        this.currentNoteFilter = filter;
        this.filterPublicBtn.classList.toggle('active', filter === 'public');
        this.filterPrivateBtn.classList.toggle('active', filter === 'private');

        // Si volvemos a público, bloquear la bóveda de nuevo para seguridad
        if (filter === 'public') this.isVaultUnlocked = false;

        this.setActiveNote(null);
        this.renderNotesList();
    }

    enterPrivateVault() {
        const masterSaved = localStorage.getItem('nova_master_pwd');

        if (!masterSaved) {
            // Silencioso: si no hay notas privadas, simplemente se mantiene en público
            this.setFilter('public');
            return;
        }

        if (this.isVaultUnlocked) {
            this.setFilter('private');
        } else {
            this.masterLockText.textContent = "Introduce tu contraseña maestra para desbloquear tus notas privadas.";
            this.masterPwdInput.placeholder = "Contraseña...";
            this.masterPwdInput.type = 'password';
            this.toggleVaultPwdBtn.textContent = '👁️';
            this.masterLockModal.hidden = false;
            this.masterPwdInput.value = '';
            this.masterPwdInput.focus();
            this.masterPwdError.style.display = 'none';
        }
    }

    verifyMasterPassword() {
        const pwd = this.masterPwdInput.value;
        const masterSaved = localStorage.getItem('nova_master_pwd');

        if (!masterSaved) {
            // CREANDO CONTRASEÑA POR PRIMERA VEZ
            if (pwd.length < 1) return;
            localStorage.setItem('nova_master_pwd', pwd);

            // Asignar a la nota que originó la creación
            const note = this.notes.find(n => n.id === this.pendingNoteId);
            if (note) {
                note.password = pwd;
                this.saveToStorage();
            }

            this.masterLockModal.hidden = true;
            this.setActiveNote(null);
            this.renderNotesList();
        } else {
            // VERIFICANDO PARA ENTRAR
            if (pwd === masterSaved) {
                this.isVaultUnlocked = true;
                this.masterLockModal.hidden = true;
                this.setFilter('private');
            } else {
                this.masterPwdError.style.display = 'block';
            }
        }
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
