import * as $ from "jquery";
import dom from "./dom.html";
import moment from "moment";
import { SideMenuElement } from "atcoder-sidemenu";
import { PredictorDB } from "../../libs/database/predictorDB";
import { Contest } from "../../libs/contest/contest";
import { Task } from "../../libs/contest/task";
import { OnDemandResults } from "../../libs/contest/results/standingsResults";
import { FixedResults } from "../../libs/contest/results/fIxedResults";
import { Result } from "../../libs/contest/results/result";
import { PredictorModel } from "./model/PredictorModel";
import { CalcFromRankModel } from "./model/calcFromRankModel";
import { CalcFromPerfModel } from "./model/calcFromPerfModel";
import { CalcFromRateModel } from "./model/calcFromRateModel";
import { roundValue } from "../../libs/utils/roundValue";
import {
    getAPerfsData,
    getMyHistoryData,
    getPerformanceHistories,
    getResultsData,
    getStandingsData
} from "atcoder-userscript-libs/src/libs/data";
import {
    contestScreenName,
    startTime,
    getLS,
    setLS,
    userScreenName
} from "atcoder-userscript-libs/src/libs/global";
import { fetchContestInformation } from "atcoder-userscript-libs/src/libs/contestInformation";
import { getColor } from "atcoder-userscript-libs/src/libs/rating";

export let predictor = new SideMenuElement(
    "predictor",
    "Predictor",
    /atcoder.jp\/contests\/.+/,
    dom,
    afterAppend
);

const firstContestDate = moment("2016-07-16 21:00");
const predictorElements = [
    "predictor-input-rank",
    "predictor-input-perf",
    "predictor-input-rate",
    "predictor-current",
    "predictor-nextac-select",
    "predictor-nextac-button",
    "predictor-nextac-warning",
    "predictor-reload",
    "predictor-tweet"
];
const aPerfUpdatedTimeKey = "predictor-aperf-last-updated";
const updateDuration = 10 * 60 * 1000;

