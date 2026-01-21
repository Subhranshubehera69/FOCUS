/**
 * Focus Flow - Productivity Web App
 */

// ===============================================
// STATE MANAGEMENT
// ===============================================

const state = {
    mode: 'timer', // 'timer' or 'stopwatch'
    timer: {
        duration: 25 * 60, // 25 minutes in seconds
        remaining: 25 * 60,
        isRunning: false,
        intervalId: null
    },
    stopwatch: {
        elapsed: 0,
        isRunning: false,
        intervalId: null,
        laps: [],
        startTime: 0
    },
    tasks: [],
    editingTaskId: null,
    // Drag state for n8n-style dragging
    drag: {
        isDragging: false,
        activeNode: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0
    }
};

// ===============================================
// DOM ELEMENTS
// ===============================================

const elements = {
    // Time display
    currentTime: document.getElementById('currentTime'),

    // Timer elements
    timerValue: document.getElementById('timerValue'),
    timerLabel: document.getElementById('timerLabel'),
    progressRing: document.getElementById('progressRing'),
    timerPresets: document.getElementById('timerPresets'),
    lapsContainer: document.getElementById('lapsContainer'),
    lapsList: document.getElementById('lapsList'),
    lapCount: document.getElementById('lapCount'),

    // Custom timer
    customPresetBtn: document.getElementById('customPresetBtn'),
    customTimerInput: document.getElementById('customTimerInput'),
    customMinutes: document.getElementById('customMinutes'),
    setCustomBtn: document.getElementById('setCustomBtn'),

    // Control buttons
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    lapBtn: document.getElementById('lapBtn'),

    // Tab buttons
    tabBtns: document.querySelectorAll('.tab-btn'),
    presetBtns: document.querySelectorAll('.preset-btn:not(.custom-preset-btn)'),

    // Task elements
    taskCanvas: document.getElementById('taskCanvas'),
    nodesContainer: document.getElementById('nodesContainer'),
    connectionsLayer: document.getElementById('connectionsLayer'),
    emptyState: document.getElementById('emptyState'),
    addTaskBtn: document.getElementById('addTaskBtn'),

    // Modal elements
    taskModal: document.getElementById('taskModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalClose: document.getElementById('modalClose'),
    taskNameInput: document.getElementById('taskName'),
    stepsListModal: document.getElementById('stepsListModal'),
    addStepBtn: document.getElementById('addStepBtn'),
    cancelTaskBtn: document.getElementById('cancelTaskBtn'),
    saveTaskBtn: document.getElementById('saveTaskBtn'),

    // Audio
    alarmSound: document.getElementById('alarmSound'),

    // Particles
    floatingParticles: document.getElementById('floatingParticles')
};

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatStopwatchTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const centisecs = Math.floor((ms % 1000) / 10);

    if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        return `${hrs}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveToStorage() {
    localStorage.setItem('focusFlow_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('focusFlow_timer', JSON.stringify({
        duration: state.timer.duration,
        remaining: state.timer.remaining
    }));
}

function loadFromStorage() {
    const tasks = localStorage.getItem('focusFlow_tasks');
    const timer = localStorage.getItem('focusFlow_timer');

    if (tasks) {
        state.tasks = JSON.parse(tasks);
    }

    if (timer) {
        const timerData = JSON.parse(timer);
        state.timer.duration = timerData.duration;
        state.timer.remaining = timerData.remaining;
    }
}

// ===============================================
// FLOATING PARTICLES
// ===============================================

function createFloatingParticles() {
    const container = elements.floatingParticles;
    if (!container) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

// ===============================================
// CURRENT TIME DISPLAY
// ===============================================

function updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours();
    const mins = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    elements.currentTime.textContent = `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

// ===============================================
// TIMER FUNCTIONS
// ===============================================

function updateTimerDisplay() {
    const timeStr = formatTime(state.timer.remaining);
    elements.timerValue.textContent = timeStr;

    // Add has-hours class if showing hours (contains two colons)
    const hasHours = (timeStr.match(/:/g) || []).length >= 2;
    elements.timerValue.classList.toggle('has-hours', hasHours);

    // Update progress ring
    const circumference = 2 * Math.PI * 90; // radius = 90
    const progress = state.timer.remaining / state.timer.duration;
    const offset = circumference * (1 - progress);
    elements.progressRing.style.strokeDashoffset = offset;

    // Add active class when running
    const timerSection = document.querySelector('.timer-section');
    if (state.timer.isRunning) {
        timerSection.classList.add('timer-active');
    } else {
        timerSection.classList.remove('timer-active');
    }
}

function startTimer() {
    if (state.timer.isRunning) return;

    state.timer.isRunning = true;
    elements.startBtn.classList.add('hidden');
    elements.pauseBtn.classList.remove('hidden');

    state.timer.intervalId = setInterval(() => {
        state.timer.remaining--;
        updateTimerDisplay();

        if (state.timer.remaining <= 0) {
            timerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    state.timer.isRunning = false;
    clearInterval(state.timer.intervalId);

    elements.startBtn.classList.remove('hidden');
    elements.pauseBtn.classList.add('hidden');
    elements.startBtn.querySelector('.btn-text').textContent = 'Resume';
}

function resetTimer() {
    pauseTimer();
    state.timer.remaining = state.timer.duration;
    elements.startBtn.querySelector('.btn-text').textContent = 'Start';
    updateTimerDisplay();
    saveToStorage();
}

function timerComplete() {
    pauseTimer();
    elements.startBtn.querySelector('.btn-text').textContent = 'Start';

    // Play alarm sound
    try {
        elements.alarmSound.currentTime = 0;
        elements.alarmSound.play();
    } catch (e) {
        console.log('Audio play failed:', e);
    }

    // Visual feedback
    const timerSection = document.querySelector('.timer-section');
    timerSection.classList.add('timer-complete');
    setTimeout(() => {
        timerSection.classList.remove('timer-complete');
    }, 1000);

    // Show notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus Flow', {
            body: 'Timer complete! Take a break.',
        });
    }

    state.timer.remaining = state.timer.duration;
    updateTimerDisplay();
}

function setTimerDuration(minutes) {
    if (state.timer.isRunning) {
        pauseTimer();
    }

    state.timer.duration = minutes * 60;
    state.timer.remaining = state.timer.duration;

    // Update preset buttons
    elements.presetBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.minutes) === minutes);
    });

    // Remove active from custom button
    if (elements.customPresetBtn) {
        elements.customPresetBtn.classList.remove('active');
    }

    // Hide custom input
    if (elements.customTimerInput) {
        elements.customTimerInput.classList.add('hidden');
    }

    elements.startBtn.querySelector('.btn-text').textContent = 'Start';
    updateTimerDisplay();
    saveToStorage();
}

