import { Results } from "./results";

export class FixedResults extends Results {
    /**
     * @param {Result[]} results
     */
    constructor(results) {
        super();
        this.resultsDic = {};
        results.forEach(result => {
            this.resultsDic[result.UserScreenName] = result;
        });
    }
    /**
     * @param {string} userScreenName
     * @return {Result}
     */
    getUserResult(userScreenName) {
        return this.resultsDic[userScreenName] || null;
    }
    /**
     * @param {number} totalScore
     * @param {number} elapsed
     * @return {number}
     */
    getInsertedRatedRank(totalScore, elapsed) {
        let ratedRank = 1;
        const resultsArray = Object.values(this.resultsDic);
        for (const result of resultsArray) {
            if ((result.TotalScore === totalScore && result.Elapsed >= elapsed) || (result.TotalScore < totalScore)) {
                return ratedRank;
            }
            if (result.IsRated) ratedRank++;
        }
    }
}
