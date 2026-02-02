/**
 * @class AuthManager
 * @description Handles local user authentication (registration, login, logout, session)
 */
class AuthManager {
    constructor() {
        this.USERS_KEY = 'novanotes_users';
        this.SESSION_KEY = 'novanotes_session';

        // DOM Elements
        this.authModal = document.getElementById('auth-modal');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.loginEmail = document.getElementById('login-email');
        this.loginPassword = document.getElementById('login-password');
        this.loginError = document.getElementById('login-error');
        this.loginSubmitBtn = document.getElementById('login-submit-btn');
        this.registerName = document.getElementById('register-name');
        this.registerEmail = document.getElementById('register-email');
        this.registerPassword = document.getElementById('register-password');
        this.registerConfirm = document.getElementById('register-confirm');
        this.registerError = document.getElementById('register-error');
        this.registerSubmitBtn = document.getElementById('register-submit-btn');
        this.showRegisterLink = document.getElementById('show-register');
        this.showLoginLink = document.getElementById('show-login');
        this.userGreetingBox = document.getElementById('user-greeting-box');
        this.greetingName = document.getElementById('greeting-name');
        this.logoutBtn = document.getElementById('logout-btn');

        this.authSelector = document.getElementById('auth-selector');
        this.selectLoginBtn = document.getElementById('select-login-btn');
        this.selectRegisterBtn = document.getElementById('select-register-btn');
        this.backToSelectorBtns = document.querySelectorAll('.btn-auth-back');
        this.googleSignInBtn = document.getElementById('google-signin-btn');
        this.githubSignInBtn = document.getElementById('github-signin-btn');

        this.onLoginSuccess = null; // Callback when user logs in
        this.onLogout = null; // Callback when user logs out

        this.initListeners();
    }

    initListeners() {
        // Toggle between login and register
        this.showRegisterLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });

        this.showLoginLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });

        // Submit handlers
        this.loginSubmitBtn?.addEventListener('click', () => this.handleLogin());
        this.registerSubmitBtn?.addEventListener('click', () => this.handleRegister());

        // Enter key handlers
        this.loginPassword?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        this.registerConfirm?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleRegister();
        });

        // Logout
        this.logoutBtn?.addEventListener('click', () => this.logout());

        // Selector buttons
        this.selectLoginBtn?.addEventListener('click', () => this.showLogin());
        this.selectRegisterBtn?.addEventListener('click', () => this.showRegister());

        // Back to selector
        this.backToSelectorBtns.forEach(btn => {
            btn.addEventListener('click', () => this.showAuthSelector());
        });

        // Google Sign-In Button
        this.googleSignInBtn?.addEventListener('click', () => this.handleGoogleSignIn());

        // GitHub Sign-In Button
        this.githubSignInBtn?.addEventListener('click', () => this.handleGithubSignIn());

        // Password visibility toggles
        document.querySelectorAll('.password-input-wrapper .btn-toggle-pwd').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.textContent = isPassword ? '🙈' : '👁️';
                }
            });
        });
    }

    /**
     * Simple hash function for passwords (not cryptographically secure, but adequate for localStorage demo)
     */
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'h_' + Math.abs(hash).toString(36) + '_' + password.length;
    }

    getUsers() {
        return JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
    }

    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }

    getSession() {
        return JSON.parse(localStorage.getItem(this.SESSION_KEY));
    }

    saveSession(session) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    }

    clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
    }

    isLoggedIn() {
        return this.getSession() !== null;
    }

    getCurrentUser() {
        return this.getSession();
    }

    showAuthSelector() {
        this.authSelector.style.display = 'flex';
        this.loginForm.style.display = 'none';
        this.registerForm.style.display = 'none';
    }

    showLogin() {
        this.authSelector.style.display = 'none';
        this.loginForm.style.display = 'flex';
        this.registerForm.style.display = 'none';
        this.loginError.textContent = '';
        this.loginEmail.value = '';
        this.loginPassword.value = '';
    }

    showRegister() {
        this.authSelector.style.display = 'none';
        this.loginForm.style.display = 'none';
        this.registerForm.style.display = 'flex';
        this.registerError.textContent = '';
        this.registerName.value = '';
        this.registerEmail.value = '';
        this.registerPassword.value = '';
        this.registerConfirm.value = '';
    }

    showAuthModal() {
        this.authModal.hidden = false;
        this.showAuthSelector();
    }

    hideAuthModal() {
        this.authModal.hidden = true;
    }

    handleLogin() {
        const email = this.loginEmail.value.trim().toLowerCase();
        const password = this.loginPassword.value;

        // Validations
        if (!email || !password) {
            this.loginError.textContent = 'Por favor, completa todos los campos.';
            return;
        }

        const users = this.getUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            this.loginError.textContent = 'No existe una cuenta con ese correo.';
            return;
        }

        if (user.passwordHash !== this.hashPassword(password)) {
            this.loginError.textContent = 'Contraseña incorrecta.';
            return;
        }

        // Success - create session
        const session = {
            userId: user.id,
            name: user.name,
            email: user.email
        };
        this.saveSession(session);
        this.hideAuthModal();
        this.updateUserUI(session);

        if (this.onLoginSuccess) this.onLoginSuccess(session);
    }

    handleRegister() {
        const name = this.registerName.value.trim();
        const email = this.registerEmail.value.trim().toLowerCase();
        const password = this.registerPassword.value;
        const confirm = this.registerConfirm.value;

        // Validations
        if (!name || !email || !password || !confirm) {
            this.registerError.textContent = 'Por favor, completa todos los campos.';
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            this.registerError.textContent = 'Ingresa un correo electrónico válido.';
            return;
        }

        if (password.length < 6) {
            this.registerError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

        if (password !== confirm) {
            this.registerError.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        const users = this.getUsers();
        if (users.find(u => u.email === email)) {
            this.registerError.textContent = 'Ya existe una cuenta con ese correo.';
            return;
        }

        // Create new user
        const newUser = {
            id: 'user_' + Date.now().toString(36),
            name: name,
            email: email,
            passwordHash: this.hashPassword(password),
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveUsers(users);

        // Auto-login after registration
        const session = {
            userId: newUser.id,
            name: newUser.name,
            email: newUser.email
        };
        this.saveSession(session);
        this.hideAuthModal();
        this.updateUserUI(session);

        if (this.onLoginSuccess) this.onLoginSuccess(session);
    }

    async handleGoogleSignIn() {
        // Check if Firebase is loaded
        if (typeof window.signInWithGoogle !== 'function') {
            alert('Error: Firebase no está listo. Por favor, recarga la página.');
            return;
        }

        // Show loading state
        this.googleSignInBtn.classList.add('loading');
        this.googleSignInBtn.disabled = true;

        try {
            const result = await window.signInWithGoogle();
            const user = result.user;

            // Create or update local user from Google data
            const users = this.getUsers();
            let existingUser = users.find(u => u.email === user.email);

            if (!existingUser) {
                // Create new user from Google data
                existingUser = {
                    id: 'google_' + user.uid,
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    photoURL: user.photoURL,
                    provider: 'google',
                    createdAt: new Date().toISOString()
                };
                users.push(existingUser);
                this.saveUsers(users);
            } else {
                // Update existing user with Google data if needed
                existingUser.photoURL = user.photoURL;
                existingUser.provider = 'google';
                this.saveUsers(users);
            }

            // Create session
            const session = {
                userId: existingUser.id,
                firebaseUid: user.uid, // Raw Firebase UID for Firestore
                name: existingUser.name,
                email: existingUser.email,
                photoURL: existingUser.photoURL,
                provider: 'google'
            };
            this.saveSession(session);

            this.hideAuthModal();
            this.updateUserUI(session);

            if (this.onLoginSuccess) this.onLoginSuccess(session);

        } catch (error) {
            console.error('Google Sign-In Error:', error);

            if (error.code === 'auth/popup-closed-by-user') {
                // User closed the popup, no need to show error
                return;
            }

            alert('Error al iniciar sesión con Google: ' + (error.message || 'Intenta de nuevo.'));
        } finally {
            this.googleSignInBtn.classList.remove('loading');
            this.googleSignInBtn.disabled = false;
        }
    }

    async handleGithubSignIn() {
        // Check if Firebase is loaded
        if (typeof window.signInWithGithub !== 'function') {
            alert('Error: Firebase no está listo. Por favor, recarga la página.');
            return;
        }

        // Show loading state
        this.githubSignInBtn.classList.add('loading');
        this.githubSignInBtn.disabled = true;

        try {
            const result = await window.signInWithGithub();
            const user = result.user;

            // Create or update local user from GitHub data
            const users = this.getUsers();
            let existingUser = users.find(u => u.email === user.email);

            if (!existingUser) {
                // Create new user from GitHub data
                existingUser = {
                    id: 'github_' + user.uid,
                    name: user.displayName || user.email?.split('@')[0] || 'Usuario GitHub',
                    email: user.email,
                    photoURL: user.photoURL,
                    provider: 'github',
                    createdAt: new Date().toISOString()
                };
                users.push(existingUser);
                this.saveUsers(users);
            } else {
                // Update existing user with GitHub data if needed
                existingUser.photoURL = user.photoURL;
                existingUser.provider = 'github';
                this.saveUsers(users);
            }

            // Create session
            const session = {
                userId: existingUser.id,
                firebaseUid: user.uid, // Raw Firebase UID for Firestore
                name: existingUser.name,
                email: existingUser.email,
                photoURL: existingUser.photoURL,
                provider: 'github'
            };
            this.saveSession(session);

            this.hideAuthModal();
            this.updateUserUI(session);

            if (this.onLoginSuccess) this.onLoginSuccess(session);

        } catch (error) {
            console.error('GitHub Sign-In Error:', error);

            if (error.code === 'auth/popup-closed-by-user') {
                // User closed the popup, no need to show error
                return;
            }

            if (error.code === 'auth/account-exists-with-different-credential') {
                alert('Ya existe una cuenta con este correo electrónico. Intenta iniciar sesión con Google o con tu correo y contraseña.');
                return;
            }

            alert('Error al iniciar sesión con GitHub: ' + (error.message || 'Intenta de nuevo.'));
        } finally {
            this.githubSignInBtn.classList.remove('loading');
            this.githubSignInBtn.disabled = false;
        }
    }

    logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            // Also sign out from Firebase if it was a Google or GitHub login
            const session = this.getSession();
            if ((session?.provider === 'google' || session?.provider === 'github') && typeof window.signOutFirebase === 'function') {
                window.signOutFirebase().catch(console.error);
            }

            this.clearSession();
            this.userGreetingBox.style.display = 'none';
            this.showAuthModal();
            if (this.onLogout) this.onLogout();
        }
    }

    updateUserUI(session) {
        if (session) {
            this.userGreetingBox.style.display = 'flex';
            this.greetingName.textContent = session.name;
        } else {
            this.userGreetingBox.style.display = 'none';
        }
    }

    /**
     * Check auth status on app load
     */
    checkAuth() {
        const session = this.getSession();
        if (session) {
            this.hideAuthModal();
            this.updateUserUI(session);
            return session;
        } else {
            this.showAuthModal();
            return null;
        }
    }
}

/**
 * @class AIManager
 * @description Handles interaction with Google Gemini API for AI features.
 */
class AIManager {
    constructor(noteApp) {
        this.noteApp = noteApp; // Reference to main app for context
        this.API_KEY_KEY = 'novanotes_gemini_key';
        this.SESSIONS_KEY = 'novanotes_ai_sessions_v1';

        // List of models to try in order of preference
        // Only using models available in v1beta API (2025+)
        this.MODELS_TO_TRY = [
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-exp-1206'  // Experimental model as last resort
        ];

        // DOM Elements
        this.aiBtn = document.getElementById('ai-btn');
        this.chatInterface = document.getElementById('ai-chat-interface');
        this.closeChatBtn = document.getElementById('close-ai-chat-btn');

        // History UI
        this.historyToggleBtn = document.getElementById('ai-history-toggle-btn');
        this.historySidebar = document.getElementById('ai-history-sidebar');
        this.historyListContainer = document.getElementById('ai-history-list');
        this.newChatBtn = document.getElementById('ai-new-chat-btn');
        this.closeHistoryBtn = document.getElementById('ai-close-history-btn');

        this.keyModal = document.getElementById('ai-key-modal');
        this.keyInput = document.getElementById('ai-api-key-input');
        this.saveKeyBtn = document.getElementById('save-ai-key-btn');
        this.closeKeyBtn = document.getElementById('close-ai-key-btn');
        this.settingsBtn = document.getElementById('ai-settings-btn');
        this.chatInput = document.getElementById('ai-chat-input');
        this.sendBtn = document.getElementById('ai-send-btn');
        this.messagesContainer = document.getElementById('ai-chat-messages');
        this.keyError = document.getElementById('ai-key-error');

        // State
        this.sessions = this.loadSessions();
        this.currentSessionId = null;

        this.initListeners();

        // Load last session or start new
        if (this.sessions.length > 0) {
            this.loadSession(this.sessions[0].id); // Load most recent
        } else {
            this.createNewSession(false); // Start fresh without UI flash
        }
    }

