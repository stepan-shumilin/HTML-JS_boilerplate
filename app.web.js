// TODO require vs import
//let todoApp = require('./app.js');
import * as todoApp from './app.js';

let appController;

window.onload = function() {

    let appState = new todoApp.ToDoState();
    appState.restore();

    // Tests
    // appState.openTasks.addTask(appState.createTask('1'));
    // appState.openTasks.addTask(appState.createTask('2'));
    // appState.openTasks.addTask(appState.createTask('3'));

    appController = new TodoController(appState);
    appController.startApp();

//    appState.save();
};

/**
 * Something like controller in MVC or Presenter in MVP
 */
class TodoController {

    constructor(state) {
        this.state = state;
    }

    startApp() {
        this.initControls();
        this.bindListeners();

        this.setOpenTasks();
        this.setDoneTasks();

        this.restoreControls();

        this.filterTasks();
    }

    setOpenTasks() {
        let taskList = this.state.openTasks;
        this.setSortList(this.openListSort, taskList.availableSorts);

        this.refresh(taskList.tasks, this.openTasks);
    }

    setDoneTasks() {
        let taskList = this.state.completedTasks;
        this.setSortList(this.doneListSort, taskList.availableSorts);

        this.refresh(taskList.tasks, this.doneTasks);
    }

    setSortList(selectElement, values) {
        values.forEach((sortBy) => {
           let option = document.createElement('option');
           option.value = sortBy.value();
           option.innerHTML = sortBy.text();

           selectElement.appendChild(option);
        });
    }

    restoreControls() {
        this.searchTasks.value = this.state.searchTerm;

        this.openListSort.value = this.state.openTasks.sortby;
        this.doneListSort.value = this.state.completedTasks.sortby;
    }

    refresh(tasks, container) {
        this.cleanTasksContainer(container);
        tasks.forEach((task) => this.insertTaskIntoElement(task, container));
    }

    cleanTasksContainer(container) {
        container.querySelectorAll('.task-box').forEach((item) => item.remove());
    }

    initControls() {
        this.searchTasks = document.getElementById('searchTasks');
        this.btnSearchTasks = document.getElementById('btnSearchTasks');

        this.newTask = document.getElementById('newTask');
        this.btnAddTask = document.getElementById('btnAddTask');

        this.clearOpenLink = document.getElementById('clearOpen');
        this.clearDoneLink = document.getElementById('clearDone');

        this.openTasks = document.getElementById('taskListOpen');
        this.doneTasks = document.getElementById('taskListDone');

        //initialization of markup (initial)
        //this.checkBoxes = document.getElementsByClassName('status');
        //this.tasks = document.getElementsByClassName('task-box');
        //this.removeLinks = document.getElementsByClassName('fa-trash');

        this.openListSort = document.getElementById('openListSort');
        this.doneListSort = document.getElementById('doneListSort');

        this.openListEmpty = document.getElementById('openListEmpty');
        this.doneListEmpty = document.getElementById('doneListEmpty');
    }

/*
    {
        name :
        emptyLink :
        sortSelect:
        hasDueDate: true|false
    }
*/

    bindListeners() {
        this.searchTasks.addEventListener('keyup', (event) => {
            if (isEnterPressed(event)) {
                this.filterTasks();
            }
        });

        this.btnSearchTasks.addEventListener('click', () => this.filterTasks());

        this.btnAddTask.addEventListener('click', () =>  appController.addTask());
        this.newTask.addEventListener('keyup', onAddTask);

        this.clearOpenLink.addEventListener('click', () => appController.clearOpen());
        this.clearDoneLink.addEventListener('click', () => appController.clearDone());

        this.openListSort.addEventListener('change', (event) => appController.sortOpen(event.target.value));
        this.doneListSort.addEventListener('change', (event) => appController.sortDone(event.target.value));

        document.querySelector('.search-result > a.button').addEventListener('click', () => appController.clearFilter());
    }

    filterTasks() {
        let text = this.searchTasks.value;

        if (text.length === 0) {
            if (this.state.searchTerm) {
                this.clearFilter();
            } else {
                console.log('Search is empty, skipping');
            }
            return;
        }

        let searchResult = document.querySelector('.search-result');
        if (text) {
            searchResult.querySelector('span').innerHTML = `Search tasks by "${text}"`;
            showNode(searchResult);
        } else {
            hideNode(searchResult);
        }

        this.state.searchTerm = text;

        if (this.filterTaskList(text, this.state.openTasks, this.openTasks)) {
            this.openListSort.disabled = '';
        } else {
            this.openListSort.disabled = 'disabled';
        }

        if (this.filterTaskList(text, this.state.completedTasks, this.doneTasks)) {
            this.doneListSort.disabled = '';
        } else {
            this.doneListSort.disabled = 'disabled';
        }

        this.state.save();
    }

