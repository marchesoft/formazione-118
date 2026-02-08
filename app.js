// Data Management with Supabase
class DataManager {
    constructor() {
        this.supabase = supabaseClient; // From config.js
    }

    async getAuthorizedEmails() {
        const { data, error } = await this.supabase
            .from('authorized_emails')
            .select('*');
        if (error) {
            console.error('Error fetching authorizedEmails:', error);
            return [];
        }
        return data.map(u => ({
            ...u,
            isAdmin: u.isadmin,
            addedAt: u.addedat,
            company: u.company || 'N/A',
            role: u.role || 'N/A'
        }));
    }

    async saveAuthorizedEmails(emails) {
        const mapped = emails.map(u => ({
            email: u.email,
            name: u.name,
            isadmin: u.isAdmin,
            notes: u.notes,
            addedat: u.addedAt,
            company: u.company,
            role: u.role
        }));
        const { error } = await this.supabase
            .from('authorized_emails')
            .upsert(mapped);
        if (error) console.error('Error saving user data:', error);
    }

    async registerUser(userData) {
        const mapped = {
            email: userData.email,
            name: userData.name,
            company: userData.company,
            role: userData.role,
            isadmin: false,
            addedat: new Date().toISOString()
        };
        const { error } = await this.supabase
            .from('authorized_emails')
            .insert(mapped);
        if (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    async getCourses() {
        const { data, error } = await this.supabase
            .from('courses')
            .select('*')
            .order('createdat', { ascending: false });
        if (error) {
            console.error('Error fetching courses:', error);
            return [];
        }
        return data.map(c => ({
            ...c,
            startTime: c.starttime,
            maxParticipants: c.maxparticipants,
            createdAt: c.createdat
        }));
    }

    async saveCourses(courses) {
        const mapped = courses.map(c => {
            const entry = {
                ...c,
                starttime: c.startTime,
                maxparticipants: c.maxParticipants,
                createdat: c.createdAt
            };
            // Remove the camelCase ones to avoid Supabase errors
            delete entry.startTime;
            delete entry.maxParticipants;
            delete entry.createdAt;
            return entry;
        });

        const { error } = await this.supabase
            .from('courses')
            .upsert(mapped);
        if (error) {
            console.error('Error saving courses:', error);
            throw error;
        }
    }

    async updateCourse(courseId, updates) {
        const mapped = { ...updates };
        if (updates.startTime) { mapped.starttime = updates.startTime; delete mapped.startTime; }
        if (updates.maxParticipants) { mapped.maxparticipants = updates.maxParticipants; delete mapped.maxParticipants; }
        if (updates.createdAt) { mapped.createdat = updates.createdAt; delete mapped.createdAt; }

        const { error } = await this.supabase
            .from('courses')
            .update(mapped)
            .eq('id', courseId);

        if (error) {
            console.error('Error updating course:', error);
            throw error;
        }
    }

    async deleteCourse(courseId) {
        const { error } = await this.supabase
            .from('courses')
            .delete()
            .eq('id', courseId);
        if (error) console.error('Error deleting course:', error);
    }

    async deleteAuthorizedEmail(email) {
        const { error } = await this.supabase
            .from('authorized_emails')
            .delete()
            .eq('email', email);
        if (error) console.error('Error deleting user:', error);
    }

    async getEnrollments() {
        const { data, error } = await this.supabase
            .from('enrollments')
            .select('*');
        if (error) {
            console.error('Error fetching enrollments:', error);
            return [];
        }
        return data.map(e => ({
            ...e,
            courseId: e.courseid,
            userId: e.userid,
            enrolledAt: e.enrolledat
        }));
    }

    async saveEnrollments(enrollments) {
        const mapped = enrollments.map(e => ({
            ...e,
            courseid: e.courseId,
            userid: e.userId,
            enrolledat: e.enrolledAt
        }));
        mapped.forEach(e => {
            delete e.courseId;
            delete e.userId;
            delete e.enrolledAt;
        });
        const { error } = await this.supabase
            .from('enrollments')
            .upsert(mapped);
        if (error) console.error('Error saving enrollments:', error);
    }

    async enrollUser(courseId, userId) {
        const { error } = await this.supabase
            .from('enrollments')
            .insert({ courseid: courseId, userid: userId });
        if (error) console.error('Error enrolling user:', error);
    }

    async unenrollUser(courseId, userId) {
        const { error } = await this.supabase
            .from('enrollments')
            .delete()
            .match({ courseid: courseId, userid: userId });
        if (error) console.error('Error unenrolling user:', error);
    }

    async getCurrentUser() {
        const userEmail = localStorage.getItem('currentUserEmail');
        if (userEmail) {
            const emails = await this.getAuthorizedEmails();
            return emails.find(u => u.email === userEmail);
        }
        return null;
    }

    setCurrentUser(email) {
        localStorage.setItem('currentUserEmail', email);
    }

    logout() {
        localStorage.removeItem('currentUserEmail');
    }

    async getCourseMessages(courseId) {
        const { data, error } = await this.supabase
            .from('course_messages')
            .select('*')
            .eq('courseid', courseId)
            .order('timestamp', { ascending: true });
        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
        return data.map(m => ({
            ...m,
            courseId: m.courseid,
            userEmail: m.useremail,
            userName: m.username
        }));
    }

    async saveCourseMessage(message) {
        const mapped = {
            courseid: message.courseId,
            useremail: message.userEmail,
            username: message.userName,
            message: message.message,
            timestamp: message.timestamp
        };
        const { error } = await this.supabase
            .from('course_messages')
            .insert(mapped);
        if (error) console.error('Error saving message:', error);
    }

    async deleteAllCourseMessages(courseId) {
        const { error } = await this.supabase
            .from('course_messages')
            .delete()
            .eq('courseid', courseId);
        if (error) console.error('Error deleting messages:', error);
    }
}

// App Class
class CourseApp {
    constructor() {
        this.dataManager = new DataManager();
        this.currentUser = null;
        this.currentCourse = null;
        this.audioContext = null;
        this.showingCompleted = false;
        this.init();
    }

    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
        }
    }

