//NameSpace
SideMenu.Predictor = {};
var maxDic =
    [
        [/^abc\d{3}$/, 1600],
        [/^arc\d{3}$/, 3200],
        [/^agc\d{3}$/, 8192],
        [/^apc\d{3}$/, 8192],
        [/^soundhound2018-summer-qual$/, 2400],
        [/^dwacon5th-prelims$/, 3200],
        [/.*/, 8192]
    ];

SideMenu.Predictor.maxPerf = maxDic.filter(x => x[0].exec(contestScreenName))[0][1];

if (!SideMenu.Datas.History) {
    await SideMenu.Datas.Update.History().done(() => { isDone = true });
}