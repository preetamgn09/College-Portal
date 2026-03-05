/**
 * Smart Attendance and Student Performance Tracker - Frontend Application
 * Demonstrates: Modern JavaScript, ES6+, Async/Await, DOM Manipulation, Chart.js
 */

// ============================================================================
// Configuration and State
// ============================================================================

const API_BASE_URL = 'http://localhost:5000/api';

const state = {
    currentView: 'dashboard',
    students: [],
    subjects: [],
    selectedStudent: null,
    charts: {},
    filters: {
        department: '',
        semester: '',
        subject: ''
    },
    currentUser: null,  // Add current user to state
    userRole: null
};

// ============================================================================
// Authentication Check
// ============================================================================

async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include'
        });

        if (response.ok) {
            const user = await response.json();
            state.currentUser = user;
            state.userRole = user.role;
            
            // Display user info
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userRole').textContent = user.role;
            
            // Configure UI based on role
            configureUIForRole(user.role);
            
            return true;
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
            return false;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
        return false;
    }
}

function configureUIForRole(role) {
    // Hide/show tabs based on role
    if (role === 'student') {
        // Students can't see students tab, can't add subjects
        document.getElementById('studentsTab').style.display = 'none';
        document.getElementById('analyticsTab').style.display = 'none';
        
        // Hide add buttons for students
        document.getElementById('addStudentBtn')?.style.setProperty('display', 'none');
        document.getElementById('addSubjectBtn')?.style.setProperty('display', 'none');
        document.getElementById('markAttendanceBtn')?.style.setProperty('display', 'none');
        document.getElementById('addPerformanceBtn')?.style.setProperty('display', 'none');
        
        // Set default student ID for dashboard
        if (state.currentUser.student_id) {
            setTimeout(() => {
                document.getElementById('dashboardStudentSelect').value = state.currentUser.student_id;
                loadStudentDashboard(state.currentUser.student_id);
            }, 500);
        }
    } else if (role === 'teacher') {
        // Teachers have full access
        // No restrictions needed
    }
}

// Logout handler
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = 'login.html';
        }
    }
});

// ============================================================================
// Configuration and State
// ============================================================================

// ============================================================================
// API Functions
// ============================================================================

