class TaskList {

    constructor(name, taskList) {
        this.name = name;
        this.sortby = taskList.sortby ? taskList.sortby : SortBy.RECORDS_ASC.value();
        this.tasks = Array.isArray(taskList.tasks) ? taskList.tasks : [];
    }

    addTask(task) {
        // if (!(task instanceof Task)) {
        //     throw new Error('Unsupported task object. Use Task.')
        // }

        if (!task.id) {
            console.log('Task with empty id could not be used, not added to list');
        }

        this.tasks.push(task);
    }

    removeTaskById(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
    }

    filter(text) {
        return this.tasks.filter(task => task.text && task.text.includes(text));
    }

    sort(value) {
        let sort = SortBy.parse(value);

        if (sort == null) {
            console.warn('Sort value "' + value + '" is not supported');
            return;
        }

        this.sortby = value;
        this.tasks.sort(sort.comparator());
    }

    // TODO complete and reopen shouldn't be here, better to use them in particualar lists (Open, Completed)

    completeTask(id) {
        let task = this.pullTaskFromList(id);
        task.dueDate = new Date();
        task.status = 'completed';
        return task;
    }

    reopenTask(id) {
        let task = this.pullTaskFromList(id);
        task.dueDate = null;
        task.status = 'open';
        return task;
    }

    pullTaskFromList(id) {

        for (let i = 0; i < this.tasks.length; i++) {
            let task = this.tasks[i];
            if (parseInt(task.id) === parseInt(id)) {    // TODO JSON.stringify problem
                this.tasks.splice(i, 1);
                return task;
            }
        }

        return new Task();
    }

    clear() {
        this.tasks = [];
    }
}

// TODO Make available sorts getter
class OpenTasks extends TaskList {
    constructor(taskList) {
        super('Open', taskList);
        this.availableSorts = SortBy.getSorts(['text', 'creationDate']);
    }

    // TODO complete method
}

class CompletedTasks extends TaskList {
    constructor(taskList) {
        super('Done', taskList);
        this.availableSorts = SortBy.getSorts(['text', 'dueDate']);
    }

    // TODO reopen method
}

// Deserialize correctly
class Task {

    constructor(text, id) {
        this.id = id;
        this.text = text;
        this.status = 'open';
        this.date = new Date();
    }

    // TODO methods should be here
    /*
    reopen() {
        this.dueDate = null;
        this.status = 'open';
    }

    complete() {
        this.dueDate = new Date();
        this.status = 'completed';
    }
    */
}

class ToDoState {

    get storageKey() {
        return 'todoList';
    }

    save() {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this));
    }

    // TODO use dateTimeReviver, also deserialize tasks
    restore() {
        let state;
        let stateJson = window.localStorage.getItem(this.storageKey);
        if (stateJson) {
            state = JSON.parse(stateJson);
        } else {
            state = {
                openTasks : [],
                completedTasks : [],
                nextTaskId : 1,
                searchTerm : ''
            };
        }

        this.openTasks = new OpenTasks(state.openTasks);
        this.completedTasks = new CompletedTasks(state.completedTasks);
        this.taskIdGenerator = nextTaskIdGenerator(state.nextTaskId);

        this.openTasks.tasks.forEach((task) => convertDates(task));
        this.completedTasks.tasks.forEach((task) => convertDates(task));
        this.searchTerm = state.searchTerm ? state.searchTerm : '';

        function convertDates(task) {
            task.date = convertDate(task.date);
            task.dueDate = convertDate(task.dueDate);
        }

        function convertDate(textDate) {
            if (typeof textDate === 'string') {
                return new Date(textDate);
            }
        }
    }

    createTask(text) {
        this.nextTaskId = this.taskIdGenerator.next().value;
        return new Task(text, this.nextTaskId);
    }
}

function* nextTaskIdGenerator(startIndex) {

    let offset;
    if (typeof startIndex === 'number' && startIndex >= 0) {
        offset = startIndex;
    } else {
        offset = 0;
    }

    let id = 0;
    while(true) {
        yield offset + id++;
    }
}

class SortByItem {

    constructor(field, order) {
        this.field = field;
        this.order = order;
    }

    text() {
        return `${this.field} (${this.order})`;
    }

    /** To be used as unique sort value in a sort options. */
    value() {
        return `${this.field}_${this.order}`;
    }
}

function compare(a, b, order) {
    let result;
    if (a < b) {
        result = -1;
    } else if (b > a) {
        result = 1;
    } else {
        result = 0;
    }

    if (order === 'desc') {
        return -result;
    }

    return result;
}

// TODO replace with partial arguments?

class TitleSort extends SortByItem {
    constructor(order) {
        super('text', order);
    }

    text() {
        return `Records (${this.order})`;
    }

    comparator() {
        let order = this.order;
        return function(task1, task2) {
            let text1 = task1.text.toUpperCase();
            let text2 = task2.text.toUpperCase();

            return compare(text1, text2, order);
        }
    }
}

class DueDateSort extends SortByItem {
    constructor(order) {
        super('dueDate', order);
    }

    text() {
        return `Due date (${this.order})`;
    }

    comparator() {
        let order = this.order;
        return function(task1, task2) {
            let a = task1.dueDate;
            let b = task2.dueDate;

            return compare(a, b, order);
        }
    }
}

class CreationDateSort extends SortByItem {
    constructor(order) {
        super('creationDate', order);
    }

    text() {
        return `Creation date (${this.order})`;
    }

    comparator() {
        let order = this.order;
        return function(task1, task2) {
            let a = task1.date;
            let b = task2.date;

            return compare(a, b, order);
        }
    }
}

const SortBy = {
    RECORDS_ASC: new TitleSort('asc'),
    RECORDS_DESC: new TitleSort('desc'),
    CREATION_DATE_ASC: new DueDateSort('asc'),
    CREATION_DATE_DESC: new DueDateSort('desc'),
    DUE_DATE_ASC: new CreationDateSort('asc'),
    DUE_DATE_DESC: new CreationDateSort('desc'),

    // TODO reduce
    getSorts : function(fields) {
        let result = [];
        // TODO replace to map/reduce
        for(let key in SortBy) {
            let sort = SortBy[key];
            if (fields.indexOf(sort.field) > -1) {
                result.push(sort);
            }
        }
        return result;
    },

    parse: function(value) {
        // TODO replace to filter
        for(let key in SortBy) {
            let sort = SortBy[key];
            if (sort.value() === value) {
                return sort;
            }
        }
        return null;
    }
};

// TODO module.exports vs export (node 12/13 compatibility)

/*
module.exports = {
    TaskList: TaskList,
    Task: Task,
    SortBy: SortBy,
    ToDoState: ToDoState
};
*/

export {TaskList, Task, CompletedTasks, OpenTasks, ToDoState}
