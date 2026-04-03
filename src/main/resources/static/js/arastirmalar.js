/**
 * Araştırma Yazıları sayfa JS.
 *
 * AJAX tabanlı KAP haber arama ve detay görüntüleme.
 * XSS koruması: DOM API ile element oluşturma, innerHTML kullanılmaz.
 */
(function () {
    'use strict';

    var SEARCH_URL = '/ajax/arastirmalar/search';
    var DETAY_URL = '/ajax/arastirmalar/detay';
    var TIMEOUT_MS = 30000;
    var MAX_OZET = 200;

    var stockCodeInput = document.getElementById('stockCodeInput');
    var searchBtn = document.getElementById('searchBtn');
    var loadingArea = document.getElementById('loadingArea');
    var errorArea = document.getElementById('errorArea');
    var errorMessage = document.getElementById('errorMessage');
    var resultsArea = document.getElementById('resultsArea');
    var resultCount = document.getElementById('resultCount');
    var resultsContainer = document.getElementById('resultsContainer');
    var emptyArea = document.getElementById('emptyArea');
    var detayModal = document.getElementById('detayModal');
    var detayModalTitle = document.getElementById('detayModalTitle');
    var detayLoading = document.getElementById('detayLoading');
    var detayContent = document.getElementById('detayContent');

    var csrfToken = document.querySelector('meta[name="_csrf"]');
    var csrfHeader = document.querySelector('meta[name="_csrf_header"]');

    // ── Autocomplete ──────────────────────────────────────
    var AC_MAX_RESULTS = 8;
    var acStockCache = null;
    var acIsFetching = false;
    var acDropdown = null;

    /**
     * Hisse listesini API'den ceker ve cache'ler.
     * @param {Function} callback - Veri hazir oldugunda cagirilacak fonksiyon
     */
    function ensureStockCache(callback) {
        if (acStockCache) {
            callback(acStockCache);
            return;
        }
        if (acIsFetching) {
            setTimeout(function () { ensureStockCache(callback); }, 100);
            return;
        }
        acIsFetching = true;
        fetch('/ajax/stocks/search')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                acStockCache = data || [];
                acIsFetching = false;
                callback(acStockCache);
            })
            .catch(function () {
                acIsFetching = false;
                acStockCache = [];
                callback(acStockCache);
            });
    }

    /**
     * Hisse listesini sorguya gore filtreler.
     * @param {Array} stocks - Hisse listesi
     * @param {string} query - Arama metni (kucuk harfe cevirilmis)
     * @returns {Array} Filtrelenmis hisse listesi (max AC_MAX_RESULTS)
     */
    function filterAutocomplete(stocks, query) {
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
            if (tickerMatches.length + descMatches.length >= AC_MAX_RESULTS * 2) break;
        }
        return tickerMatches.concat(descMatches).slice(0, AC_MAX_RESULTS);
    }

    /**
     * Autocomplete dropdown'u olusturur veya mevcut olani dondurur.
     * @returns {HTMLElement} Dropdown container
     */
    function getOrCreateDropdown() {
        if (acDropdown) return acDropdown;
        acDropdown = document.createElement('div');
        acDropdown.className = 'dropdown-menu show p-0';
        acDropdown.style.cssText = 'max-height:300px;overflow-y:auto;width:100%;position:absolute;top:100%;left:0;z-index:1050;display:none;';
        stockCodeInput.parentNode.appendChild(acDropdown);
        return acDropdown;
    }

    /**
     * Autocomplete dropdown'u kapatir.
     */
    function closeAutocomplete() {
        var dd = getOrCreateDropdown();
        dd.style.display = 'none';
        while (dd.firstChild) dd.removeChild(dd.firstChild);
    }

    /**
     * Autocomplete sonuclarini gosterir.
     * @param {Array} results - Filtrelenmis hisse listesi
     */
    function showAutocompleteResults(results) {
        var dd = getOrCreateDropdown();
        while (dd.firstChild) dd.removeChild(dd.firstChild);

        if (results.length === 0) {
            dd.style.display = 'none';
            return;
        }

        for (var i = 0; i < results.length; i++) {
            (function (stock) {
                var a = document.createElement('a');
                a.className = 'dropdown-item d-flex align-items-center px-3 py-2';
                a.href = '#';

                var tickerSpan = document.createElement('span');
                tickerSpan.className = 'fw-semibold me-2';
                tickerSpan.textContent = stock.ticker || '';

                var descSpan = document.createElement('span');
                descSpan.className = 'text-muted fs-12 text-truncate';
                descSpan.textContent = stock.description || '';

                a.appendChild(tickerSpan);
                a.appendChild(descSpan);

                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    stockCodeInput.value = stock.ticker || '';
                    closeAutocomplete();
                    doSearch();
                });

                dd.appendChild(a);
            })(results[i]);
        }

        dd.style.display = 'block';
    }

    // Autocomplete input event
    stockCodeInput.addEventListener('input', function () {
        var query = (stockCodeInput.value || '').trim().toLowerCase();
        if (query.length < 1) {
            closeAutocomplete();
            return;
        }
        ensureStockCache(function (stocks) {
            var results = filterAutocomplete(stocks, query);
            showAutocompleteResults(results);
        });
    });

    // Dis tiklama ile kapat
    document.addEventListener('click', function (e) {
        if (!stockCodeInput.contains(e.target) && acDropdown && !acDropdown.contains(e.target)) {
            closeAutocomplete();
        }
    });

    function hideAll() {
        loadingArea.classList.add('d-none');
        errorArea.classList.add('d-none');
        resultsArea.classList.add('d-none');
        emptyArea.classList.add('d-none');
    }

    function showError(msg) {
        hideAll();
        errorMessage.textContent = msg;
        errorArea.classList.remove('d-none');
    }

    function truncate(text, max) {
        if (!text) return '';
        if (text.length <= max) return text;
        return text.substring(0, max) + '...';
    }

    function createResultCard(item) {
        var col = document.createElement('div');
        col.className = 'border rounded p-3 mb-3';

        // Header row
        var header = document.createElement('div');
        header.className = 'd-flex align-items-center justify-content-between mb-2';

        var titleEl = document.createElement('h6');
        titleEl.className = 'mb-0 fw-semibold';
        titleEl.textContent = item.baslik || 'Başlıksız';
        header.appendChild(titleEl);

        if (item.bildirimTipi) {
            var badge = document.createElement('span');
            badge.className = 'badge bg-info ms-2';
            badge.textContent = item.bildirimTipi;
            header.appendChild(badge);
        }
        col.appendChild(header);

        // Özet
        if (item.ozet) {
            var ozetEl = document.createElement('p');
            ozetEl.className = 'text-muted mb-2';
            ozetEl.textContent = truncate(item.ozet, MAX_OZET);
            col.appendChild(ozetEl);
        }

        // Footer row
        var footer = document.createElement('div');
        footer.className = 'd-flex align-items-center justify-content-between';

        var meta = document.createElement('div');
        meta.className = 'd-flex align-items-center gap-2';

        if (item.hisseSenediKodu) {
            var codeBadge = document.createElement('span');
            codeBadge.className = 'badge bg-primary';
            codeBadge.textContent = item.hisseSenediKodu;
            meta.appendChild(codeBadge);
        }

        if (item.tarih) {
            var tarihEl = document.createElement('small');
            tarihEl.className = 'text-muted';
            tarihEl.textContent = item.tarih;
            meta.appendChild(tarihEl);
        }
        footer.appendChild(meta);

        // Detay butonu
        if (item.chunkIds && item.chunkIds.length > 0) {
            var detayBtn = document.createElement('button');
            detayBtn.type = 'button';
            detayBtn.className = 'btn btn-sm btn-outline-primary';
            detayBtn.textContent = 'Detay';
            detayBtn.addEventListener('click', function () {
                showDetay(item.baslik || 'Detay', item.chunkIds.join(','));
            });
            footer.appendChild(detayBtn);
        }

        col.appendChild(footer);
        return col;
    }

    function doSearch() {
        var code = (stockCodeInput.value || '').trim().toUpperCase();
        if (!code) {
            showError('Lütfen bir hisse kodu girin.');
            return;
        }
        if (!/^[A-Za-z0-9]{1,10}$/.test(code)) {
            showError('Geçersiz hisse kodu. Sadece harf ve rakam kullanılabilir.');
            return;
        }

        hideAll();
        loadingArea.classList.remove('d-none');

        var controller = new AbortController();
        var timeoutId = setTimeout(function () {
            controller.abort();
        }, TIMEOUT_MS);

        var headers = { 'Accept': 'application/json' };
        if (csrfToken && csrfHeader) {
            headers[csrfHeader.getAttribute('content')] = csrfToken.getAttribute('content');
        }

        fetch(SEARCH_URL + '?stockCode=' + encodeURIComponent(code), {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        })
            .then(function (response) {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error('Sunucu hatası: ' + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                hideAll();
                if (!data || data.length === 0) {
                    emptyArea.classList.remove('d-none');
                    return;
                }

                // Sonuçları temizle
                while (resultsContainer.firstChild) {
                    resultsContainer.removeChild(resultsContainer.firstChild);
                }

                resultCount.textContent = data.length;
                data.forEach(function (item) {
                    resultsContainer.appendChild(createResultCard(item));
                });

                resultsArea.classList.remove('d-none');
            })
            .catch(function (err) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    showError('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
                } else {
                    showError('Arama sırasında bir hata oluştu: ' + err.message);
                }
            });
    }

    function showDetay(title, ids) {
        detayModalTitle.textContent = title;
        detayContent.textContent = '';
        detayLoading.classList.remove('d-none');

        var modal = new bootstrap.Modal(detayModal);
        modal.show();

        var controller = new AbortController();
        var timeoutId = setTimeout(function () {
            controller.abort();
        }, TIMEOUT_MS);

        var headers = { 'Accept': 'text/plain' };
        if (csrfToken && csrfHeader) {
            headers[csrfHeader.getAttribute('content')] = csrfToken.getAttribute('content');
        }

        fetch(DETAY_URL + '?ids=' + encodeURIComponent(ids), {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        })
            .then(function (response) {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error('Sunucu hatası: ' + response.status);
                }
                return response.text();
            })
            .then(function (text) {
                detayLoading.classList.add('d-none');
                detayContent.textContent = text || 'İçerik bulunamadı.';
            })
            .catch(function (err) {
                clearTimeout(timeoutId);
                detayLoading.classList.add('d-none');
                if (err.name === 'AbortError') {
                    detayContent.textContent = 'İstek zaman aşımına uğradı.';
                } else {
                    detayContent.textContent = 'Detay yüklenirken hata oluştu: ' + err.message;
                }
            });
    }

    // Event listeners
    searchBtn.addEventListener('click', doSearch);
    stockCodeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            closeAutocomplete();
            doSearch();
        }
        if (e.key === 'Escape') {
            closeAutocomplete();
        }
    });
})();