    clearFilter() {
        this.searchTasks.value = '';
        this.state.searchTerm = '';
        this.state.save();

        hideNode('.search-result');
        hideNode('.search-tasks-count');

        this.refresh(this.state.openTasks.tasks, this.openTasks);
        this.refresh(this.state.completedTasks.tasks, this.doneTasks);

        this.openListSort.disabled = '';
        this.doneListSort.disabled = '';
    }

    filterTaskList(text, taskList, parentElement) {

        let filteredTasks = taskList.filter(text);
        this.refresh(filteredTasks, parentElement);

        let filterResults = parentElement.querySelector('.search-tasks-count');
        filterResults.innerHTML = `Found ${filteredTasks.length} tasks`;

        showNode(filterResults);

        return filteredTasks.length !== 0;
    }

    addTask() {
        let text = this.newTask.value;
        console.log('Add task "' + text + '"');

        this.newTask.value = '';

        let newTask = this.state.createTask(text);
        this.state.openTasks.addTask(newTask);
        this.state.save();

        this.insertTaskIntoElement(newTask, this.openTasks);

        this.activateOpenTaskList();
    }

    /*
     * ??? Some operation on document fragment looks strange, because they need to be in document DOM
     * In particular: adding listeners and working with attributes
     */
    insertTaskIntoElement(task, parentElement) {
        let template = document.getElementById('taskTemplate');
        let taskNode = template.content.cloneNode(true);

        taskNode.querySelector('.text').innerHTML = task.text;

        let creationDateNode = taskNode.querySelector('.time div');
        creationDateNode.innerHTML = this.formatTime(task.date);
        creationDateNode.setAttribute('title', this.formatTime(task.date, true));

        if (task.status === 'completed') {
            let completedTimeNode = taskNode.querySelector('.time div.complete-time');
            completedTimeNode.innerHTML = this.formatTime(task.dueDate);
            showNode(completedTimeNode);

            taskNode.querySelector('input.status').checked = 'checked';
        }

        let insertBefore = this.findInsertBeforeNode(parentElement);
        parentElement.insertBefore(taskNode, insertBefore);

        let addedTaskNode = parentElement.querySelector('.task-box');
        addedTaskNode.setAttribute('data-taskId', task.id);

        this.addTaskListeners(addedTaskNode);
    }

    // TODO replace with classList api

    activateOpenTaskList() {
        this.clearOpenLink.parentElement.style.display = '';
        this.openListSort.style.display = '';
        this.openListEmpty.style.display = 'none';
    }

    deactivateOpenTaskList() {
        this.clearOpenLink.parentElement.style.display = 'none';
        this.openListSort.style.display = 'none';
        this.openListEmpty.style.display = 'block';
    }

    activateDoneTaskList() {
        this.clearDoneLink.parentElement.style.display = '';
        this.doneListSort.style.display = '';
        this.doneListEmpty.style.display = 'none';
    }

    deactivateDoneTaskList() {
        this.clearDoneLink.parentElement.style.display = 'none';
        this.doneListSort.style.display = 'none';
        this.doneListEmpty.style.display = 'block';
    }

    addTaskListeners(taskNode) {

        taskNode.addEventListener('mouseenter', onMouseEnter);
        taskNode.addEventListener('mouseleave', onMouseLeave);

        let textNode = taskNode.querySelector('span.text');
        if (textNode) {
            textNode.addEventListener('dblclick', onTaskDoubleClick);
        }

         taskNode.querySelector('.status').addEventListener('click', onChangeStatus);
         taskNode.querySelector('.fa-trash').addEventListener('click', onRemoveTask);
    }

    // TODO Generify clear open/done
    clearOpen() {
        if (window.confirm('Clear Open list?')) {
            console.log('Clear Open list');

            this.cleanTasksContainer(this.openTasks);
            this.deactivateOpenTaskList();

            this.state.openTasks.clear();
            this.state.save();
        }
    }

    clearDone() {
        if (window.confirm('Clear Done list?')) {
            console.log('Clear Done list');

            this.cleanTasksContainer(this.doneTasks);
            this.deactivateDoneTaskList();

            this.state.completedTasks.clear();
            this.state.save();
        }
    }

    // TODO Generify sort open/done
    sortOpen(sort) {
        console.log('Sort Open by "' + sort + '"');

        this.state.openTasks.sort(sort);
        this.state.save();

        let taskList = this.state.openTasks;  // should use filtered list
        this.refresh(taskList.tasks, this.openTasks);
    }

    sortDone(sort) {
        console.log('Sort Done by "' + sort + '"');

        this.state.completedTasks.sort(sort);
        this.state.save();

        let taskList = this.state.completedTasks;
        this.refresh(taskList.tasks, this.doneTasks);
    }

