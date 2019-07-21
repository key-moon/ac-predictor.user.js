import { Results } from "./results";

export class FixedResults extends Results {
    /**
     * @param {Result[]} results
     */
    constructor(results) {
        super();
        this.resultsDic = new Map();
        results.forEach(result => {
            this.resultsDic.set(result.UserScreenName, result);
        });
    }
    /**
     * @param {string} userScreenName
     * @return {Result}
     */
    getUserResult(userScreenName) {
        return this.resultsDic.get(userScreenName) || null;
    }
    /**
     * @param {number} totalScore
     * @param {number} elapsed
     * @return {number}
     */
    getInsertedRatedRank(totalScore, elapsed) {
        let ratedRank = 1;
        const resultsIterator = this.resultsDic.values();
        for (const result of resultsIterator) {
            if ((result.TotalScore === totalScore && result.Elapsed >= elapsed) || (result.TotalScore < totalScore)) {
                return ratedRank;
            }
            if (result.IsRated) ratedRank++;
        }
    }
}
