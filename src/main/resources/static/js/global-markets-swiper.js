/**
 * Emtialar / Borsa Slider — Dashboard global market verileri.
 *
 * TradingView'dan alinan emtia, doviz, kripto ve endeks verilerini
 * swiper slider olarak gosterir. 60 saniye aralikla polling yapar.
 *
 * Bagimliliklar: Swiper.js
 */
(function () {
    'use strict';

    var REFRESH_INTERVAL = 60000;
    var OFFHOURS_REFRESH_INTERVAL = 120000; // 2 dakika (seans disi — forex/kripto 7/24)
    var ERROR_RETRY_DELAY = 120000;
    var MAX_CONSECUTIVE_ERRORS = 3;

    /**
     * Piyasa durumuna gore uygun polling araligini doner.
     * Seans aciksa 60s, kapaliysa 2dk (forex/kripto 7/24 islem gorur).
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
    var swiperInstance = null;

    // Kategori ikonlari ve renkleri
    var CATEGORY_CONFIG = {
        'EMTIA':  { icon: 'ri-vip-diamond-line', color: 'warning' },
        'DOVIZ':  { icon: 'ri-exchange-dollar-line', color: 'success' },
        'KRIPTO': { icon: 'ri-bit-coin-line', color: 'info' },
        'ENDEKS': { icon: 'ri-bar-chart-grouped-line', color: 'primary' }
    };

    // Sembol -> Turkce kisa isim mapping
    var DISPLAY_NAMES = {
        'GOLD': 'Alt\u0131n (Ons)',
        'SILVER': 'G\u00fcm\u00fc\u015f (Ons)',
        'BRENT': 'Brent Petrol',
        'HG1!': 'Bak\u0131r',
        'PA1!': 'Paladyum',
        'PL1!': 'Platin',
        'USDTRY': 'Dolar/TL',
        'EURTRY': 'Euro/TL',
        'BTCUSD': 'Bitcoin',
        'ETHUSD': 'Ethereum',
        'DJI': 'Dow Jones',
        'SPX': 'S&P 500',
        'DXY': 'Dolar Endeksi',
        'NI225': 'Nikkei 225',
        'KOSPI': 'KOSPI',
        'DAX': 'DAX',
        'VIX': 'VIX',
        'EEM': 'Geli\u015fen Piyasalar',
        'TUR': 'T\u00fcrkiye ETF'
    };

    /**
     * Fiyati Turkce formata cevirir.
     */
    function formatPrice(price) {
        if (price == null || isNaN(price)) return '--';
        if (price >= 10000) {
            return price.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }
        if (price >= 100) {
            return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }

    /**
     * Tek bir swiper-slide DOM elementi olusturur (XSS-safe, DOM API).
     */
    function createSlide(item) {
        var config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG['ENDEKS'];
        var name = DISPLAY_NAMES[item.symbol] || item.name || item.symbol;
        var change = item.dailyChange || 0;
        var isPos = change >= 0;
        var arrow = isPos ? '\u2191' : '\u2193';
        var changeClass = isPos ? 'text-success' : 'text-danger';
        var changeText = arrow + ' ' + (isPos ? '+' : '') + change.toFixed(2).replace('.', ',') + '%';
        var priceText = formatPrice(item.lastPrice);
        var key = item.symbol.toLowerCase().replace('!', '');

        var slide = document.createElement('div');
        slide.className = 'swiper-slide';

        var card = document.createElement('div');
        card.className = 'card';

        var body = document.createElement('div');
        body.className = 'card-body py-3 px-3';

        // Header: ikon + isim
        var header = document.createElement('div');
        header.className = 'd-flex align-items-center';

        var avatarWrap = document.createElement('div');
        avatarWrap.className = 'avatar-xs flex-shrink-0';
        var avatarSpan = document.createElement('span');
        avatarSpan.className = 'avatar-title bg-white text-' + config.color + ' rounded-circle border fw-bold fs-11';
        avatarSpan.textContent = item.symbol.substring(0, 2);
        avatarWrap.appendChild(avatarSpan);

        var textWrap = document.createElement('div');
        textWrap.className = 'ms-2 overflow-hidden';
        var nameEl = document.createElement('h6');
        nameEl.className = 'mb-0 fs-13 text-truncate';
        nameEl.textContent = name;
        var catEl = document.createElement('p');
        catEl.className = 'text-muted fs-11 mb-0';
        catEl.textContent = item.category || '';
        textWrap.appendChild(nameEl);
        textWrap.appendChild(catEl);

        header.appendChild(avatarWrap);
        header.appendChild(textWrap);

        // Price + Change
        var priceWrap = document.createElement('div');
        priceWrap.className = 'mt-2';
        var priceEl = document.createElement('h5');
        priceEl.className = 'mb-0 fs-15';
        priceEl.id = 'gm-price-' + key;
        priceEl.textContent = priceText;
        var changeEl = document.createElement('span');
        changeEl.className = 'fs-12 fw-medium ' + changeClass;
        changeEl.id = 'gm-change-' + key;
        changeEl.textContent = changeText;
        priceWrap.appendChild(priceEl);
        priceWrap.appendChild(changeEl);

        body.appendChild(header);
        body.appendChild(priceWrap);
        card.appendChild(body);
        slide.appendChild(card);

        return slide;
    }

    /**
     * Swiper'i verilerle doldurur.
     */
    function renderSlider(data) {
        var wrapper = document.getElementById('global-market-swiper-wrapper');
        if (!wrapper || !data || !data.length) return;

        // Kategori sirasina gore sirala: EMTIA, DOVIZ, KRIPTO, ENDEKS
        var order = { 'EMTIA': 0, 'DOVIZ': 1, 'KRIPTO': 2, 'ENDEKS': 3 };
        data.sort(function (a, b) {
            return (order[a.category] || 9) - (order[b.category] || 9);
        });

        // Mevcut slide'lari temizle
        while (wrapper.firstChild) {
            wrapper.removeChild(wrapper.firstChild);
        }

        for (var i = 0; i < data.length; i++) {
            wrapper.appendChild(createSlide(data[i]));
        }

        // Swiper'i baslat veya guncelle
        if (swiperInstance) {
            swiperInstance.update();
        } else {
            initSwiper();
        }
    }

    /**
     * Mevcut slide'larin fiyat/degisim degerlerini gunceller (DOM rewrite olmadan).
     */
    function updateSliderValues(data) {
        if (!data || !data.length) return;
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var key = item.symbol.toLowerCase().replace('!', '');
            var priceEl = document.getElementById('gm-price-' + key);
            var changeEl = document.getElementById('gm-change-' + key);

            if (priceEl) {
                priceEl.textContent = formatPrice(item.lastPrice);
            }
            if (changeEl) {
                var change = item.dailyChange || 0;
                var isPos = change >= 0;
                var arrow = isPos ? '\u2191' : '\u2193';
                changeEl.textContent = arrow + ' ' + (isPos ? '+' : '') + change.toFixed(2).replace('.', ',') + '%';
                changeEl.className = 'fs-12 fw-medium ' + (isPos ? 'text-success' : 'text-danger');
            }
        }
    }

    /**
     * Swiper instance'ini baslatir.
     */
    function initSwiper() {
        if (typeof Swiper === 'undefined') return;
        swiperInstance = new Swiper('.globalMarketSlider', {
            slidesPerView: 2,
            loop: false,
            spaceBetween: 16,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false
            },
            breakpoints: {
                640:  { slidesPerView: 3 },
                768:  { slidesPerView: 3.5 },
                1024: { slidesPerView: 4 },
                1280: { slidesPerView: 5 },
                1536: { slidesPerView: 6 }
            }
        });
    }

    /**
     * AJAX ile global market verilerini ceker.
     */
    function fetchData() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/ajax/dashboard/global-markets', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 15000;

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data && data.length > 0) {
                        if (!swiperInstance) {
                            renderSlider(data);
                        } else {
                            updateSliderValues(data);
                        }
                        consecutiveErrors = 0;
                    }
                    scheduleNext(getRefreshInterval());
                } catch (e) {
                    console.warn('[GLOBAL-MARKET] JSON parse hatasi:', e);
                    handleError();
                }
            } else {
                handleError();
            }
        };

        xhr.onerror = xhr.ontimeout = function () {
            handleError();
        };

        xhr.send();
    }

    function handleError() {
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.warn('[GLOBAL-MARKET] ' + consecutiveErrors + ' ardisik hata, 2dk bekleniyor');
            consecutiveErrors = 0;
            scheduleNext(ERROR_RETRY_DELAY);
        } else {
            scheduleNext(getRefreshInterval());
        }
    }

    function scheduleNext(delay) {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(fetchData, delay);
    }

    function init() {
        // SSR verisi varsa hemen render et
        if (window.initialGlobalMarkets && window.initialGlobalMarkets.length > 0) {
            renderSlider(window.initialGlobalMarkets);
            scheduleNext(getRefreshInterval());
        } else {
            // SSR bossa hemen fetch yap (60s bekleme)
            fetchData();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
