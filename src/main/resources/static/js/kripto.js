/**
 * Kripto Para listesi sayfasi istemci tarafi mantigi.
 *
 * SSR ile gelen INITIAL_MARKETS uzerinde filtreleme, siralama ve sayfalama yapar.
 * Arama (debounce), kolon siralama, sayfalama, KPI guncelleme ve
 * sparkline grafik ozellikleri icerir. 2dk market polling + 5dk sparkline polling.
 */
(function () {
    'use strict';

    // ── Sabitler ──────────────────────────────────────────
    var PAGE_SIZE = 25;
    var MARKET_REFRESH = 30000; // 30sn
    var SPARKLINE_REFRESH = 300000; // 5dk
    var MAX_ERRORS = 3;
    var MAX_VISIBLE_PAGES = 7;

    // ── Durum ─────────────────────────────────────────────
    var allMarkets = [];
    var filteredMarkets = [];
    var currentPage = 1;
    var sortCol = 'marketCapRank';
    var sortAsc = true;
    var searchQuery = '';
    var sparklineCharts = {}; // coinId -> ApexCharts instance
    var consecutiveErrors = 0;
    var cachedSparklines = null;
    var debounceTimer = null;

    // ── DOM Referanslari ──────────────────────────────────
    var tableBody = null;
    var tableContainer = null;
    var emptyState = null;
    var paginationNav = null;
    var paginationInfo = null;

    // ── Formatlama Yardimcilari ──────────────────────────

    /**
     * USD para birimi formatlar. Buyukluge gore ondalik hassasiyet ayarlar.
     * @param {number|null} val - Formatlanacak deger
     * @returns {string} Formatlanmis USD degeri
     */
    function formatUsd(val) {
        if (val == null || isNaN(val)) return '--';
        if (val >= 1000) return '$' + val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (val >= 1) return '$' + val.toFixed(2);
        return '$' + val.toFixed(4);
    }

    /**
     * Buyuk sayilari kisaltilmis formatta gosterir (T/B/M).
     * @param {number|null} val - Formatlanacak deger
     * @returns {string} Kisaltilmis USD degeri
     */
    function formatCompact(val) {
        if (val == null || isNaN(val)) return '--';
        if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + ' Trilyon';
        if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + ' Milyar';
        if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + ' Milyon';
        if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + ' Bin';
        return '$' + val.toLocaleString('en-US');
    }

    /**
     * Yuzde degerini isaret ile formatlar.
     * @param {number|null} val - Formatlanacak yuzde degeri
     * @returns {string} Formatlanmis yuzde
     */
    function formatPercent(val) {
        if (val == null || isNaN(val)) return '--';
        var sign = val >= 0 ? '+' : '';
        return sign + val.toFixed(2) + '%';
    }

    /**
     * Degere gore renk sinifi dondurur.
     * @param {number|null} val - Kontrol edilecek deger
     * @returns {string} CSS sinif adi
     */
    function colorClass(val) {
        if (val == null || isNaN(val)) return 'text-muted';
        return val >= 0 ? 'text-success' : 'text-danger';
    }

    /**
     * Fear & Greed degeri icin renk sinifi dondurur.
     * @param {number} val - Fear & Greed endeks degeri (0-100)
     * @returns {string} Bootstrap renk adi
     */
    function fearGreedColor(val) {
        if (val <= 24) return 'danger';
        if (val <= 44) return 'warning';
        if (val <= 55) return 'info';
        if (val <= 74) return 'success';
        return 'primary';
    }

    // ── Filtre + Siralama + Sayfalama ────────────────────

    /**
     * Arama filtresi ve siralamayi uygulayarak tablo ve sayfalamayi yeniden render eder.
     */
    function applyFilters(resetPage) {
        var result = allMarkets;

        // Arama filtresi
        if (searchQuery.length >= 2) {
            var q = searchQuery.toLowerCase();
            result = result.filter(function (c) {
                return (c.name && c.name.toLowerCase().indexOf(q) !== -1) ||
                       (c.symbol && c.symbol.toLowerCase().indexOf(q) !== -1);
            });
        }

        // Siralama
        if (sortCol) {
            result = result.slice().sort(function (a, b) {
                var va = a[sortCol], vb = b[sortCol];
                if (sortCol === 'name') {
                    va = (va || '').toLowerCase();
                    vb = (vb || '').toLowerCase();
                }
                if (va == null && vb == null) return 0;
                if (va == null) return 1;
                if (vb == null) return -1;
                if (va < vb) return sortAsc ? -1 : 1;
                if (va > vb) return sortAsc ? 1 : -1;
                return 0;
            });
        }

        filteredMarkets = result;
        if (resetPage !== false) currentPage = 1;
        renderTable();
        renderPagination();
        updateResultCount();
    }

    // ── Tablo Render ─────────────────────────────────────

    /**
     * Mevcut sayfadaki coin verilerini tabloya render eder.
     */
    function renderTable() {
        if (!tableBody) return;

        // Mevcut sparkline chart instance'larini temizle (memory leak onlemi)
        Object.keys(sparklineCharts).forEach(function(coinId) {
            if (sparklineCharts[coinId]) sparklineCharts[coinId].destroy();
        });
        sparklineCharts = {};

        var start = (currentPage - 1) * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, filteredMarkets.length);
        var page = filteredMarkets.slice(start, end);

        // Empty state kontrolu
        if (page.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = '';
            return;
        }
        if (tableContainer) tableContainer.style.display = '';
        if (emptyState) emptyState.style.display = 'none';

        var fragment = document.createDocumentFragment();

        for (var i = 0; i < page.length; i++) {
            var c = page[i];
            var tr = document.createElement('tr');

            // # sira
            var tdRank = document.createElement('td');
            tdRank.className = 'fw-medium';
            tdRank.textContent = start + i + 1;
            tr.appendChild(tdRank);

            // Coin (logo + ad + sembol)
            var tdCoin = document.createElement('td');
            var coinDiv = document.createElement('div');
            coinDiv.className = 'd-flex align-items-center';
            var img = document.createElement('img');
            img.src = c.image || '';
            img.alt = c.symbol || '';
            img.width = 24;
            img.height = 24;
            img.className = 'rounded-circle me-2';
            img.onerror = function () { this.style.display = 'none'; };
            var nameDiv = document.createElement('div');
            var nameSpan = document.createElement('span');
            nameSpan.className = 'fw-medium text-primary';
            nameSpan.textContent = c.name || '';
            var symSpan = document.createElement('span');
            symSpan.className = 'text-muted ms-1 text-uppercase fs-11';
            symSpan.textContent = c.symbol || '';
            nameDiv.appendChild(nameSpan);
            nameDiv.appendChild(symSpan);
            coinDiv.appendChild(img);
            coinDiv.appendChild(nameDiv);
            tdCoin.appendChild(coinDiv);
            tr.appendChild(tdCoin);

            // Fiyat
            var tdPrice = document.createElement('td');
            tdPrice.className = 'fw-medium';
            tdPrice.textContent = formatUsd(c.currentPrice);
            tr.appendChild(tdPrice);

            // 1s%
            var td1h = document.createElement('td');
            td1h.className = colorClass(c.priceChangePercentage1hInCurrency);
            td1h.textContent = formatPercent(c.priceChangePercentage1hInCurrency);
            tr.appendChild(td1h);

            // 24s%
            var td24h = document.createElement('td');
            td24h.className = colorClass(c.priceChangePercentage24hInCurrency);
            td24h.textContent = formatPercent(c.priceChangePercentage24hInCurrency);
            tr.appendChild(td24h);

            // 7g%
            var td7d = document.createElement('td');
            td7d.className = colorClass(c.priceChangePercentage7dInCurrency);
            td7d.textContent = formatPercent(c.priceChangePercentage7dInCurrency);
            tr.appendChild(td7d);

            // Market Cap
            var tdMcap = document.createElement('td');
            tdMcap.textContent = formatCompact(c.marketCap);
            tr.appendChild(tdMcap);

            // Hacim
            var tdVol = document.createElement('td');
            tdVol.textContent = formatCompact(c.totalVolume);
            tr.appendChild(tdVol);

            // 7g Sparkline
            var tdSpark = document.createElement('td');
            var sparkDiv = document.createElement('div');
            sparkDiv.className = 'sparkline-chart';
            sparkDiv.setAttribute('data-coin-id', c.id || '');
            sparkDiv.style.width = '120px';
            sparkDiv.style.height = '40px';
            tdSpark.appendChild(sparkDiv);
            tr.appendChild(tdSpark);

            // Satir tiklama — detay sayfasina yonlendirme
            tr.style.cursor = 'pointer';
            (function (id) {
                tr.addEventListener('click', function () {
                    window.location.href = '/kripto/' + encodeURIComponent(id);
                });
            })(c.id);

            fragment.appendChild(tr);
        }

        // Mevcut satirlari temizle ve yenilerini ekle
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        tableBody.appendChild(fragment);
    }

    // ── Sayfalama ────────────────────────────────────────

    /**
     * Sayfalama kontrollerini render eder.
     */
    function renderPagination() {
        var totalPages = Math.ceil(filteredMarkets.length / PAGE_SIZE);

        // Info
        if (paginationInfo) {
            var start = filteredMarkets.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
            var end = Math.min(currentPage * PAGE_SIZE, filteredMarkets.length);
            paginationInfo.textContent = filteredMarkets.length > 0
                ? start + '-' + end + ' / ' + filteredMarkets.length + ' coin'
                : '0 coin';
        }

        if (!paginationNav) return;
        while (paginationNav.firstChild) {
            paginationNav.removeChild(paginationNav.firstChild);
        }

        if (totalPages <= 1) return;

        // Onceki
        appendPageItem('\u00AB', currentPage > 1 ? currentPage - 1 : null, false);

        // Sayfa numaralari
        var pages = calculatePageNumbers(totalPages);
        for (var i = 0; i < pages.length; i++) {
            if (pages[i] === '...') {
                appendEllipsis();
            } else {
                appendPageItem(pages[i], pages[i], pages[i] === currentPage);
            }
        }

        // Sonraki
        appendPageItem('\u00BB', currentPage < totalPages ? currentPage + 1 : null, false);
    }

    /**
     * Sayfalama elemani ekler.
     * @param {string|number} label - Gorunecek metin
     * @param {number|null} page - Tiklaninca gidilecek sayfa
     * @param {boolean} isActive - Aktif sayfa mi
     */
    function appendPageItem(label, page, isActive) {
        var li = document.createElement('li');
        li.className = 'page-item' + (isActive ? ' active' : '') + (page == null ? ' disabled' : '');
        var a = document.createElement('a');
        a.className = 'page-link';
        a.textContent = label;
        a.href = 'javascript:void(0);';
        if (page != null && !isActive) {
            (function (p) {
                a.addEventListener('click', function () {
                    currentPage = p;
                    renderTable();
                    renderPagination();
                    fetchAndRenderSparklines();
                    var table = document.getElementById('kripto-table');
                    if (table) table.scrollIntoView({behavior: 'smooth', block: 'start'});
                });
            })(page);
        }
        li.appendChild(a);
        paginationNav.appendChild(li);
    }

    /**
     * Sayfalamaya uc nokta (ellipsis) ekler.
     */
    function appendEllipsis() {
        var li = document.createElement('li');
        li.className = 'page-item disabled';
        var span = document.createElement('span');
        span.className = 'page-link';
        span.textContent = '...';
        li.appendChild(span);
        paginationNav.appendChild(li);
    }

    /**
     * Sayfa numaralarini hesaplar (ellipsis dahil).
     * @param {number} totalPages - Toplam sayfa sayisi
     * @returns {Array} Sayfa numaralari dizisi
     */
    function calculatePageNumbers(totalPages) {
        if (totalPages <= MAX_VISIBLE_PAGES) {
            var all = [];
            for (var i = 1; i <= totalPages; i++) all.push(i);
            return all;
        }

        var pages = [];
        var half = Math.floor(MAX_VISIBLE_PAGES / 2);

        if (currentPage <= half + 1) {
            for (var j = 1; j <= MAX_VISIBLE_PAGES - 2; j++) pages.push(j);
            pages.push('...');
            pages.push(totalPages);
        } else if (currentPage >= totalPages - half) {
            pages.push(1);
            pages.push('...');
            for (var k = totalPages - MAX_VISIBLE_PAGES + 3; k <= totalPages; k++) pages.push(k);
        } else {
            pages.push(1);
            pages.push('...');
            for (var m = currentPage - 1; m <= currentPage + 1; m++) pages.push(m);
            pages.push('...');
            pages.push(totalPages);
        }

        return pages;
    }

    /**
     * Sonuc sayisi badge'ini gunceller.
     */
    function updateResultCount() {
        var el = document.getElementById('kripto-result-count');
        if (el) el.textContent = filteredMarkets.length;
    }

    function updateLastUpdateTime() {
        var el = document.getElementById('kripto-last-update');
        if (el) {
            var now = new Date();
            el.textContent = 'Son g\u00fcncelleme: ' + now.toLocaleTimeString('tr-TR');
        }
    }

    // ── KPI Guncelleme ───────────────────────────────────

    /**
     * Global piyasa ve Fear & Greed KPI kartlarini gunceller.
     * @param {Object|null} global - Global piyasa verisi
     * @param {Object|null} fearGreed - Fear & Greed endeks verisi
     */
    function updateKpis(global, fearGreed) {
        if (global) {
            var mcEl = document.getElementById('kpi-market-cap');
            if (mcEl) mcEl.textContent = formatCompact(global.totalMarketCapUsd);

            var volEl = document.getElementById('kpi-volume');
            if (volEl) volEl.textContent = formatCompact(global.totalVolumeUsd);

            var btcEl = document.getElementById('kpi-btc-dominance');
            if (btcEl) btcEl.textContent = (global.btcDominance || 0).toFixed(1) + '%';

            var chgEl = document.getElementById('kpi-market-change');
            if (chgEl) {
                var chg = global.marketCapChangePercentage24hUsd || 0;
                chgEl.textContent = formatPercent(chg);
                chgEl.className = colorClass(chg) + ' fs-16 fw-semibold ff-secondary mb-4';
            }
        }

        if (fearGreed) {
            var fgVal = document.getElementById('kpi-fear-greed-value');
            var fgLabel = document.getElementById('kpi-fear-greed-label');
            if (fgVal) fgVal.textContent = fearGreed.value;
            if (fgLabel) {
                fgLabel.textContent = fearGreed.classification || '';
                var fc = fearGreedColor(fearGreed.value);
                fgLabel.className = 'badge bg-' + fc + '-subtle text-' + fc;
            }
        }
    }

    // ── Sparkline Render ─────────────────────────────────

    /**
     * Tek bir sparkline grafik olusturur veya gunceller.
     * @param {HTMLElement} container - Grafik container elemani
     * @param {Array} data - Fiyat veri dizisi
     * @param {boolean} isPositive - Pozitif trend mi
     */
    function renderSparkline(container, data, isPositive) {
        if (!container || !data || data.length === 0) return;
        if (typeof ApexCharts === 'undefined') return;

        var coinId = container.getAttribute('data-coin-id');
        // Mevcut chart varsa destroy et
        if (sparklineCharts[coinId]) {
            sparklineCharts[coinId].destroy();
        }

        var color = isPositive ? '#6ada7d' : '#fa896b';
        var chart = new ApexCharts(container, {
            series: [{data: data}],
            chart: {type: 'area', height: 40, width: 120, sparkline: {enabled: true}, toolbar: {show: false}},
            stroke: {curve: 'smooth', width: 1.5},
            fill: {
                type: 'gradient',
                gradient: {shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [50, 100]}
            },
            colors: [color],
            tooltip: {enabled: false}
        });
        chart.render();
        sparklineCharts[coinId] = chart;
    }

    /**
     * Mevcut sayfadaki tum sparkline grafikleri render eder.
     * @param {Object} sparklinesMap - coinId -> fiyat dizisi eslesmesi
     */
    function renderSparklinesForPage(sparklinesMap) {
        if (!sparklinesMap) return;
        var containers = document.querySelectorAll('.sparkline-chart');
        for (var i = 0; i < containers.length; i++) {
            var coinId = containers[i].getAttribute('data-coin-id');
            var data = sparklinesMap[coinId];
            if (data && data.length > 0) {
                containers[i].style.display = '';
                var isPositive = data[data.length - 1] >= data[0];
                renderSparkline(containers[i], data, isPositive);
            } else {
                containers[i].style.display = 'none';
                var parent = containers[i].parentNode;
                if (parent) {
                    // Onceki no-sparkline span'i temizle
                    var existing = parent.querySelector('.no-sparkline');
                    if (existing) existing.remove();
                    var span = document.createElement('span');
                    span.className = 'no-sparkline text-muted fs-12';
                    span.textContent = '\u2014';
                    parent.appendChild(span);
                }
            }
        }
    }

    // ── AJAX Cagrilari ───────────────────────────────────

    /**
     * Market verilerini AJAX ile ceker ve tabloyu gunceller.
     */
    function fetchMarkets() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/ajax/kripto/markets', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 15000;
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data && data.length > 0) {
                        allMarkets = data;
                        applyFilters(false);
                        fetchAndRenderSparklines();
                        updateLastUpdateTime();
                        consecutiveErrors = 0;
                    }
                } catch (e) {
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

    /**
     * Sparkline verilerini AJAX ile ceker ve mevcut sayfaya render eder.
     * Onbellekteki veri varsa dogrudan kullanir.
     */
    function fetchAndRenderSparklines() {
        // Cached varsa hemen render et (sayfa degisiminde)
        if (cachedSparklines) {
            renderSparklinesForPage(cachedSparklines);
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/ajax/kripto/sparklines', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 20000;
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    cachedSparklines = JSON.parse(xhr.responseText);
                    renderSparklinesForPage(cachedSparklines);
                } catch (e) { /* silent */ }
            }
        };
        xhr.onerror = xhr.ontimeout = function () { /* silent */ };
        xhr.send();
    }

    /**
     * Global piyasa ve Fear & Greed verilerini AJAX ile ceker.
     */
    function fetchGlobalAndFearGreed() {
        // Global
        var xhr1 = new XMLHttpRequest();
        xhr1.open('GET', '/ajax/kripto/global', true);
        xhr1.setRequestHeader('Accept', 'application/json');
        xhr1.timeout = 10000;
        xhr1.onload = function () {
            if (xhr1.status >= 200 && xhr1.status < 300) {
                try {
                    updateKpis(JSON.parse(xhr1.responseText), null);
                } catch (e) { /* silent */ }
            }
        };
        xhr1.send();

        // Fear & Greed
        var xhr2 = new XMLHttpRequest();
        xhr2.open('GET', '/ajax/kripto/fear-greed', true);
        xhr2.setRequestHeader('Accept', 'application/json');
        xhr2.timeout = 10000;
        xhr2.onload = function () {
            if (xhr2.status >= 200 && xhr2.status < 300) {
                try {
                    updateKpis(null, JSON.parse(xhr2.responseText));
                } catch (e) { /* silent */ }
            }
        };
        xhr2.send();
    }

    /**
     * Ardisik hata sayacini arttirir. MAX_ERRORS'a ulasirsa sifirlar.
     */
    function handleError() {
        consecutiveErrors++;
        // MAX_ERRORS'a ulasinca polling durur, basarili response'ta sifirlanir (line 509)
    }

    // ── Sort Header Binding ──────────────────────────────

    /**
     * Tablo baslik tiklamalarini dinler ve siralama uygular.
     */
    function bindSortHeaders() {
        var headers = document.querySelectorAll('th[data-col]');
        for (var i = 0; i < headers.length; i++) {
            headers[i].style.cursor = 'pointer';
            headers[i].addEventListener('click', function () {
                var col = this.getAttribute('data-col');
                if (sortCol === col) {
                    sortAsc = !sortAsc;
                } else {
                    sortCol = col;
                    sortAsc = col === 'name'; // isim asc, sayilar desc
                }
                // Ikon guncelle
                var allIcons = document.querySelectorAll('th[data-col] i.sort-icon');
                for (var j = 0; j < allIcons.length; j++) {
                    allIcons[j].className = 'sort-icon ri-arrow-up-down-line text-muted ms-1 fs-13';
                }
                var icon = this.querySelector('i.sort-icon');
                if (icon) {
                    icon.className = 'sort-icon ms-1 fs-13 ' + (sortAsc ? 'ri-arrow-up-s-fill text-primary' : 'ri-arrow-down-s-fill text-primary');
                }
                applyFilters();
            });
        }
    }

    // ── Arama Binding ────────────────────────────────────

    /**
     * Arama inputunu dinler ve debounce ile filtreleme uygular.
     */
    function bindSearch() {
        var input = document.getElementById('kripto-search');
        if (!input) return;
        input.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                searchQuery = input.value.trim();
                applyFilters();
            }, 300);
        });
    }

    // ── Baslangic ────────────────────────────────────────

    /**
     * Sayfa yuklendiginde tum bilesenleri baslatir.
     */
    function init() {
        // DOM referanslarini al
        tableBody = document.getElementById('kripto-table-body');
        tableContainer = document.getElementById('kripto-table-container');
        emptyState = document.getElementById('kripto-empty-state');
        paginationNav = document.getElementById('kripto-pagination');
        paginationInfo = document.getElementById('kripto-pagination-info');

        allMarkets = window.INITIAL_MARKETS || [];

        // SSR KPI guncelle
        if (window.INITIAL_GLOBAL) updateKpis(window.INITIAL_GLOBAL, null);
        if (window.INITIAL_FEAR_GREED) updateKpis(null, window.INITIAL_FEAR_GREED);

        bindSortHeaders();
        bindSearch();

        // Varsayilan siralama: piyasa degerine gore (marketCap DESC)
        sortCol = 'marketCap';
        sortAsc = false;

        if (allMarkets.length > 0) {
            applyFilters();
            fetchAndRenderSparklines();
            updateLastUpdateTime();
        } else {
            fetchMarkets();
        }

        // Polling baslat (error backoff: MAX_ERRORS asildiysa polling durur, basarili response'ta devam eder)
        setInterval(function () {
            if (consecutiveErrors < MAX_ERRORS) {
                fetchMarkets();
                fetchGlobalAndFearGreed();
            }
        }, MARKET_REFRESH);

        setInterval(function () {
            cachedSparklines = null; // Cache temizle, yeni veri cek
            fetchAndRenderSparklines();
        }, SPARKLINE_REFRESH);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