    initListeners() {
        // Toggle Chat
        if (this.aiBtn) {
            this.aiBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleChat();
            });
        }

        // History Toggles
        if (this.historyToggleBtn) {
            this.historyToggleBtn.addEventListener('click', () => {
                this.renderHistoryList();
                this.historySidebar.hidden = !this.historySidebar.hidden;
            });
        }

        if (this.closeHistoryBtn) {
            this.closeHistoryBtn.addEventListener('click', () => {
                this.historySidebar.hidden = true;
            });
        }

        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => {
                this.createNewSession();
                this.historySidebar.hidden = true; // Auto close sidebar
            });
        }

        // Close Chat
        if (this.closeChatBtn) {
            this.closeChatBtn.addEventListener('click', () => {
                this.chatInterface.hidden = true;
            });
        }

        // Settings (Key Configuration)
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => {
                this.openKeyModal();
            });
        }

        // Key Modal
        if (this.saveKeyBtn) {
            this.saveKeyBtn.addEventListener('click', () => this.saveKey());
        }
        if (this.closeKeyBtn) {
            this.closeKeyBtn.addEventListener('click', () => this.keyModal.hidden = true);
        }

        // Sending Messages
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.handleUserSend());
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleUserSend();
                }
            });
        }
    }

    // --- Session Management ---

    loadSessions() {
        try {
            const data = localStorage.getItem(this.SESSIONS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading sessions', e);
            return [];
        }
    }

    saveSessions() {
        localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(this.sessions));
    }

    createNewSession(updateUI = true) {
        const newSession = {
            id: Date.now().toString(),
            title: 'Nueva Conversación',
            messages: [],
            updatedAt: Date.now()
        };

        // Add welcome message
        const welcomeMsg = { type: 'ai-welcome', text: '¡Hola! Soy Nova. ¿En qué puedo ayudarte hoy?', timestamp: Date.now() };
        newSession.messages.push(welcomeMsg);

        this.sessions.unshift(newSession); // Add to top
        this.saveSessions();
        this.loadSession(newSession.id);

        if (updateUI) this.renderHistoryList();
    }

    loadSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        this.currentSessionId = sessionId;
        this.messagesContainer.innerHTML = ''; // Clear view

        session.messages.forEach(msg => {
            this.appendMessageToView(msg.type, msg.text);
        });

        this.scrollToBottom();
    }

    deleteSession(sessionId) {
        if (!confirm('¿Eliminar esta conversación?')) return;

        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        this.saveSessions();
        this.renderHistoryList();

        // If deleted current session
        if (this.currentSessionId === sessionId) {
            if (this.sessions.length > 0) {
                this.loadSession(this.sessions[0].id);
            } else {
                this.createNewSession();
            }
        }
    }

    updateCurrentSessionTitle(firstUserMessage) {
        if (!this.currentSessionId) return;
        const session = this.sessions.find(s => s.id === this.currentSessionId);
        if (session && session.title === 'Nueva Conversación') {
            // Simple truncation for title
            session.title = firstUserMessage.length > 30 ? firstUserMessage.substring(0, 30) + '...' : firstUserMessage;
            this.saveSessions();
            this.renderHistoryList();
        }
    }

    // --- UI Rendering ---

    renderHistoryList() {
        if (!this.historyListContainer) return;
        this.historyListContainer.innerHTML = '';

        if (this.sessions.length === 0) {
            this.historyListContainer.innerHTML = '<div class="history-placeholder" style="text-align:center; padding: 20px; color: var(--text-muted);">No hay chats guardados</div>';
            return;
        }

        this.sessions.forEach(session => {
            const item = document.createElement('div');
            item.className = `history-item ${session.id === this.currentSessionId ? 'active' : ''}`;

            const dateStr = new Date(session.updatedAt).toLocaleDateString();

            item.innerHTML = `
                <div style="flex:1; overflow:hidden;" onclick="app.aiManager.switchSession('${session.id}')">
                    <div class="history-title">${session.title}</div>
                    <div class="history-date">${dateStr}</div>
                </div>
                <button class="history-delete-btn" onclick="app.aiManager.deleteSession('${session.id}')">🗑️</button>
            `;
            this.historyListContainer.appendChild(item);
        });
    }

    // Bridge for onclick in HTML
    switchSession(id) {
        this.loadSession(id);
        this.historySidebar.hidden = true; // optional: close on select
    }

    toggleChat() {
        // First check if user has a key
        const key = this.getKey();
        if (!key) {
            this.openKeyModal();
            return;
        }

        this.chatInterface.hidden = !this.chatInterface.hidden;
        if (!this.chatInterface.hidden) {
            this.chatInput.focus();
            this.scrollToBottom();
        }
    }

    openKeyModal() {
        this.keyModal.hidden = false;
        this.keyInput.value = this.getKey() || '';
        this.keyInput.focus();
        this.keyError.textContent = '';
    }

    getKey() {
        return localStorage.getItem(this.API_KEY_KEY);
    }

    saveKey() {
        const key = this.keyInput.value.trim();
        if (!key) {
            this.keyError.textContent = 'Por favor ingresa una clave válida.';
            return;
        }
        if (!key.startsWith('AIza')) {
            this.keyError.textContent = 'La clave no parece válida (debe empezar con AIza...).';
            return; // Soft validation, can be removed if strict
        }

        localStorage.setItem(this.API_KEY_KEY, key);
        this.keyModal.hidden = true;
        this.chatInterface.hidden = false; // Open chat after saving

        // Greeting if first time
        if (this.messagesContainer.children.length <= 1) {
            this.appendMessage('ai', '¡Configuración exitosa! Ahora puedo leer tus notas y ayudarte. Intenta pedirme que resuma lo que estás escribiendo.');
        }
    }

    handleUserSend() {
        const text = this.chatInput.value.trim();
        if (!text) return;

        // Clear input
        this.chatInput.value = '';
        this.chatInput.style.height = 'auto'; // Reset height if auto-expanding

        // Save to current Session
        if (!this.currentSessionId) this.createNewSession(false);

        // Update title if it's the first message
        this.updateCurrentSessionTitle(text);

        // Show user message
        this.appendMessage('user', text);

        // Get context from active note
        const context = this.noteApp.getActiveNoteContext();

        // Show loading
        const loadingId = this.appendLoading();

        // Call API
        this.callGemini(text, context)
            .then(response => {
                this.removeLoading(loadingId);
                this.appendMessage('ai', response);
            })
            .catch(err => {
                this.removeLoading(loadingId);
                this.appendMessage('ai error', 'Lo siento, hubo un error: ' + (err.message || 'Desconocido'));
            });
    }

    appendMessage(type, text) {
        // Save to data model
        const session = this.sessions.find(s => s.id === this.currentSessionId);
        if (session) {
            session.messages.push({ type, text, timestamp: Date.now() });
            session.updatedAt = Date.now();
            // Move session to top
            this.sessions = this.sessions.filter(s => s.id !== this.currentSessionId);
            this.sessions.unshift(session);
            this.saveSessions();
        }

        // Visual Append
        this.appendMessageToView(type, text);
    }

    appendMessageToView(type, text) {
        const div = document.createElement('div');
        div.className = `ai-message ${type}`;

        let formattedText = text;

        // Simple Markdown parsing (safety check for non-strings)
        if (typeof text === 'string') {
            formattedText = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\`\`\`(.*?)\`\`\`/gs, '<pre><code>$1</code></pre>')
                .replace(/\n/g, '<br>');
        }

        div.innerHTML = formattedText;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
        return div;
    }


    appendLoading() {
        const id = 'loading-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'ai-message loading';
        div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
        return id;
    }

    removeLoading(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async callGemini(prompt, context) {
        const key = this.getKey();
        if (!key) throw new Error('No hay API Key configurada.');

        const systemInstruction = `Eres Nova, un asistente inteligente integrado en una aplicación de notas.
        El usuario está editando una nota.
        
        CONTEXTO DE LA NOTA ACTUAL (Puede estar vacío):
        ---
        TÍTULO: ${context.title}
        CONTENIDO: ${context.content}
        ---

        INSTRUCCIONES:
        1. Responde de manera concisa y útil.
        2. Si el usuario te pide resumir, usa el contexto proporcionado.
        3. Si te pide redactar, genera el texto directamente.
        4. Eres servicial, amigable y profesional.
        5. Habla siempre en Español (o en el idioma que el usuario prefiera si lo cambia).
        `;

        let lastError = null;

        for (const model of this.MODELS_TO_TRY) {
            try {
                // console.log(`Trying AI model: ${model}`); // Debug (optional)
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
                const payload = {
                    contents: [{
                        parts: [{
                            text: systemInstruction + "\n\nUSUARIO DICE: " + prompt
                        }]
                    }]
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    // Handle Quota Exceeded (429) specifically -> Try next model
                    if (response.status === 429) {
                        console.warn(`Model ${model} hit rate limit (429). Trying next...`);
                        lastError = new Error(`Límite de cuota excedido en ${model}.`);
                        continue;
                    }

                    // If it's a 404 (Not Found) or 400 (Bad Request), treat as model issue and continue to next
                    if (response.status === 404 || response.status === 400 || response.status === 503) {
                        const errData = await response.json().catch(() => ({}));
                        const msg = errData.error?.message || response.statusText;
                        console.warn(`Model ${model} failed (${response.status}): ${msg}`);
                        lastError = new Error(`Model ${model} issue: ${msg}`);
                        continue; // Try next model
                    }

                    // Other errors
                    const errData = await response.json();
                    throw new Error(errData.error?.message || 'Error en Google AI');
                }

                const data = await response.json();
                const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!aiText) throw new Error('Respuesta vacía de la IA.');

                // Success!
                return aiText;

            } catch (error) {
                lastError = error;
                // If network fail, let's keep trying other models just in case
                console.error(`Error with model ${model}:`, error);
            }
        }

        // If loop finishes without returning
        if (lastError && (lastError.message.includes('cuota') || lastError.message.includes('429') || lastError.message.includes('rate limit'))) {
            throw new Error('⏳ Límite de uso alcanzado. La API gratuita de Gemini tiene límites. Espera 20-30 segundos e intenta de nuevo.');
        }

        throw lastError || new Error('No se pudo conectar con la IA. Verifica tu conexión a internet y tu API Key.');
    }
}

/**
 * @class NoteApp
 * @description Core engine for novaStarPro. Handles note management, state, UI rendering, and security.
 */
class NoteApp {
    /**
     * @constructor
     * Initializes the application state, DOM references, and event listeners.
     * @param {string|null} userId - The ID of the current logged-in user
     * @param {string|null} firebaseUid - The raw Firebase UID for Firestore operations
     * @param {boolean} isGuest - Whether the app is running in guest/public view mode
     */
    constructor(userId = null, firebaseUid = null, isGuest = false) {
        this.currentUserId = userId;
        this.firebaseUid = firebaseUid; // Used for Firestore cloud sync
        this.isGuest = isGuest;
        this.notes = this.isGuest ? [] : this.loadUserNotes(); // Don't load local notes for guest

        this.activeNoteId = null;
        this.searchTerm = '';

        /** @type {Object} Default typography and color settings */
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
        this.editorActions = document.querySelector('.editor-actions'); // Add this line

        this.themeSelect = document.getElementById('theme-select');
        this.lockNoteBtn = document.getElementById('lock-note-btn');
        this.passwordModal = document.getElementById('password-modal');
        this.pwdInput = document.getElementById('note-password-input');
        this.confirmPwdBtn = document.getElementById('confirm-password-btn');
        this.closePwdBtn = document.getElementById('close-pwd-btn');
        this.pwdError = document.getElementById('pwd-error');
        this.bgColorPicker = document.getElementById('bg-color-picker');
        this.categoryModal = document.getElementById('category-modal');

        this.installBtn = document.getElementById('pwa-install-btn');
        this.infoBtn = document.getElementById('info-btn');
        this.infoModal = document.getElementById('info-modal');
        this.closeInfoBtn = document.getElementById('close-info-btn');
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');
        this.themeIcon = document.getElementById('theme-icon');
        this.filterPublicBtn = document.getElementById('filter-public-btn');
        this.filterPrivateBtn = document.getElementById('filter-private-btn');
        this.filterTrashBtn = document.getElementById('filter-trash-btn');
        this.masterLockModal = document.getElementById('master-lock-modal');
        this.masterPwdInput = document.getElementById('master-password-input');
        this.unlockVaultBtn = document.getElementById('unlock-vault-btn');
        this.closeVaultViewBtn = document.getElementById('close-vault-view-btn');
        this.masterPwdError = document.getElementById('master-pwd-error');
        this.masterLockText = document.getElementById('master-lock-text');
        this.toggleVaultPwdBtn = document.getElementById('toggle-vault-pwd');
        // Cambio de contraseña
        this.changePwdBtn = document.getElementById('change-pwd-btn');
        this.changePwdModal = document.getElementById('change-pwd-modal');
        this.closeChangePwdBtn = document.getElementById('close-change-pwd-btn');
        this.currentPwdInput = document.getElementById('current-pwd-input');
        this.newPwdInput = document.getElementById('new-pwd-input');
        this.confirmPwdInput = document.getElementById('confirm-pwd-input');
        this.saveNewPwdBtn = document.getElementById('save-new-pwd-btn');
        this.changePwdError = document.getElementById('change-pwd-error');
        this.changePwdSuccess = document.getElementById('change-pwd-success');
        // Pin note
        this.pinNoteBtn = document.getElementById('pin-note-btn');
        // Export PDF
        this.exportPdfBtn = document.getElementById('export-pdf-btn');


        this.saveStatus = document.getElementById('save-status');
        this.mobileBackBtn = document.getElementById('mobile-back-btn');
        this.shareNoteBtn = document.getElementById('share-note-btn'); // Share button

        this.currentNoteFilter = 'public'; // 'public', 'private', or 'trash'
        this.isVaultUnlocked = false; // Estado de desbloqueo sesión actual
        this.deferredPrompt = null;

        // Cleanup trash on initialization
        this.cleanupTrash();


        // Optimized Debouncing
        this.debouncedSaveAndRender = this.debounce(() => this.autoSave(true), 1500);
        this.debouncedSelection = this.debounce(() => this.handleSelection(), 100);

        // Features: Voice, Reminder
        this.voiceNoteBtn = document.getElementById('voice-note-btn');
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;

        // --- ULTRA SECRET VAULT STATE ---
        this.isUltraVaultActive = false;
        this.isDecoyMode = false;
        this.vaultAttempts = 0;
        this.logoClickCount = 0;
        this.logoClickTimer = null;
        this.vaultConfig = this.loadVaultConfig();
        this.decoyNotes = this.generateDecoyNotes();

        // Vault DOM Elements
        this.vaultOnboardingModal = document.getElementById('vault-onboarding-modal');
        this.vaultAuthModal = document.getElementById('vault-auth-modal');
        this.vaultSecretBar = document.getElementById('vault-secret-bar');
        this.vaultTriggerSelect = document.getElementById('vault-trigger-select');
        this.customTapsContainer = document.getElementById('custom-taps-container');
        this.activateVaultBtn = document.getElementById('activate-vault-btn');
        this.vaultLogo = document.querySelector('.logo'); // Make sure we have the logo selector

        // --- END VAULT STATE ---

        this.reminderBtn = document.getElementById('reminder-btn');

        // Share Modal Elements
        this.shareModal = document.getElementById('share-modal');
        this.shareContentText = document.getElementById('share-content-text');
        this.closeShareBtn = document.getElementById('close-share-btn');
        this.copyShareLinkBtn = document.getElementById('copy-share-link-btn');
        this.createPublicLinkBtn = document.getElementById('create-public-link-btn'); // New button
        this.reminderModal = document.getElementById('reminder-modal');
        this.closeReminderBtn = document.getElementById('close-reminder-btn');
        this.reminderDateInput = document.getElementById('reminder-date-input');
        this.saveReminderBtn = document.getElementById('save-reminder-btn');
        this.deleteReminderBtn = document.getElementById('delete-reminder-btn');

        // Alarm System
        this.reminderInterval = null;

        // New Layout Elements for Sort
        this.sortTriggerBtn = document.getElementById('sort-trigger-btn');
        this.sortMenuOptions = document.getElementById('sort-menu-options');
        this.sortTextCurrent = document.getElementById('sort-text-current');
        this.sortIconCurrent = document.querySelector('.sort-icon-current');
        this.currentSortValue = 'date-desc'; // Default

        this.sortTextCurrent = document.getElementById('sort-text-current');
        this.sortIconCurrent = document.querySelector('.sort-icon-current');
        this.currentSortValue = 'date-desc'; // Default

        this.starBtn = document.getElementById('star-note-btn');

        // Category System (New)


        this.noteColorBtn = document.getElementById('note-color-btn');
        this.noteColorMenu = document.getElementById('note-color-menu');
        this.colorSwatches = document.querySelectorAll('.color-swatch');

        // New Media Elements
        this.btnImage = document.getElementById('btn-image');
        this.btnSketch = document.getElementById('btn-sketch');
        this.imageUploadInput = document.getElementById('image-upload-input');

        // Sketch Modal
        this.sketchModal = document.getElementById('sketch-modal');
        this.sketchCanvas = document.getElementById('sketch-canvas');
        this.closeSketchBtn = document.getElementById('close-sketch-btn');
        this.clearSketchBtn = document.getElementById('clear-sketch-btn');
        this.saveSketchBtn = document.getElementById('save-sketch-btn');
        this.sketchColor = document.getElementById('sketch-color');
        this.sketchSize = document.getElementById('sketch-size');
        this.ctx = null;
        this.isDrawing = false;

        // Image Resize Modal
        this.imageResizeModal = document.getElementById('image-resize-modal');
        this.imgResizeRange = document.getElementById('img-resize-range');
        this.imgResizeVal = document.getElementById('img-resize-val');
        this.cancelResizeBtn = document.getElementById('cancel-resize-btn');
        this.confirmResizeBtn = document.getElementById('confirm-resize-btn');
        this.currentResizingImg = null;

        // Help Dropdown
        this.helpBtn = document.getElementById('help-btn');
        this.helpDropdownMenu = document.getElementById('help-dropdown-menu');
        this.helpAiBtn = document.getElementById('help-ai-btn');

        // Context Menu (Long Press) Elements
        this.contextMenu = document.getElementById('note-context-menu');
        this.contextMenuTitle = document.getElementById('context-menu-title');
        this.closeContextMenuBtn = document.getElementById('close-context-menu-btn');
        this.ctxFavoriteBtn = document.getElementById('ctx-favorite-btn');
        this.ctxFavoriteLabel = document.getElementById('ctx-favorite-label');
        this.ctxPinBtn = document.getElementById('ctx-pin-btn');
        this.ctxPinLabel = document.getElementById('ctx-pin-label');
        this.ctxDeleteBtn = document.getElementById('ctx-delete-btn');
        this.ctxColorSwatches = document.querySelectorAll('.ctx-color-swatch');

        // Long Press State
        this.longPressTimer = null;
        this.longPressNoteId = null;
        this.longPressDuration = 500; // ms
        this.isLongPressing = false;

        // Initialize AI Manager
        this.aiManager = new AIManager(this);

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
        // Ultra Secret Vault Initialization
        this.initVault();

        this.newNoteBtn.addEventListener('click', () => this.createNewNote());



        this.deleteNoteBtn.onclick = (e) => { e.preventDefault(); this.deleteNote(); };
        this.saveNoteBtn.onclick = () => this.saveActiveNote();
        this.searchInput.oninput = (e) => this.handleSearch(e.target.value);
        this.fullscreenBtn.onclick = () => this.toggleFullscreen();

        // Help Dropdown Toggle
        if (this.helpBtn && this.helpDropdownMenu) {
            this.helpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.helpDropdownMenu.hidden = !this.helpDropdownMenu.hidden;
            });

            // Close on click outside
            document.addEventListener('click', (e) => {
                if (!this.helpBtn.contains(e.target) && !this.helpDropdownMenu.contains(e.target)) {
                    this.helpDropdownMenu.hidden = true;
                }
            });

            // "Talk to AI" opens the AI chat
            if (this.helpAiBtn) {
                this.helpAiBtn.addEventListener('click', () => {
                    this.helpDropdownMenu.hidden = true;
                    if (this.aiManager) {
                        this.aiManager.toggleChat();
                    }
                });
            }

            // "Report Error" opens modal
            const helpEmailBtn = document.getElementById('help-email-btn');
            const reportModal = document.getElementById('report-error-modal');
            const closeReportBtn = document.getElementById('close-report-modal-btn');
            const copyEmailBtn = document.getElementById('copy-support-email-btn');

            if (helpEmailBtn && reportModal) {
                helpEmailBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (this.helpDropdownMenu) this.helpDropdownMenu.hidden = true;
                    reportModal.style.display = 'flex';
                });
            }

            if (closeReportBtn && reportModal) {
                closeReportBtn.addEventListener('click', () => {
                    reportModal.style.display = 'none';
                });
            }

            if (copyEmailBtn) {
                copyEmailBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText('danieleliecerorduzbaron@gmail.com').then(() => {
                        copyEmailBtn.textContent = '✅ ¡Copiado!';
                        setTimeout(() => {
                            copyEmailBtn.textContent = '📋 Copiar Correo';
                        }, 2000);
                    });
                });
            }
        }

        // Also add global function as backup
        window.openReportModal = function () {
            const modal = document.getElementById('report-error-modal');
            const dropdown = document.getElementById('help-dropdown-menu');
            if (dropdown) dropdown.hidden = true;
            if (modal) modal.style.display = 'flex';
        };

        window.closeReportModal = function () {
            const modal = document.getElementById('report-error-modal');
            if (modal) modal.style.display = 'none';
        };

        window.copySupportEmail = function () {
            navigator.clipboard.writeText('danieleliecerorduzbaron@gmail.com').then(() => {
                const btn = document.getElementById('copy-support-email-btn');
                if (btn) {
                    btn.textContent = '✅ ¡Copiado!';
                    setTimeout(() => { btn.textContent = '📋 Copiar Correo'; }, 2000);
                }
            });
        };
        // PWA Install Logic
        // Check if already running as installed PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true
            || document.referrer.includes('android-app://');

        if (isStandalone) {
            // App is already installed and running as PWA, hide install button
            this.installBtn.style.display = 'none';
        } else {
            // Only show install prompt if not already installed
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
                // Double-check it's not in standalone mode before showing
                if (!window.matchMedia('(display-mode: standalone)').matches) {
                    this.installBtn.style.display = 'flex';
                }
            });
        }

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

        // Also listen for display-mode changes (in case user uninstalls)
        window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
            if (e.matches) {
                this.installBtn.style.display = 'none';
            }
        });

        // Filters (Public / Private / Trash)
        this.filterPublicBtn?.addEventListener('click', () => {
            this.currentNoteFilter = 'public';
            this.renderNotesList();
            this.updateUIForFilter();
            // Clear editor if trash note was selected
            if (this.activeNoteId) this.setActiveNote(null);
        });

        this.filterPrivateBtn?.addEventListener('click', () => {
            if (!this.isVaultUnlocked) {
                this.masterLockModal.style.display = 'flex';
                this.masterPwdInput.value = '';
                this.masterPwdInput.focus();
            } else {
                this.currentNoteFilter = 'private';
                this.renderNotesList();
                this.updateUIForFilter();
            }
            // Clear editor if trash note was selected
            if (this.activeNoteId) this.setActiveNote(null);
        });

        this.filterTrashBtn?.addEventListener('click', () => {
            this.currentNoteFilter = 'trash';
            this.renderNotesList();
            this.updateUIForFilter();
            if (this.activeNoteId) this.setActiveNote(null);
        });

        // Share Note - Open Modal
        this.shareNoteBtn?.addEventListener('click', () => this.shareCurrentNote());

        // Create Public Link Listener
        this.createPublicLinkBtn?.addEventListener('click', async () => {
            if (!this.activeNoteId) return;

            const note = this.notes.find(n => n.id === this.activeNoteId);
            if (!note) return;

            this.createPublicLinkBtn.textContent = '⏳ Generando enlace...';
            this.createPublicLinkBtn.disabled = true;

            try {
                if (typeof window.publishNotePublicly === 'function') {
                    const publicId = await window.publishNotePublicly(note);
                    if (publicId) {
                        const link = `${window.location.origin}${window.location.pathname}?publicNote=${publicId}`;
                        this.shareContentText.value = link;
                        this.createPublicLinkBtn.textContent = '✅ Enlace Generado';
                        // Optionally hide the button after success or keep for regen?
                    } else {
                        throw new Error('ID nulo recibido');
                    }
                } else {
                    alert('Error: Función de publicación no disponible. Recarga la página.');
                }
            } catch (err) {
                console.error(err);
                alert('No se pudo generar el enlace. Verifica tu conexión.');
                this.createPublicLinkBtn.textContent = '🌐 Generar Enlace Público';
            } finally {
                this.createPublicLinkBtn.disabled = false;
            }
        });

        // Share Modal Listeners
        this.closeShareBtn?.addEventListener('click', () => {
            this.shareModal.hidden = true;
            this.shareModal.classList.remove('flex'); // Assuming utility class or hidden attribute handles it
            this.shareModal.style.display = 'none';
        });

        this.copyShareLinkBtn?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(this.shareContentText.value);
                const originalText = this.copyShareLinkBtn.textContent;
                this.copyShareLinkBtn.textContent = '✅ Copiado';
                setTimeout(() => this.copyShareLinkBtn.textContent = originalText, 2000);
            } catch (err) {
                alert('No se pudo copiar automáticamente.');
            }
        });

        // Close on overlay click
        this.shareModal?.addEventListener('click', (e) => {
            if (e.target === this.shareModal) {
                this.shareModal.style.display = 'none';
            }
        });

        // Info Modal Logic - Secured
        if (this.infoBtn && this.infoModal) {
            this.infoBtn.onclick = (e) => {
                e.stopPropagation();
                this.infoModal.hidden = false;
                this.infoModal.style.display = 'flex'; // Ensure flex display
            };
        }

        if (this.closeInfoBtn && this.infoModal) {
            this.closeInfoBtn.onclick = (e) => {
                e.stopPropagation();
                this.infoModal.hidden = true;
                this.infoModal.style.display = 'none';
            };
        }

        if (this.infoModal) {
            this.infoModal.onclick = (e) => {
                if (e.target === this.infoModal) {
                    this.infoModal.hidden = true;
                    this.infoModal.style.display = 'none';
                }
            };
        }

        // Theme Toggle
        this.themeToggleBtn.onclick = () => this.toggleTheme();
        this.initTheme();

        // Mobile Menu Logic
        this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
        this.mobileMenuBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleMobileMenu();
        };

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.formatToolbar.classList.contains('show') &&
                !this.formatToolbar.contains(e.target) &&
                e.target !== this.mobileMenuBtn &&
                !this.mobileMenuBtn.contains(e.target)) {
                this.formatToolbar.classList.remove('show');
                this.mobileMenuBtn.classList.remove('active');
            }
        });

        // Content Editable Events
        this.noteTitleInput.oninput = () => {
            this.updateSidebarCardPreview();
            this.debouncedSaveAndRender();
            this.updatePlaceholderState();
        };
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

        // Remove Highlight Button
        this.removeHighlightBtn = document.getElementById('remove-highlight-btn');
        if (this.removeHighlightBtn) {
            this.removeHighlightBtn.onclick = () => this.removeHighlight();
        }

        this.renderNotesList();
        this.updateStats();

        // Establecer estado vacío inicial (oculta toolbar, muestra emoji de bienvenida)
        this.setActiveNote(null);

        // Ocultar botón de cambiar contraseña (solo visible en bóveda privada)
        this.changePwdBtn.style.display = 'none';

        // Format listeners with auto-close logic handled carefully
        this.titleFontSelect.onchange = (e) => { this.updateFormat('titleFont', e.target.value); this.closeToolbarMobile(); };
        this.titleSizeSelect.onchange = (e) => { this.updateFormat('titleSize', e.target.value); this.closeToolbarMobile(); };

        // Color pickers: update on input (realtime), close on change (final selection)
        this.titleColorPicker.oninput = (e) => this.updateFormat('titleColor', e.target.value);
        this.titleColorPicker.onchange = (e) => this.closeToolbarMobile();

        this.contentFontSelect.onchange = (e) => { this.updateFormat('contentFont', e.target.value); this.closeToolbarMobile(); };
        this.contentSizeSelect.onchange = (e) => { this.updateFormat('contentSize', e.target.value); this.closeToolbarMobile(); };

        this.textColorPicker.oninput = (e) => this.updateFormat('textColor', e.target.value);
        this.textColorPicker.onchange = (e) => this.closeToolbarMobile();


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
        this.pinNoteBtn.onclick = () => this.togglePin();
        this.exportPdfBtn.onclick = () => this.exportToPDF();

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
        this.filterTrashBtn.onclick = () => this.setFilter('trash');

        // Bloqueo de Enter en password maestro
        this.masterPwdInput.onkeydown = (e) => { if (e.key === 'Enter') this.verifyMasterPassword(); };

        // Cambio de Contraseña Listeners
        this.changePwdBtn.onclick = () => this.openChangePwdModal();
        this.closeChangePwdBtn.onclick = () => this.closeChangePwdModal();
        this.saveNewPwdBtn.onclick = () => this.saveNewPassword();
        this.changePwdModal.onclick = (e) => {
            if (e.target === this.changePwdModal) this.closeChangePwdModal();
        };

        // Feedback Listeners
        this.initFeedback();

        // Formato de Texto
        // Format Toolbar Buttons
        const formatButtons = [
            { id: 'btn-bold', cmd: 'bold' },
            { id: 'btn-italic', cmd: 'italic' },
            { id: 'btn-underline', cmd: 'underline' }
        ];

        formatButtons.forEach(btn => {
            const el = document.getElementById(btn.id);
            if (el) {
                el.onclick = () => {
                    this.applyTextFormat(btn.cmd);
                    this.closeToolbarMobile();
                };
            }
        });

        // Custom Checklist Logic
        const btnList = document.getElementById('btn-list');
        if (btnList) {
            btnList.onclick = () => {
                this.insertChecklist();
                this.closeToolbarMobile();
            };
        }

        // Checklist Interaction (Delegated)
        this.noteContentInput.addEventListener('click', (e) => {
            // Check if clicking on LI
            if (e.target.tagName === 'LI' && this.noteContentInput.contains(e.target)) {
                // Toggle checked state
                const li = e.target;
                // Get click position relative to LI
                const rect = li.getBoundingClientRect();
                const x = e.clientX - rect.left;

                // If click is in the "checkbox area" (first 30px approximately)
                if (x <= 30) {
                    li.classList.toggle('checked');
                    this.debouncedSaveAndRender();
                    e.preventDefault(); // Prevent moving cursor there if just checking
                }
            }
        });
        // Botón de atrás en móvil
        if (this.mobileBackBtn) {
            this.mobileBackBtn.onclick = () => this.setActiveNote(null);
        }

        // Feature Listeners
        this.voiceNoteBtn.onclick = () => this.toggleRecording();

        this.reminderBtn.onclick = () => this.openReminderModal();
        this.closeReminderBtn.onclick = () => this.reminderModal.hidden = true;
        this.saveReminderBtn.onclick = () => this.saveReminder();
        this.deleteReminderBtn.onclick = () => this.deleteReminder();

        // Start Alarm System
        if ('Notification' in window) {
            Notification.requestPermission();
        }
        this.startReminderCheck();

        // SORT DROPDOWN LOGIC
        if (this.sortTriggerBtn) {
            this.sortTriggerBtn.onclick = (e) => {
                e.stopPropagation();
                this.sortMenuOptions.hidden = !this.sortMenuOptions.hidden;
            };

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (this.sortMenuOptions && !this.sortMenuOptions.hidden) {
                    if (!this.sortTriggerBtn.contains(e.target) && !this.sortMenuOptions.contains(e.target)) {
                        this.sortMenuOptions.hidden = true;
                    }
                }
            });

            // Options Selection
            const sortOptions = this.sortMenuOptions.querySelectorAll('.sort-option');
            sortOptions.forEach(opt => {
                opt.onclick = () => {
                    // Remove active from all
                    sortOptions.forEach(o => o.classList.remove('active'));
                    // Add active to current
                    opt.classList.add('active');

                    // Update Logic
                    this.currentSortValue = opt.getAttribute('data-value');
                    this.renderNotesList();

                    // Update UI Trigger (Icon & Text)
                    const icon = opt.querySelector('.opt-icon').textContent;
                    const title = opt.querySelector('.opt-title').textContent;

                    this.sortIconCurrent.textContent = icon;
                    this.sortTextCurrent.textContent = title;

                    // Close menu
                    this.sortMenuOptions.hidden = true;
                };
            });
        }

        if (this.starBtn) {
            this.starBtn.onclick = () => this.toggleFavorite();
        }

        if (this.noteColorBtn) {
            this.noteColorBtn.onclick = (e) => {
                e.stopPropagation();
                this.noteColorMenu.style.display = this.noteColorMenu.style.display === 'grid' ? 'none' : 'grid';
            };
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.noteColorBtn.contains(e.target) && !this.noteColorMenu.contains(e.target)) {
                    this.noteColorMenu.style.display = 'none';
                }
            });
        }

        this.colorSwatches.forEach(swatch => {
            swatch.onclick = (e) => {
                const color = e.target.getAttribute('data-color');
                this.setNoteColor(color);
                this.noteColorMenu.style.display = 'none';
            };
        });



        // Media Listeners
        if (this.btnImage) this.btnImage.onclick = () => this.imageUploadInput.click();
        if (this.imageUploadInput) this.imageUploadInput.onchange = (e) => this.handleImageUpload(e);
        if (this.btnSketch) this.btnSketch.onclick = () => this.openSketchModal();

        // Sketch Logic
        if (this.closeSketchBtn) this.closeSketchBtn.onclick = () => this.sketchModal.hidden = true;
        if (this.clearSketchBtn) this.clearSketchBtn.onclick = () => this.clearSketch();
        if (this.saveSketchBtn) this.saveSketchBtn.onclick = () => this.saveSketch();

        // Resize Logic
        if (this.cancelResizeBtn) this.cancelResizeBtn.onclick = () => this.imageResizeModal.hidden = true;
        if (this.confirmResizeBtn) this.confirmResizeBtn.onclick = () => this.applyImageResize();
        if (this.imgResizeRange) {
            this.imgResizeRange.oninput = (e) => {
                const val = e.target.value + '%';
                this.imgResizeVal.textContent = val;
                if (this.currentResizingImg) this.currentResizingImg.style.width = val;
            };
        }

        // Image Double Click to Resize
        this.noteContentInput.addEventListener('dblclick', (e) => {
            if (e.target.tagName === 'IMG') {
                this.openResizeModal(e.target);
            }
        });

        // --- Gestos Táctiles para Redimensionar Imágenes (Móvil) ---
        let initialPinchDistance = 0;
        let initialPinchWidthPercent = 100;
        let pinchTargetImg = null;

        this.noteContentInput.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2 && e.target.tagName === 'IMG') {
                pinchTargetImg = e.target;
                initialPinchDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                let currentWidth = pinchTargetImg.style.width || '100%';
                initialPinchWidthPercent = parseInt(currentWidth) || 100;
                // No llamamos a preventDefault para no romper el scroll normal,
                // a menos que estemos pinchando la imagen.
            }
        }, { passive: true });

        this.noteContentInput.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && pinchTargetImg) {
                const currentDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );

                if (initialPinchDistance > 0) {
                    const ratio = currentDistance / initialPinchDistance;
                    let newWidthPercent = initialPinchWidthPercent * ratio;

                    // Limitar entre 10% y 100%
                    newWidthPercent = Math.max(10, Math.min(100, Math.round(newWidthPercent)));

                    pinchTargetImg.style.width = newWidthPercent + '%';

                    // Aquí sí prevenimos el scroll para que el gesto de zoom sea fluido
                    if (e.cancelable) e.preventDefault();
                }
            }
        }, { passive: false });

        this.noteContentInput.addEventListener('touchend', () => {
            if (pinchTargetImg) {
                this.debouncedSaveAndRender();
                pinchTargetImg = null;
                initialPinchDistance = 0;
            }
        });

        // ============================================
        // Context Menu (Long Press) Initialization
        // ============================================
        this.initContextMenu();
    }

    /**
     * Initializes the context menu for long press on note items (mobile)
     */
    initContextMenu() {
        // Close context menu button
        if (this.closeContextMenuBtn) {
            this.closeContextMenuBtn.addEventListener('click', () => this.closeContextMenu());
        }

        // Close menu when clicking overlay
        if (this.contextMenu) {
            this.contextMenu.addEventListener('click', (e) => {
                if (e.target === this.contextMenu) {
                    this.closeContextMenu();
                }
            });
        }

        // Favorite button
        if (this.ctxFavoriteBtn) {
            this.ctxFavoriteBtn.addEventListener('click', () => {
                this.toggleFavoriteById(this.longPressNoteId);
                this.closeContextMenu();
            });
        }

        // Pin button
        if (this.ctxPinBtn) {
            this.ctxPinBtn.addEventListener('click', () => {
                this.togglePinById(this.longPressNoteId);
                this.closeContextMenu();
            });
        }

        // Delete button
        if (this.ctxDeleteBtn) {
            this.ctxDeleteBtn.addEventListener('click', () => {
                const noteIdToDelete = this.longPressNoteId; // Save before closing
                this.closeContextMenu();
                // Small delay to allow menu to close before confirm dialog
                setTimeout(() => {
                    this.deleteNoteById(noteIdToDelete);
                }, 100);
            });
        }

        // Color swatches
        this.ctxColorSwatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                const color = e.target.getAttribute('data-color');
                this.setNoteColorById(this.longPressNoteId, color);

                // Update visual selection
                this.ctxColorSwatches.forEach(s => s.classList.remove('selected'));
                e.target.classList.add('selected');

                // Small haptic feedback delay before closing
                setTimeout(() => this.closeContextMenu(), 150);
            });
        });
    }

    /**
     * Handles touch start for long press detection on note items
     */
    handleNoteTouchStart(noteId, noteEl, e) {
        // Only single touch
        if (e.touches.length !== 1) return;

        this.isLongPressing = false;
        this.longPressNoteId = noteId;

        // Add visual feedback
        noteEl.classList.add('long-pressing');

        this.longPressTimer = setTimeout(() => {
            this.isLongPressing = true;
            noteEl.classList.remove('long-pressing');
            noteEl.classList.add('long-pressed');

            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }

            this.openContextMenu(noteId);

            // Remove animation class after it plays
            setTimeout(() => noteEl.classList.remove('long-pressed'), 400);
        }, this.longPressDuration);
    }

    /**
     * Handles touch end/cancel to cancel long press
     */
    handleNoteTouchEnd(noteEl) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        noteEl.classList.remove('long-pressing');
    }

    /**
     * Opens the context menu for a specific note
     */
    openContextMenu(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        this.longPressNoteId = noteId;

        // Update menu title
        if (this.contextMenuTitle) {
            const title = note.title || 'Nota sin título';
            this.contextMenuTitle.textContent = title.length > 25 ? title.substring(0, 25) + '...' : title;
        }

        // Update favorite button label
        if (this.ctxFavoriteLabel) {
            this.ctxFavoriteLabel.textContent = note.isFavorite ? 'Quitar de Favoritos' : 'Añadir a Favoritos';
        }

        // Update pin button label
        if (this.ctxPinLabel) {
            this.ctxPinLabel.textContent = note.pinned ? 'Desfijar' : 'Fijar Arriba';
        }

        // Update color selection
        this.ctxColorSwatches.forEach(swatch => {
            swatch.classList.remove('selected');
            if (swatch.getAttribute('data-color') === (note.color || 'none')) {
                swatch.classList.add('selected');
            }
        });

        // Show menu
        if (this.contextMenu) {
            this.contextMenu.hidden = false;
        }
    }

    /**
     * Closes the context menu
     */
    closeContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.hidden = true;
        }
        this.longPressNoteId = null;
        this.isLongPressing = false;
    }

    /**
     * Toggle favorite for a note by ID (used by context menu)
     */
    toggleFavoriteById(noteId) {
        if (!noteId) return;
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.isFavorite = !note.isFavorite;
            this.saveToStorage();
            this.renderNotesList();

            // Update main editor UI if this is the active note
            if (noteId === this.activeNoteId) {
                this.updateNoteMetaUI(note);
            }
        }
    }

    /**
     * Toggle pin for a note by ID (used by context menu)
     */
    togglePinById(noteId) {
        if (!noteId) return;
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.pinned = !note.pinned;
            this.saveToStorage();
            this.renderNotesList();

            // Update main editor UI if this is the active note
            if (noteId === this.activeNoteId && this.pinNoteBtn) {
                this.pinNoteBtn.classList.toggle('pin-active', note.pinned);
            }
        }
    }

    /**
     * Delete note by ID (used by context menu)
     */
    deleteNoteById(noteId) {
        if (!noteId) return;

        const noteIndex = this.notes.findIndex(n => n.id === noteId);
        if (noteIndex === -1) return;

        // If filtering by trash, DELETE PERMANENTLY
        if (this.currentNoteFilter === 'trash') {
            if (confirm('¿Eliminar esta nota permanentemente?')) {
                this.notes.splice(noteIndex, 1);
                this.saveToStorage();
                this.renderNotesList();
                if (noteId === this.activeNoteId) {
                    this.setActiveNote(null);
                }
            }
        } else {
            // Soft delete: Move to Trash
            if (confirm('¿Mover esta nota a la papelera?')) {
                const note = this.notes[noteIndex];
                note.deletedAt = new Date().toISOString();
                note.isFavorite = false;
                note.pinned = false;

                this.saveToStorage();
                this.renderNotesList();
                if (noteId === this.activeNoteId) {
                    this.setActiveNote(null);
                }
            }
        }
    }

    /**
     * Set note color by ID (used by context menu)
     */
    setNoteColorById(noteId, color) {
        if (!noteId) return;
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.color = color;
            this.saveToStorage();
            this.renderNotesList();
        }
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

    // Simplified Feedback System (Local Only to prevent CORS errors)
    refreshCounts() {
        // Load from local storage or default to 0
        const lCount = parseInt(localStorage.getItem('nstar_l') || '0');
        const dCount = parseInt(localStorage.getItem('nstar_d') || '0');

        const lEl = document.getElementById('like-count');
        const dEl = document.getElementById('dislike-count');
        if (lEl) lEl.textContent = lCount;
        if (dEl) dEl.textContent = dCount;
    }

    handleVote(type, btn) {
        // Simple toggle logic for local feel
        const isVoted = btn.classList.contains('voted');

        // Handle "deselect" if clicking same button, or switch if checking other
        const otherType = type === 'likes' ? 'dislikes' : 'likes';
        const otherBtn = type === 'likes' ? document.getElementById('dislike-btn') : document.getElementById('like-btn');

        // If I was voted, deselect me
        if (isVoted) {
            btn.classList.remove('voted');
            localStorage.removeItem('novanotes_voted');

            let myCount = parseInt(localStorage.getItem(type === 'likes' ? 'nstar_l' : 'nstar_d') || '0');
            myCount = Math.max(0, myCount - 1);
            localStorage.setItem(type === 'likes' ? 'nstar_l' : 'nstar_d', myCount);

        } else {
            // If other was voted, deselect it
            if (otherBtn.classList.contains('voted')) {
                otherBtn.classList.remove('voted');
                let otherCount = parseInt(localStorage.getItem(otherType === 'likes' ? 'nstar_l' : 'nstar_d') || '0');
                otherCount = Math.max(0, otherCount - 1);
                localStorage.setItem(otherType === 'likes' ? 'nstar_l' : 'nstar_d', otherCount);
            }

            // Select me
            btn.classList.add('voted');
            localStorage.setItem('novanotes_voted', type);

            let myCount = parseInt(localStorage.getItem(type === 'likes' ? 'nstar_l' : 'nstar_d') || '0');
            myCount++;
            localStorage.setItem(type === 'likes' ? 'nstar_l' : 'nstar_d', myCount);

            // Visual feedback
            const emoji = type === 'likes' ? '✨' : '💫';
            this.showFloatingEmoji(emoji, btn);
        }

        this.refreshCounts();
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
        // Now acts as Highlight / Marker Background Color
        document.execCommand('hiliteColor', false, color);
        // Also support 'backColor' for some browsers if needed, but hiliteColor is standard for selection
        this.debouncedSaveAndRender();
        this.selectionToolbar.hidden = true; // Auto hide after selection
        this.noteContentInput.focus();
    }

    removeHighlight() {
        // Remove highlight by setting transparent background
        document.execCommand('hiliteColor', false, 'transparent');
        // Fallback for some browsers
        document.execCommand('backColor', false, 'transparent');
        this.debouncedSaveAndRender();
        this.selectionToolbar.hidden = true;
        this.noteContentInput.focus();
    }

    applyTextFormat(command, value = null) {
        this.noteContentInput.focus();
        document.execCommand(command, false, value);
        this.debouncedSaveAndRender();
    }

    insertImage(src) {
        const imgHtml = `<img src="${src}" style="max-width: 100%; border-radius: 15px; margin: 15px 0; display: block; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">`;
        this.noteContentInput.focus();
        document.execCommand('insertHTML', false, imgHtml + '<div><br></div>');
        this.debouncedSaveAndRender();
    }

    insertChecklist() {
        this.noteContentInput.focus();
        // Insert a UL with class "checklist"
        // We need to check if we are already in a list or just insert a new one.
        // Simplified: use execCommand to make a list, then add class to the parent UL
        document.execCommand('insertUnorderedList');

        // Find the parent UL of the current selection and add class
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let node = selection.anchorNode;
            while (node && node.nodeName !== 'UL' && node !== this.noteContentInput) {
                node = node.parentNode;
            }
            if (node && node.nodeName === 'UL') {
                node.classList.add('checklist');
            }
        }
        this.debouncedSaveAndRender();
    }

    // Emoji picker methods removed as requested
    insertTextAtCursor(text) {
        document.execCommand('insertText', false, text);
        this.debouncedSaveAndRender();
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

    renderActiveNote() {
        if (!this.activeNoteId) return;

        const note = this.notes.find(n => n.id === this.activeNoteId);
        this.noteTitleInput.innerText = note.title || ''; // Use innerText to avoid HTML in title
        this.noteContentInput.innerHTML = note.content || '';

        this.updateReminderUI(note);

        // ... rest of rendering ...
        this.applyFormat(note.styles);
        this.applyTheme(note.theme || 'none', note.customBgColor);



        this.updateNoteMetaUI(note);

        // Update placeholders
        this.updatePlaceholderState();
        this.updateWordCount();
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

    toggleMobileMenu() {
        this.formatToolbar.classList.toggle('show');
        this.mobileMenuBtn.classList.toggle('active');
    }

    closeToolbarMobile() {
        if (window.innerWidth <= 768) {
            this.formatToolbar.classList.remove('show');
            this.mobileMenuBtn.classList.remove('active');
        }
        // Return focus to content to keep typing flow
        if (this.activeNoteId) this.noteContentInput.focus();
    }

    toggleFullscreen() {
        this.appContainer.classList.toggle('fullscreen');
        this.fullscreenBtn.classList.toggle('fullscreen-active');
    }

    /**
     * Creates a new note with default styles and pushes it to the stack.
     * @returns {void}
     */
    createNewNote() {
        const newNote = {
            id: Date.now().toString(),
            title: '',
            content: '',
            updatedAt: new Date().toISOString(),
            category: 'personal', // Default
            styles: { ...this.DEFAULT_STYLES },
            isFavorite: false,
            color: 'none' // 'none', 'red', 'blue', etc.
        };
        this.notes.unshift(newNote);
        this.saveToStorage();
        this.setActiveNote(newNote.id);
        this.renderNotesList();
        this.renderNotesList();
        this.updateStats();
        this.noteTitleInput.focus();
        this.updateNoteMetaUI(newNote);
    }

    /**
     * Loads a specific note into the editor and applies its custom styles.
     * @param {string|null} id - The ID of the note to load.
     */
    setActiveNote(id) {
        if (!id) {
            this.activeNoteId = null;
            this.editorFields.hidden = true;
            this.emptyState.hidden = false;
            this.editorView.classList.add('empty');
            // Hide entire toolbar container
            if (this.editorActions) this.editorActions.style.display = 'none';
            this.deleteNoteBtn.hidden = true;
            this.saveNoteBtn.hidden = true;
            this.lastEditedText.textContent = 'Selecciona una nota para comenzar';
            document.body.classList.remove('editor-screen-active');
            // Resetear el fondo/tema del editor al estado normal
            this.applyTheme('none');
            return;
        }

        const note = this.notes.find(n => n.id === id);
        if (note) {
            // No permitir abrir notas privadas si el filtro es público
            if (note.password && this.currentNoteFilter === 'public') return;

            document.body.classList.add('editor-screen-active');
            this.activeNoteId = id;

            // Show toolbar
            if (this.editorActions) this.editorActions.style.display = 'flex';
            this.noteTitleInput.innerHTML = note.title;
            this.noteContentInput.innerHTML = note.content;

            // Restore Note Color logic (Visual bg wrapper or border)
            // If uses "theme" (Canva style) or "color" (Simple color).
            // We'll prioritize 'theme' if set, else 'color'.
            this.themeSelect.value = note.theme || 'none';
            this.bgColorPicker.style.display = note.theme === 'custom' ? 'block' : 'none';
            if (note.customBgColor) this.bgColorPicker.value = note.customBgColor;
            this.applyTheme(note.theme || 'none', note.customBgColor);

            // New: Handle Note Color UI (Button active state)
            this.updateColorUI(note.color || 'none');

            this.lockNoteBtn.classList.toggle('locked-active', !!note.password);
            this.pinNoteBtn.classList.toggle('pin-active', !!note.pinned);

            // Start Update
            this.starBtn.classList.toggle('active', !!note.isFavorite);

            // End Update

            this.lastEditedText.textContent = `Editado: ${this.formatDate(note.updatedAt)}`;
            this.applyFormat(note.styles);

            // Gestionar placeholders
            this.updatePlaceholderState();

            this.editorView.classList.remove('empty');
            this.editorFields.hidden = false;
            this.emptyState.hidden = true;
            this.deleteNoteBtn.hidden = false;
            this.saveNoteBtn.hidden = false;

        } else {
            this.setActiveNote(null);
        }
        this.updateActiveNoteInList();
    }

    updateColorUI(color) {
        // Reset swatches
        this.colorSwatches.forEach(s => s.classList.remove('active'));
        // Activate current
        const current = this.noteColorMenu.querySelector(`[data-color="${color}"]`);
        if (current) current.classList.add('active');

        // Update button icon color maybe?
        if (color !== 'none') {
            this.noteColorBtn.style.color = this.getColorHex(color);
        } else {
            this.noteColorBtn.style.color = '';
        }
    }

    getColorHex(colorName) {
        const colors = {
            'red': '#ef4444', 'orange': '#f97316', 'yellow': '#eab308',
            'green': '#22c55e', 'teal': '#14b8a6', 'blue': '#3b82f6',
            'purple': '#a855f7', 'pink': '#ec4899'
        };
        return colors[colorName] || 'var(--text-muted)';
    }



    // --- Media Methods --- //

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                this.insertImage(readerEvent.target.result);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = ''; // Reset
    }

    openResizeModal(img) {
        this.currentResizingImg = img;
        // Parse width %
        let currentWidth = img.style.width || '100%';
        if (!currentWidth.includes('%')) currentWidth = '100%';
        const val = parseInt(currentWidth);

        this.imgResizeRange.value = val;
        this.imgResizeVal.textContent = val + '%';

        this.imageResizeModal.hidden = false;
        this.imageResizeModal.classList.remove('hidden');
    }

    applyImageResize() {
        // Just hide, change updates realtime-ish or we can finalize here
        if (this.currentResizingImg) {
            this.currentResizingImg.style.width = this.imgResizeRange.value + '%';
            this.debouncedSaveAndRender();
        }
        this.imageResizeModal.hidden = true;
        this.currentResizingImg = null;
    }

    // --- Sketch Methods --- //

    openSketchModal() {
        this.sketchModal.hidden = false;
        this.sketchModal.classList.remove('hidden');

        // Init Canvas
        if (!this.ctx) {
            this.initCanvas();
        } else {
            this.clearSketch();
        }
    }

    initCanvas() {
        const canvas = this.sketchCanvas;
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        this.ctx = canvas.getContext('2d');
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Mouse Events
        canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        canvas.addEventListener('mousemove', (e) => this.draw(e));
        canvas.addEventListener('mouseup', () => this.stopDrawing());
        canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch Events
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.startDrawing(e.touches[0]); });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.draw(e.touches[0]); });
        canvas.addEventListener('touchend', () => this.stopDrawing());
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.sketchCanvas.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.sketchCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.ctx.lineWidth = this.sketchSize.value;
        this.ctx.strokeStyle = this.sketchColor.value;

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();

        this.lastX = x;
        this.lastY = y;
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    clearSketch() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.sketchCanvas.width, this.sketchCanvas.height);
        }
    }

    saveSketch() {
        const dataUrl = this.sketchCanvas.toDataURL('image/png');
        this.insertImage(dataUrl);
        this.sketchModal.hidden = true;
    }

    /* Tag methods removed */

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
            const titleEl = card.querySelector('.note-title');
            const previewEl = card.querySelector('.note-preview');
            const titleText = this.noteTitleInput.innerText || 'Nota sin título';

            // Preserve pin/icon if technically possible or just simple update
            // For simplicity and robustness, we just update text.
            // Ideally we should just update the text node, but innerText write removes children.
            // Let's rely on full re-render (debounced) for perfect structure,
            // and for immediate preview just update text to show responsiveness.
            if (titleEl) titleEl.innerText = titleText;
            if (previewEl) previewEl.innerText = this.noteContentInput.innerText.substring(0, 40) || 'Sin contenido adicional...';
        }
    }

    autoSave(shouldRefreshList = false) {
        if (!this.activeNoteId) return;

        // Mostrar estado de guardando
        this.saveStatus.textContent = 'Guardando...';
        this.saveStatus.className = 'save-status saving';

        const index = this.notes.findIndex(n => n.id === this.activeNoteId);
        if (index === -1) return;

        const note = this.notes[index];
        note.title = this.noteTitleInput.innerHTML;
        note.content = this.noteContentInput.innerHTML;

        note.updatedAt = new Date().toISOString();

        this.saveToStorage();
        this.lastEditedText.textContent = `Editado: ${this.formatDate(note.updatedAt)}`;

        // Mostrar estado de salvado
        setTimeout(() => {
            this.saveStatus.textContent = '✓ Guardado';
            this.saveStatus.className = 'save-status saved';
        }, 500);

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

    deleteNote(noteId = null) {
        const idToDelete = noteId || this.activeNoteId;
        if (!idToDelete) return;

        const noteIndex = this.notes.findIndex(n => n.id === idToDelete);
        if (noteIndex === -1) return;

        // If filtering by trash, DELETE PERMANENTLY
        if (this.currentNoteFilter === 'trash') {
            if (confirm('¿Estás seguro de que quieres eliminar esta nota permanentemente? Esta acción no se puede deshacer.')) {
                this.notes.splice(noteIndex, 1);
                this.saveToStorage();
                this.renderNotesList();
                this.setActiveNote(null); // Volver a inicio
                this.showSyncStatus('synced');
            }
        } else {
            // Soft delete: Move to Trash
            if (confirm('¿Mover esta nota a la papelera?')) {
                const note = this.notes[noteIndex];
                note.deletedAt = new Date().toISOString(); // Mark as deleted
                note.isFavorite = false; // Remove favorite status
                note.isPinned = false; // Remove pin

                this.saveToStorage();
                this.renderNotesList();
                this.setActiveNote(null); // Volver a inicio
                this.showSyncStatus('synced');
            }
        }
    }

    updateUIForFilter() {
        // Reset ALL active states
        this.filterPublicBtn?.classList.remove('active');
        this.filterPrivateBtn?.classList.remove('active');
        this.filterTrashBtn?.classList.remove('active');

        // Set active based on current filter
        if (this.currentNoteFilter === 'public') {
            this.filterPublicBtn?.classList.add('active');
            this.masterLockModal.style.display = 'none'; // Ensure lock modal is hidden
        } else if (this.currentNoteFilter === 'private') {
            this.filterPrivateBtn?.classList.add('active');
        } else if (this.currentNoteFilter === 'trash') {
            this.filterTrashBtn?.classList.add('active');
            this.masterLockModal.style.display = 'none';
        }
    }

    /**
     * Restore a note from trash
     */
    restoreNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            delete note.deletedAt;
            this.activeNoteId = noteId;
            // Switch to filter where note belongs? For now stay in trash view but remove item
            this.saveToStorage();
            this.renderNotesList();
            // Optional: Switch filter automatically
            // this.currentNoteFilter = note.isLocked ? 'private' : 'public';
            // this.updateUIForFilter();
        }
    }

    /**
     * Delete notes older than 7 days from trash
     */
    cleanupTrash() {
        if (!this.notes) return;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const initialCount = this.notes.length;
        this.notes = this.notes.filter(note => {
            if (note.deletedAt) {
                const deletedDate = new Date(note.deletedAt);
                return deletedDate > sevenDaysAgo; // Keep only if deleted recently
            }
            return true;
        });

        if (this.notes.length !== initialCount) {
            console.log(`🗑️ Cleaned up ${initialCount - this.notes.length} old notes from trash.`);
            this.saveToStorage();
        }
    }

    /**
     * Share the current note using Web Share API or Clipboard
     */
    async shareCurrentNote() {
        if (!this.activeNoteId) {
            alert('Primero selecciona una nota para compartir.');
            return;
        }

        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (!note) return;

        // Populate Modal
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        let plainText = tempDiv.textContent || tempDiv.innerText || '';

        const textToShare = `${note.title || 'Nota sin título'}\n\n${plainText}\n\n(Compartido desde NovaStarPro)`;

        this.shareContentText.value = textToShare;
        this.shareModal.style.display = 'flex';
        this.shareModal.hidden = false;
    }

    /**
     * Restaura una nota de la papelera
     */
    restoreNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            note.trashed = false;
            delete note.trashedAt;
            this.saveToStorage();
            this.renderNotesList();
            this.updateStats();
        }
    }

    /**
     * Elimina permanentemente una nota
     */
    deletePermanently(id) {
        if (confirm('¿Eliminar esta nota PERMANENTEMENTE? Esta acción no se puede deshacer.')) {
            this.notes = this.notes.filter(n => n.id !== id);
            this.saveToStorage();
            this.setActiveNote(null);
            this.renderNotesList();
            this.updateStats();
        }
    }

    toggleFavorite() {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note) {
            note.isFavorite = !note.isFavorite;
            this.saveToStorage();
            this.updateNoteMetaUI(note); // Update star button
            this.renderNotesList(); // Update list item star
        }
    }

    setNoteColor(color) {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note) {
            note.color = color;
            this.saveToStorage();
            this.renderNotesList();
        }
    }

    updateNoteMetaUI(note) {
        // Update Star Button
        if (this.starBtn) {
            const svg = this.starBtn.querySelector('svg');
            if (note.isFavorite) {
                this.starBtn.classList.add('active');
                if (svg) svg.setAttribute('fill', 'currentColor');
                this.starBtn.style.color = '#fbbf24'; // Gold
            } else {
                this.starBtn.classList.remove('active');
                if (svg) svg.setAttribute('fill', 'none');
                this.starBtn.style.color = ''; // Reset
            }
        }
    }

    handleSearch(query) {
        // --- VAULT TRIGGER CHECK ---
        if (query === '###') {
            const onEnter = (e) => {
                if (e.key === 'Enter') {
                    this.openVaultAuth(); // Abre directamente el modal de contraseña
                    this.searchInput.value = '';
                    this.searchInput.removeEventListener('keydown', onEnter);
                }
            };
            this.searchInput.addEventListener('keydown', onEnter);
            return;
        }
        // --- END VAULT TRIGGER ---

        this.searchTerm = query.toLowerCase();
        this.renderNotesList();
    }


    /**
     * Renders the note list based on current filters and search terms.
     */
    // --- Rendering Helpers for Search Highlighting ---

    highlightText(text, query) {
        if (!query) return text;
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    renderNotesList() {
        this.notesList.innerHTML = '';

        let filteredNotes = [];

        // --- VAULT LOGIC IN RENDERING ---
        if (this.isUltraVaultActive) {
            if (this.isDecoyMode) {
                // MODO SEÑUELO: Mostrar las notas falsas
                filteredNotes = this.decoyNotes;
            } else {
                // MODO REAL: Mostrar solo notas secretas
                filteredNotes = this.notes.filter(n => n.isSecret && !n.deletedAt);
            }
        } else if (this.searchTerm) {
            // Buscador normal (excluye notas de la bóveda para que sean invisibles)
            filteredNotes = this.notes.filter(note =>
                !note.isSecret &&
                (note.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                    this.getRawText(note.content).toLowerCase().includes(this.searchTerm.toLowerCase()))
            );
        } else {
            if (this.currentNoteFilter === 'trash') {
                filteredNotes = this.notes.filter(n => n.deletedAt);
            } else if (this.currentNoteFilter === 'private') {
                filteredNotes = this.notes.filter(n => !n.isSecret && (n.password || n.isPrivate) && !n.deletedAt);
            } else {
                // Public logic (Exclude secret notes!)
                filteredNotes = this.notes.filter(n =>
                    !n.isSecret && !n.password && !n.isPrivate && !n.deletedAt && n.type !== 'folder'
                );
            }
        }
        // --- END VAULT LOGIC ---

        // Sort
        const sortMode = this.currentSortValue || 'date-desc';

        filteredNotes.sort((a, b) => {
            // Pinned always on top? Or controlled by sort?
            // Usually pinned is always on top.
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            switch (sortMode) {
                case 'favorites':
                    if (a.isFavorite && !b.isFavorite) return -1;
                    if (!a.isFavorite && b.isFavorite) return 1;
                    // Fallback to date
                    return new Date(b.timestamp || b.updatedAt) - new Date(a.timestamp || a.updatedAt);
                case 'name-asc':
                    return (a.title || '').localeCompare(b.title || '');
                case 'name-desc':
                    return (b.title || '').localeCompare(a.title || '');
                case 'date-asc':
                    return new Date(a.timestamp || a.updatedAt) - new Date(b.timestamp || b.updatedAt);
                case 'date-desc':
                default:
                    return new Date(b.timestamp || b.updatedAt) - new Date(a.timestamp || a.updatedAt);
            }
        });

        if (filteredNotes.length === 0) {
            let emptyIcon = '📝';
            let emptyTitle = 'No hay notas';
            let emptyMsg = '¡Crea tu primera nota ahora!';

            if (this.currentNoteFilter === 'trash') {
                emptyIcon = '🗑️';
                emptyTitle = 'Papelera vacía';
                emptyMsg = 'No hay notas eliminadas';
            } else if (this.searchTerm) {
                emptyIcon = '🔍';
                emptyTitle = 'Sin resultados';
                emptyMsg = 'No se encontró nada con esa búsqueda';
            }

            this.notesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-illustration">${emptyIcon}</div>
                    <h3>${emptyTitle}</h3>
                    <p>${emptyMsg}</p>
                </div>
             `;
            this.updateStats(); // Ensure stats are updated even if empty
            return;
        }

        filteredNotes.forEach(note => {
            const noteEl = document.createElement('div');
            // Add color class if present
            const colorClass = note.color && note.color !== 'none' ? `color-${note.color}` : '';
            noteEl.className = `note-item ${note.id === this.activeNoteId ? 'active' : ''} ${colorClass}`;
            noteEl.setAttribute('data-id', note.id);
            if (note.pinned) noteEl.classList.add('pinned');


            // Build star HTML
            const starHtml = `<span class="note-star ${note.isFavorite ? 'active' : ''}">★</span>`;

            // Tags removed

            const plainText = this.getRawText(note.content);
            const cat = note.category || 'Personal';

            // Highlight Logic
            let displayTitle = note.title || 'Nota sin título';
            let displayPreview = plainText.substring(0, 40) || 'Sin contenido adicional...';

            if (this.searchTerm) {
                displayTitle = this.highlightText(displayTitle, this.searchTerm);
                displayPreview = this.highlightText(displayPreview, this.searchTerm);
            }

            noteEl.innerHTML = `
                <!-- <div class="note-icon">${this.getCategoryIcon(cat)}</div> -->
                <div class="note-info">
                    <div class="note-title">
                        ${starHtml} ${displayTitle}
                        ${note.pinned ? '<span title="Fijada">📌</span>' : ''}
                        ${note.reminder ? '<span title="Recordatorio">⏰</span>' : ''}
                        ${note.isRecording ? '<span title="Nota de voz">🎤</span>' : ''}
                    </div>
                    <div class="note-preview">${displayPreview}</div>
                    <div class="note-meta">
                        <span>${this.formatDate(note.timestamp || note.updatedAt)}</span>
                    </div>
                </div>
                <button class="note-menu-btn" data-note-id="${note.id}" title="Opciones">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2"></circle>
                        <circle cx="12" cy="12" r="2"></circle>
                        <circle cx="12" cy="19" r="2"></circle>
                    </svg>
                </button>
            `;

            if (this.currentNoteFilter === 'trash') {
                const actions = document.createElement('div');
                actions.className = 'trash-actions';
                actions.style.marginTop = '8px';
                actions.style.display = 'flex';
                actions.style.gap = '10px';

                actions.innerHTML = `
                   <button class="btn-text-small" style="font-size: 0.8rem; padding: 6px 10px; border-color: var(--accent); color: var(--accent); cursor: pointer; border-radius: 6px; background: rgba(99, 102, 241, 0.1);" 
                        onclick="event.stopPropagation(); app.restoreNote('${note.id}')">♻️ Restaurar</button>
                   <button class="btn-text-small" style="font-size: 0.8rem; padding: 6px 10px; border-color: #ef4444; color: #ef4444; cursor: pointer; border-radius: 6px; background: rgba(239, 68, 68, 0.1);" 
                        onclick="event.stopPropagation(); app.deleteNote('${note.id}')">🗑️ Borrar</button>
                 `;
                noteEl.querySelector('.note-info').appendChild(actions);

                // Read-only view on click
                noteEl.onclick = () => {
                    this.setActiveNote(note.id);
                    this.noteTitleInput.contentEditable = false;
                    this.noteContentInput.contentEditable = false;
                    this.lastEditedText.textContent = 'Nota en papelera (Solo lectura)';
                    if (this.editorActions) this.editorActions.style.display = 'none';
                };
            } else {
                // Click handler
                noteEl.onclick = (e) => {
                    // Don't open note if long press was triggered
                    if (this.isLongPressing) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.isLongPressing = false;
                        return;
                    }
                    this.setActiveNote(note.id);
                    this.noteTitleInput.contentEditable = true;
                    this.noteContentInput.contentEditable = true;
                    if (this.editorActions) this.editorActions.style.display = 'flex';
                };

                // Long press detection (touch events for mobile)
                noteEl.addEventListener('touchstart', (e) => {
                    this.handleNoteTouchStart(note.id, noteEl, e);
                }, { passive: true });

                noteEl.addEventListener('touchend', () => {
                    this.handleNoteTouchEnd(noteEl);
                }, { passive: true });

                noteEl.addEventListener('touchcancel', () => {
                    this.handleNoteTouchEnd(noteEl);
                }, { passive: true });

                noteEl.addEventListener('touchmove', () => {
                    // Cancel long press if user moves finger (scrolling)
                    this.handleNoteTouchEnd(noteEl);
                }, { passive: true });

                // Menu button click (desktop 3-dot menu)
                const menuBtn = noteEl.querySelector('.note-menu-btn');
                if (menuBtn) {
                    menuBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Don't trigger note click
                        this.openContextMenu(note.id);
                    });
                }
            }

            this.notesList.appendChild(noteEl);
        });

        if (filteredNotes.length === 0) {
            let emptyIcon = '📝';
            let emptyTitle = 'No hay notas';
            let emptyMsg = '¡Crea tu primera nota ahora!';

            if (this.currentNoteFilter === 'trash') {
                emptyIcon = '🗑️';
                emptyTitle = 'Papelera vacía';
                emptyMsg = 'No hay notas eliminadas';
            } else if (this.searchTerm) {
                emptyIcon = '🔍';
                emptyTitle = 'Sin resultados';
                emptyMsg = 'No se encontró nada con esa búsqueda';
            }

            this.notesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-illustration">${emptyIcon}</div>
                    <h3>${emptyTitle}</h3>
                    <p>${emptyMsg}</p>
                </div>
             `;
        }
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

    /**
     * Resalta el texto buscado en un string
     */
    highlightText(text, query) {
        if (!query || query.trim() === '') return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    updateStats() {
        const count = this.notes.length;
        this.noteCountText.textContent = `${count} ${count === 1 ? 'nota' : 'notas'} `;
    }

    /**
     * Get the storage key for the current user's notes
     */
    getNotesStorageKey() {
        if (this.currentUserId) {
            return `novanotes_data_${this.currentUserId} `;
        }
        return 'novanotes_data';
    }

    /**
     * Load notes for the current user
     */
    loadUserNotes() {
        const key = this.getNotesStorageKey();
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    /**
     * Save notes to localStorage for the current user
     * Also syncs to cloud if user is logged in with Google/GitHub
     */
    saveToStorage() {
        const key = this.getNotesStorageKey();
        localStorage.setItem(key, JSON.stringify(this.notes));

        // Sync to cloud if available
        this.syncToCloud();
    }

    /**
     * Sync notes to Firestore cloud storage
     * Called automatically after local save
     */
    async syncToCloud() {
        if (!this.firebaseUid) return;

        // Check if cloud functions are available
        if (typeof window.saveNotesToCloud !== 'function') {
            return;
        }

        try {
            await window.saveNotesToCloud(this.firebaseUid, this.notes);
            this.showSyncStatus('synced');
        } catch (error) {
            console.error('Cloud sync failed:', error);
            this.showSyncStatus('error');
        }
    }

    /**
     * Show sync status indicator
     */
    showSyncStatus(status) {
        if (!this.saveStatus) return;

        if (status === 'synced') {
            this.saveStatus.textContent = '☁️ Sincronizado';
            this.saveStatus.style.color = '#22c55e';
        } else if (status === 'syncing') {
            this.saveStatus.textContent = '⏳ Sincronizando...';
            this.saveStatus.style.color = '#f59e0b';
        } else if (status === 'error') {
            this.saveStatus.textContent = '⚠️ Error de sincronización';
            this.saveStatus.style.color = '#ef4444';
        }

        // Clear status after 3 seconds
        setTimeout(() => {
            if (this.saveStatus) {
                this.saveStatus.textContent = '';
            }
        }, 3000);
    }

    /**
     * Load notes from cloud and merge with local
     * Called on app initialization for logged-in users
     */
    async loadFromCloud() {
        if (!this.firebaseUid) return;

        if (typeof window.loadNotesFromCloud !== 'function') {
            console.log('Cloud functions not ready yet');
            return;
        }

        this.showSyncStatus('syncing');

        try {
            const cloudNotes = await window.loadNotesFromCloud(this.firebaseUid);

            if (cloudNotes !== null) {
                const localNotes = this.loadUserNotes();

                // Merge local and cloud notes
                if (typeof window.mergeNotes === 'function') {
                    this.notes = window.mergeNotes(localNotes, cloudNotes);
                } else {
                    // Fallback: prefer cloud if exists, otherwise local
                    this.notes = cloudNotes.length > 0 ? cloudNotes : localNotes;
                }

                // Save merged notes back to both local and cloud
                const key = this.getNotesStorageKey();
                localStorage.setItem(key, JSON.stringify(this.notes));

                // Render the updated notes
                this.renderNotesList();
                this.updateStats();

                this.showSyncStatus('synced');
                console.log('📱 Notes synchronized:', this.notes.length, 'total notes');
            }
        } catch (error) {
            console.error('Failed to load from cloud:', error);
            this.showSyncStatus('error');
        }
    }

    /**
     * Switch to a different user (reload notes)
     * Loads local notes first, then syncs with cloud
     */
    async switchUser(userId) {
        this.currentUserId = userId;
        this.notes = this.loadUserNotes();
        this.activeNoteId = null;
        this.setActiveNote(null);
        this.renderNotesList();
        this.updateStats();

        // Load and sync with cloud notes
        await this.loadFromCloud();
    }

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
        const isTitleEmpty = (this.noteTitleInput.textContent.trim() === '');
        const isContentEmpty = (this.noteContentInput.textContent.trim() === '' && !this.noteContentInput.querySelector('img'));

        this.noteTitleInput.classList.toggle('is-empty', isTitleEmpty);
        this.noteContentInput.classList.toggle('is-empty', isContentEmpty);
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
        this.filterTrashBtn.classList.toggle('active', filter === 'trash');

        // Si volvemos a público, bloquear la bóveda de nuevo para seguridad
        if (filter === 'public') this.isVaultUnlocked = false;

        // Mostrar botón de cambiar contraseña solo en la bóveda privada
        this.changePwdBtn.style.display = (filter === 'private') ? 'flex' : 'none';

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

    /**
     * Abre el modal de cambio de contraseña
     */
    openChangePwdModal() {
        const masterSaved = localStorage.getItem('nova_master_pwd');
        if (!masterSaved) {
            alert('No tienes una contraseña maestra configurada. Crea una nota privada primero.');
            return;
        }
        this.changePwdModal.hidden = false;
        this.currentPwdInput.value = '';
        this.newPwdInput.value = '';
        this.confirmPwdInput.value = '';
        this.changePwdError.style.display = 'none';
        this.changePwdSuccess.style.display = 'none';
        this.currentPwdInput.focus();
    }

    /**
     * Cierra el modal de cambio de contraseña
     */
    closeChangePwdModal() {
        this.changePwdModal.hidden = true;
        this.currentPwdInput.value = '';
        this.newPwdInput.value = '';
        this.confirmPwdInput.value = '';
        this.changePwdError.style.display = 'none';
        this.changePwdSuccess.style.display = 'none';
    }

    /**
     * Guarda la nueva contraseña maestra después de verificar la actual
     */
    saveNewPassword() {
        const masterSaved = localStorage.getItem('nova_master_pwd');
        const currentPwd = this.currentPwdInput.value;
        const newPwd = this.newPwdInput.value;
        const confirmPwd = this.confirmPwdInput.value;

        this.changePwdError.style.display = 'none';
        this.changePwdSuccess.style.display = 'none';

        // Validar contraseña actual
        if (currentPwd !== masterSaved) {
            this.changePwdError.textContent = 'La contraseña actual es incorrecta.';
            this.changePwdError.style.display = 'block';
            return;
        }

        // Validar nueva contraseña
        if (newPwd.length < 1) {
            this.changePwdError.textContent = 'La nueva contraseña no puede estar vacía.';
            this.changePwdError.style.display = 'block';
            return;
        }

        // Validar coincidencia
        if (newPwd !== confirmPwd) {
            this.changePwdError.textContent = 'Las contraseñas no coinciden.';
            this.changePwdError.style.display = 'block';
            return;
        }

        // Actualizar contraseña maestra
        localStorage.setItem('nova_master_pwd', newPwd);

        // Actualizar contraseña en todas las notas privadas
        this.notes.forEach(note => {
            if (note.password) {
                note.password = newPwd;
            }
        });
        this.saveToStorage();

        // Mostrar éxito
        this.changePwdSuccess.textContent = '¡Contraseña cambiada exitosamente!';
        this.changePwdSuccess.style.display = 'block';

        // Cerrar modal después de 1.5 segundos
        setTimeout(() => {
            this.closeChangePwdModal();
        }, 1500);
    }

    /**
     * Fija o desfija la nota activa
     */
    togglePin() {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);
        if (note) {
            note.pinned = !note.pinned;
            this.pinNoteBtn.classList.toggle('pin-active', note.pinned);
            this.saveToStorage();
            this.renderNotesList();
        }
    }

    /**
     * Exporta la nota actual a PDF usando html2pdf.js
     */
    exportToPDF() {
        if (!this.activeNoteId) {
            return;
        }

        const note = this.notes.find(n => n.id === this.activeNoteId);
        // Basic configuration
        const opt = {
            margin: 1,
            filename: (note.title || 'nota').replace(/\s+/g, '_') + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Select element to export
        const element = document.getElementById('editor-view');
        html2pdf().set(opt).from(element).save();
    }

    // --- Features Implementation ---

    // 2. Voice Note Logic (Audio Recording)
    async toggleRecording() {
        if (!this.isRecording) {
            // Start Recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = (event) => {
                    this.audioChunks.push(event.data);
                };

                this.mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/mp3' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64Audio = reader.result;
                        this.insertAudioPlayer(base64Audio);
                    };
                    stream.getTracks().forEach(track => track.stop());
                };

                this.mediaRecorder.start();
                this.isRecording = true;
                this.voiceNoteBtn.classList.add('recording');
                this.voiceNoteBtn.title = "Detener Grabación";

            } catch (err) {
                console.error("Error accessing microphone:", err);
                alert("No se pudo acceder al micrófono.");
            }
        } else {
            // Stop Recording
            if (this.mediaRecorder) {
                this.mediaRecorder.stop();
            }
            this.isRecording = false;
            this.voiceNoteBtn.classList.remove('recording');
            this.voiceNoteBtn.title = "Nota de Voz";
        }
    }

    insertAudioPlayer(base64Src) {
        const playerHtml = `
            <div class="custom-audio-player" contenteditable="false">
                <span class="audio-icon">🎤</span>
                <audio controls src="${base64Src}"></audio>
            </div>
            <div><br></div>
        `;

        this.noteContentInput.focus();
        document.execCommand('insertHTML', false, playerHtml);
        this.debouncedSaveAndRender();
    }



    // 3. Reminder Logic
    openReminderModal() {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);

        if (note.reminder) {
            this.reminderDateInput.value = note.reminder;
            this.deleteReminderBtn.style.display = 'block';
            this.saveReminderBtn.textContent = 'Actualizar Recordatorio';
        } else {
            this.reminderDateInput.value = '';
            this.deleteReminderBtn.style.display = 'none';
            this.saveReminderBtn.textContent = 'Guardar Recordatorio';
        }

        this.reminderModal.hidden = false;
        this.reminderModal.classList.remove('hidden');
    }

    saveReminder() {
        if (!this.activeNoteId) return;
        const dateVal = this.reminderDateInput.value;
        if (!dateVal) return;

        const note = this.notes.find(n => n.id === this.activeNoteId);
        note.reminder = dateVal;
        note.reminderFired = false; // Reset fired status whenever updated

        this.saveToStorage();
        this.updateReminderUI(note);
        this.reminderModal.hidden = true;
        this.renderNotesList(); // Update sidebar badge
    }

    deleteReminder() {
        if (!this.activeNoteId) return;
        const note = this.notes.find(n => n.id === this.activeNoteId);
        delete note.reminder;

        this.saveToStorage();
        this.updateReminderUI(note);
        this.reminderModal.hidden = true;
        this.renderNotesList();
    }

    updateReminderUI(note) {
        // Check if there is already a reminder badge in the editor meta
        const existingBadge = document.querySelector('.reminder-badge');
        if (existingBadge) existingBadge.remove();

        if (note && note.reminder) {
            // Update Button State
            if (this.reminderBtn) this.reminderBtn.classList.add('active');

            const date = new Date(note.reminder);
            const fmtDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const badge = document.createElement('div');
            badge.className = 'reminder-badge';
            if (note.reminderFired) badge.classList.add('expired'); // Optional styling
            badge.innerHTML = `<span>⏰ ${fmtDate}</span>`;

            // Insert before save status
            const metaDiv = document.querySelector('.editor-meta');
            metaDiv.insertBefore(badge, this.saveStatus);
        } else {
            // Reset Button State
            if (this.reminderBtn) this.reminderBtn.classList.remove('active');
        }
    }

    // --- Alarm System Methods ---

    startReminderCheck() {
        if (this.reminderInterval) clearInterval(this.reminderInterval);

        // Check every 30 seconds
        this.reminderInterval = setInterval(() => {
            this.checkReminders();
        }, 30000);
    }

    checkReminders() {
        const now = new Date();
        let changed = false;

        this.notes.forEach(note => {
            if (note.reminder && !note.reminderFired) {
                const reminderTime = new Date(note.reminder);

                // If the time has passed (or is now)
                if (now >= reminderTime) {
                    this.triggerAlarm(note);
                    note.reminderFired = true;
                    changed = true;
                }
            }
        });

        if (changed) {
            this.saveToStorage();
            this.renderNotesList();
            if (this.activeNoteId) this.renderActiveNote();
        }
    }

    triggerAlarm(note) {
        // 1. Play Sound (Web Audio API - Beep)
        this.playAlarmSound();

        // 2. System Notification (background/outside app)
        if (Notification.permission === "granted") {
            const notif = new Notification("⏰ Recordatorio de novaStarPro", {
                body: `Es hora de: ${note.title || 'Tu nota sin título'}`,
                icon: 'icons/icon-192x192.png', // Ensure this path exists or uses default
                requireInteraction: true
            });
            notif.onclick = () => {
                window.focus();
                this.setActiveNote(note.id);
            };
        }

        // 3. In-App Alert
        alert(`⏰ ¡DING DING! \n\nRecordatorio: ${note.title || 'Nota'}`);
    }

    playAlarmSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const oscillators = [];

            // Function to create a beep
            const beep = (startTime, freq, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            // Sequence: High High Low (Air horn style or simple alarm)
            const now = ctx.currentTime;
            beep(now, 880, 0.5);       // A5
            beep(now + 0.6, 880, 0.5); // A5
            beep(now + 1.2, 880, 0.8); // A5 Long

        } catch (e) {
            console.error("Audio play error", e);
        }
    }



    /**
     * Inicializa el tema desde localStorage
     */
    initTheme() {
        const savedTheme = localStorage.getItem('nova_theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            this.themeIcon.textContent = '☀️';
        } else {
            document.body.classList.remove('light-theme');
            this.themeIcon.textContent = '🌙';
        }
    }

    /**
     * Alterna entre tema claro y oscuro
     */

    toggleTheme() {
        const isLight = document.body.classList.toggle('light-theme');
        this.themeIcon.textContent = isLight ? '☀️' : '🌙';
        localStorage.setItem('nova_theme', isLight ? 'light' : 'dark');
    }

    getCategoryIcon(category) {
        switch (category) {
            case 'personal': return '👤';
            case 'ideas': return '💡';
            case 'proyectos': return '🚀';
            case 'tareas': return '✅';
            case 'custom': return '📂';
            default: return '📝';
        }
    }
    async loadGuestNote(publicId) {
        // Force mobile to show editor view
        document.body.classList.add('editor-screen-active');

        // Hide sidebar and auth
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';

        const editorMain = document.querySelector('.editor-main');
        if (editorMain) editorMain.style.width = '100%';

        // CRITICAL: Hide the full Auth Modal Overlay
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.style.display = 'none';
            // Also force hide any other overlays if they exist
            authModal.classList.add('hidden');
        }

        // Show loading state in editor
        this.editorView.classList.remove('empty');
        this.editorFields.hidden = false;
        this.emptyState.hidden = true;

        this.noteTitleInput.innerText = 'Cargando nota compartida...';
        this.noteContentInput.innerText = '';

        try {
            // Wait a bit for Firebase functions to be bound if race condition
            if (typeof window.loadPublicNote !== 'function') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (typeof window.loadPublicNote !== 'function') {
                throw new Error('Firebase helpers not ready');
            }

            const noteData = await window.loadPublicNote(publicId);

            if (noteData) {
                // Mock a local note object
                const note = {
                    id: noteData.id,
                    title: noteData.title,
                    content: noteData.content,
                    updatedAt: noteData.createdAt,
                    theme: noteData.theme,
                    customBgColor: noteData.customBgColor
                };

                this.notes = [note]; // Single note in memory
                this.activeNoteId = note.id;

                // Render
                this.noteTitleInput.innerHTML = note.title || 'Sin título';
                this.noteContentInput.innerHTML = note.content || '';

                // Apply styles
                this.applyTheme(note.theme || 'none', note.customBgColor);

                // Read Only Mode
                this.noteTitleInput.contentEditable = false;
                this.noteContentInput.contentEditable = false;

                // Hide toolbar editing tools and save button
                if (this.formatToolbar) this.formatToolbar.style.display = 'none';
                if (this.saveNoteBtn) this.saveNoteBtn.style.display = 'none';
                if (this.deleteNoteBtn) this.deleteNoteBtn.style.display = 'none';

                // Show a banner "You are viewing a shared note"
                const banner = document.createElement('div');
                banner.style.cssText = 'background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; padding: 12px; text-align: center; margin-bottom: 20px; border-radius: 12px; font-weight: 600; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);';
                banner.innerHTML = '👀 Estás viendo una nota pública de <b>NovaStarPro</b>';

                // Add a "Create your own" button
                const ctaBtn = document.createElement('button');
                ctaBtn.innerText = 'Crear mis propias notas';
                ctaBtn.style.cssText = 'margin-left: 15px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: white; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;';
                ctaBtn.onclick = () => window.location.href = window.location.pathname; // Reload without params
                banner.appendChild(ctaBtn);

                this.editorFields.prepend(banner);

            } else {
                this.noteTitleInput.innerText = 'Error: Nota no encontrada';
                this.noteContentInput.innerText = 'Es posible que el enlace haya expirado o sea inválido.';
                this.noteContentInput.style.color = '#ef4444';
            }
        } catch (e) {
            console.error(e);
            this.noteTitleInput.innerText = 'Error de conexión';
            this.noteContentInput.innerText = 'No se pudo conectar con el servidor de notas.';
        }
    }

    // --- ULTRA SECRET VAULT METHODS ---

    /**
     * Initializes the Vault system, triggers onboarding if first time, 
     * otherwise sets up activation listeners.
     */
    initVault() {
        // 1. Check if first time setup
        if (!this.vaultConfig) {
            // Show onboarding after a small delay to not interrupt initial load
            setTimeout(() => this.vaultOnboardingModal.hidden = false, 2000);
        }

        // 2. Setup Listeners for Activation
        this.setupVaultActivationListeners();

        // 3. Setup Onboarding Listeners
        this.setupVaultOnboardingListeners();

        // 4. Setup Auth Listeners
        this.setupVaultAuthListeners();

        // 5. Setup Secret Bar Listeners
        this.setupVaultSecretBarListeners();

        // 6. Panic Button (Esc)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isUltraVaultActive) {
                this.exitUltraVault();
            }
        });
    }

    loadVaultConfig() {
        const config = localStorage.getItem('nova_vault_config');
        return config ? JSON.parse(config) : null;
    }

    saveVaultConfig(config) {
        localStorage.setItem('nova_vault_config', JSON.stringify(config));
        this.vaultConfig = config;
    }

    setupVaultActivationListeners() {
        // Logo Multi-Tap
        if (this.vaultLogo) {
            this.vaultLogo.addEventListener('click', () => {
                if (!this.vaultConfig) return;

                const requiredTaps = this.vaultConfig.triggerType === 'custom-taps'
                    ? this.vaultConfig.customTaps
                    : parseInt(this.vaultConfig.triggerType.split('-')[1]);

                this.logoClickCount++;
                clearTimeout(this.logoClickTimer);

                this.logoClickTimer = setTimeout(() => {
                    if (this.logoClickCount >= requiredTaps) {
                        this.openVaultAuth();
                    }
                    this.logoClickCount = 0;
                }, 400); // 400ms between taps
            });
        }

        // Global Keyboard Shortcut (Ctrl+Shift+V)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                if (this.vaultConfig) this.openVaultAuth();
            }
        });
    }

    setupVaultOnboardingListeners() {
        if (!this.vaultOnboardingModal) return;

        // Toggle custom taps input and search code info
        this.vaultTriggerSelect.onchange = (e) => {
            const value = e.target.value;
            this.customTapsContainer.style.display = value === 'custom-taps' ? 'block' : 'none';
        };

        this.activateVaultBtn.onclick = () => {
            const config = {
                triggerType: this.vaultTriggerSelect.value,
                pass1: document.getElementById('vault-pass1-setup').value
            };

            if (!config.pass1) {
                alert('Debes definir una contraseña para la bóveda.');
                return;
            }

            this.saveVaultConfig(config);
            this.vaultOnboardingModal.hidden = true;
            this.showSyncStatus('Bóveda Lista 🔐');
        };
    }

    setupVaultAuthListeners() {
        const inputP1 = document.getElementById('vault-input-p1');
        const verifyBtn = document.getElementById('vault-verify-btn');
        const closeBtn = document.getElementById('close-vault-auth-btn');

        verifyBtn.onclick = () => {
            if (inputP1.value === this.vaultConfig.pass1) {
                this.enterUltraVault();
            } else {
                this.handleVaultAuthFailure();
            }
        };

        inputP1.onkeydown = (e) => {
            if (e.key === 'Enter') verifyBtn.click();
        };

        closeBtn.onclick = () => this.vaultAuthModal.hidden = true;
    }

    setupVaultSecretBarListeners() {
        // En la versión simplificada, el buscador ### activa directamente el modal de contraseña real
    }

    handleVaultAuthFailure() {
        this.vaultAttempts++;
        const indicator = document.getElementById('vault-error-indicator');
        if (indicator) indicator.style.display = 'inline-block';

        this.vaultAuthModal.querySelector('.vault-auth-content').classList.add('shake');
        setTimeout(() => this.vaultAuthModal.querySelector('.vault-auth-content').classList.remove('shake'), 400);

        document.getElementById('vault-input-p1').value = '';
    }

    openVaultAuth() {
        if (this.isUltraVaultActive) {
            this.exitUltraVault();
            return;
        }

        this.vaultAttempts = 0;
        const indicator = document.getElementById('vault-error-indicator');
        if (indicator) indicator.style.display = 'none';

        document.getElementById('vault-input-p1').value = '';
        this.vaultAuthModal.hidden = false;
        document.getElementById('vault-input-p1').focus();
    }

    enterUltraVault() {
        this.isUltraVaultActive = true;
        this.isDecoyMode = false;
        this.vaultAuthModal.hidden = true;
        this.setGhostMode(true);
        this.renderNotesList();
        this.showSyncStatus('Bóveda Abierta ✅');

        // Visual indicator that we are in Vault
        this.appContainer.classList.add('vault-active-border');
    }

    enterDecoyMode() {
        this.isUltraVaultActive = true;
        this.isDecoyMode = true;
        this.vaultAuthModal.hidden = true;
        this.setGhostMode(true);
        this.renderNotesList();
        this.showSyncStatus('Identidad Confirmada'); // Fake success

        console.warn('⚠️ DECOY MODE ACTIVATED');
    }

    exitUltraVault() {
        this.isUltraVaultActive = false;
        this.isDecoyMode = false;
        this.setGhostMode(false);
        this.renderNotesList();
        this.appContainer.classList.remove('vault-active-border');
        this.showSyncStatus('Bóveda Cerrada 🔒');
    }

    setGhostMode(active) {
        if (active) {
            this._originalTitle = document.title;
            document.title = "Configuración de Sistema";
        } else {
            document.title = this._originalTitle || "NovaNotes";
        }
    }

    showVaultSecretBar() {
        if (!this.vaultConfig) return;
        this.vaultSecretBar.style.display = 'block';
        document.getElementById('vault-secret-bar-input').focus();
    }

    generateDecoyNotes() {
        return [
            {
                id: 'decoy-1',
                title: '🔑 Claves Bancarias (No tocar)',
                content: '<p><b>Ahorros:</b> 4412-8874 (Clave: 9918)</p><p><b>Corriente:</b> 1102-3341 (Clave: 0052)</p>',
                timestamp: new Date().toISOString(),
                isSecret: true,
                decoy: true
            },
            {
                id: 'decoy-2',
                title: '🛒 Lista de Compras Pendiente',
                content: '<p>- Pan Tajado</p><p>- Leche Deslactosada</p><p>- Detergente</p><p>- Papel Higiénico</p>',
                timestamp: new Date().toISOString(),
                isSecret: true,
                decoy: true
            },
            {
                id: 'decoy-3',
                title: '📧 Cuentas Viejas',
                content: '<p><b>Hotmail:</b> carlitosperez99@hotmail.com (Pass: perez123)</p>',
                timestamp: new Date().toISOString(),
                isSecret: true,
                decoy: true
            }
        ];
    }

    // --- AI Context Helper ---
    getActiveNoteContext() {
        if (!this.activeNoteId) {
            return { title: 'Ninguna (Interfaz vacía)', content: '' };
        }
        // Use innerText to get full visible text (Note: getRawText truncates to 45 chars by default!)
        return {
            title: this.noteTitleInput.innerText || '',
            content: this.noteContentInput.innerText || ''
        };
    }
}

/**
 * Inicialización global del motor de novaStarPro con autenticación
 */
let app = null;
const auth = new AuthManager();

// Check authentication status first
const session = auth.checkAuth();

// Check URL params for Shared Note
const urlParams = new URLSearchParams(window.location.search);
const publicNoteId = urlParams.get('publicNote');

if (publicNoteId) {
    // GUEST MODE
    console.log('🚀 Starting in Guest Mode');
    app = new NoteApp(null, null, true); // isGuest = true
    window.app = app;
    app.loadGuestNote(publicNoteId);
} else if (session) {
    // User is logged in - initialize app with their userId and firebaseUid
    app = new NoteApp(session.userId, session.firebaseUid);
    window.app = app;

    // Load notes from cloud after initialization
    setTimeout(() => {
        if (app && typeof app.loadFromCloud === 'function') {
            app.loadFromCloud();
        }
    }, 500);
}

// Handle login success - initialize app for the user
auth.onLoginSuccess = async (session) => {
    app = new NoteApp(session.userId, session.firebaseUid);
    window.app = app;

    // Load and sync notes from cloud
    setTimeout(() => {
        if (app && typeof app.loadFromCloud === 'function') {
            app.loadFromCloud();
        }
    }, 500);
};

// Handle logout - clear app reference
auth.onLogout = () => {
    app = null;
    window.app = null;
};

// Make auth available globally
window.auth = auth;

// Registrar el motor de la App para Google (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('novaStarPro lista para instalar'))
            .catch(err => console.log('Error al registrar App:', err));
    });
}