    playTone(freq, type, duration, startTime = 0) {
        if (!this.audioContext) this.initAudio();
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

        gain.gain.setValueAtTime(0.1, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
    }

    playEnrollSound() {
        // Victory arpeggio: C - E - G - C(high)
        this.playTone(523.25, 'sine', 0.2, 0);   // C5
        this.playTone(659.25, 'sine', 0.2, 0.15); // E5
        this.playTone(783.99, 'sine', 0.2, 0.30); // G5
        this.playTone(1046.50, 'sine', 0.4, 0.45); // C6
    }

    playMessageSound() {
        // Simple "ding"
        this.playTone(880, 'sine', 0.1, 0); // A5
        this.playTone(1760, 'sine', 0.3, 0.1); // A6
    }

    playUnenrollSound() {
        // Sad descending tones: G5 - E5 - C5
        this.playTone(783.99, 'sine', 0.2, 0); // G5
        this.playTone(659.25, 'sine', 0.2, 0.15); // E5
        this.playTone(523.25, 'sine', 0.4, 0.30); // C5
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();

        // Request notification permission if user is logged in
        if (this.currentUser) {
            this.requestNotificationPermission();
        }
    }

    async checkAuth() {
        this.currentUser = await this.dataManager.getCurrentUser();
        if (this.currentUser) {
            await this.showAppScreen();
        } else {
            this.showAuthScreen();
        }
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
        this.toggleAuthMode('login'); // Start with login
    }

    async showAppScreen() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        document.getElementById('user-name').textContent = this.currentUser.name;

        if (this.currentUser.isAdmin) {
            document.getElementById('admin-controls').style.display = 'block';
        } else {
            document.getElementById('admin-controls').style.display = 'none';
        }

        await this.showCourseList();
    }