    createInput(event) {

        let spanText = event.target;
        let container = spanText.parentElement;
        let text = spanText.innerText;

        let input = document.createElement('input');
        input.value = text;

        input.setAttribute('oldValue', text);

        input.addEventListener('keyup', onTaskUpdate);
        input.addEventListener('blur', () => onEscape(input));

        // replaces div with input
        spanText.remove();
        container.appendChild(input);

        input.focus();
    }

    findInsertBeforeNode(parentElement) {
        let taskNodes = parentElement.querySelectorAll('.task-box');
        if (taskNodes.length > 0) {
            return taskNodes[0];
        }

        return parentElement.querySelector('.clear-task-list');
    }

    formatTime(date, seconds) {
        if (date instanceof Date) {

            let timeFormat = {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };

            if (seconds) {
                timeFormat['second'] = '2-digit';
            }

            return date.toLocaleString('en-US', timeFormat);
        }

        return "";
    }

    completeTask(id, dueDateNode) {
        let completedTask = this.state.openTasks.completeTask(id);
        this.state.completedTasks.addTask(completedTask);

        dueDateNode.innerHTML = this.formatTime(completedTask.dueDate);
        dueDateNode.setAttribute('title', this.formatTime(completedTask.dueDate, true));

        this.state.save();
    }

    reopenTask(id) {
        let reopenedTask = this.state.completedTasks.reopenTask(id);
        this.state.openTasks.addTask(reopenedTask);

        this.state.save();
    }
}

function hideNode(node) {
    if (typeof node === 'string') {
        document.querySelectorAll(node).forEach((node) => node.classList.add('none'));
    } else {
        node.classList.add('none');
    }
}

function showNode(node) {
    if (typeof node === 'string') {
        document.querySelectorAll(node).forEach((node) => node.classList.remove('none'));
    } else {
        node.classList.remove('none');
    }
}

function isEnterPressed(event) {
    return event.key === 'Enter';
}

function onTaskDoubleClick(event) {
    console.log('Edit event "' + event.target + '"');

    appController.createInput(event);
}

function onRemoveTask(event) {
    if (window.confirm('Remove task?')) {
        console.log('Remove task "' + event.target + '"');

        let taskNode = event.target.parentElement.parentElement;
        taskNode.remove();

        if (appController.openTasks.querySelectorAll('.task-box').length === 0) {
            appController.deactivateOpenTaskList();
        }

        if (appController.doneTasks.querySelectorAll('.task-box').length === 0) {
            appController.deactivateDoneTaskList();
        }
    }
}

function onMouseEnter(event) {
    // console.log('Show remove icon for "' + event.target + '"');

    let taskBox = event.target;
    taskBox.querySelector('.thrash').style.display = 'block';
}

function onMouseLeave(event) {
    // console.log('Hide remove icon for "' + event.target + '"');

    let taskBox = event.target;
    taskBox.querySelector('.thrash').style.display = 'none';
}

function onChangeStatus(event) {
    let checkbox = event.target;
    console.log('Change status for "' + checkbox + '"');

    let done = checkbox.checked;
    let taskNode = checkbox.parentElement;

    let taskId = taskNode.getAttribute('data-taskid');
    if (done) {
        let insertBefore = appController.findInsertBeforeNode(appController.doneTasks);
        appController.doneTasks.insertBefore(taskNode, insertBefore);

        let completeTimeNode = taskNode.querySelector('.complete-time');

        appController.completeTask(taskId, completeTimeNode);

        completeTimeNode.classList.remove('none');

    } else {
        let insertBefore = appController.findInsertBeforeNode(appController.openTasks);
        appController.openTasks.insertBefore(taskNode, insertBefore);

        appController.reopenTask(taskId);

        taskNode.querySelector('.complete-time').classList.add('none');
    }

    // activate / deactivate

    //let taskId = event.target.parentElement.dataset.taskId;
}

function onAddTask(event) {
    if (event.key === 'Enter') {
        appController.addTask();
    }
}

function onTaskUpdate(event) {
    let input = event.target;

    if (event.key === 'Enter') {

        let container = input.parentElement;
        container.innerHTML = '';

        let span = document.createElement('span');
        span.textContent = input.value;
        span.classList.add('text');

        span.addEventListener('dblclick', (event) => appController.createInput(event));
        container.appendChild(span);

    } else if (event.code === 'Escape') {
        onEscape(input);
    }
}

function onEscape(input) {

    let container = input.parentElement;
    container.innerHTML = '';

    let span = document.createElement('span');
    span.textContent = input.attributes['oldValue'].textContent;
    span.classList.add('text');

    span.addEventListener('dblclick', (event) => appController.createInput(event));

    container.appendChild(span);
}