async function afterAppend() {
    const isStandingsPage = /standings([^/]*)?$/.test(document.location.href);
    const predictorDB = new PredictorDB();
    const contestInformation = await fetchContestInformation(contestScreenName);

    /** @type Results */
    let results;

    /** @type Contest */
    let contest;

    /** @type PredictorModel */
    let model = new PredictorModel({
        rankValue: 0,
        perfValue: 0,
        rateValue: 0,
        enabled: false,
        history: getPerformanceHistories(await getMyHistoryData())
    });

    $('[data-toggle="tooltip"]').tooltip();

    if (!shouldEnabledPredictor().verdict) {
        model.updateInformation(shouldEnabledPredictor().message);
        updateView();
        return;
    }

    try {
        await initPredictor();
    } catch (e) {
        model.updateInformation(e.message);
        model.setEnable(false);
        updateView();
    }

    subscribeEvents();

    function subscribeEvents() {
        $("#predictor-reload").click(async () => {
            model.updateInformation("読み込み中…");
            $("#predictor-reload").button("loading");
            updateView();
            await updateStandingsFromAPI();
            $("#predictor-reload").button("reset");
            updateView();
        });
        $("#predictor-current").click(function() {
            const myResult = contest.templateResults[userScreenName];
            if (!myResult) return;
            model = new CalcFromRankModel(model);
            model.updateData(
                myResult.RatedRank,
                model.perfValue,
                model.rateValue
            );
            updateView();
        });
        $("#predictor-nextac-button").click(async function() {
            $("#predictor-nextac-warning").alert("close");

            const myTaskResults = contest.standings.StandingsData.filter(x => x.UserScreenName === userScreenName)[0].TaskResults;
            const myACTaskScreenNames = Object.keys(myTaskResults).filter(taskScreenName => myTaskResults[taskScreenName].Status === 1);
            const myACTaskAssignments = myACTaskScreenNames.map(taskScreenName => {
                return model.tasks.filter(task => task.taskScreenName === taskScreenName)[0].assignment;
            });

            const nextTaskAssignment = $("#predictor-nextac-select option:selected").val();
            if (myACTaskAssignments.includes(nextTaskAssignment)) {
                const alertDom = `<div class="alert alert-warning col-xs-7" role="alert" id="predictor-nextac-warning" style="float: right; padding: 5.5px 12px; margin-bottom: 0px;"><button type="button" class="close" data-dismiss="alert" aria-label="閉じる"><span aria-hidden="true">×</span></button><span>この問題はAC済です</span></div>`;
                $("#predictor-current").after(alertDom);
                return;
            }

            const nextPoint = model.tasks.filter(x => x.assignment === nextTaskAssignment)[0].point;
            const myTotalScore = contest.templateResults[userScreenName].TotalScore;
            const myPenalty = contest.templateResults[userScreenName].Penalty;
            // This is bugged, waiting for the update of "atcoder-userscript-libs".
            // const contestPenalty = contestInformation.Penalty;
            const contestPenalty = await fetchContestPenalty(contestScreenName);
            const nextElapsed = moment().diff(moment(startTime)) * 1000000;
            const nextRank = getInsertedRatedRank(myTotalScore + nextPoint, nextElapsed + contestPenalty * myPenalty);
            model = new CalcFromRankModel(model);
            model.updateData(
                nextRank,
                model.perfValue,
                model.rateValue
            );
            updateView();

            function getInsertedRatedRank(totalScore, elapsed) {
                let ratedRank = 1;
                const resultsDic = results instanceof FixedResults ? results.resultsDic : results.templateResults;
                const resultsArray = Object.values(resultsDic);
                for (const result of resultsArray) {
                    if ((result.TotalScore === totalScore && result.Elapsed >= elapsed) || (result.TotalScore < totalScore)) {
                        return ratedRank;
                    }
                    if (result.IsRated) ratedRank++;
                }
            }
            async function fetchContestPenalty(contestScreenName) {
                return new Promise(async (resolve) => {
                    const topPageDom = await $.ajax(`https://atcoder.jp/contests/${contestScreenName}`).then(x => new DOMParser().parseFromString(x, "text/html"));
                    const dataParagraph = topPageDom.getElementsByClassName("small")[0];
                    const data = Array.from(dataParagraph.children).map(x => x.innerText.split(':')[1].trim());
                    resolve(parseDurationString(data[2]));
    
                    function parseDurationString(s) {
                        if (s === "None" || s === "なし") return 0;
                        if (!/(\d+[^\d]+)/.test(s)) return NaN;
                        const dic = {ヶ月: "month", 日: "day", 時間: "hour", 分: "minute", 秒: "second"};
                        let res = {};
                        s.match(/(\d+[^\d]+)/g).forEach(x => {
                            const trimmed = x.trim(' ','s');
                            const num = trimmed.match(/\d+/)[0];
                            const unit = trimmed.match(/[^\d]+/)[0];
                            const convertedUnit = dic[unit]||unit;
                            res[convertedUnit] = num;
                        });
                        return moment.duration(res).asMilliseconds();
                    }
                });
            }
        });
        $("#predictor-input-rank").keyup(function() {
            const inputString = $("#predictor-input-rank").val();
            if (!isFinite(inputString)) return;
            const inputNumber = parseInt(inputString);
            model = new CalcFromRankModel(model);
            model.updateData(inputNumber, 0, 0);
            updateView();
        });
        $("#predictor-input-perf").keyup(function() {
            const inputString = $("#predictor-input-perf").val();
            if (!isFinite(inputString)) return;
            const inputNumber = parseInt(inputString);
            model = new CalcFromPerfModel(model);
            model.updateData(0, inputNumber, 0);
            updateView();
        });
        $("#predictor-input-rate").keyup(function() {
            const inputString = $("#predictor-input-rate").val();
            if (!isFinite(inputString)) return;
            const inputNumber = parseInt(inputString);
            model = new CalcFromRateModel(model);
            model.updateData(0, 0, inputNumber);
            updateView();
        });
    }

    async function initPredictor() {
        let aPerfs;
        let standings;

        try {
            standings = await getStandingsData(contestScreenName);
        } catch (e) {
            throw new Error("順位表の取得に失敗しました。");
        }

        try {
            const lastUpdated = getLS(aPerfUpdatedTimeKey);
            const now = Date.now();
            aPerfs = await (standings.Fixed ||
            now - lastUpdated <= updateDuration
                ? getAPerfsFromLocalData().catch(() => getAPerfsFromAPI())
                : getAPerfsFromAPI().catch(() => getAPerfsFromLocalData()));
        } catch (e) {
            throw new Error("APerfの取得に失敗しました。");
        }

        async function getAPerfsFromAPI() {
            setLS(aPerfUpdatedTimeKey, Date.now());
            return await getAPerfsData(contestScreenName);
        }
        async function getAPerfsFromLocalData() {
            return await predictorDB.getData("APerfs", contestScreenName);
        }

        try {
            const tasks = await getContestTasks(contestScreenName);
            model.updateTasks(tasks);
            for (const task of tasks) {
                $("#predictor-nextac-select").append(`<option value="${task.assignment}">${task.assignment}問題</option>`)
            }
        } catch (e) {
            throw new Error("配点の取得に失敗しました。");
        }

        async function getContestTasks(contestScreenName) {
            const standingsTaskInfo = standings.TaskInfo;
            let tasks = [];
            for (const taskData of standingsTaskInfo) {
                tasks.push(new Task(
                    taskData.Assignment,
                    (await getTaskPoint(taskData.TaskScreenName)),
                    taskData.TaskScreenName
                ))
            }
            return tasks;

            async function getTaskPoint(taskScreenName) {
                const taskPageDom = await $.ajax(`https://atcoder.jp/contests/${contestScreenName}/tasks/${taskScreenName}`).then(x => new DOMParser().parseFromString(x, "text/html"));
                const point = parseInt($(taskPageDom).find("#task-statement").find("var").eq(0).text());
                if (!isNaN(point)) return point * 100;
                else throw new Error();
            }
        }

        await updateData(aPerfs, standings);
        model.setEnable(true);
        model.updateInformation(`最終更新 : ${moment().format("HH:mm:ss")}`);

        if (isStandingsPage) {
            $("thead > tr").append(
                '<th class="standings-result-th" style="width:84px;min-width:84px;">perf</th><th class="standings-result-th" style="width:168px;min-width:168px;">レート変化</th>'
            );
            new MutationObserver(addPerfToStandings).observe(
                document.getElementById("standings-tbody"),
                { childList: true }
            );
            new MutationObserver(async mutationRecord => {
                const isDisabled = mutationRecord[0].target.classList.contains(
                    "disabled"
                );
                if (isDisabled) {
                    await updateStandingsFromAPI();
                }
            }).observe(document.getElementById("refresh"), {
                attributes: true,
                attributeFilter: ["class"]
            });
        }
        updateView();
    }

    async function updateStandingsFromAPI() {
        try {
            const shouldEnabled = shouldEnabledPredictor();
            if (!shouldEnabled.verdict) throw new Error(shouldEnabled.message);
            const standings = await getStandingsData(contestScreenName);
            await updateData(contest.aPerfs, standings);
            model.updateInformation(
                `最終更新 : ${moment().format("HH:mm:ss")}`
            );
            model.setEnable(true);
        } catch (e) {
            model.updateInformation(e.message);
            model.setEnable(false);
        }
    }

    async function updateData(aperfs, standings) {
        if (Object.keys(aperfs).length === 0) {
            throw new Error("APerfのデータが提供されていません");
        }
        contest = new Contest(
            contestScreenName,
            contestInformation,
            standings,
            aperfs
        );
        model.contest = contest;
        await updateResultsData();
    }

    function updateView() {
        const roundedRankValue = isFinite(model.rankValue)
            ? roundValue(model.rankValue, 2)
            : "";
        const roundedPerfValue = isFinite(model.perfValue)
            ? roundValue(model.perfValue, 2)
            : "";
        const roundedRateValue = isFinite(model.rateValue)
            ? roundValue(model.rateValue, 2)
            : "";
        $("#predictor-input-rank").val(roundedRankValue);
        $("#predictor-input-perf").val(roundedPerfValue);
        $("#predictor-input-rate").val(roundedRateValue);

        $("#predictor-alert").html(
            `<h5 class='sidemenu-txt'>${model.information}</h5>`
        );

        if (model.enabled) enabled();
        else disabled();

        if (isStandingsPage) {
            addPerfToStandings();
        }
        function enabled() {
            $("#predictor-reload").button("reset");
            predictorElements.forEach(element => {
                $(`#${element}`).removeAttr("disabled");
            });
        }
        function disabled() {
            $("#predictor-reload").button("reset");
            predictorElements.forEach(element => {
                $(`#${element}`).attr("disabled", true);
            });
        }
    }

    function shouldEnabledPredictor() {
        if (!startTime.isBefore())
            return { verdict: false, message: "コンテストは始まっていません" };
        if (moment(startTime) < firstContestDate)
            return {
                verdict: false,
                message: "現行レートシステム以前のコンテストです"
            };
        if (contestInformation.RatedRange[0] > contestInformation.RatedRange[1])
            return {
                verdict: false,
                message: "ratedなコンテストではありません"
            };
        return { verdict: true, message: "" };
    }

    //全員の結果データを更新する
    async function updateResultsData() {
        if (contest.standings.Fixed && contest.IsRated) {
            let rawResult = await getResultsData(contestScreenName);
            rawResult.sort((a, b) =>
                a.Place !== b.Place
                    ? a.Place - b.Place
                    : b.OldRating - a.OldRating
            );
            let sortedStandingsData = Array.from(
                contest.standings.StandingsData
            ).filter(x => x.TotalResult.Count !== 0);
            sortedStandingsData.sort((a, b) =>
                a.TotalResult.Count === 0 && b.TotalResult.Count === 0
                    ? 0
                    : a.TotalResult.Count === 0
                    ? 1
                    : b.TotalResult.Count === 0
                    ? -1
                    : a.Rank !== b.Rank
                    ? a.Rank - b.Rank
                    : b.OldRating !== a.OldRating
                    ? b.OldRating - a.OldRating
                    : a.UserIsDeleted
                    ? -1
                    : b.UserIsDeleted
                    ? 1
                    : 0
            );

            let lastPerformance = contest.perfLimit;
            let deletedCount = 0;
            results = new FixedResults(
                sortedStandingsData.map((data, index) => {
                    let result = rawResult[index - deletedCount];
                    if (!result || data.OldRating !== result.OldRating) {
                        deletedCount++;
                        result = null;
                    }
                    return new Result(
                        result ? result.IsRated : false,
                        data.TotalResult.Count !== 0,
                        data.UserScreenName,
                        data.Rank,
                        -1,
                        data.OldRating,
                        result ? result.NewRating : 0,
                        0,
                        result && result.IsRated
                            ? (lastPerformance = result.Performance)
                            : lastPerformance,
                        result ? result.InnerPerformance : 0,
                        data.TotalResult.Score,
                        data.TotalResult.Elapsed,
                        data.TotalResult.Penalty
                    );
                })
            );
        } else {
            results = new OnDemandResults(contest, contest.templateResults);
        }
    }

    //結果データを順位表に追加する
    function addPerfToStandings() {
        $(".standings-perf , .standings-rate").remove();

        $("#standings-tbody > tr").each((index, elem) => {
            if (elem.firstElementChild.textContent === "-") {
                let longCell = elem.getElementsByClassName(
                    "standings-result"
                )[0];
                longCell.setAttribute(
                    "colspan",
                    parseInt(longCell.getAttribute("colspan")) + 2
                );
                return;
            }
            const result = results
                ? results.getUserResult(
                      $(".standings-username .username", elem).text()
                  )
                : null;
            const perfElem =
                !result || !result.IsSubmitted
                    ? "-"
                    : getRatingSpan(result.Performance);
            const rateElem = !result
                ? "-"
                : result.IsRated && contest.IsRated
                ? getRatingChangeElem(result.OldRating, result.NewRating)
                : getUnratedElem(result.OldRating);
            $(elem).append(
                `<td class="standings-result standings-perf">${perfElem}</td>`
            );
            $(elem).append(
                `<td class="standings-result standings-rate">${rateElem}</td>`
            );
            function getRatingChangeElem(oldRate, newRate) {
                return `<span class="bold">${getRatingSpan(
                    oldRate
                )}</span> → <span class="bold">${getRatingSpan(
                    newRate
                )}</span> <span class="grey">(${
                    newRate >= oldRate ? "+" : ""
                }${newRate - oldRate})</span>`;
            }
            function getUnratedElem(rate) {
                return `<span class="bold">${getRatingSpan(
                    rate
                )}</span> <span class="grey">(unrated)</span>`;
            }
            function getRatingSpan(rate) {
                return `<span class="user-${getColor(rate)}">${rate}</span>`;
            }
        });
    }
}
