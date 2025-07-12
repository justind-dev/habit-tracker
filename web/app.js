class HabitTracker {
    constructor() {
        this.habits = [];
        this.currentEditId = null;
        this.currentDeleteId = null;
        this.motivationalMessages = [
            "You're stronger than you think!",
            "Every moment is a victory!",
            "Keep going, you've got this!",
            "Progress, not perfection!",
            "You're doing amazing!",
            "One day at a time!",
            "Proud of your journey!",
            "Stay strong, stay focused!",
            "You're worth it!",
            "Believe in yourself!"
        ];
        
        // Badge definitions in milliseconds
        // TODO: We can add some more here. Honestly in the future it would be nice to have a modal
        // for the user to be able to add their own.
        this.badgeDefinitions = [
            { id: 'hour_1', name: '1 Hour', milliseconds: 3600000 },
            { id: 'hour_3', name: '3 Hours', milliseconds: 10800000 },
            { id: 'hour_6', name: '6 Hours', milliseconds: 21600000 },
            { id: 'hour_12', name: '12 Hours', milliseconds: 43200000 },
            { id: 'day_1', name: '1 Day', milliseconds: 86400000 },
            { id: 'day_2', name: '2 Days', milliseconds: 172800000 },
            { id: 'day_3', name: '3 Days', milliseconds: 259200000 },
            { id: 'day_4', name: '4 Days', milliseconds: 345600000 },
            { id: 'day_5', name: '5 Days', milliseconds: 432000000 },
            { id: 'day_6', name: '6 Days', milliseconds: 518400000 },
            { id: 'week_1', name: '1 Week', milliseconds: 604800000 },
            { id: 'day_10', name: '10 Days', milliseconds: 864000000 },
            { id: 'day_12', name: '12 Days', milliseconds: 1036800000 },
            { id: 'week_2', name: '2 Weeks', milliseconds: 1209600000 },
            { id: 'day_16', name: '16 Days', milliseconds: 1382400000 },
            { id: 'week_3', name: '3 Weeks', milliseconds: 1814400000 },
            { id: 'month_1', name: '1 Month', milliseconds: 2592000000 },
            { id: 'day_50', name: '50 Days', milliseconds: 4320000000 },
            { id: 'week_6', name: '6 Weeks', milliseconds: 3628800000 },
            { id: 'month_2', name: '2 Months', milliseconds: 5184000000 },
            { id: 'day_75', name: '75 Days', milliseconds: 6480000000 },
            { id: 'month_3', name: '3 Months', milliseconds: 7776000000 },
            { id: 'day_100', name: '100 Days', milliseconds: 8640000000 },
            { id: 'month_4', name: '4 Months', milliseconds: 10368000000 },
            { id: 'month_5', name: '5 Months', milliseconds: 12960000000 },
            { id: 'month_6', name: '6 Months', milliseconds: 15552000000 },
            { id: 'year_1', name: '1 Year', milliseconds: 31536000000 },
            { id: 'year_2', name: '2 Years', milliseconds: 63072000000 }
        ].sort((a, b) => a.milliseconds - b.milliseconds); // Sort ascending for next badge calculation
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.migrateDataIfNeeded();
        this.bindEvents();
        this.render();
        this.startStreakUpdater();
    }

    bindEvents() {
        // Add habit button
        document.getElementById('addHabitBtn').addEventListener('click', () => this.openHabitModal());
        
        // Modal controls
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeHabitModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeHabitModal());
        document.getElementById('habitForm').addEventListener('submit', (e) => this.handleHabitSubmit(e));
        
        // Occurrence modal controls
        document.getElementById('closeOccurrenceBtn').addEventListener('click', () => this.closeOccurrenceModal());
        document.getElementById('cancelOccurrenceBtn').addEventListener('click', () => this.closeOccurrenceModal());
        document.getElementById('occurrenceForm').addEventListener('submit', (e) => this.handleOccurrenceSubmit(e));
        
        // Delete modal controls
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());

        // Import / export controls
        // Todo: The above controls need to match the below in safe handling.
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        const importFile = document.getElementById('importFile');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', () => this.triggerImport());
        }
        
        if (importFile) {
            importFile.addEventListener('change', (e) => this.handleImport(e));
        }

        
        // Badges modal controls (will be added when HTML is updated)
        const closeBadgesBtn = document.getElementById('closeBadgesBtn');
        if (closeBadgesBtn) {
            closeBadgesBtn.addEventListener('click', () => this.closeBadgesModal());
        }
        
        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }

    // Storage methods
    loadFromStorage() {
        const stored = localStorage.getItem('habitTrackerHabits');
        if (stored) {
            this.habits = JSON.parse(stored);
        }
    }

    saveToStorage() {
        localStorage.setItem('habitTrackerHabits', JSON.stringify(this.habits));
    }

    // Migrate old data to include new fields
    migrateDataIfNeeded() {
        let updated = false;
        this.habits.forEach(habit => {
            if (!habit.currentStreakStart) {
                // Initialize current streak start
                if (habit.occurrences.length > 0) {
                    // Sort occurrences by date descending
                    habit.occurrences.sort((a, b) => new Date(b.date) - new Date(a.date));
                    habit.currentStreakStart = habit.occurrences[0].date;
                } else {
                    habit.currentStreakStart = habit.startDate;
                }
                updated = true;
            }
            if (!habit.earnedBadges) {
                habit.earnedBadges = [];
                updated = true;
            }
        });
        
        if (updated) {
            // Recalculate badges for all habits
            this.habits.forEach(habit => {
                this.updateStreakAndBadges(habit);
            });
            this.saveToStorage();
        }
    }

    // Habit CRUD operations
    addHabit(name, startDate) {
        const habit = {
            id: Date.now().toString(),
            name: name,
            startDate: new Date(startDate).toISOString(),
            occurrences: [],
            currentStreakStart: new Date(startDate).toISOString(),
            earnedBadges: [],
            createdAt: new Date().toISOString()
        };
        this.habits.push(habit);
        this.updateStreakAndBadges(habit);
        this.saveToStorage();
        this.render();
        this.showMotivationalMessage();
    }

    updateHabit(id, name, startDate) {
        const habit = this.habits.find(h => h.id === id);
        if (habit) {
            habit.name = name;
            const oldStartDate = habit.startDate;
            habit.startDate = new Date(startDate).toISOString();
            
            // Remove occurrences before new start date
            habit.occurrences = habit.occurrences.filter(o => 
                new Date(o.date) >= new Date(habit.startDate)
            );
            
            // Recalculate streak and badges if start date changed or occurrences were removed
            if (oldStartDate !== habit.startDate || habit.occurrences.length === 0) {
                this.updateStreakAndBadges(habit);
            }
            
            this.saveToStorage();
            this.render();
        }
    }

    deleteHabit(id) {
        this.habits = this.habits.filter(h => h.id !== id);
        this.saveToStorage();
        this.render();
    }

    addOccurrence(habitId, date, notes) {
        const habit = this.habits.find(h => h.id === habitId);
        if (habit) {
            const occurrence = {
                id: Date.now().toString(),
                date: new Date(date).toISOString(),
                notes: notes || ''
            };
            habit.occurrences.push(occurrence);
            habit.occurrences.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            this.updateStreakAndBadges(habit);
            
            this.saveToStorage();
            this.render();
        }
    }

    // Badge and Streak Methods
    updateStreakAndBadges(habit) {
        // Determine current streak start
        if (habit.occurrences.length === 0) {
            habit.currentStreakStart = habit.startDate;
        } else {
            // Find the start of the current streak
            const sortedOccurrences = [...habit.occurrences].sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );
            
            let streakStart = habit.startDate;
            let previousDate = new Date(habit.startDate);
            
            for (const occurrence of sortedOccurrences) {
                const occurrenceDate = new Date(occurrence.date);
                // If this occurrence broke the streak, update streak start
                if (occurrenceDate < previousDate) {
                    streakStart = occurrence.date;
                }
                previousDate = occurrenceDate;
            }
            
            habit.currentStreakStart = streakStart;
        }
        
        // Calculate earned badges based on current streak
        habit.earnedBadges = this.calculateEarnedBadges(habit);
    }

    calculateEarnedBadges(habit) {
        const now = new Date();
        let currentStreakStart;
        
        if (habit.occurrences.length === 0) {
            currentStreakStart = new Date(habit.startDate);
        } else {
            currentStreakStart = new Date(habit.occurrences[0].date);
        }
        
        const currentStreakDuration = now - currentStreakStart;
        const earnedBadges = [];
        
        for (const badge of this.badgeDefinitions) {
            if (currentStreakDuration >= badge.milliseconds) {
                earnedBadges.push({
                    id: badge.id,
                    name: badge.name,
                    earnedAt: new Date(currentStreakStart.getTime() + badge.milliseconds).toISOString()
                });
            }
        }
        
        // Sort by earned time descending (most recent first)
        earnedBadges.sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
        
        return earnedBadges;
    }

    getNextBadge(habit) {
        const now = new Date();
        const streakStart = new Date(habit.currentStreakStart);
        const currentStreakDuration = now - streakStart;
        
        // Find the next badge that hasn't been earned yet
        for (const badge of this.badgeDefinitions) {
            if (currentStreakDuration < badge.milliseconds) {
                const timeRemaining = badge.milliseconds - currentStreakDuration;
                const earnTime = new Date(now.getTime() + timeRemaining);
                
                return {
                    name: badge.name,
                    timeRemaining: timeRemaining,
                    earnTime: earnTime,
                    formattedTimeRemaining: this.formatDuration(timeRemaining)
                };
            }
        }
        
        // All badges earned
        return null;
    }

    getLatestBadges(habit, count = 3) {
        return habit.earnedBadges.slice(0, count);
    }

    formatBadgeDisplay(badge) {
        return `⭐ ${badge.name}`;
    }

    calculateCurrentStreak(habit) {
        const now = new Date();
        
        if (habit.occurrences.length === 0) {
            const streakStart = new Date(habit.startDate);
            return this.formatDuration(now - streakStart);
        }
        
        const mostRecentOccurrence = new Date(habit.occurrences[0].date);
        
        return this.formatDuration(now - mostRecentOccurrence);
    }

    calculateLongestStreak(habit) {
        if (habit.occurrences.length === 0) {
            // No occurrences, longest streak is current streak
            return this.calculateCurrentStreak(habit);
        }
        
        const now = new Date();
        const startDate = new Date(habit.startDate);
        const sortedOccurrences = [...habit.occurrences].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        let longestStreak = 0;
        let previousDate = startDate;
        
        // Check streaks between occurrences
        for (const occurrence of sortedOccurrences) {
            const occurrenceDate = new Date(occurrence.date);
            const streakLength = occurrenceDate - previousDate;
            
            if (streakLength > longestStreak) {
                longestStreak = streakLength;
            }
            
            previousDate = occurrenceDate;
        }
        
        // Check current streak (from last occurrence to now)
        const currentStreakLength = now - previousDate;
        if (currentStreakLength > longestStreak) {
            longestStreak = currentStreakLength;
        }
        
        return this.formatDuration(longestStreak);
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        const displayHours = hours % 24;
        const displayMinutes = minutes % 60;
        
        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''}, ${displayHours} hr${displayHours !== 1 ? 's' : ''}, ${displayMinutes} min${displayMinutes !== 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${displayHours} hr${displayHours !== 1 ? 's' : ''}, ${displayMinutes} min${displayMinutes !== 1 ? 's' : ''}`;
        } else {
            return `${displayMinutes} min${displayMinutes !== 1 ? 's' : ''}`;
        }
    }

    // UI Methods
    render() {
        const habitsList = document.getElementById('habitsList');
        
        if (this.habits.length === 0) {
            habitsList.innerHTML = `
                <div class="empty-state">
                    <h3>No habits tracked yet</h3>
                    <p>Click the button above to start tracking your first habit!</p>
                </div>
            `;
            return;
        }
        
        habitsList.innerHTML = this.habits.map(habit => {
            const latestBadges = this.getLatestBadges(habit, 3);
            const nextBadge = this.getNextBadge(habit);
            
            const badgesHtml = latestBadges.length > 0 ? `
                <div class="badge-display">
                    <div class="badge-items">
                        ${latestBadges.map(badge => 
                            `<span class="badge-item">${this.formatBadgeDisplay(badge)}</span>`
                        ).join(', ')}
                    </div>
                    ${habit.earnedBadges.length > 3 ? 
                        `<button class="view-all-badges" onclick="tracker.openBadgesModal('${habit.id}')">View All Badges</button>` 
                        : ''
                    }
                </div>
            ` : '';

            const nextBadgeHtml = nextBadge ? `
                <div class="next-badge">
                    <span class="next-badge-label">Next Badge:</span>
                    <span class="next-badge-name">⭐ ${nextBadge.name}</span>
                    <span class="next-badge-time">in ${nextBadge.formattedTimeRemaining}</span>
                </div>
            ` : `
                <div class="next-badge all-earned">
                    <span class="next-badge-label">🏆 All badges earned! Amazing!</span>
                </div>
            `;
            
            return `
                <div class="habit-card" data-id="${habit.id}">
                    <div class="habit-header">
                        <h3 class="habit-name">${this.escapeHtml(habit.name)}</h3>
                        <div class="habit-actions">
                            <button class="icon-btn add-occurrence" title="Add Occurrence" onclick="tracker.openOccurrenceModal('${habit.id}')">
                                +
                            </button>
                            <button class="icon-btn edit" title="Edit Habit" onclick="tracker.openHabitModal('${habit.id}')">
                                ✏️
                            </button>
                            <button class="icon-btn delete" title="Delete Habit" onclick="tracker.openDeleteModal('${habit.id}')">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="streak-info">
                        <div class="streak-item">
                            <div class="streak-label">Current Streak</div>
                            <div class="streak-value">${this.calculateCurrentStreak(habit)}</div>
                        </div>
                        <div class="streak-item">
                            <div class="streak-label">Longest Streak</div>
                            <div class="streak-value">${this.calculateLongestStreak(habit)}</div>
                        </div>
                        <div class="streak-item">
                            <div class="streak-label">Occurrences</div>
                            <div class="streak-value occurrences">${habit.occurrences.length}</div>
                        </div>
                    </div>
                    ${badgesHtml}
                    ${nextBadgeHtml}
                </div>
            `;
        }).join('');
    }

    // Modal Methods
    openHabitModal(habitId = null) {
        const modal = document.getElementById('habitModal');
        const form = document.getElementById('habitForm');
        const title = document.getElementById('modalTitle');
        
        if (habitId) {
            const habit = this.habits.find(h => h.id === habitId);
            if (habit) {
                this.currentEditId = habitId;
                title.textContent = 'Edit Habit';
                document.getElementById('habitName').value = habit.name;
                document.getElementById('startDate').value = this.formatDateTimeLocal(new Date(habit.startDate));
            }
        } else {
            this.currentEditId = null;
            title.textContent = 'Add New Habit';
            form.reset();
            document.getElementById('startDate').value = this.formatDateTimeLocal(new Date());
        }
        
        modal.classList.add('active');
    }

    closeHabitModal() {
        document.getElementById('habitModal').classList.remove('active');
        document.getElementById('habitForm').reset();
        this.currentEditId = null;
    }

    openOccurrenceModal(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;
        
        document.getElementById('occurrenceHabitId').value = habitId;
        document.getElementById('occurrenceDate').value = this.formatDateTimeLocal(new Date());
        
        // Set min and max dates
        const dateInput = document.getElementById('occurrenceDate');
        dateInput.min = this.formatDateTimeLocal(new Date(habit.startDate));
        dateInput.max = this.formatDateTimeLocal(new Date());
        
        document.getElementById('occurrenceModal').classList.add('active');
    }

    closeOccurrenceModal() {
        document.getElementById('occurrenceModal').classList.remove('active');
        document.getElementById('occurrenceForm').reset();
    }

    openDeleteModal(habitId) {
        this.currentDeleteId = habitId;
        document.getElementById('deleteModal').classList.add('active');
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('active');
        this.currentDeleteId = null;
    }

    openBadgesModal(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;
        
        const modal = document.getElementById('badgesModal');
        if (!modal) return; // Modal not yet in HTML
        
        const habitNameEl = document.getElementById('badgeHabitName');
        const badgesListEl = document.getElementById('badgesList');
        
        if (habitNameEl) habitNameEl.textContent = habit.name;
        
        if (badgesListEl) {
            if (habit.earnedBadges.length === 0) {
                badgesListEl.innerHTML = '<p class="no-badges">No badges earned yet. Keep going!</p>';
            } else {
                badgesListEl.innerHTML = habit.earnedBadges.map(badge => `
                    <div class="badge-row">
                        <span class="badge-name">${this.formatBadgeDisplay(badge)}</span>
                        <span class="badge-date">${this.formatBadgeDate(new Date(badge.earnedAt))}</span>
                    </div>
                `).join('');
            }
        }
        
        modal.classList.add('active');
    }

    closeBadgesModal() {
        const modal = document.getElementById('badgesModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    closeAllModals() {
        this.closeHabitModal();
        this.closeOccurrenceModal();
        this.closeDeleteModal();
        this.closeBadgesModal();
    }

    // Form Handlers
    handleHabitSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('habitName').value.trim();
        const startDate = document.getElementById('startDate').value;
        
        if (!name || !startDate) return;
        
        if (this.currentEditId) {
            this.updateHabit(this.currentEditId, name, startDate);
        } else {
            this.addHabit(name, startDate);
        }
        
        this.closeHabitModal();
    }

    handleOccurrenceSubmit(e) {
        e.preventDefault();
        const habitId = document.getElementById('occurrenceHabitId').value;
        const date = document.getElementById('occurrenceDate').value;
        const notes = document.getElementById('occurrenceNotes').value.trim();
        
        if (!habitId || !date) return;
        
        this.addOccurrence(habitId, date, notes);
        this.closeOccurrenceModal();
    }

    confirmDelete() {
        if (this.currentDeleteId) {
            this.deleteHabit(this.currentDeleteId);
            this.closeDeleteModal();
        }
    }

    // Utility Methods
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    formatBadgeDate(date) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        };
        return date.toLocaleDateString('en-US', options);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showMotivationalMessage() {
        const messageEl = document.getElementById('motivationalMessage');
        const messageText = document.getElementById('messageText');
        
        const randomMessage = this.motivationalMessages[
            Math.floor(Math.random() * this.motivationalMessages.length)
        ];
        
        messageText.textContent = randomMessage;
        messageEl.classList.add('show');
        
        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 3000);
    }

    startStreakUpdater() {
        // Update streaks every minute
        setInterval(() => {
            // Recalculate badges in case any new ones were earned
            this.habits.forEach(habit => {
                const previousBadgeCount = habit.earnedBadges.length;
                this.updateStreakAndBadges(habit);
                
                // If new badges were earned, show motivational message
                if (habit.earnedBadges.length > previousBadgeCount) {
                    this.showMotivationalMessage();
                }
            });
            
            this.saveToStorage();
            this.render();
        }, 60000);
    }
    
    triggerImport() {
        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.click();
        }
    }

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = this.importData(e.target.result, 'replace');
            
            if (result.success) {
                this.showMotivationalMessage();
            }
            
            // Reset file input
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }

    exportData() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            habits: this.habits
        };
        
        const filename = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        const dataStr = JSON.stringify(exportData, null, 2);
        
        // Execute download immediately to preserve user gesture
        this.dataUrlDownload(dataStr, filename);
    }

    dataUrlDownload(dataStr, filename) {
        const dataUrl = "data:text/json;charset=utf-8," + encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    generateUniqueId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    importData(fileContent, mode = 'replace') {
        try {
            const importData = JSON.parse(fileContent);
            
            if (!importData.habits || !Array.isArray(importData.habits)) {
                throw new Error('Invalid backup file format');
            }

            // Backup current data before import
            const currentBackup = [...this.habits];
            
            if (mode === 'replace') {
                this.habits = [];
            }

            // Process imported habits with ID conflict resolution
            const importedHabits = importData.habits.map(habit => {
                const newHabit = { ...habit };
                
                // Generate new IDs to prevent conflicts
                const oldId = newHabit.id;
                newHabit.id = this.generateUniqueId();
                
                // Update occurrence IDs and ensure they're valid
                if (newHabit.occurrences && Array.isArray(newHabit.occurrences)) {
                    newHabit.occurrences = newHabit.occurrences.map(occ => ({
                        ...occ,
                        id: this.generateUniqueId()
                    }));
                } else {
                    newHabit.occurrences = [];
                }

                // Ensure required fields exist
                if (!newHabit.currentStreakStart) {
                    newHabit.currentStreakStart = newHabit.startDate;
                }
                if (!newHabit.earnedBadges) {
                    newHabit.earnedBadges = [];
                }

                return newHabit;
            });

            // Add imported habits
            this.habits.push(...importedHabits);

            // Recalculate all streaks and badges
            this.habits.forEach(habit => {
                this.updateStreakAndBadges(habit);
            });

            this.saveToStorage();
            this.render();
            
            return { success: true, importedCount: importedHabits.length };
            
        } catch (error) {
            // Restore backup on failure
            if (currentBackup) {
                this.habits = currentBackup;
                this.saveToStorage();
                this.render();
            }
            
            return { success: false, error: error.message };
        }
    }
}

// Initialize the app when DOM is loaded
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new HabitTracker();
});