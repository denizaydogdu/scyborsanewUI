/**
 * Hisse Arama Autocomplete
 *
 * Header search bar'da hisse arama ozelligi saglar.
 * Tum hisse listesini bir kez ceker, client-side cache'ler ve yerel filtreleme yapar.
 * Ticker eslesmesi aciklama eslesmesinden once gosterilir.
 * Masaustu ve mobil arama alanlari desteklenir.
 */
(function () {
    'use strict';

    var MAX_RESULTS = 8;
    var MIN_QUERY_LENGTH = 1;
    var stockCache = null;
    var isFetching = false;

    /**
     * Hisse listesini API'den ceker ve cache'ler.
     * @param {Function} callback - Veri hazir oldugunda cagirilacak fonksiyon
     */
    function ensureStockCache(callback) {
        if (stockCache) {
            callback(stockCache);
            return;
        }
        if (isFetching) {
            setTimeout(function () { ensureStockCache(callback); }, 100);
            return;
        }
        isFetching = true;
        fetch('/ajax/stocks/search')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                stockCache = data || [];
                isFetching = false;
                callback(stockCache);
            })
            .catch(function () {
                isFetching = false;
                stockCache = [];
                callback(stockCache);
            });
    }

    /**
     * Hisse listesini sorgu metnine gore filtreler.
     * Ticker eslesmesi (startsWith) aciklama eslesmesinden (includes) once gosterilir.
     * @param {Array} stocks - Hisse listesi
     * @param {string} query - Arama metni (kucuk harfe cevirilmis)
     * @returns {Array} Filtrelenmis ve siralanmis hisse listesi (max MAX_RESULTS)
     */
    function filterStocks(stocks, query) {
        var tickerMatches = [];
        var descMatches = [];

        for (var i = 0; i < stocks.length; i++) {
            var s = stocks[i];
            var ticker = (s.ticker || '').toLowerCase();
            var desc = (s.description || '').toLowerCase();

            if (ticker.indexOf(query) === 0) {
                tickerMatches.push(s);
            } else if (desc.indexOf(query) !== -1) {
                descMatches.push(s);
            }

            if (tickerMatches.length + descMatches.length >= MAX_RESULTS * 2) break;
        }

        return tickerMatches.concat(descMatches).slice(0, MAX_RESULTS);
    }

    /**
     * Guvenli metin icerigi — ozel HTML karakterlerini escape eder.
     * @param {string} text - Escape edilecek metin
     * @returns {string} Escape edilmis metin
     */
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.textContent;
    }

    /**
     * Logo fallback avatar DOM elementi olusturur.
     * @param {string} ticker - Hisse kodu
     * @returns {HTMLElement} Fallback avatar elementi
     */
    function createFallbackAvatar(ticker) {
        var div = document.createElement('div');
        div.className = 'rounded-circle me-2 d-flex align-items-center justify-content-center border';
        div.style.cssText = 'width:28px;height:28px;min-width:28px;font-size:10px;font-weight:600;background:#fff;';
        div.textContent = (ticker || '').substring(0, 4);
        return div;
    }

    /**
     * Tek bir arama sonucu icin DOM elementi olusturur.
     * @param {Object} stock - Hisse verisi (ticker, description, logoid)
     * @returns {HTMLElement} Dropdown item elementi
     */
    function createItem(stock) {
        var ticker = stock.ticker || '';
        var desc = stock.description || '';
        var logoid = stock.logoid || '';

        var a = document.createElement('a');
        a.href = '/stock/detail/' + encodeURIComponent(ticker);
        a.className = 'dropdown-item notify-item py-2';

        var wrapper = document.createElement('div');
        wrapper.className = 'd-flex align-items-center';

        // Logo veya fallback
        if (logoid && logoid.length > 0) {
            var img = document.createElement('img');
            img.src = '/img/stock-logos/' + logoid;
            img.className = 'rounded-circle me-2';
            img.style.cssText = 'width:28px;height:28px;min-width:28px;object-fit:contain;';
            img.onerror = function () {
                var fallback = createFallbackAvatar(ticker);
                img.parentNode.replaceChild(fallback, img);
            };
            wrapper.appendChild(img);
        } else {
            wrapper.appendChild(createFallbackAvatar(ticker));
        }

        var textDiv = document.createElement('div');
        textDiv.className = 'overflow-hidden';

        var tickerSpan = document.createElement('span');
        tickerSpan.className = 'fw-semibold';
        tickerSpan.textContent = ticker;

        var descSpan = document.createElement('p');
        descSpan.className = 'text-muted mb-0 fs-12 text-truncate';
        descSpan.style.maxWidth = '280px';
        descSpan.textContent = desc;

        textDiv.appendChild(tickerSpan);
        textDiv.appendChild(descSpan);
        wrapper.appendChild(textDiv);
        a.appendChild(wrapper);

        return a;
    }

    /**
     * Sonuc bulunamadi mesaji elementi olusturur.
     * @returns {HTMLElement} Bos durum elementi
     */
    function createEmpty() {
        var div = document.createElement('div');
        div.className = 'dropdown-item text-muted text-center py-3';

        var icon = document.createElement('i');
        icon.className = 'mdi mdi-magnify me-1';
        div.appendChild(icon);
        div.appendChild(document.createTextNode('Sonuc bulunamadi'));

        return div;
    }

    /**
     * Sonuclari container'a render eder (DOM API ile).
     * @param {HTMLElement} container - Sonuclarin eklencegi container
     * @param {Array} results - Filtrelenmis hisse listesi
     */
    function renderResults(container, results) {
        // Mevcut icerigi temizle
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        if (results.length === 0) {
            container.appendChild(createEmpty());
        } else {
            for (var i = 0; i < results.length; i++) {
                container.appendChild(createItem(results[i]));
            }
        }
    }

    // ── Masaustu Arama ──────────────────────────────────────

    /**
     * Masaustu arama alanini ve dropdown'unu baslat.
     */
    function initDesktopSearch() {
        var input = document.getElementById('search-options');
        var dropdown = document.getElementById('search-dropdown');
        if (!input || !dropdown) return;

        input.addEventListener('input', function () {
            var query = (input.value || '').trim().toLowerCase();
            if (query.length < MIN_QUERY_LENGTH) {
                dropdown.classList.remove('show');
                while (dropdown.firstChild) dropdown.removeChild(dropdown.firstChild);
                return;
            }

            ensureStockCache(function (stocks) {
                var results = filterStocks(stocks, query);
                renderResults(dropdown, results);
                dropdown.classList.add('show');
            });
        });

        // Enter tusuna basinca ilk sonuca git
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var firstLink = dropdown.querySelector('a.dropdown-item');
                if (firstLink) {
                    window.location.href = firstLink.getAttribute('href');
                }
            }
            if (e.key === 'Escape') {
                dropdown.classList.remove('show');
                while (dropdown.firstChild) dropdown.removeChild(dropdown.firstChild);
                input.value = '';
                input.blur();
            }
        });

        // Dis tiklama ile kapat
        document.addEventListener('click', function (e) {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
                while (dropdown.firstChild) dropdown.removeChild(dropdown.firstChild);
            }
        });

        // Velzon close button ile senkronize calis
        var closeBtn = document.getElementById('search-close-options');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                dropdown.classList.remove('show');
                while (dropdown.firstChild) dropdown.removeChild(dropdown.firstChild);
            });
        }
    }

    // ── Mobil Arama ──────────────────────────────────────

    /**
     * Mobil arama alanini ve sonuc listesini baslat.
     */
    function initMobileSearch() {
        var input = document.getElementById('search-options-mobile');
        var resultsList = document.getElementById('search-dropdown-mobile');
        if (!input || !resultsList) return;

        input.addEventListener('input', function () {
            var query = (input.value || '').trim().toLowerCase();
            if (query.length < MIN_QUERY_LENGTH) {
                resultsList.style.display = 'none';
                while (resultsList.firstChild) resultsList.removeChild(resultsList.firstChild);
                return;
            }

            ensureStockCache(function (stocks) {
                var results = filterStocks(stocks, query);
                renderResults(resultsList, results);
                resultsList.style.display = 'block';
            });
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var firstLink = resultsList.querySelector('a.dropdown-item');
                if (firstLink) {
                    window.location.href = firstLink.getAttribute('href');
                }
            }
            if (e.key === 'Escape') {
                resultsList.style.display = 'none';
                while (resultsList.firstChild) resultsList.removeChild(resultsList.firstChild);
                input.value = '';
                input.blur();
            }
        });
    }

    // ── Baslatma ──────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initDesktopSearch();
            initMobileSearch();
        });
    } else {
        initDesktopSearch();
        initMobileSearch();
    }

})();
