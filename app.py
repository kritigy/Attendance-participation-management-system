from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Mobile Attendance System API")

# ---------- MODELS ----------
class Student(BaseModel):
    id: str
    name: str
    email: str

class Teacher(BaseModel):
    id: str
    name: str
    email: str

class Attendance(BaseModel):
    student_id: str
    subject: str
    status: str  # present / absent


# ---------- SAMPLE IN-MEMORY DATABASE ----------
students_db: List[Student] = []
teachers_db: List[Teacher] = []
attendance_db: List[Attendance] = []


# ---------- ROUTES ----------

@app.get("/", response_class=HTMLResponse)
def home():
    return """
    <html>
        <head>
            <title>Mobile Attendance System</title>
        </head>
        <body style="font-family: Arial; text-align: center; margin-top: 50px;">
            <h1>📚 Mobile Attendance System</h1>
            <p>Welcome to the prototype Attendance System built with <b>FastAPI</b> 🚀</p>
            <h3>Available Features:</h3>
            <ul style="list-style: none;">
                <li>✅ Add Students</li>
                <li>✅ Add Teachers</li>
                <li>✅ Mark Attendance</li>
                <li>✅ View Attendance Records</li>
            </ul>
            <p>👉 Go to <a href='/docs'>API Docs</a> to try it out.</p>
        </body>
    </html>
    """


# ----- STUDENTS -----
@app.post("/students/")
def add_student(student: Student):
    students_db.append(student)
    return {"message": "Student added successfully ✅", "student": student}

@app.get("/students/")
def list_students():
    return {"students": students_db}


# ----- TEACHERS -----
@app.post("/teachers/")
def add_teacher(teacher: Teacher):
    teachers_db.append(teacher)
    return {"message": "Teacher added successfully ✅", "teacher": teacher}

@app.get("/teachers/")
def list_teachers():
    return {"teachers": teachers_db}


# ----- ATTENDANCE -----
@app.post("/attendance/mark")
def mark_attendance(record: Attendance):
    attendance_db.append(record)
    return {"message": "Attendance marked successfully 📌", "attendance": record}

@app.get("/attendance/")
def get_attendance():
    return {"attendance_records": attendance_db}
