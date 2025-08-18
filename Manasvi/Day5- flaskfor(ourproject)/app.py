from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__, static_folder="client", static_url_path="")
CORS(app)
SESSIONS = {}

def gen_code(n=6):
    import random, string
    return "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(n))

@app.get("/")
def ui():
    return app.send_static_file("index.html")

@app.get("/api/health")
def health():
    return jsonify(ok=True, service="attendance-mvp (flask)")

@app.post("/api/sessions")
def create_session():
    data = request.get_json(silent=True) or {}
    code = gen_code()
    SESSIONS[code] = {
        "class_name": data.get("class_name", "Untitled"),
        "status": "OPEN",
        "gps_check": bool(data.get("gps_check", False)),
        "face_check": bool(data.get("face_check", False)),
        "attendees": set(),
        "poll": None,
        "responses": {}
    }
    return jsonify(code=code), 201

@app.get("/api/sessions/<code>")
def get_session(code):
    s = SESSIONS.get(code)
    if not s:
        return jsonify(error="not found"), 404
    return jsonify(
        class_name=s["class_name"],
        status=s["status"],
        gps_check=s["gps_check"],
        face_check=s["face_check"],
        attendee_count=len(s["attendees"]),
        poll=s["poll"],
        responses_count=len(s["responses"])
    )

@app.post("/api/sessions/<code>/join")
def join_session(code):
    s = SESSIONS.get(code)
    if not s:
        return jsonify(error="not found"), 404
    if s["status"] == "CLOSED":
        return jsonify(error="session closed"), 400
    data = request.get_json(silent=True) or {}
    sid = data.get("student_id")
    if not sid:
        return jsonify(error="student_id required"), 400
    s["attendees"].add(sid)
    return jsonify(present=True)

@app.post("/api/sessions/<code>/poll")
def create_poll(code):
    s = SESSIONS.get(code)
    if not s:
        return jsonify(error="not found"), 404
    data = request.get_json(silent=True) or {}
    question = data.get("question")
    options = data.get("options")
    correct_index = data.get("correct_index", None)
    if not question or not options or not isinstance(options, list) or len(options) < 2:
        return jsonify(error="question and options[] (>=2) required"), 400
    s["poll"] = {"question": question, "options": options, "correct_index": correct_index}
    s["responses"] = {}
    s["status"] = "QUIZ"
    return jsonify(ok=True)

@app.post("/api/sessions/<code>/responses")
def submit_response(code):
    s = SESSIONS.get(code)
    if not s:
        return jsonify(error="not found"), 404
    if s["status"] not in ("OPEN", "QUIZ"):
        return jsonify(error="not accepting responses"), 400
    data = request.get_json(silent=True) or {}
    sid = data.get("student_id")
    idx = data.get("option_index")
    if sid is None or idx is None:
        return jsonify(error="student_id and option_index required"), 400
    s["responses"][sid] = idx
    return jsonify(saved=True)

@app.post("/api/sessions/<code>/end")
def end_session(code):
    s = SESSIONS.get(code)
    if not s:
        return jsonify(error="not found"), 404
    s["status"] = "CLOSED"
    return jsonify(status="CLOSED")

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
