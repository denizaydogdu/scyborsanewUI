/**
 * Piyasa Sentiment Dashboard Widget
 *
 * Kisa, orta ve uzun vadeli sentiment verilerini gosterir.
 * 30 saniye aralikla API'den guncel veri ceker.
 * 3 ardisik hata sonrasi 2 dakika bekleyip tekrar dener.
 */
(function () {
    'use strict';

    var REFRESH_INTERVAL = 30000;       // 30 saniye
    var OFFHOURS_REFRESH_INTERVAL = 300000; // 5 dakika (seans disi)
    var ERROR_RETRY_DELAY = 120000;     // 2 dakika
    var MAX_CONSECUTIVE_ERRORS = 3;
    var ANIMATION_DURATION = 500;       // ms

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

    // Renk kurallari
    var COLOR_GREEN = '#0ab39c';
    var COLOR_AMBER = '#f7b84b';
    var COLOR_RED = '#f06548';

    /**
     * Yuzde degerine gore renk doner.
     * @param {number} value - 0-100 arasi yuzde
     * @returns {string} CSS renk kodu
     */
    function getColor(value) {
        if (value >= 70) return COLOR_GREEN;
        if (value >= 50) return COLOR_AMBER;
        return COLOR_RED;
    }

    /**
     * Counter degerini animasyonlu gunceller.
     * @param {HTMLElement} el - .counter-value span elementi
     * @param {number} newValue - Hedef deger
     */
    function animateValue(el, newValue) {
        var startValue = parseFloat(el.textContent) || 0;
        var startTime = null;
        var diff = newValue - startValue;

        if (Math.abs(diff) < 0.01) {
            el.textContent = newValue.toFixed(1);
            return;
        }

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / ANIMATION_DURATION, 1);
            // easeOutCubic
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = startValue + (diff * eased);
            el.textContent = current.toFixed(1);
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    /**
     * Tek bir sentiment kartini gunceller.
     * @param {string} containerId - Kart container ID'si (sentiment-short vb.)
     * @param {number} value - Yuzde degeri
     */
    function updateCard(containerId, value) {
        var container = document.getElementById(containerId);
        if (!container) return;

        var color = getColor(value);

        var counterEl = container.querySelector('.counter-value');
        if (counterEl) {
            counterEl.setAttribute('data-target', value);
            animateValue(counterEl, value);
        }

        // Progress bar guncelle
        var progressBar = container.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = value + '%';
            progressBar.style.backgroundColor = color;
            progressBar.setAttribute('aria-valuenow', value);
        }

        // Ikon rengi guncelle
        var icon = container.querySelector('.avatar-title');
        if (icon) {
            icon.style.color = color;
        }
    }

    /**
     * Tum sentiment kartlarini gunceller.
     * @param {Object} data - Sentiment verileri
     */
    function updateDisplay(data) {
        if (!data) return;
        updateCard('sentiment-short', data.kisaVadeli || 0);
        updateCard('sentiment-medium', data.ortaVadeli || 0);
        updateCard('sentiment-long', data.uzunVadeli || 0);
    }

    /**
     * API'den guncel sentiment verisi ceker.
     */
    function fetchSentiment() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/ajax/dashboard/sentiment', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 10000;

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    updateDisplay(data);
                    consecutiveErrors = 0;
                    scheduleRefresh(getRefreshInterval());
                } catch (e) {
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
            console.warn('[Sentiment] ' + consecutiveErrors + ' ardisik hata, ' +
                (ERROR_RETRY_DELAY / 1000) + 's bekleniyor');
            consecutiveErrors = 0;
            scheduleRefresh(ERROR_RETRY_DELAY);
        } else {
            scheduleRefresh(getRefreshInterval());
        }
    }

    /**
     * Sonraki yenileme zamanlamasini ayarlar.
     * @param {number} delay - Milisaniye cinsinden gecikme
     */
    function scheduleRefresh(delay) {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
        refreshTimer = setTimeout(fetchSentiment, delay);
    }

    /**
     * Widget baslatma.
     */
    function init() {
        // Sayfa yuklenisinde sunucu tarafindan saglanan veriyi kullan
        if (window.initialSentimentData && typeof window.initialSentimentData === 'object') {
            updateDisplay(window.initialSentimentData);
        }

        // Periyodik guncellemeyi baslat
        scheduleRefresh(getRefreshInterval());
    }

    // DOMContentLoaded ile baslat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