function toggleCustomInput() {
    const isHidden = elements.customTimerInput.classList.contains('hidden');

    if (isHidden) {
        elements.customTimerInput.classList.remove('hidden');
        elements.customMinutes.focus();

        // Remove active from all preset buttons
        elements.presetBtns.forEach(btn => btn.classList.remove('active'));
        elements.customPresetBtn.classList.add('active');
    } else {
        elements.customTimerInput.classList.add('hidden');
        elements.customPresetBtn.classList.remove('active');
    }
}

function setCustomTimer() {
    const minutes = parseInt(elements.customMinutes.value);

    if (isNaN(minutes) || minutes < 1 || minutes > 180) {
        elements.customMinutes.style.borderColor = '#ef4444';
        setTimeout(() => {
            elements.customMinutes.style.borderColor = '';
        }, 2000);
        return;
    }

    state.timer.duration = minutes * 60;
    state.timer.remaining = state.timer.duration;

    // Update UI
    elements.presetBtns.forEach(btn => btn.classList.remove('active'));
    elements.customTimerInput.classList.add('hidden');
    elements.customPresetBtn.classList.add('active');

    elements.startBtn.querySelector('.btn-text').textContent = 'Start';
    updateTimerDisplay();
    saveToStorage();
}

// ===============================================
// STOPWATCH FUNCTIONS
// ===============================================

