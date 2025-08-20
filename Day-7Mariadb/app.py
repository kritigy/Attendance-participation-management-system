from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os, json
import mysql.connector
from mysql.connector import pooling

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3300")),
    "user": os.getenv("DB_USER", "app_user"),
    "password": os.getenv("DB_PASS", ""),
    "database": os.getenv("DB_NAME", "bootcamp_logs"),
}

# Small connection pool for performance
cnxpool = pooling.MySQLConnectionPool(pool_name="bootcamp_pool", pool_size=5, **DB_CONFIG)

app = Flask(__name__)

def run_query(sql, params=None, fetch=False, many=False):
    conn = cnxpool.get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        if many:
            cur.executemany(sql, params or [])
        else:
            cur.execute(sql, params or ())
        if fetch:
            rows = cur.fetchall()
            cur.close(); conn.close()
            return rows
        conn.commit()
        cur.close(); conn.close()
    except Exception as e:
        try: conn.rollback()
        except: pass
        raise e

@app.get("/health")
def health():
    return jsonify(run_query("SELECT 1 AS ok", fetch=True)[0])

@app.post("/users")
def create_user():
    data = request.get_json(force=True)
    username = data.get("username")
    display_name = data.get("display_name")
    if not username:
        return jsonify({"error":"username is required"}), 400
    run_query("INSERT INTO users (username, display_name) VALUES (%s,%s)", (username, display_name))
    return jsonify({"status":"ok","message":"user created"})

@app.post("/sessions")
def create_session():
    data = request.get_json(force=True)
    user_id = data.get("user_id")
    session_token = data.get("session_token")
    if not user_id or not session_token:
        return jsonify({"error":"user_id and session_token are required"}), 400
    run_query("INSERT INTO sessions (user_id, session_token) VALUES (%s,%s)", (user_id, session_token))
    return jsonify({"status":"ok","message":"session created"})

@app.post("/log")
def add_log():
    data = request.get_json(force=True)
    user_id = data.get("user_id")
    action_type = data.get("action_type")   # 'login','logout','message','reaction','upload'
    if not user_id or not action_type:
        return jsonify({"error":"user_id and action_type are required"}), 400

    session_id  = data.get("session_id")
    message     = data.get("message")
    emoji       = data.get("emoji")
    mood        = data.get("mood")          # 'chill','hustle','salty','emo','party'
    ip_address  = data.get("ip_address")
    device_info = data.get("device_info")
    metadata    = data.get("metadata")
    metadata_json = json.dumps(metadata) if isinstance(metadata, (dict, list)) else metadata

    run_query(
        """INSERT INTO user_logs
           (user_id, session_id, action_type, message, emoji, mood, ip_address, device_info, metadata)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (user_id, session_id, action_type, message, emoji, mood, ip_address, device_info, metadata_json)
    )
    return jsonify({"status":"ok","message":"log inserted"})

@app.get("/logs")
def list_logs():
    limit = int(request.args.get("limit", 20))
    rows = run_query(
        """SELECT ul.id, u.username, ul.session_id, ul.action_type, ul.message, ul.emoji,
                  ul.mood, ul.ip_address, ul.device_info, ul.metadata, ul.created_at
           FROM user_logs ul
           JOIN users u ON u.id = ul.user_id
           ORDER BY ul.created_at DESC
           LIMIT %s""",
        (limit,), fetch=True
    )
    return jsonify(rows)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
