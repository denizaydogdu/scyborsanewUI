/**
 * BIST piyasa saatleri utility.
 * Istanbul saati (UTC+3 sabit) bazinda seans kontrolu.
 * Turkiye 2016'dan beri DST uygulamiyor — UTC+3 her zaman gecerli.
 * Tatillerden habersiz — API adaptive cache halleder.
 */
window.ScyborsaMarketHours = (function () {
    'use strict';

    var ISTANBUL_OFFSET_HOURS = 3;
    var OPEN_HOUR = 9, OPEN_MIN = 50;
    var CLOSE_HOUR = 18, CLOSE_MIN = 25;

    /**
     * Suanki Istanbul zamanini hesaplar (UTC+3 sabit).
     * @returns {Date} Istanbul saatine gore Date nesnesi
     */
    function getNowIstanbul() {
        var now = new Date();
        var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
        return new Date(utcMs + ISTANBUL_OFFSET_HOURS * 3600000);
    }

    /**
     * Hafta ici kontrolu.
     * @param {Date} d - Kontrol edilecek tarih
     * @returns {boolean} Hafta iciyse true
     */
    function isWeekday(d) {
        var day = d.getDay();
        return day !== 0 && day !== 6;
    }

    /**
     * Seans saatleri kontrolu (09:50-18:25).
     * @param {Date} d - Kontrol edilecek tarih
     * @returns {boolean} Seans saatleri icindeyse true
     */
    function isWithinTradingHours(d) {
        var totalMins = d.getHours() * 60 + d.getMinutes();
        var openMins = OPEN_HOUR * 60 + OPEN_MIN;   // 590
        var closeMins = CLOSE_HOUR * 60 + CLOSE_MIN; // 1105
        return totalMins >= openMins && totalMins <= closeMins;
    }

    return {
        /**
         * BIST piyasasinin su an acik olup olmadigini doner.
         * Hafta ici 09:50-18:25 (Istanbul) arasi true.
         * @returns {boolean} Piyasa aciksa true
         */
        isMarketOpen: function () {
            var ist = getNowIstanbul();
            return isWeekday(ist) && isWithinTradingHours(ist);
        }
    };
})();
