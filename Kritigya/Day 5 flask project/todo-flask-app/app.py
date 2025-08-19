from flask import Flask
from routes.tasks import tasks_bp

app = Flask(__name__)

app.register_blueprint(tasks_bp, url_prefix='/')  # '/' makes home page accessible

if __name__ == '__main__':
    app.run(debug=True)