function updateStopwatchDisplay() {
    elements.timerValue.textContent = formatStopwatchTime(state.stopwatch.elapsed);

    // Update progress ring (continuous rotation for stopwatch)
    const circumference = 2 * Math.PI * 90;
    const rotations = (state.stopwatch.elapsed / 60000) % 1; // One rotation per minute
    const offset = circumference * rotations;
    elements.progressRing.style.strokeDashoffset = -offset;
}

function startStopwatch() {
    if (state.stopwatch.isRunning) return;

    state.stopwatch.isRunning = true;
    elements.startBtn.classList.add('hidden');
    elements.pauseBtn.classList.remove('hidden');
    elements.lapBtn.classList.remove('hidden');

    state.stopwatch.startTime = Date.now() - state.stopwatch.elapsed;

    state.stopwatch.intervalId = setInterval(() => {
        state.stopwatch.elapsed = Date.now() - state.stopwatch.startTime;
        updateStopwatchDisplay();
    }, 50);
}

function pauseStopwatch() {
    state.stopwatch.isRunning = false;
    clearInterval(state.stopwatch.intervalId);

    elements.startBtn.classList.remove('hidden');
    elements.pauseBtn.classList.add('hidden');
    elements.startBtn.querySelector('.btn-text').textContent = 'Resume';
}

function resetStopwatch() {
    pauseStopwatch();
    state.stopwatch.elapsed = 0;
    state.stopwatch.laps = [];
    elements.startBtn.querySelector('.btn-text').textContent = 'Start';
    elements.lapBtn.classList.add('hidden');
    updateStopwatchDisplay();
    renderLaps();
}

function addLap() {
    const lapTime = state.stopwatch.elapsed;
    const lapNumber = state.stopwatch.laps.length + 1;
    const previousLapTime = state.stopwatch.laps.length > 0 ? state.stopwatch.laps[0].time : 0;

    state.stopwatch.laps.unshift({
        number: lapNumber,
        time: lapTime,
        split: lapTime - previousLapTime
    });

    renderLaps();
}

function renderLaps() {
    elements.lapCount.textContent = state.stopwatch.laps.length;

    if (state.stopwatch.laps.length === 0) {
        elements.lapsContainer.classList.add('hidden');
        return;
    }

    elements.lapsContainer.classList.remove('hidden');
    elements.lapsList.innerHTML = state.stopwatch.laps.map(lap => `
        <div class="lap-item">
            <span class="lap-number">Lap ${lap.number}</span>
            <span class="lap-time">${formatStopwatchTime(lap.time)}</span>
        </div>
    `).join('');
}

// ===============================================
// MODE SWITCHING
// ===============================================

function switchMode(mode) {
    // Stop any running timers
    if (state.timer.isRunning) pauseTimer();
    if (state.stopwatch.isRunning) pauseStopwatch();

    state.mode = mode;

    // Update tab buttons
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Reset start button text
    elements.startBtn.querySelector('.btn-text').textContent = 'Start';
    elements.startBtn.classList.remove('hidden');
    elements.pauseBtn.classList.add('hidden');

    if (mode === 'timer') {
        elements.timerLabel.textContent = 'Focus Time';
        elements.timerPresets.classList.remove('hidden');
        elements.lapsContainer.classList.add('hidden');
        elements.lapBtn.classList.add('hidden');
        elements.timerValue.classList.remove('stopwatch-mode');
        if (elements.customTimerInput) {
            elements.customTimerInput.classList.add('hidden');
        }
        updateTimerDisplay();
    } else {
        elements.timerLabel.textContent = 'Elapsed';
        elements.timerPresets.classList.add('hidden');
        elements.lapBtn.classList.add('hidden');
        elements.timerValue.classList.add('stopwatch-mode');
        if (elements.customTimerInput) {
            elements.customTimerInput.classList.add('hidden');
        }
        updateStopwatchDisplay();
        renderLaps();
    }
}

