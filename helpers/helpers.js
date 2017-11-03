
    var helpers = {};
    var s4 = function () {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    };

    helpers.getTimestamp = function () {
        return (new Date()).toISOString().substr(0, 19);
    };

    helpers.newGuid = function() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    };

    helpers.formatDuration = function (duration) {
        duration = duration | 0;
        var ms = duration % 1000;
        duration -= ms;
        var s = (duration / 1000) % 60;
        duration -= s * 1000;
        var m = (duration / 60000) % 60;
        duration -= m * 60000;
        var h = (duration / 3600000) % 24;
        duration -= h * 3600000;
        var d = duration / 86400000;

        return (d > 0 ? d + '.' : '') +
            (h < 10 ? '0' + h : h) + ':' +
            (m < 10 ? '0' + m : m) + ':' +
            (s < 10 ? '0' + s : s) + '.' +
            (ms < 10 ? '00' + ms : ms < 100 ? '0' + ms : ms);
    };



    module.exports = helpers;