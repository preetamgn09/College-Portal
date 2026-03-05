"""
Advanced Python Programming - Attendance & Performance System
Demonstrates ALL syllabus concepts:
- Cycle 1: OOP, Files, Database (SQLite)
- Cycle 2: NumPy, Pandas, Data Analysis
"""

from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
import sqlite3
import hashlib
import os
import json
from datetime import datetime
import numpy as np
import pandas as pd

app = Flask(__name__)
app.secret_key = 'python-project-secret-key-2024'
CORS(app, supports_credentials=True)

DB_PATH = 'attendance_system.db'

# ============================================================================
# CYCLE 1: BASIC CONCEPTS - OOP, EXCEPTION HANDLING
# ============================================================================

class DatabaseManager:
    """
    OOP Concepts: Classes, Encapsulation
    Exception Handling for database operations
    """
    def __init__(self, db_path):
        self.db_path = db_path
    
    def get_connection(self):
        """Database connection with exception handling"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            return conn
        except sqlite3.Error as e:
            print(f"Database connection error: {e}")
            raise
    
    def execute_query(self, query, params=None):
        """Execute query with exception handling"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            conn.commit()
            return cursor.lastrowid
        except sqlite3.Error as e:
            print(f"Query error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def fetch_all(self, query, params=None):
        """Fetch all results with exception handling"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            results = cursor.fetchall()
            return [dict(row) for row in results]
        except sqlite3.Error as e:
            print(f"Fetch error: {e}")
            return []
        finally:
            if conn:
                conn.close()

class User:
    """Base class demonstrating Inheritance"""
    def __init__(self, name, email, password):
        self.name = name
        self.email = email
        self.password = self._hash_password(password)
    
    def _hash_password(self, password):
        """Encapsulation: private method"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password):
        """Polymorphism: can be overridden"""
        return self.password == self._hash_password(password)

class Student(User):
    """Inheritance from User"""
    def __init__(self, name, email, password, roll_no, department, semester):
        super().__init__(name, email, password)
        self.roll_no = roll_no
        self.department = department
        self.semester = semester

class Teacher(User):
    """Inheritance from User"""
    def __init__(self, name, email, password, department):
        super().__init__(name, email, password)
        self.department = department

# Database instance
db_manager = DatabaseManager(DB_PATH)

# ============================================================================
# DATABASE SETUP - SQL, SQLite Database Files
# ============================================================================

def init_database():
    """Create database schema using SQL"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Students table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            student_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            roll_no TEXT UNIQUE NOT NULL,
            email TEXT NOT NULL,
            department TEXT NOT NULL,
            semester INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    ''')
    
    # Teachers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teachers (
            teacher_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            department TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    ''')
    
    # Subjects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_code TEXT NOT NULL,
            subject_name TEXT NOT NULL,
            teacher_id INTEGER,
            department TEXT,
            semester INTEGER,
            credits INTEGER DEFAULT 2,
            total_hours INTEGER DEFAULT 48,
            FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
        )
    ''')
    
    # Attendance table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            subject_id INTEGER,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id),
            FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        )
    ''')
    
    # Performance table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS performance (
            performance_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            subject_id INTEGER,
            assessment_type TEXT NOT NULL,
            marks_obtained REAL NOT NULL,
            total_marks REAL NOT NULL,
            date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id),
            FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✓ Database initialized with SQL schema")

# ============================================================================
# CYCLE 2: NUMPY & PANDAS - DATA ANALYSIS
# ============================================================================

def analyze_attendance_numpy(student_id):
    """
    NumPy Concepts: Arrays, Computations, Aggregations, Broadcasting
    """
    query = '''
        SELECT status FROM attendance 
        WHERE student_id = ?
    '''
    records = db_manager.fetch_all(query, (student_id,))
    
    if not records:
        return {
            'total_classes': 0,
            'present_count': 0,
            'absent_count': 0,
            'attendance_percentage': 0.0
        }
    
    # Create NumPy array from attendance records
    status_list = [1 if r['status'] == 'Present' else 0 for r in records]
    attendance_array = np.array(status_list)
    
    # NumPy Aggregations: Min, Max, Sum
    total_classes = len(attendance_array)
    present_count = np.sum(attendance_array)  # Sum of 1s
    absent_count = total_classes - present_count
    
    # NumPy Computation
    attendance_percentage = (present_count / total_classes * 100) if total_classes > 0 else 0
    
    return {
        'total_classes': int(total_classes),
        'present_count': int(present_count),
        'absent_count': int(absent_count),
        'attendance_percentage': float(attendance_percentage)
    }

def analyze_performance_pandas(student_id):
    """
    Pandas Concepts: DataFrame, Series, Data Operations, Grouping, Aggregation
    """
    query = '''
        SELECT p.*, s.subject_name, s.subject_code
        FROM performance p
        JOIN subjects s ON p.subject_id = s.subject_id
        WHERE p.student_id = ?
    '''
    records = db_manager.fetch_all(query, (student_id,))
    
    if not records:
        return {
            'records': [],
            'summary': {
                'total_assessments': 0,
                'average_percentage': 0.0,
                'highest_score': 0.0,
                'lowest_score': 0.0
            },
            'subject_wise': []
        }
    
    # Create Pandas DataFrame from records
    df = pd.DataFrame(records)
    
    # Pandas Operations: Creating new columns
    df['percentage'] = (df['marks_obtained'] / df['total_marks']) * 100
    
    # Pandas Aggregation: mean, max, min
    avg_percentage = df['percentage'].mean()
    highest_score = df['percentage'].max()
    lowest_score = df['percentage'].min()
    
    # Pandas Grouping: Group by subject
    subject_wise = df.groupby('subject_name').agg({
        'percentage': 'mean',
        'marks_obtained': 'sum',
        'total_marks': 'sum'
    }).reset_index()
    
    # Convert to dictionary
    subject_wise_list = subject_wise.to_dict('records')
    
    return {
        'records': records,
        'summary': {
            'total_assessments': len(df),
            'average_percentage': float(avg_percentage),
            'highest_score': float(highest_score),
            'lowest_score': float(lowest_score)
        },
        'subject_wise': subject_wise_list
    }

def get_class_analytics_pandas():
    """
    Advanced Pandas: Merge, Join, Complex Aggregations
    Data Visualization preparation
    """
    # Get all students performance
    query = '''
        SELECT s.student_id, s.name, s.roll_no, s.department,
               p.marks_obtained, p.total_marks, p.assessment_type,
               sub.subject_name
        FROM students s
        LEFT JOIN performance p ON s.student_id = p.student_id
        LEFT JOIN subjects sub ON p.subject_id = sub.subject_id
    '''
    
    data = db_manager.fetch_all(query)
    
    if not data:
        return {'message': 'No data available'}
    
    df = pd.DataFrame(data)
    
    # Handle missing data (Pandas concept)
    df = df.dropna(subset=['marks_obtained', 'total_marks'])
    
    if len(df) == 0:
        return {'message': 'No performance data available'}
    
    # Calculate percentage
    df['percentage'] = (df['marks_obtained'] / df['total_marks']) * 100
    
    # Aggregation by department
    dept_stats = df.groupby('department').agg({
        'percentage': ['mean', 'max', 'min', 'std']
    }).round(2)
    
    return {
        'total_students': len(df['student_id'].unique()),
        'class_average': float(df['percentage'].mean()),
        'department_stats': dept_stats.to_dict()
    }

# ============================================================================
# FILE OPERATIONS - Serialization, File I/O
# ============================================================================

def export_student_report(student_id):
    """
    File Operations: Creating files, Writing to files
    Serialization: JSON format
    """
    try:
        # Get student data
        student_query = 'SELECT * FROM students WHERE student_id = ?'
        student = db_manager.fetch_all(student_query, (student_id,))
        
        if not student:
            return None
        
        student = student[0]
        
        # Get attendance and performance
        attendance = analyze_attendance_numpy(student_id)
        performance = analyze_performance_pandas(student_id)
        
        # Create report dictionary
        report = {
            'student_info': student,
            'attendance_summary': attendance,
            'performance_summary': performance['summary'],
            'generated_at': datetime.now().isoformat()
        }
        
        # File operations: Create and write to file
        filename = f"reports/student_{student_id}_report.json"
        os.makedirs('reports', exist_ok=True)
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=4)
        
        return filename
    
    except Exception as e:
        print(f"Report generation error: {e}")
        return None

# ============================================================================
# FLASK ROUTES - REST API
# ============================================================================

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('.', path)

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register new user with exception handling"""
    try:
        data = request.json
        
        # Auto-add @bmsce.ac.in if not present
        email = data['email']
        if '@' not in email:
            email = email + '@bmsce.ac.in'
        
        # Hash password
        hashed_pw = hashlib.sha256(data['password'].encode()).hexdigest()
        
        # Create user
        user_query = 'INSERT INTO users (email, password, role) VALUES (?, ?, ?)'
        user_id = db_manager.execute_query(user_query, (email, hashed_pw, data['role']))
        
        if data['role'] == 'student':
            student_query = '''
                INSERT INTO students (user_id, name, roll_no, email, department, semester)
                VALUES (?, ?, ?, ?, ?, ?)
            '''
            db_manager.execute_query(
                student_query,
                (user_id, data['name'], data['roll_no'], email, data['department'], data['semester'])
            )
        else:
            teacher_query = '''
                INSERT INTO teachers (user_id, name, email, department)
                VALUES (?, ?, ?, ?)
            '''
            teacher_id = db_manager.execute_query(
                teacher_query,
                (user_id, data['name'], email, data['department'])
            )
            
            # Create Advanced Python Programming subject
            subject_query = '''
                INSERT INTO subjects (subject_code, subject_name, teacher_id, department, semester, credits, total_hours)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            '''
            db_manager.execute_query(
                subject_query,
                ('23IS5PWAPP', 'Advanced Python Programming', teacher_id, data['department'], 5, 2, 48)
            )
        
        return jsonify({'message': 'Registration successful'}), 200
    
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email or roll number already exists'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login with session management"""
    try:
        data = request.json
        email = data['email']
        
        if '@' not in email:
            email = email + '@bmsce.ac.in'
        
        hashed_pw = hashlib.sha256(data['password'].encode()).hexdigest()
        
        user_query = 'SELECT * FROM users WHERE email = ? AND password = ?'
        users = db_manager.fetch_all(user_query, (email, hashed_pw))
        
        if not users:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        user = users[0]
        
        if user['role'] == 'student':
            student_query = 'SELECT * FROM students WHERE user_id = ?'
            student = db_manager.fetch_all(student_query, (user['user_id'],))[0]
            user.update(student)
        else:
            teacher_query = 'SELECT * FROM teachers WHERE user_id = ?'
            teacher = db_manager.fetch_all(teacher_query, (user['user_id'],))[0]
            user.update(teacher)
        
        session['user_id'] = user['user_id']
        session['role'] = user['role']
        
        return jsonify({'user': user}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/students', methods=['GET'])
def get_students():
    """Get all registered students"""
    query = 'SELECT * FROM students ORDER BY roll_no'
    students = db_manager.fetch_all(query)
    return jsonify(students)

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    """Get all subjects"""
    query = 'SELECT * FROM subjects'
    subjects = db_manager.fetch_all(query)
    return jsonify(subjects)

@app.route('/api/attendance/mark', methods=['POST'])
def mark_attendance():
    """Mark attendance for multiple students"""
    try:
        data = request.json
        
        for student_id in data['student_ids']:
            query = '''
                INSERT INTO attendance (student_id, subject_id, date, status)
                VALUES (?, ?, ?, ?)
            '''
            db_manager.execute_query(
                query,
                (student_id, data['subject_id'], data['date'], data['status'])
            )
        
        return jsonify({'message': 'Attendance marked successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/performance/add', methods=['POST'])
def add_performance():
    """Add performance record"""
    try:
        data = request.json
        
        query = '''
            INSERT INTO performance (student_id, subject_id, assessment_type, marks_obtained, total_marks, date)
            VALUES (?, ?, ?, ?, ?, ?)
        '''
        db_manager.execute_query(
            query,
            (data['student_id'], data['subject_id'], data['assessment_type'],
             data['marks_obtained'], data['total_marks'], data['date'])
        )
        
        return jsonify({'message': 'Performance added successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/student/<int:student_id>', methods=['GET'])
def student_dashboard(student_id):
    """
    Student dashboard with NumPy and Pandas analysis
    """
    try:
        # Use NumPy for attendance analysis
        attendance_data = analyze_attendance_numpy(student_id)
        
        # Use Pandas for performance analysis
        performance_data = analyze_performance_pandas(student_id)
        
        # Get attendance records for display
        att_query = '''
            SELECT a.*, s.subject_name, s.subject_code
            FROM attendance a
            JOIN subjects s ON a.subject_id = s.subject_id
            WHERE a.student_id = ?
            ORDER BY a.date DESC
        '''
        attendance_records = db_manager.fetch_all(att_query, (student_id,))
        
        return jsonify({
            'attendance': {
                'summary': attendance_data,
                'records': attendance_records
            },
            'performance': performance_data
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/teacher/analytics', methods=['GET'])
def teacher_analytics():
    """Teacher dashboard with class analytics using Pandas"""
    try:
        analytics = get_class_analytics_pandas()
        return jsonify(analytics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/report/student/<int:student_id>', methods=['GET'])
def generate_student_report(student_id):
    """Generate and download student report (File Operations)"""
    try:
        filename = export_student_report(student_id)
        if filename:
            return jsonify({'message': 'Report generated', 'filename': filename}), 200
        return jsonify({'error': 'Failed to generate report'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# MAIN - APPLICATION ENTRY POINT
# ============================================================================

if __name__ == '__main__':
    print("\n" + "="*80)
    print("🎓 ADVANCED PYTHON PROGRAMMING - ATTENDANCE & PERFORMANCE SYSTEM")
    print("="*80)
    print("\n📚 Demonstrating ALL Syllabus Concepts:")
    print("   CYCLE 1: OOP, Files, Database, Exception Handling")
    print("   CYCLE 2: NumPy, Pandas, Data Analysis")
    print("\n" + "="*80)
    
    # Remove old database for fresh start
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("✓ Removed old database")
    
    # Initialize database
    init_database()
    
    print("\n✓ Server starting on http://localhost:5000")
    print("="*80 + "\n")
    
    app.run(debug=True, port=5000, host='0.0.0.0')