// ===============================================
// TASK MANAGEMENT
// ===============================================

function createTask(name, steps = []) {
    // Calculate position for new node (vertical layout like n8n)
    const taskIndex = state.tasks.length;
    const baseX = 150; // Center horizontally
    const baseY = 40 + taskIndex * 220; // Stack vertically with spacing

    const task = {
        id: generateId(),
        name: name,
        steps: steps.map((step, index) => ({
            id: generateId(),
            text: step,
            completed: false,
            completedAt: null, // Timestamp when step was completed
            order: index
        })),
        completed: false,
        createdAt: Date.now(),
        position: { x: baseX, y: baseY }
    };

    state.tasks.push(task);
    saveToStorage();
    renderTasks();
    return task;
}

function updateTask(taskId, name, steps) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.name = name;

    // Preserve completion status for existing steps
    const existingSteps = new Map(task.steps.map(s => [s.text, s.completed]));

    task.steps = steps.map((step, index) => ({
        id: generateId(),
        text: step,
        completed: existingSteps.get(step) || false,
        order: index
    }));

    saveToStorage();
    renderTasks();
}

function deleteTask(taskId) {
    const index = state.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return;

    const node = document.querySelector(`[data-task-id="${taskId}"]`);
    if (node) {
        node.style.animation = 'nodeSlideOut 0.3s ease forwards';
        setTimeout(() => {
            state.tasks.splice(index, 1);
            saveToStorage();
            renderTasks();
        }, 300);
    } else {
        state.tasks.splice(index, 1);
        saveToStorage();
        renderTasks();
    }
}

function toggleStep(taskId, stepId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const step = task.steps.find(s => s.id === stepId);
    if (!step) return;

    step.completed = !step.completed;

    // Record completion timestamp
    if (step.completed) {
        step.completedAt = Date.now();
    } else {
        step.completedAt = null;
    }

    // Check if all steps are completed
    task.completed = task.steps.length > 0 && task.steps.every(s => s.completed);

    // Create particle effect on completion
    if (step.completed) {
        const checkbox = document.querySelector(`[data-step-id="${stepId}"]`);
        if (checkbox) {
            createParticles(checkbox);
        }
    }

    saveToStorage();
    renderTasks();
}

function getTaskProgress(task) {
    if (task.steps.length === 0) return 0;
    const completed = task.steps.filter(s => s.completed).length;
    return (completed / task.steps.length) * 100;
}

// ===============================================
// PARTICLE EFFECTS
// ===============================================

function createParticles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const angle = (i / 12) * Math.PI * 2;
        const distance = 30 + Math.random() * 40;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.background = colors[i % colors.length];
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');

        document.body.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 800);
    }
}

// ===============================================
// TASK RENDERING
// ===============================================

