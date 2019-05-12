import document from "./dom.html"
import {SideMenuElement} from "../../libs/sidemenu/element";
import {HistoryData} from "../../libs/datas/history";
import {unpositivize_rating, calc_rating} from "../../libs/utils/atcoder_rating";



export let estimator = new SideMenuElement('estimator','Estimator',/atcoder.jp/, document, afterAppend);


async function afterAppend() {
    const historyData = new HistoryData(userScreenName,() => {});
    await historyData.update();
    var estimator_state = parseInt(localStorage.getItem("sidemenu_estimator_state"));
    $("#estimator-input").val(localStorage.getItem("sidemenu_estimator_value"));
    updateInputs();

    $("#estimator-input").keyup(updateInputs);

    $("#estimator-toggle").click(function () {
        $("#estimator-input").val($("#estimator-res").val());
        estimator_state = (estimator_state + 1) % 2;
        updateInputs();
    });

    function updateInputs() {
        let input = $("#estimator-input").val();
        if (!isFinite(input)) {
			displayAlert("数字ではありません");
            return;
        }

		let history = historyData.data.filter(x => x.IsRated);
        history.sort(function (a, b) {
            if (a.EndTime < b.EndTime) return 1;
            if (a.EndTime > b.EndTime) return -1;
            return 0;
        })
        history = history.map(x => x.InnerPerformance);
		input = parseInt(input);
		let res = -1;
        if (estimator_state === 0) {
            // binary search
			let goal_rating = unpositivize_rating(input);
			let lo = -10000.0;
			let hi = 10000.0;
			for (let i = 0; i < 100; ++i) {
				let mid = (hi + lo) / 2;
				let r = calc_rating([mid].concat(history));
                if (r >= goal_rating) {
                    hi = mid;
                } else {
                    lo = mid;
                }
            }
            res = (hi + lo) / 2;
            $("#estimator-input-desc").text("目標レーティング");
            $("#estimator-res-desc").text("必要パフォーマンス");
        }
        else {
            res = calc_rating([input].concat(history));
            $("#estimator-input-desc").text("パフォーマンス");
            $("#estimator-res-desc").text("到達レーティング");
        }
		res = Math.round(res * 100) / 100;
        if (!isNaN(res)) $("#estimator-res").val(res);
        updateLocalStorage();
        updateTweetBtn();
    }

    function updateLocalStorage() {
        localStorage.setItem("sidemenu_estimator_state", estimator_state);
        localStorage.setItem("sidemenu_estimator_value", $("#estimator-input").val());
    }

    function updateTweetBtn() {
        var tweetStr =
            `AtCoderのハンドルネーム: ${userScreenName}%0A
${estimator_state === 0 ? "目標レーティング" : "パフォーマンス"}: ${$("#estimator-input").val()}%0A
${estimator_state === 0 ? "必要パフォーマンス" : "到達レーティング"}: ${$("#estimator-res").val()}%0A`;
        $('#estimator-tweet').attr("href", `https://twitter.com/share?text=${tweetStr}&url=https://greasyfork.org/ja/scripts/369954-ac-predictor`);
    }

    function displayAlert(message) {
		let alertDiv = document.createElement('div');
		alertDiv.setAttribute("role", "alert");
		alertDiv.setAttribute("class", "alert alert-warning alert-dismissible");
		let closeButton = document.createElement('button');
		closeButton.setAttribute("type", "button");
		closeButton.setAttribute("class", "close");
		closeButton.setAttribute("data-dismiss", "alert");
		closeButton.setAttribute("aria-label", "閉じる");
		let closeSpan = document.createElement('span');
		closeSpan.setAttribute("aria-hidden", "true");
		closeSpan.textContent = "×";
		closeButton.appendChild(closeSpan);
		let messageContent = document.createTextNode(message);
		alertDiv.appendChild(closeButton);
		alertDiv.appendChild(messageContent);
		$("#estimator-alert").append(alertDiv);
    }
}