export class Task {
    /**
     * @param {string} assignment
     * @param {number} point
     * @param {string} taskScreenName
     */
    constructor(assignment, point, taskScreenName) {
        this.assignment = assignment;
        this.point = point;
        this.taskScreenName = taskScreenName;
    }
}