// Format completion time as a readable timestamp
function formatCompletionTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = date.getHours();
    const mins = date.getMinutes();
    const secs = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} ${ampm}`;
}

function renderTasks() {
    // Show/hide empty state
    if (state.tasks.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.nodesContainer.innerHTML = '';
        elements.connectionsLayer.innerHTML = '';
        return;
    }

    elements.emptyState.classList.add('hidden');

    // Render task nodes with vertical positioning
    elements.nodesContainer.innerHTML = state.tasks.map((task, index) => {
        // Get position from task or calculate default vertical position
        const posX = task.position ? task.position.x : 150;
        const posY = task.position ? task.position.y : 40 + index * 220;

        return `
        <div class="task-node ${task.completed ? 'completed' : ''}" 
             data-task-id="${task.id}" 
             data-index="${index}"
             style="left: ${posX}px; top: ${posY}px;">
            <div class="task-header">
                <div class="drag-handle" title="Drag to move">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="5" r="2"/>
                        <circle cx="12" cy="5" r="2"/>
                        <circle cx="19" cy="5" r="2"/>
                        <circle cx="5" cy="12" r="2"/>
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="19" cy="12" r="2"/>
                        <circle cx="5" cy="19" r="2"/>
                        <circle cx="12" cy="19" r="2"/>
                        <circle cx="19" cy="19" r="2"/>
                    </svg>
                </div>
                <span class="task-name">${escapeHtml(task.name)}</span>
                <div class="task-actions">
                    <button class="task-action-btn edit" title="Edit" onclick="event.stopPropagation(); editTask('${task.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="task-action-btn delete" title="Delete" onclick="event.stopPropagation(); deleteTask('${task.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
            ${task.steps.length > 0 ? `
                <div class="task-steps">
                    ${task.steps.map(step => `
                        <div class="step-item ${step.completed ? 'completed' : ''}">
                            <input 
                                type="checkbox" 
                                class="step-checkbox" 
                                data-step-id="${step.id}"
                                ${step.completed ? 'checked' : ''}
                                onchange="event.stopPropagation(); toggleStep('${task.id}', '${step.id}')"
                            >
                            <span class="step-text">${escapeHtml(step.text)}</span>
                            ${step.completed && step.completedAt ? `
                                <span class="step-completion-time" title="Completed at">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12,6 12,12 16,14"/>
                                    </svg>
                                    ${formatCompletionTime(step.completedAt)}
                                </span>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="task-progress">
                    <div class="task-progress-fill" style="width: ${getTaskProgress(task)}%"></div>
                </div>
            ` : ''}
        </div>
    `}).join('');

    // Render connections after a short delay to ensure nodes are positioned
    setTimeout(() => {
        renderConnections();
        setupDragHandlers();
    }, 100);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===============================================
// CONNECTION LINES (n8n Style Enhanced)
// ===============================================

function renderConnections() {
    const nodes = document.querySelectorAll('.task-node');
    if (nodes.length < 2) {
        elements.connectionsLayer.innerHTML = '';
        return;
    }

    const containerRect = elements.nodesContainer.getBoundingClientRect();

    // Adjust container position
    elements.connectionsLayer.style.width = elements.nodesContainer.offsetWidth + 'px';
    elements.connectionsLayer.style.height = elements.nodesContainer.offsetHeight + 'px';

    let pathsHTML = `
        <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
    `;

    // Create vertical connections between consecutive nodes
    for (let i = 0; i < nodes.length - 1; i++) {
        const node1 = nodes[i];
        const node2 = nodes[i + 1];

        const rect1 = node1.getBoundingClientRect();
        const rect2 = node2.getBoundingClientRect();

        // Calculate start and end points relative to the container (vertical flow)
        const startX = rect1.left + rect1.width / 2 - containerRect.left;
        const startY = rect1.bottom - containerRect.top + 10;
        const endX = rect2.left + rect2.width / 2 - containerRect.left;
        const endY = rect2.top - containerRect.top - 10;

        // Vertical bezier curve
        const controlOffset = Math.min(40, (endY - startY) / 2);
        const path = `M ${startX} ${startY} 
                C ${startX} ${startY + controlOffset}, 
                  ${endX} ${endY - controlOffset}, 
                  ${endX} ${endY}`;

        // Background path (thicker, for glow effect)
        pathsHTML += `
            <path class="connection-path-bg" d="${path}"/>
        `;

        // Main animated path
        pathsHTML += `
            <path class="connection-path connection-path-animated" 
                  d="${path}" 
                  stroke="url(#connectionGradient)"
                  filter="url(#glow)"
                  id="connection-${i}"/>
        `;

        // Animated particles along path
        for (let p = 0; p < 3; p++) {
            const delay = p * 0.5;
            pathsHTML += `
                <circle r="4" class="flow-particle">
                    <animateMotion dur="2s" repeatCount="indefinite" begin="${delay}s">
                        <mpath href="#connection-${i}"/>
                    </animateMotion>
                </circle>
            `;
        }
    }

    elements.connectionsLayer.innerHTML = pathsHTML;
}

// ===============================================
// N8N-STYLE DRAG HANDLERS
// ===============================================

function setupDragHandlers() {
    const nodes = document.querySelectorAll('.task-node');

    nodes.forEach(node => {
        // Mouse down on node or drag handle starts drag
        node.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on buttons, checkboxes, or inputs
            if (e.target.closest('.task-action-btn') ||
                e.target.closest('.step-checkbox') ||
                e.target.tagName === 'INPUT') {
                return;
            }

            startDrag(e, node);
        });
    });

    // Global mouse move and up handlers
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', endDrag);
}

function startDrag(e, node) {
    e.preventDefault();

    const taskId = node.dataset.taskId;
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    state.drag.isDragging = true;
    state.drag.activeNode = node;
    state.drag.startX = e.clientX;
    state.drag.startY = e.clientY;
    state.drag.offsetX = task.position.x;
    state.drag.offsetY = task.position.y;

    node.classList.add('dragging');
    elements.taskCanvas.classList.add('dragging-node');
}

function handleDrag(e) {
    if (!state.drag.isDragging || !state.drag.activeNode) return;

    e.preventDefault();

    const dx = e.clientX - state.drag.startX;
    const dy = e.clientY - state.drag.startY;

    const newX = Math.max(0, state.drag.offsetX + dx);
    const newY = Math.max(0, state.drag.offsetY + dy);

    // Update node position visually
    state.drag.activeNode.style.left = newX + 'px';
    state.drag.activeNode.style.top = newY + 'px';

    // Update connections in real-time
    renderConnections();
}

function endDrag(e) {
    if (!state.drag.isDragging || !state.drag.activeNode) return;

    const node = state.drag.activeNode;
    const taskId = node.dataset.taskId;
    const task = state.tasks.find(t => t.id === taskId);

    if (task) {
        // Calculate final position
        const dx = e.clientX - state.drag.startX;
        const dy = e.clientY - state.drag.startY;

        task.position.x = Math.max(0, state.drag.offsetX + dx);
        task.position.y = Math.max(0, state.drag.offsetY + dy);

        saveToStorage();
    }

    node.classList.remove('dragging');
    elements.taskCanvas.classList.remove('dragging-node');

    // Reset drag state
    state.drag.isDragging = false;
    state.drag.activeNode = null;
    state.drag.startX = 0;
    state.drag.startY = 0;
    state.drag.offsetX = 0;
    state.drag.offsetY = 0;

    // Final connection update
    renderConnections();
}

// Re-render connections on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (state.tasks.length > 1) {
            renderConnections();
        }
    }, 100);
});

// ===============================================
// MODAL FUNCTIONS
// ===============================================

function openModal(taskId = null) {
    state.editingTaskId = taskId;

    if (taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;

        elements.modalTitle.textContent = 'Edit Task';
        elements.taskNameInput.value = task.name;
        renderModalSteps(task.steps.map(s => s.text));
    } else {
        elements.modalTitle.textContent = 'Add New Task';
        elements.taskNameInput.value = '';
        renderModalSteps(['']);
    }

    elements.taskModal.classList.remove('hidden');
    elements.taskNameInput.focus();
}

function closeModal() {
    elements.taskModal.classList.add('hidden');
    state.editingTaskId = null;
}

function renderModalSteps(steps) {
    elements.stepsListModal.innerHTML = steps.map((step, index) => `
        <div class="step-input-group" data-step-index="${index}">
            <input type="text" placeholder="Step ${index + 1}..." value="${escapeHtml(step)}" maxlength="100">
            <button type="button" class="step-remove-btn" onclick="removeModalStep(${index})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function addModalStep() {
    const currentSteps = getModalSteps();
    currentSteps.push('');
    renderModalSteps(currentSteps);

    // Focus the new input
    const inputs = elements.stepsListModal.querySelectorAll('input');
    inputs[inputs.length - 1].focus();
}

function removeModalStep(index) {
    const currentSteps = getModalSteps();
    if (currentSteps.length <= 1) {
        currentSteps[0] = '';
        renderModalSteps(currentSteps);
        return;
    }
    currentSteps.splice(index, 1);
    renderModalSteps(currentSteps);
}

function getModalSteps() {
    const inputs = elements.stepsListModal.querySelectorAll('input');
    return Array.from(inputs).map(input => input.value.trim());
}

function saveTask() {
    const name = elements.taskNameInput.value.trim();
    if (!name) {
        elements.taskNameInput.focus();
        elements.taskNameInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            elements.taskNameInput.style.borderColor = '';
        }, 2000);
        return;
    }

    const steps = getModalSteps().filter(s => s.length > 0);

    if (state.editingTaskId) {
        updateTask(state.editingTaskId, name, steps);
    } else {
        createTask(name, steps);
    }

    closeModal();
}

