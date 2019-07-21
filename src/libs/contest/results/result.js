export class Result {
    /***
     * @param {boolean} isRated
     * @param {boolean} isSubmitted
     * @param {string} userScreenName
     * @param {number} performance
     * @param {number} place
     * @param {number} ratedRank
     * @param {number} competitions
     * @param {number} innerPerformance
     * @param {number} oldRating
     * @param {number} newRating
     * @param {number} totalScore
     * @param {number} elapsed
     * @param {number} penalty
     */
    constructor(
        isRated,
        isSubmitted,
        userScreenName,
        place,
        ratedRank,
        oldRating,
        newRating,
        competitions,
        performance,
        innerPerformance,
        totalScore,
        elapsed,
        penalty
    ) {
        this.IsRated = isRated;
        this.IsSubmitted = isSubmitted;
        this.UserScreenName = userScreenName;
        this.Place = place;
        this.RatedRank = ratedRank;
        this.OldRating = oldRating;
        this.NewRating = newRating;
        this.Competitions = competitions;
        this.Performance = performance;
        this.InnerPerformance = innerPerformance;
        this.TotalScore = totalScore;
        this.Elapsed = elapsed;
        this.Penalty = penalty;
    }
}
