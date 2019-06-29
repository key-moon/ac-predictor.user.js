// ==UserScript==
// @name        ac-predictor-minimal
// @namespace   http://ac-predictor.azurewebsites.net/
// @version     1.0.0
// @description AtCoderのパフォーマンスを予測し、順位表に表示します。
// @author      keymoon
// @license     MIT
// @require     https://greasyfork.org/scripts/386712-atcoder-userscript-libs/code/atcoder-userscript-libs.js
// @supportURL  https://github.com/key-moon/ac-predictor.user.js/issues
// @match       https://atcoder.jp/*/standings
// @exclude     https://atcoder.jp/*/standings/json
// ==/UserScript==

import { afterAppend } from "./elements/predictor/script";

afterAppend();