class API {
    static async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include',  // Include cookies for session
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - redirect to login
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            showToast(error.message, 'danger');
            throw error;
        }
    }

    // Student APIs
    static async getStudents() {
        return await this.request('/students');
    }

    static async getStudent(id) {
        return await this.request(`/students/${id}`);
    }

    static async createStudent(data) {
        return await this.request('/students', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async updateStudent(id, data) {
        return await this.request(`/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async deleteStudent(id) {
        return await this.request(`/students/${id}`, {
            method: 'DELETE'
        });
    }

    static async searchStudents(criteria) {
        return await this.request('/search/students', {
            method: 'POST',
            body: JSON.stringify(criteria)
        });
    }

    // Subject APIs
    static async getSubjects() {
        return await this.request('/subjects');
    }

    static async createSubject(data) {
        return await this.request('/subjects', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Attendance APIs
    static async markAttendance(data) {
        return await this.request('/attendance', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async getStudentAttendance(studentId) {
        return await this.request(`/attendance/student/${studentId}`);
    }

    static async bulkMarkAttendance(data) {
        return await this.request('/bulk/attendance', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async getAttendanceAnalytics(studentIds) {
        return await this.request('/attendance/analytics', {
            method: 'POST',
            body: JSON.stringify({ student_ids: studentIds })
        });
    }

    // Performance APIs
    static async addPerformance(data) {
        return await this.request('/performance', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async getStudentPerformance(studentId) {
        return await this.request(`/performance/student/${studentId}`);
    }

    static async getPerformanceReport(studentId) {
        return await this.request(`/performance/report/${studentId}`);
    }

    // Dashboard APIs
    static async getStudentDashboard(studentId) {
        return await this.request(`/dashboard/student/${studentId}`);
    }

    // Export APIs
    static async exportStudentCSV(studentId) {
        return await this.request(`/export/student/${studentId}/csv`);
    }

    static async exportAttendanceCSV(dateFrom, dateTo) {
        return await this.request('/export/attendance/csv', {
            method: 'POST',
            body: JSON.stringify({ date_from: dateFrom, date_to: dateTo })
        });
    }

    // Statistics
    static async getStatistics() {
        return await this.request('/statistics/overview');
    }

    // Backup
    static async createBackup() {
        return await this.request('/backup', {
            method: 'POST'
        });
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    const icons = {
        success: '✓',
        danger: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toastIcon.textContent = icons[type] || icons.info;
    toastMessage.textContent = message;
    toast.className = `toast active ${type}`;

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function calculateGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

function getGradeColor(grade) {
    const colors = {
        'A': 'success',
        'B': 'info',
        'C': 'warning',
        'D': 'warning',
        'F': 'danger'
    };
    return colors[grade] || 'info';
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Make closeModal globally available
window.closeModal = closeModal;

// ============================================================================
// Navigation
// ============================================================================

function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            switchView(view);
            
            // Update active state
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function switchView(viewName) {
    state.currentView = viewName;
    
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Load view data
    switch (viewName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'students':
            loadStudents();
            break;
        case 'attendance':
            loadAttendanceView();
            break;
        case 'performance':
            loadPerformanceView();
            break;
        case 'analytics':
            loadAnalyticsView();
            break;
        case 'subjects':
            loadSubjects();
            break;
    }
}

// ============================================================================
// Dashboard View
// ============================================================================

async function loadDashboard() {
    try {
        // Populate student dropdown
        const students = await API.getStudents();
        state.students = students;
        
        const select = document.getElementById('dashboardStudentSelect');
        select.innerHTML = '<option value="">Select Student</option>';
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.student_id;
            option.textContent = `${student.name} (${student.roll_no})`;
            select.appendChild(option);
        });
        
        // Load dashboard if student is selected
        select.addEventListener('change', async (e) => {
            const studentId = e.target.value;
            if (studentId) {
                await loadStudentDashboard(studentId);
            } else {
                document.getElementById('dashboardContent').style.display = 'block';
                document.getElementById('dashboardData').style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadStudentDashboard(studentId) {
    try {
        document.getElementById('dashboardContent').style.display = 'none';
        document.getElementById('dashboardData').style.display = 'block';
        
        const dashboard = await API.getStudentDashboard(studentId);
        
        // Display alerts
        displayAlerts(dashboard.alerts);
        
        // Display stats
        displayDashboardStats(dashboard);
        
        // Display charts
        displayDashboardCharts(dashboard);
        
        // Display recent activity
        displayRecentActivity(dashboard);
        
        showToast('Dashboard loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading student dashboard:', error);
        showToast('Failed to load dashboard', 'danger');
    }
}

function displayAlerts(alerts) {
    const container = document.getElementById('alertsContainer');
    container.innerHTML = '';
    
    if (!alerts || alerts.length === 0) {
        return;
    }
    
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alert.type}`;
        alertDiv.innerHTML = `
            <span>${alert.type === 'warning' ? '⚠' : '❗'}</span>
            <span>${alert.message}: ${alert.value.toFixed(2)}%</span>
        `;
        container.appendChild(alertDiv);
    });
}

function displayDashboardStats(dashboard) {
    const attendance = dashboard.attendance?.summary || {};
    const performance = dashboard.performance?.summary || {};
    
    // Attendance Rate
    const attendanceRate = attendance.attendance_percentage || 0;
    document.getElementById('attendanceRate').textContent = `${attendanceRate.toFixed(1)}%`;
    
    const attendanceChange = document.getElementById('attendanceChange');
    if (attendanceRate >= 75) {
        attendanceChange.textContent = '✓ Good Standing';
        attendanceChange.className = 'stat-change positive';
    } else {
        attendanceChange.textContent = '⚠ Below Threshold';
        attendanceChange.className = 'stat-change negative';
    }
    
    // Average Performance
    const avgPerformance = performance.average_percentage || 0;
    document.getElementById('averagePerformance').textContent = `${avgPerformance.toFixed(1)}%`;
    
    const performanceChange = document.getElementById('performanceChange');
    const grade = calculateGrade(avgPerformance);
    performanceChange.textContent = `Grade: ${grade}`;
    performanceChange.className = `stat-change ${getGradeColor(grade) === 'success' ? 'positive' : 'negative'}`;
    
    // Total Subjects (from charts data)
    const subjectCount = dashboard.attendance?.charts?.subject_wise?.length || 0;
    document.getElementById('totalSubjects').textContent = subjectCount;
    
    // Current Grade
    document.getElementById('currentGrade').textContent = grade;
}

function displayDashboardCharts(dashboard) {
    // Destroy existing charts
    Object.values(state.charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    state.charts = {};
    
    // Attendance Trend Chart
    if (dashboard.attendance?.charts?.daily_trend) {
        const ctx = document.getElementById('attendanceTrendChart');
        if (ctx) {
            const data = dashboard.attendance.charts.daily_trend;
            state.charts.attendanceTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => formatDate(d.date)),
                    datasets: [{
                        label: 'Attendance %',
                        data: data.map(d => d.attendance_percentage),
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    }
    
    // Performance Trend Chart
    if (dashboard.performance?.charts?.performance_trend) {
        const ctx = document.getElementById('performanceTrendChart');
        if (ctx) {
            const data = dashboard.performance.charts.performance_trend;
            state.charts.performanceTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => formatDate(d.date)),
                    datasets: [{
                        label: 'Score %',
                        data: data.map(d => d.percentage),
                        borderColor: '#f093fb',
                        backgroundColor: 'rgba(240, 147, 251, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    }
    
    // Subject-wise Attendance Chart
    if (dashboard.attendance?.charts?.subject_wise) {
        const ctx = document.getElementById('subjectAttendanceChart');
        if (ctx) {
            const data = dashboard.attendance.charts.subject_wise;
            state.charts.subjectAttendance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.subject_name),
                    datasets: [{
                        label: 'Attendance %',
                        data: data.map(d => d.attendance_percentage),
                        backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    }
    
    // Subject-wise Performance Chart
    if (dashboard.performance?.charts?.subject_performance) {
        const ctx = document.getElementById('subjectPerformanceChart');
        if (ctx) {
            const data = dashboard.performance.charts.subject_performance;
            state.charts.subjectPerformance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.subject_name),
                    datasets: [{
                        label: 'Average %',
                        data: data.map(d => d.percentage),
                        backgroundColor: 'rgba(240, 147, 251, 0.8)',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    }
}

function displayRecentActivity(dashboard) {
    const container = document.getElementById('recentActivity');
    container.innerHTML = '';
    
    // Combine attendance and performance records
    const activities = [];
    
    if (dashboard.attendance?.records) {
        dashboard.attendance.records.slice(0, 5).forEach(record => {
            activities.push({
                type: 'attendance',
                icon: '📅',
                title: `${record.status} - ${record.subject_name}`,
                meta: formatDate(record.date)
            });
        });
    }
    
    if (dashboard.performance?.records) {
        dashboard.performance.records.slice(0, 5).forEach(record => {
            const percentage = (record.marks_obtained / record.total_marks * 100).toFixed(1);
            activities.push({
                type: 'performance',
                icon: '📝',
                title: `${record.assessment_type} - ${record.subject_name}`,
                meta: `${percentage}% on ${formatDate(record.date)}`
            });
        });
    }
    
    // Sort by most recent
    activities.sort((a, b) => new Date(b.meta) - new Date(a.meta));
    
    // Display top 10
    activities.slice(0, 10).forEach(activity => {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-item';
        activityDiv.innerHTML = `
            <div class="activity-icon ${activity.type}">
                ${activity.icon}
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-meta">${activity.meta}</div>
            </div>
        `;
        container.appendChild(activityDiv);
    });
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
    }
}

// Initialize refresh button
document.getElementById('refreshDashboard')?.addEventListener('click', () => {
    const studentId = document.getElementById('dashboardStudentSelect').value;
    if (studentId) {
        loadStudentDashboard(studentId);
    } else {
        showToast('Please select a student first', 'warning');
    }
});

// ============================================================================
// Students View
// ============================================================================

async function loadStudents() {
    try {
        const students = await API.getStudents();
        state.students = students;
        displayStudents(students);
        
        // Populate dropdowns in other views
        populateStudentDropdowns(students);
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No students found</td></tr>';
        return;
    }
    
    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.roll_no}</td>
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td><span class="badge info">${student.department}</span></td>
            <td>Sem ${student.semester}</td>
            <td class="table-actions">
                <button class="table-action-btn" onclick="viewStudentDetails(${student.student_id})">View</button>
                <button class="table-action-btn" onclick="editStudent(${student.student_id})">Edit</button>
                <button class="table-action-btn danger" onclick="deleteStudentConfirm(${student.student_id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function populateStudentDropdowns(students) {
    // Populate all student dropdowns
    const selects = [
        'attendanceForm student_id',
        'performanceForm student_id',
        'analyticsStudentSelect',
        'performanceStudentSelect'
    ];
    
    selects.forEach(selectId => {
        const parts = selectId.split(' ');
        const formId = parts[0];
        const name = parts[1] || '';
        
        let select;
        if (name) {
            select = document.querySelector(`#${formId} [name="${name}"]`);
        } else {
            select = document.getElementById(selectId);
        }
        
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Student</option>';
            
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.student_id;
                option.textContent = `${student.name} (${student.roll_no})`;
                select.appendChild(option);
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
}

// Student search
document.getElementById('studentSearchInput')?.addEventListener('input', async (e) => {
    const searchTerm = e.target.value;
    const department = document.getElementById('departmentFilter').value;
    const semester = document.getElementById('semesterFilter').value;
    
    try {
        const result = await API.searchStudents({
            search_term: searchTerm,
            department: department,
            semester: semester
        });
        
        displayStudents(result.results);
    } catch (error) {
        console.error('Error searching students:', error);
    }
});

// Filter listeners
document.getElementById('departmentFilter')?.addEventListener('change', () => {
    document.getElementById('studentSearchInput').dispatchEvent(new Event('input'));
});

document.getElementById('semesterFilter')?.addEventListener('change', () => {
    document.getElementById('studentSearchInput').dispatchEvent(new Event('input'));
});

// Add student
document.getElementById('addStudentBtn')?.addEventListener('click', () => {
    document.getElementById('studentForm').reset();
    document.getElementById('studentModalTitle').textContent = 'Add Student';
    openModal('studentModal');
});

// Student form submission
document.getElementById('studentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.semester = parseInt(data.semester);
    
    try {
        if (state.editingStudentId) {
            await API.updateStudent(state.editingStudentId, data);
            showToast('Student updated successfully', 'success');
            state.editingStudentId = null;
        } else {
            await API.createStudent(data);
            showToast('Student added successfully', 'success');
        }
        
        closeModal('studentModal');
        loadStudents();
    } catch (error) {
        console.error('Error saving student:', error);
    }
});

window.editStudent = async function(studentId) {
    try {
        const student = await API.getStudent(studentId);
        state.editingStudentId = studentId;
        
        const form = document.getElementById('studentForm');
        form.elements['name'].value = student.name;
        form.elements['email'].value = student.email;
        form.elements['roll_no'].value = student.roll_no;
        form.elements['department'].value = student.department;
        form.elements['semester'].value = student.semester;
        
        document.getElementById('studentModalTitle').textContent = 'Edit Student';
        openModal('studentModal');
    } catch (error) {
        console.error('Error loading student:', error);
    }
};

window.viewStudentDetails = function(studentId) {
    document.getElementById('dashboardStudentSelect').value = studentId;
    switchView('dashboard');
    loadStudentDashboard(studentId);
};

window.deleteStudentConfirm = async function(studentId) {
    if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        try {
            await API.deleteStudent(studentId);
            showToast('Student deleted successfully', 'success');
            loadStudents();
        } catch (error) {
            console.error('Error deleting student:', error);
        }
    }
};

// ============================================================================
// Subjects View
// ============================================================================

async function loadSubjects() {
    try {
        const subjects = await API.getSubjects();
        state.subjects = subjects;
        displaySubjects(subjects);
        
        // Populate subject dropdowns
        populateSubjectDropdowns(subjects);
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function displaySubjects(subjects) {
    const grid = document.getElementById('subjectsGrid');
    grid.innerHTML = '';
    
    if (subjects.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No subjects found</p></div>';
        return;
    }
    
    subjects.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerHTML = `
            <div class="subject-code">${subject.subject_code}</div>
            <div class="subject-name">${subject.subject_name}</div>
            <div class="subject-info">${subject.department} • Semester ${subject.semester}</div>
        `;
        grid.appendChild(card);
    });
}

function populateSubjectDropdowns(subjects) {
    const selects = [
        'attendanceSubjectSelect',
        'performanceSubjectSelect',
        'attendanceForm subject_id',
        'performanceForm subject_id'
    ];
    
    selects.forEach(selectId => {
        const parts = selectId.split(' ');
        const formId = parts[0];
        const name = parts[1] || '';
        
        let select;
        if (name) {
            select = document.querySelector(`#${formId} [name="${name}"]`);
        } else {
            select = document.getElementById(selectId);
        }
        
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Subject</option>';
            
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.subject_id;
                option.textContent = `${subject.subject_code} - ${subject.subject_name}`;
                select.appendChild(option);
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
}

// Add subject
document.getElementById('addSubjectBtn')?.addEventListener('click', () => {
    document.getElementById('subjectForm').reset();
    openModal('subjectModal');
});

// Subject form submission
document.getElementById('subjectForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.semester = parseInt(data.semester);
    
    try {
        await API.createSubject(data);
        showToast('Subject added successfully', 'success');
        closeModal('subjectModal');
        loadSubjects();
    } catch (error) {
        console.error('Error saving subject:', error);
    }
});

// ============================================================================
// Attendance View
// ============================================================================

async function loadAttendanceView() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
}

// Mark attendance
document.getElementById('markAttendanceBtn')?.addEventListener('click', () => {
    document.getElementById('attendanceForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('#attendanceForm [name="date"]').value = today;
    openModal('attendanceModal');
});

// Attendance form submission
document.getElementById('attendanceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.student_id = parseInt(data.student_id);
    data.subject_id = parseInt(data.subject_id);
    
    try {
        await API.markAttendance(data);
        showToast('Attendance marked successfully', 'success');
        closeModal('attendanceModal');
    } catch (error) {
        console.error('Error marking attendance:', error);
    }
});

// Bulk attendance
document.getElementById('bulkAttendanceBtn')?.addEventListener('click', async () => {
    const subjectId = document.getElementById('attendanceSubjectSelect').value;
    const date = document.getElementById('attendanceDate').value;
    
    if (!subjectId || !date) {
        showToast('Please select subject and date', 'warning');
        return;
    }
    
    const status = prompt('Enter status for all students (Present/Absent/Late):');
    if (!status || !['Present', 'Absent', 'Late'].includes(status)) {
        showToast('Invalid status', 'danger');
        return;
    }
    
    try {
        const students = state.students;
        const studentIds = students.map(s => s.student_id);
        
        const result = await API.bulkMarkAttendance({
            student_ids: studentIds,
            subject_id: parseInt(subjectId),
            date: date,
            status: status
        });
        
        showToast(`Bulk attendance marked: ${result.success_count} successful`, 'success');
    } catch (error) {
        console.error('Error marking bulk attendance:', error);
    }
});

// ============================================================================
// Performance View
// ============================================================================

async function loadPerformanceView() {
    // Setup listeners
}

// Performance student select
document.getElementById('performanceStudentSelect')?.addEventListener('change', async (e) => {
    const studentId = e.target.value;
    
    if (!studentId) {
        document.getElementById('performanceContent').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No Performance Records</h3>
                <p>Select a student to view their performance records</p>
            </div>
        `;
        return;
    }
    
    try {
        const data = await API.getStudentPerformance(studentId);
        displayPerformanceRecords(data);
    } catch (error) {
        console.error('Error loading performance:', error);
    }
});

function displayPerformanceRecords(data) {
    const container = document.getElementById('performanceContent');
    container.innerHTML = '';
    
    if (!data.records || data.records.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No Performance Records</h3>
                <p>No assessments found for this student</p>
            </div>
        `;
        return;
    }
    
    // Create summary section
    const summary = document.createElement('div');
    summary.className = 'analytics-summary';
    summary.innerHTML = `
        <div class="analytics-metric">
            <div class="analytics-metric-label">Total Assessments</div>
            <div class="analytics-metric-value">${data.analysis.total_assessments}</div>
        </div>
        <div class="analytics-metric">
            <div class="analytics-metric-label">Average Score</div>
            <div class="analytics-metric-value">${data.analysis.average_percentage.toFixed(1)}%</div>
        </div>
        <div class="analytics-metric">
            <div class="analytics-metric-label">Highest Score</div>
            <div class="analytics-metric-value">${data.analysis.highest_marks.toFixed(1)}</div>
        </div>
        <div class="analytics-metric">
            <div class="analytics-metric-label">Current Grade</div>
            <div class="analytics-metric-value">${calculateGrade(data.analysis.average_percentage)}</div>
        </div>
    `;
    container.appendChild(summary);
    
    // Create records list
    const recordsList = document.createElement('div');
    recordsList.className = 'performance-list';
    recordsList.style.marginTop = 'var(--spacing-xl)';
    
    data.records.forEach(record => {
        const percentage = (record.marks_obtained / record.total_marks * 100).toFixed(1);
        const grade = calculateGrade(percentage);
        
        const item = document.createElement('div');
        item.className = 'performance-item';
        item.innerHTML = `
            <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">
                    ${record.subject_name} - ${record.assessment_type}
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    ${formatDate(record.date)} • ${record.marks_obtained}/${record.total_marks}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">
                    ${percentage}%
                </div>
                <span class="badge ${getGradeColor(grade)}">${grade}</span>
            </div>
        `;
        recordsList.appendChild(item);
    });
    
    container.appendChild(recordsList);
}

// Add performance
document.getElementById('addPerformanceBtn')?.addEventListener('click', () => {
    document.getElementById('performanceForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('#performanceForm [name="date"]').value = today;
    openModal('performanceModal');
});

// Performance form submission
document.getElementById('performanceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.student_id = parseInt(data.student_id);
    data.subject_id = parseInt(data.subject_id);
    data.marks_obtained = parseFloat(data.marks_obtained);
    data.total_marks = parseFloat(data.total_marks);
    
    if (data.marks_obtained > data.total_marks) {
        showToast('Marks obtained cannot exceed total marks', 'danger');
        return;
    }
    
    try {
        await API.addPerformance(data);
        showToast('Performance record added successfully', 'success');
        closeModal('performanceModal');
        
        // Refresh if student is selected
        const selectedStudent = document.getElementById('performanceStudentSelect').value;
        if (selectedStudent === data.student_id.toString()) {
            document.getElementById('performanceStudentSelect').dispatchEvent(new Event('change'));
        }
    } catch (error) {
        console.error('Error adding performance:', error);
    }
});

// ============================================================================
// Analytics View
// ============================================================================

async function loadAnalyticsView() {
    // Setup is done in initialization
}

// Generate analytics
document.getElementById('generateAnalyticsBtn')?.addEventListener('click', async () => {
    const analysisType = document.getElementById('analysisType').value;
    const studentSelect = document.getElementById('analyticsStudentSelect');
    const selectedOptions = Array.from(studentSelect.selectedOptions);
    const studentIds = selectedOptions.map(option => parseInt(option.value));
    
    if (studentIds.length === 0) {
        showToast('Please select at least one student', 'warning');
        return;
    }
    
    try {
        const resultsContainer = document.getElementById('analyticsResults');
        resultsContainer.innerHTML = '<div class="loading-state">Generating analysis...</div>';
        
        if (analysisType === 'attendance_comparison') {
            const data = await API.getAttendanceAnalytics(studentIds);
            displayAttendanceComparison(data);
        } else if (analysisType === 'performance_analysis') {
            // Fetch performance for each student
            const performanceData = {};
            for (const studentId of studentIds) {
                const data = await API.getStudentPerformance(studentId);
                const student = state.students.find(s => s.student_id === studentId);
                if (student) {
                    performanceData[student.name] = data;
                }
            }
            displayPerformanceAnalysis(performanceData);
        }
        
        showToast('Analysis generated successfully', 'success');
    } catch (error) {
        console.error('Error generating analytics:', error);
        document.getElementById('analyticsResults').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠</div>
                <h3>Error Generating Analysis</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
});

function displayAttendanceComparison(data) {
    const container = document.getElementById('analyticsResults');
    container.innerHTML = '';
    
    // Summary section
    const summary = document.createElement('div');
    summary.className = 'analytics-summary';
    summary.innerHTML = `
        <div class="analytics-metric">
            <div class="analytics-metric-label">Students Compared</div>
            <div class="analytics-metric-value">${data.students.length}</div>
        </div>
        <div class="analytics-metric">
            <div class="analytics-metric-label">Overall Average</div>
            <div class="analytics-metric-value">${data.overall_average.toFixed(1)}%</div>
        </div>
        <div class="analytics-metric">
            <div class="analytics-metric-label">Best Performance</div>
            <div class="analytics-metric-value">${data.best_student.name}</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${data.best_student.percentage.toFixed(1)}%
            </div>
        </div>
        <div class="analytics-metric">
            <div class="analytics-metric-label">Needs Attention</div>
            <div class="analytics-metric-value">${data.worst_student.name}</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                ${data.worst_student.percentage.toFixed(1)}%
            </div>
        </div>
    `;
    container.appendChild(summary);
    
    // Chart
    const chartSection = document.createElement('div');
    chartSection.className = 'chart-card';
    chartSection.style.marginTop = 'var(--spacing-xl)';
    chartSection.innerHTML = `
        <div class="chart-header">
            <h3>Student Attendance Comparison</h3>
        </div>
        <div class="chart-container">
            <canvas id="comparisonChart"></canvas>
        </div>
    `;
    container.appendChild(chartSection);
    
    // Create chart
    const ctx = document.getElementById('comparisonChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.students,
                datasets: [{
                    label: 'Attendance %',
                    data: data.attendance_percentages,
                    backgroundColor: data.attendance_percentages.map(p => 
                        p >= 75 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

function displayPerformanceAnalysis(performanceData) {
    const container = document.getElementById('analyticsResults');
    container.innerHTML = '';
    
    // Calculate averages
    const averages = {};
    Object.keys(performanceData).forEach(studentName => {
        const data = performanceData[studentName];
        averages[studentName] = data.analysis.average_percentage || 0;
    });
    
    // Summary
    const summary = document.createElement('div');
    summary.className = 'analytics-summary';
    
    const studentNames = Object.keys(averages);
    const avgValues = Object.values(averages);
    const overallAvg = avgValues.reduce((a, b) => a + b, 0) / avgValues.length;
    const maxAvg = Math.max(...avgValues);
    const minAvg = Math.min(...avgValues);
    
    summary.innerHTML = `
        <div class="analytics-metric">
            <div class="analytics-metric-label">Students Analyzed</div>
            <div class="analytics-metric-value">${studentNames.length}</div>
        </div>
        <div class="analytics-metric">
            <div class="analytics-metric-label">Average Performance</div>
            <div class="analytics-metric-value">${overallAvg.toFixed(1)}%</div>
        </div>
        <div class="analytics-metric">
            <div class="analytics-metric-label">Highest Average</div>
            <div class="analytics-metric-value">${maxAvg.toFixed(1)}%</div>
        </div>
        <div class="analytics-metric">
            <div class="analytics-metric-label">Lowest Average</div>
            <div class="analytics-metric-value">${minAvg.toFixed(1)}%</div>
        </div>
    `;
    container.appendChild(summary);
    
    // Chart
    const chartSection = document.createElement('div');
    chartSection.className = 'chart-card';
    chartSection.style.marginTop = 'var(--spacing-xl)';
    chartSection.innerHTML = `
        <div class="chart-header">
            <h3>Performance Comparison</h3>
        </div>
        <div class="chart-container">
            <canvas id="performanceComparisonChart"></canvas>
        </div>
    `;
    container.appendChild(chartSection);
    
    // Create chart
    const ctx = document.getElementById('performanceComparisonChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: studentNames,
                datasets: [{
                    label: 'Average %',
                    data: avgValues,
                    backgroundColor: 'rgba(240, 147, 251, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

// Export analytics
document.getElementById('exportAnalyticsBtn')?.addEventListener('click', async () => {
    const studentId = document.getElementById('analyticsStudentSelect').value;
    
    if (!studentId) {
        showToast('Please select a student to export', 'warning');
        return;
    }
    
    try {
        const result = await API.exportStudentCSV(parseInt(studentId));
        showToast(`Data exported to: ${result.filename}`, 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
    }
});

// Export button (in navbar)
document.getElementById('exportBtn')?.addEventListener('click', async () => {
    if (confirm('Create system backup?')) {
        try {
            const result = await API.createBackup();
            showToast('Backup created successfully', 'success');
        } catch (error) {
            console.error('Error creating backup:', error);
        }
    }
});

// ============================================================================
// Initialization
// ============================================================================

async function initApp() {
    console.log('Initializing Smart Attendance Tracker...');
    
    // Check authentication first
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return;
    }
    
    // Initialize navigation
    initNavigation();
    
    // Load initial data
    try {
        await loadStudents();
        await loadSubjects();
        
        // Load default view
        switchView('dashboard');
        
        console.log('App initialized successfully!');
        showToast('Application loaded successfully', 'success');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error loading application', 'danger');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}