    setupEventListeners() {
        // Global interaction listener to initialize AudioContext
        document.addEventListener('click', () => {
            this.initAudio();
        }, { once: true });

        // Auth listeners
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
            this.requestNotificationPermission();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        document.getElementById('go-to-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode('register');
        });

        document.getElementById('go-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode('login');
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Course management listeners
        document.getElementById('add-course-btn').addEventListener('click', () => {
            this.openCourseModal();
        });

        document.getElementById('manage-emails-btn').addEventListener('click', () => {
            this.openEmailModal();
        });

        document.getElementById('toggle-completed-btn').addEventListener('click', () => {
            this.toggleCompletedCourses();
        });

        document.getElementById('back-to-list').addEventListener('click', () => {
            this.showCourseList();
        });

        // Image upload listener
        document.getElementById('course-image').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        // Modal listeners
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeCourseModal();
        });

        document.getElementById('cancel-course-btn').addEventListener('click', () => {
            this.closeCourseModal();
        });

        document.getElementById('courseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveCourse();
        });

        // Email modal listeners
        document.querySelector('.close-email-modal').addEventListener('click', () => {
            this.closeEmailModal();
        });

        document.getElementById('addEmailForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddEmail();
        });
    }

    toggleAuthMode(mode) {
        const loginSec = document.getElementById('login-section');
        const regSec = document.getElementById('register-section');
        const loginErr = document.getElementById('login-error');
        const regErr = document.getElementById('register-error');

        if (mode === 'register') {
            loginSec.classList.remove('active');
            regSec.classList.add('active');
        } else {
            loginSec.classList.add('active');
            regSec.classList.remove('active');
        }
        loginErr.style.display = 'none';
        regErr.style.display = 'none';
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const errorElement = document.getElementById('login-error');

        if (!email) return;

        try {
            const authorizedEmails = await this.dataManager.getAuthorizedEmails();
            const user = authorizedEmails.find(u => u.email === email);

            if (user) {
                this.currentUser = user;
                this.dataManager.setCurrentUser(user.email);
                errorElement.style.display = 'none';
                await this.showAppScreen();
                document.getElementById('loginForm').reset();
            } else {
                errorElement.textContent = 'Account non trovato. Per favore registrati.';
                errorElement.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorElement.textContent = 'Errore durante l\'accesso. Riprova.';
            errorElement.style.display = 'block';
        }
    }

    async handleRegister() {
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const name = document.getElementById('reg-name').value.trim();
        const company = document.getElementById('reg-company').value.trim();
        const role = document.getElementById('reg-role').value.trim();
        const errorElement = document.getElementById('register-error');

        if (!email || !name || !company || !role) return;

        try {
            // Check if already exists
            const authorizedEmails = await this.dataManager.getAuthorizedEmails();
            if (authorizedEmails.some(u => u.email === email)) {
                errorElement.textContent = 'Questa email è già registrata. Accedi.';
                errorElement.style.display = 'block';
                return;
            }

            const userData = { email, name, company, role };
            await this.dataManager.registerUser(userData);

            // Fetch newly created user to get all fields
            const updatedUsers = await this.dataManager.getAuthorizedEmails();
            this.currentUser = updatedUsers.find(u => u.email === email);

            this.dataManager.setCurrentUser(email);
            errorElement.style.display = 'none';
            await this.showAppScreen();
            document.getElementById('registerForm').reset();
            alert('Registrazione completata con successo!');
        } catch (error) {
            console.error('Registration error:', error);
            errorElement.textContent = 'Errore durante la registrazione. Riprova.';
            errorElement.style.display = 'block';
        }
    }

    handleLogout() {
        this.dataManager.logout();
        this.currentUser = null;
        this.showAuthScreen();
    }

    async showCourseList() {
        // Clean up chat polling
        if (this.chatPollingInterval) {
            clearInterval(this.chatPollingInterval);
            this.chatPollingInterval = null;
        }

        document.getElementById('course-list-view').classList.add('active');
        document.getElementById('course-detail-view').classList.remove('active');
        await this.renderCourses();
    }

    async renderCourses() {
        const allCourses = await this.dataManager.getCourses();
        let courses;

        if (this.showingCompleted) {
            courses = allCourses.filter(c => c.status === 'completed');
            document.getElementById('toggle-completed-btn').textContent = '❌ Chiudi Archivio';
            document.getElementById('toggle-completed-btn').classList.add('archive-active');
        } else {
            courses = allCourses.filter(c => !c.status || c.status === 'active');
            document.getElementById('toggle-completed-btn').textContent = '📂 Archivio Corsi Terminati';
            document.getElementById('toggle-completed-btn').classList.remove('archive-active');
        }

        const container = document.getElementById('courses-container');
        const noCourses = document.getElementById('no-courses');

        if (courses.length === 0) {
            container.innerHTML = '';
            noCourses.style.display = 'block';
            noCourses.querySelector('p').textContent = this.showingCompleted ? 'Nessun corso terminato' : 'Nessun corso disponibile';
            return;
        }

        noCourses.style.display = 'none';
        const enrollments = await this.dataManager.getEnrollments();

        container.innerHTML = courses.map(course => {
            const participants = enrollments.filter(e => e.courseId === course.id);
            const maxParticipants = course.maxParticipants || 20;
            const availableSpots = maxParticipants - participants.length;
            const spotsClass = availableSpots > 0 ? 'spots-available' : 'spots-full';
            const displayTime = course.startTime || '09:00';
            const courseImage = course.image || '';
            return `
                <div class="course-card" onclick="app.showCourseDetail(${course.id})">
                    ${courseImage ? `<img src="${courseImage}" class="course-card-image" alt="${course.title}">` : ''}
                    <div class="course-card-content">
                        <h3>${course.title || 'Corso senza titolo'}</h3>
                        <p>${course.description || ''}</p>
                        <p><strong>Docente:</strong> ${course.instructor || 'Non specificato'}</p>
                        <p><strong>Luogo:</strong> ${course.location || 'Non specificato'}</p>
                        <div class="course-meta">
                            <span class="course-date-time">📅 ${this.formatDate(course.date)} - ⏰ ${displayTime}</span>
                            <span class="participants-count ${spotsClass}">
                                ${participants.length}/${maxParticipants} partecipanti
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async showCourseDetail(courseId) {
        try {
            console.log('Showing details for course:', courseId);
            const courses = await this.dataManager.getCourses();
            const course = courses.find(c => c.id === courseId);
            if (!course) {
                console.error('Course not found:', courseId);
                return;
            }

            this.currentCourse = course;
            document.getElementById('course-list-view').classList.remove('active');
            document.getElementById('course-detail-view').classList.add('active');

            await this.renderCourseDetail();
        } catch (e) {
            console.error('Error in showCourseDetail:', e);
            alert('Errore durante l\'apertura del corso: ' + e.message);
        }
    }

    async renderCourseDetail() {
        if (!this.currentUser) {
            console.error('Current user is missing in renderCourseDetail');
            this.handleLogout(); // Redirect to login if user is missing
            return;
        }

        const container = document.getElementById('course-detail-content');
        if (!container) {
            console.error('Course detail container not found');
            return;
        }

        const course = this.currentCourse;
        const allEnrollments = await this.dataManager.getEnrollments();
        const enrollments = allEnrollments.filter(e => e.courseId === course.id);
        const users = await this.dataManager.getAuthorizedEmails();
        const isEnrolled = enrollments.some(e => e.userId === this.currentUser.email);
        const maxParticipants = course.maxParticipants || 20;
        const availableSpots = maxParticipants - enrollments.length;
        const isFull = availableSpots <= 0;

        const participants = enrollments.map(e => {
            const user = users.find(u => u.email === e.userId);
            return user ? user.name : 'Utente sconosciuto';
        });

        let actionButtons = '';
        if (this.currentUser.isAdmin) {
            let statusButtons = '';
            if (!course.status || course.status === 'active') {
                // Active course: Edit + Terminate
                statusButtons = `
                    <button class="edit-course-btn" onclick="app.editCourse(${course.id})">Modifica Corso</button>
                    <button class="terminate-course-btn" onclick="app.terminateCourse(${course.id})">✅ Conferma Termine Corso</button>
                 `;
            } else {
                // Completed course: Restore
                statusButtons = `
                    <button class="restore-course-btn" onclick="app.restoreCourse(${course.id})">🔄 Ripristina Corso</button>
                `;
            }

            actionButtons = `
                ${statusButtons}
                <button class="delete-course-btn" onclick="app.deleteCourse(${course.id})">Elimina Corso</button>
            `;
        } else {
            if (isEnrolled) {
                actionButtons = `<button class="unenroll-btn" onclick="app.unenrollFromCourse()">Cancellati dal Corso</button>`;
            } else if (isFull) {
                actionButtons = `<button class="enroll-btn" disabled style="opacity: 0.5; cursor: not-allowed;">Corso Completo</button>`;
            } else {
                actionButtons = `<button class="enroll-btn" onclick="app.enrollInCourse()">Partecipa al Corso</button>`;
            }
        }

        const content = `
            <div class="course-detail-header">
                <div class="detail-header-content">
                    ${course.image ? `<img src="${course.image}" class="course-detail-image" alt="${course.title}">` : ''}
                    <div class="detail-title-section">
                        <h2>${course.title}</h2>
                        <p>${course.description}</p>
                    </div>
                </div>
                
                <div class="course-info">
                    <div class="course-info-item">
                        <label>Docente</label>
                        <span>${course.instructor}</span>
                    </div>
                    <div class="course-info-item">
                        <label>Luogo</label>
                        <span>${course.location || 'Non specificato'}</span>
                    </div>
                    <div class="course-info-item">
                        <label>Data del Corso</label>
                        <span>${this.formatDate(course.date)}</span>
                    </div>
                    <div class="course-info-item">
                        <label>Ora di Inizio</label>
                        <span>${course.startTime || '09:00'}</span>
                    </div>
                    <div class="course-info-item">
                        <label>Durata</label>
                        <span>${course.duration} ore</span>
                    </div>
                    <div class="course-info-item">
                        <label>Disponibilità</label>
                        <span class="${availableSpots > 0 ? 'spots-available' : 'spots-full'}">
                            ${enrollments.length}/${maxParticipants} posti occupati
                            ${availableSpots > 0 ? `(${availableSpots} disponibili)` : '(Completo)'}
                        </span>
                    </div>
                </div>

                <div class="course-actions">
                    ${actionButtons}
                </div>
            </div>


            <div class="participants-section">
                <h3>Partecipanti Iscritti</h3>
                ${participants.length > 0 ? `
                    <ul class="participants-list">
                        ${participants.map((p, idx) => `
                            <li class="participant-item">
                                <span>${p}</span>
                                ${this.currentUser.isAdmin ? `<button class="remove-participant-btn" onclick="app.removeParticipant('${enrollments[idx].userId}', '${p.replace(/'/g, "\\'")}')">Rimuovi</button>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                ` : '<p class="no-participants">Nessun partecipante iscritto</p>'}
            </div>

            ${(isEnrolled || this.currentUser.isAdmin) ? `
                <div class="chat-section">
                    <div class="chat-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3>💬 Chat del Corso</h3>
                        ${this.currentUser.isAdmin ? `<button onclick="app.clearChat()" style="background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️ Pulisci Chat</button>` : ''}
                    </div>
                    <div id="chat-container" class="chat-container">
                        <div id="chat-messages" class="chat-messages"></div>
                        <div class="chat-input-container">
                            <input type="text" id="chat-input" placeholder="Scrivi un messaggio..." onkeypress="if(event.key==='Enter') app.sendMessage()" />
                            <button onclick="app.sendMessage()">Invia</button>
                        </div>
                    </div>
                </div>
            ` : ''}
        `;

        container.innerHTML = content;

        if (isEnrolled || this.currentUser.isAdmin) {
            await this.loadChatMessages();
            this.startChatPolling();
        }
    }

    startChatPolling() {
        // Clear any existing polling
        if (this.chatPollingInterval) {
            clearInterval(this.chatPollingInterval);
        }

        // Check for new messages every 3 seconds
        this.chatPollingInterval = setInterval(async () => {
            if (this.currentCourse && document.getElementById('chat-messages')) {
                const oldCount = this.lastMessageCount || 0;
                const messages = await this.dataManager.getCourseMessages(this.currentCourse.id);

                if (messages.length > oldCount && oldCount > 0) {
                    // New message received!
                    const newMessages = messages.slice(oldCount);
                    const lastMessage = newMessages[newMessages.length - 1];

                    // Only show notification if message is from another user
                    if (lastMessage.userEmail !== this.currentUser.email) {
                        this.showMessageNotification(lastMessage);
                    }
                }

                this.lastMessageCount = messages.length;
                await this.loadChatMessages();
            }
        }, 3000);
    }

    showMessageNotification(message) {
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nuovo messaggio nel corso', {
                body: `${message.userName}: ${message.message}`,
                icon: '/favicon.ico'
            });
        }

        // Play sound
        this.playMessageSound();

        // Show alert notification
        const notificationEl = document.createElement('div');
        notificationEl.className = 'chat-notification';
        notificationEl.innerHTML = `
            <strong>💬 Nuovo messaggio da ${message.userName}</strong>
            <p>${message.message}</p>
        `;
        document.body.appendChild(notificationEl);

        // Auto-hide after 4 seconds
        setTimeout(() => {
            notificationEl.classList.add('fade-out');
            setTimeout(() => notificationEl.remove(), 300);
        }, 4000);


    }

    async loadChatMessages() {
        const messages = await this.dataManager.getCourseMessages(this.currentCourse.id);
        const container = document.getElementById('chat-messages');

        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = '<p class="no-messages">Nessun messaggio ancora. Inizia la conversazione!</p>';
            this.lastMessageCount = 0;
            return;
        }

        container.innerHTML = messages.map(msg => `
            <div class="chat-message ${msg.userEmail === this.currentUser.email ? 'own-message' : ''}">
                <div class="message-header">
                    <strong>${msg.userName}</strong>
                    <span class="message-time">${new Date(msg.timestamp).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div class="message-content">${this.escapeHtml(msg.message)}</div>
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;

        // Update last message count
        if (!this.lastMessageCount) {
            this.lastMessageCount = messages.length;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;

        const message = input.value.trim();

        if (!message) return;

        const messageData = {
            courseId: this.currentCourse.id,
            userEmail: this.currentUser.email,
            userName: this.currentUser.name,
            message: message,
            timestamp: new Date().toISOString()
        };

        await this.dataManager.saveCourseMessage(messageData);
        input.value = '';
        this.lastMessageCount++;
        await this.loadChatMessages();
    }

    clearChat() {
        if (confirm('Sei sicuro di voler eliminare TUTTI i messaggi di chat per questo corso? Questa azione non può essere annullata.')) {
            this.dataManager.deleteAllCourseMessages(this.currentCourse.id);
            this.lastMessageCount = 0;
            this.loadChatMessages();
            alert('Chat pulita con successo.');
        }
    }

    async removeParticipant(userEmail, userName) {
        if (confirm(`Sei sicuro di voler rimuovere ${userName} da questo corso?`)) {
            await this.dataManager.unenrollUser(this.currentCourse.id, userEmail);
            await this.renderCourseDetail();
        }
    }

    async enrollInCourse() {
        const enrollments = await this.dataManager.getEnrollments();
        const currentEnrollments = enrollments.filter(e => e.courseId === this.currentCourse.id);
        const maxParticipants = this.currentCourse.maxParticipants || 20;

        if (currentEnrollments.length >= maxParticipants) {
            alert('Spiacente, il corso ha raggiunto il numero massimo di partecipanti.');
            return;
        }

        await this.dataManager.enrollUser(this.currentCourse.id, this.currentUser.email);

        // Play sound
        this.playEnrollSound();

        await this.renderCourseDetail();
    }

    async unenrollFromCourse() {
        if (confirm('Sei sicuro di volerti cancellare da questo corso?')) {
            await this.dataManager.unenrollUser(this.currentCourse.id, this.currentUser.email);

            // Play unenroll sound
            this.playUnenrollSound();

            await this.renderCourseDetail();
        }
    }

    async toggleCompletedCourses() {
        this.showingCompleted = !this.showingCompleted;
        await this.renderCourses();
    }

    async terminateCourse(courseId) {
        if (confirm('Sei sicuro di voler terminare questo corso? Non sarà più visibile agli utenti ma potrai trovarlo nella sezione Corsi Terminati.')) {
            try {
                await this.dataManager.updateCourse(courseId, { status: 'completed' });
                this.playUnenrollSound();
                alert('Corso terminato con successo.');
                await this.showCourseList();
            } catch (error) {
                alert('Errore durante la terminazione del corso.');
            }
        }
    }

    async restoreCourse(courseId) {
        if (confirm('Sei sicuro di voler ripristinare questo corso? Tornerà visibile tra i corsi attivi.')) {
            try {
                await this.dataManager.updateCourse(courseId, { status: 'active' });
                this.playEnrollSound();
                alert('Corso ripristinato con successo.');

                // Switch to active view to show the restored course
                this.showingCompleted = false;
                await this.showCourseList();
            } catch (error) {
                alert('Errore durante il ripristino del corso.');
            }
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('image-preview');
                const previewImg = document.getElementById('preview-img');
                previewImg.src = e.target.result;
                preview.style.display = 'block';
                this.currentImage = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    openCourseModal(course = null) {
        const modal = document.getElementById('course-modal');
        const title = document.getElementById('modal-title');
        const preview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');

        if (course) {
            title.textContent = 'Modifica Corso';
            document.getElementById('course-id').value = course.id;
            document.getElementById('course-title').value = course.title;
            document.getElementById('course-description').value = course.description;
            document.getElementById('course-instructor').value = course.instructor;
            document.getElementById('course-location').value = course.location || '';
            document.getElementById('course-date').value = course.date;
            document.getElementById('course-start-time').value = course.startTime || '09:00';
            document.getElementById('course-duration').value = course.duration;
            document.getElementById('course-max-participants').value = course.maxParticipants;

            if (course.image) {
                previewImg.src = course.image;
                preview.style.display = 'block';
                this.currentImage = course.image;
            } else {
                preview.style.display = 'none';
                this.currentImage = null;
            }
        } else {
            title.textContent = 'Aggiungi Corso';
            document.getElementById('courseForm').reset();
            document.getElementById('course-id').value = '';
            preview.style.display = 'none';
            this.currentImage = null;
        }

        modal.classList.add('active');
    }

    closeCourseModal() {
        document.getElementById('course-modal').classList.remove('active');
        document.getElementById('courseForm').reset();
        document.getElementById('image-preview').style.display = 'none';
        this.currentImage = null;
    }

    async handleSaveCourse() {
        try {
            const id = document.getElementById('course-id').value;
            const courseData = {
                title: document.getElementById('course-title').value.toUpperCase(),
                description: document.getElementById('course-description').value.toUpperCase(),
                instructor: document.getElementById('course-instructor').value.toUpperCase(),
                location: document.getElementById('course-location').value.toUpperCase(),
                date: document.getElementById('course-date').value,
                startTime: document.getElementById('course-start-time').value,
                image: this.currentImage || null,
                duration: document.getElementById('course-duration').value,
                maxParticipants: parseInt(document.getElementById('course-max-participants').value)
            };

            if (id) {
                const courseId = parseInt(id);
                // When editing, we use update to avoid overwriting fields like 'status' or 'createdat' accidentally
                await this.dataManager.updateCourse(courseId, courseData);
                this.closeCourseModal();
                const courses = await this.dataManager.getCourses();
                this.currentCourse = courses.find(c => c.id === courseId);
                await this.renderCourseDetail();
            } else {
                // New course
                courseData.status = 'active';
                courseData.createdAt = new Date().toISOString();
                await this.dataManager.saveCourses([courseData]);
                this.closeCourseModal();
                this.showingCompleted = false;
                await this.showCourseList();
            }
            alert('Corso salvato con successo.');
        } catch (error) {
            console.error('Save failed:', error);
            alert('Errore durante il salvataggio del corso.');
        }
    }

    async editCourse(courseId) {
        const courses = await this.dataManager.getCourses();
        const course = courses.find(c => c.id === courseId);
        if (course) {
            this.openCourseModal(course);
        }
    }

    async deleteCourse(courseId) {
        if (confirm('Sei sicuro di voler eliminare questo corso? Verranno eliminate anche tutte le iscrizioni.')) {
            await this.dataManager.deleteCourse(courseId);
            await this.showCourseList();
        }
    }

    // Email Management
    async openEmailModal() {
        const modal = document.getElementById('email-modal');
        modal.classList.add('active');
        await this.renderAuthorizedEmails();
    }

    closeEmailModal() {
        document.getElementById('email-modal').classList.remove('active');
        document.getElementById('addEmailForm').reset();
    }

    async renderAuthorizedEmails() {
        const emails = await this.dataManager.getAuthorizedEmails();
        const container = document.getElementById('authorized-emails-list');

        if (emails.length === 0) {
            container.innerHTML = '<p class="no-data">Nessun utente registrato</p>';
            return;
        }

        container.innerHTML = emails.map(email => `
            <div class="email-item">
                <div class="email-info">
                    <strong>${email.name}</strong>
                    <span>${email.email}</span>
                    <span class="user-meta-small">🏢 ${email.company} | 💼 ${email.role}</span>
                    ${email.notes ? `<span class="email-notes">📝 ${email.notes}</span>` : ''}
                    ${email.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
                </div>
                ${!email.isAdmin ? `<button class="delete-email-btn" onclick="app.deleteEmail('${email.email}')">Elimina</button>` : ''}
            </div>
        `).join('');
    }

    async handleAddEmail() {
        const email = document.getElementById('new-email').value.trim().toLowerCase();
        const name = document.getElementById('new-email-name').value.trim();
        const company = document.getElementById('new-email-company').value.trim();
        const role = document.getElementById('new-email-role').value.trim();
        const notes = document.getElementById('new-email-notes').value.trim();

        let emails = await this.dataManager.getAuthorizedEmails();

        if (emails.find(e => e.email === email)) {
            alert('Questa email è già registrata');
            return;
        }

        const newUser = {
            email,
            name,
            company,
            role,
            notes: notes || '',
            isAdmin: false,
            addedAt: new Date().toISOString()
        };

        await this.dataManager.saveAuthorizedEmails([newUser]);

        document.getElementById('addEmailForm').reset();
        await this.renderAuthorizedEmails();
    }

    async deleteEmail(email) {
        if (confirm(`Sei sicuro di voler eliminare l'utente ${email}?`)) {
            await this.dataManager.deleteAuthorizedEmail(email);
            await this.renderAuthorizedEmails();
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Data da definire';
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}

// Initialize app
// Initialize app
window.app = null;
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL === 'INSERISCI_URL_SUPABASE') {
            const warning = document.createElement('div');
            warning.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:20px; border-radius:8px; box-shadow:0 0 20px rgba(0,0,0,0.2); z-index:10001; text-align:center;';
            warning.innerHTML = '<h2>Configurazione Richiesta</h2><p>Inserisci i dati di Supabase in <code>config.js</code> per avviare l\'app.</p>';
            document.body.appendChild(warning);
            return;
        }
        window.app = new CourseApp();
        console.log('App initialized and attached to window');
    } catch (e) {
        console.error('Failed to initialize app:', e);
        alert('Errore fatale durante l\'inizializzazione dell\'app: ' + e.message);
    }
});
