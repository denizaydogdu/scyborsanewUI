/**
 * Endeks Swiper — Canli Veri Guncelleme
 *
 * SSR bridge (window.initialIndexData) + 30 saniye polling ile
 * dashboard endeks kartlarini guncel tutar.
 *
 * Bagimliliklar: dashboard-crypto.init.js (sparkline chart'lar)
 */
(function () {
    'use strict';

    var REFRESH_INTERVAL = 30000;       // 30 saniye
    var OFFHOURS_REFRESH_INTERVAL = 300000; // 5 dakika (seans disi)
    var ERROR_RETRY_DELAY = 120000;     // 2 dakika
    var MAX_CONSECUTIVE_ERRORS = 3;

    /**
     * Piyasa durumuna gore uygun polling araligini doner.
     * Seans aciksa 30s, kapaliysa 5dk.
     * @returns {number} Milisaniye cinsinden polling araligi
     */
    function getRefreshInterval() {
        if (window.ScyborsaMarketHours) {
            return window.ScyborsaMarketHours.isMarketOpen() ? REFRESH_INTERVAL : OFFHOURS_REFRESH_INTERVAL;
        }
        return OFFHOURS_REFRESH_INTERVAL;
    }

    var consecutiveErrors = 0;
    var refreshTimer = null;
    var chartRegistry = {};  // code -> ApexCharts instance

    /**
     * Chart register fonksiyonu — dashboard-crypto.init.js cagirir.
     * @param {string} code - Endeks kodu (kucuk harf, ornegin 'xu100')
     * @param {Object} chartInstance - ApexCharts instance
     */
    window.indexSwiperRegisterChart = function (code, chartInstance) {
        chartRegistry[code] = chartInstance;
    };

    /**
     * Fiyati Turkce sayi formatinda gosterir (nokta binlik ayirici, virgul ondalik).
     * Ornek: 14700.02 → "14.700,02" | 51.2 → "51,20"
     * @param {number} price - Ham fiyat degeri
     * @return {string} Formatlanmis fiyat metni
     */
    function formatPrice(price) {
        return Number(price).toLocaleString('tr-TR', {
            minimumFractionDigits: 0, maximumFractionDigits: 0
        });
    }

    /**
     * Tek bir endeks kartinin fiyat ve degisim bilgisini gunceller.
     * @param {string} code - Endeks kodu (kucuk harf)
     * @param {Object} idx - Endeks performans verisi
     */
    function updateCard(code, idx) {
        var priceEl = document.getElementById('swiper-' + code + '-price');
        var changeEl = document.getElementById('swiper-' + code + '-change');

        if (priceEl) {
            var oldPrice = priceEl.textContent;
            priceEl.textContent = formatPrice(idx.lastPrice);
            if (oldPrice !== '--' && oldPrice !== priceEl.textContent && typeof flashElement === 'function') {
                flashElement(priceEl, idx.dailyChange >= 0 ? 'up' : 'down');
            }
        }

        if (changeEl) {
            changeEl.textContent = '';
            var codeSpan = document.createElement('span');
            codeSpan.className = 'text-muted text-uppercase';
            codeSpan.textContent = code.toUpperCase();

            var changeSpan = document.createElement('span');
            var isPos = idx.dailyChange >= 0;
            changeSpan.className = (isPos ? 'text-success' : 'text-danger') + ' fs-11 ms-1';
            var arrow = isPos ? '\u2191' : '\u2193';
            changeSpan.textContent = arrow + ' ' + (isPos ? '+' : '') + idx.dailyChange.toFixed(2) + '%';

            changeEl.appendChild(codeSpan);
            changeEl.appendChild(changeSpan);
        }
    }

    /**
     * Sparkline chart verisini guncel performans degerleriyle gunceller.
     * @param {string} code - Endeks kodu (kucuk harf)
     * @param {Object} idx - Endeks performans verisi
     */
    function updateSparkline(code, idx) {
        var chart = chartRegistry[code];
        if (!chart) return;

        var data = [
            idx.weeklyChange || 0,
            idx.monthlyChange || 0,
            idx.quarterlyChange || 0,
            idx.sixMonthChange || 0,
            idx.yearlyChange || 0
        ];

        chart.updateSeries([{ data: data }]);
    }

    /**
     * Endeks listesini isleyerek kartlari ve sparkline'lari gunceller.
     * @param {Array} dataList - Endeks performans verisi listesi
     */
    function processData(dataList) {
        if (!dataList || !dataList.length) return;

        for (var i = 0; i < dataList.length; i++) {
            var idx = dataList[i];
            var code = idx.symbol ? idx.symbol.toLowerCase() : '';
            if (!code) continue;

            updateCard(code, idx);
            updateSparkline(code, idx);
        }
    }

    /**
     * API'den guncel endeks verisi ceker.
     */
    function fetchData() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/ajax/dashboard/indexes', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 10000;

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    processData(data);
                    consecutiveErrors = 0;
                    scheduleNext(getRefreshInterval());
                } catch (e) {
                    console.warn('[INDEX-SWIPER] JSON parse hatasi:', e);
                    handleError();
                }
            } else {
                handleError();
            }
        };

        xhr.onerror = function () {
            handleError();
        };

        xhr.ontimeout = function () {
            handleError();
        };

        xhr.send();
    }

    /**
     * Hata durumunu yonetir. 3 ardisik hata sonrasi 2dk bekler.
     */
    function handleError() {
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.warn('[INDEX-SWIPER] ' + consecutiveErrors + ' ardisik hata, ' +
                (ERROR_RETRY_DELAY / 1000) + 's bekleniyor');
            consecutiveErrors = 0;
            scheduleNext(ERROR_RETRY_DELAY);
        } else {
            scheduleNext(getRefreshInterval());
        }
    }

    /**
     * Sonraki yenileme zamanlamasini ayarlar.
     * @param {number} delay - Milisaniye cinsinden gecikme
     */
    function scheduleNext(delay) {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
        refreshTimer = setTimeout(fetchData, delay);
    }

    /**
     * Widget baslatma — SSR verisini uygula, sonra polling baslat.
     */
    function init() {
        if (window.initialIndexData && window.initialIndexData.length > 0) {
            processData(window.initialIndexData);
        }
        scheduleNext(getRefreshInterval());
    }

    // DOMContentLoaded ile baslat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
