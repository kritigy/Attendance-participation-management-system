from flask import Blueprint, render_template, request, redirect, url_for

tasks_bp = Blueprint('tasks', __name__)

tasks = []

# Home page: Add task
@tasks_bp.route('/', methods=['GET', 'POST'])
def home():
    if request.method == 'POST':
        task = request.form.get('task')
        if task:
            tasks.append({"id": len(tasks)+1, "task": task})
        return redirect(url_for('tasks.list_tasks'))
    return render_template('home.html')

# Task List page
@tasks_bp.route('/list')
def list_tasks():
    return render_template('tasks.html', tasks=tasks)

# Edit task page
@tasks_bp.route('/edit/<int:task_id>', methods=['GET', 'POST'])
def edit(task_id):
    task_to_edit = next((t for t in tasks if t["id"] == task_id), None)
    if not task_to_edit:
        return redirect(url_for('tasks.list_tasks'))

    if request.method == 'POST':
        new_task = request.form.get('task')
        if new_task:
            task_to_edit["task"] = new_task
        return redirect(url_for('tasks.list_tasks'))

    return render_template('edit.html', task=task_to_edit)

# Delete task
@tasks_bp.route('/delete/<int:task_id>')
def delete(task_id):
    global tasks
    tasks = [t for t in tasks if t["id"] != task_id]
    # Reassign IDs
    for index, task in enumerate(tasks):
        task["id"] = index + 1
    return redirect(url_for('tasks.list_tasks'))
