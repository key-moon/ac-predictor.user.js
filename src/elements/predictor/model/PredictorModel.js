import { Task } from "../../../libs/contest/task";

export class PredictorModel {
    /**
     * @param {PredictorModel} [model]
     */
    constructor(model) {
        this.enabled = model.enabled;
        this.contest = model.contest;
        this.history = model.history;
        this.updateInformation(model.information);
        this.updateData(model.rankValue, model.perfValue, model.rateValue);
        this.updateTasks(model.tasks);
    }

    /**
     * @param {boolean} state
     */
    setEnable(state) {
        this.enabled = state;
    }

    /**
     * @param {string} information
     */
    updateInformation(information) {
        this.information = information;
    }

    /**
     * @param {number} rankValue
     * @param {number} perfValue
     * @param {number} rateValue
     */
    updateData(rankValue, perfValue, rateValue) {
        this.rankValue = rankValue;
        this.perfValue = perfValue;
        this.rateValue = rateValue;
    }

    /**
     * @param {Task} tasks
     */
    updateTasks(tasks) {
        this.tasks = tasks;
    }
}