function editTask(taskId) {
    openModal(taskId);
}

// Make functions globally accessible
window.toggleStep = toggleStep;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.removeModalStep = removeModalStep;

// ===============================================
// EVENT LISTENERS
// ===============================================

function initEventListeners() {
    // Tab switching
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchMode(btn.dataset.mode);
        });
    });

    // Timer presets
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTimerDuration(parseInt(btn.dataset.minutes));
        });
    });

    // Custom timer
    if (elements.customPresetBtn) {
        elements.customPresetBtn.addEventListener('click', toggleCustomInput);
    }

    if (elements.setCustomBtn) {
        elements.setCustomBtn.addEventListener('click', setCustomTimer);
    }

    if (elements.customMinutes) {
        elements.customMinutes.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                setCustomTimer();
            }
        });
    }

    // Timer controls
    elements.startBtn.addEventListener('click', () => {
        if (state.mode === 'timer') {
            startTimer();
        } else {
            startStopwatch();
        }
    });

    elements.pauseBtn.addEventListener('click', () => {
        if (state.mode === 'timer') {
            pauseTimer();
        } else {
            pauseStopwatch();
        }
    });

    elements.resetBtn.addEventListener('click', () => {
        if (state.mode === 'timer') {
            resetTimer();
        } else {
            resetStopwatch();
        }
    });

    elements.lapBtn.addEventListener('click', addLap);

    // Task modal
    elements.addTaskBtn.addEventListener('click', () => openModal());
    elements.modalClose.addEventListener('click', closeModal);
    elements.cancelTaskBtn.addEventListener('click', closeModal);
    elements.saveTaskBtn.addEventListener('click', saveTask);
    elements.addStepBtn.addEventListener('click', addModalStep);

    // Close modal on overlay click
    elements.taskModal.addEventListener('click', (e) => {
        if (e.target === elements.taskModal) {
            closeModal();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to close modal
        if (e.key === 'Escape' && !elements.taskModal.classList.contains('hidden')) {
            closeModal();
        }

        // Space to toggle timer (when not in input)
        if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (state.mode === 'timer') {
                if (state.timer.isRunning) {
                    pauseTimer();
                } else {
                    startTimer();
                }
            } else {
                if (state.stopwatch.isRunning) {
                    pauseStopwatch();
                } else {
                    startStopwatch();
                }
            }
        }

        // Enter to save task in modal
        if (e.key === 'Enter' && !elements.taskModal.classList.contains('hidden')) {
            if (e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                saveTask();
            }
        }
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ===============================================
// INITIALIZATION
// ===============================================

function init() {
    // Load saved data
    loadFromStorage();

    // Create floating particles
    createFloatingParticles();

    // Initialize displays
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    updateTimerDisplay();
    renderTasks();

    // Set up event listeners
    initEventListeners();

    console.log('Focus Flow initialized successfully!');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
