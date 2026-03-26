/**
 * Hazir Taramalar (Preset Screener) sayfasi istemci tarafi mantigi.
 *
 * AJAX ile strateji tarama sonuclarini getirir, istemci tarafinda siralama
 * ve sayfalama yapar. Hacim degerleri Turkce formatlanir (Milyar/Milyon/Bin).
 */
(function () {
    'use strict';

    // ── Sabitler ──────────────────────────────────────────
    var PAGE_SIZE = 15;
    var MAX_VISIBLE_PAGES = 7;

    // ── Durum ─────────────────────────────────────────────
    var allStocks = [];
    var currentPage = 1;
    var sortColumn = 'changePercent';
    var sortOrder = 'desc';

    // ── DOM Referanslari ──────────────────────────────────
    var strategySelect = document.getElementById('strategySelect');
    var btnScan = document.getElementById('btnScan');
    var strategyDescription = document.getElementById('strategyDescription');
    var loadingSpinner = document.getElementById('loadingSpinner');
    var errorMessage = document.getElementById('errorMessage');
    var errorText = document.getElementById('errorText');
    var resultsSection = document.getElementById('resultsSection');
    var resultsTitle = document.getElementById('resultsTitle');
    var resultCountBadge = document.getElementById('resultCountBadge');
    var resultsTableContainer = document.getElementById('resultsTableContainer');
    var resultsTableBody = document.getElementById('resultsTableBody');
    var emptyState = document.getElementById('emptyState');
    var initialState = document.getElementById('initialState');
    var paginationContainer = document.getElementById('paginationContainer');
    var paginationInfo = document.getElementById('paginationInfo');
    var paginationNav = document.getElementById('paginationNav');

    // ── Baslangic ─────────────────────────────────────────
    function init() {
        bindEvents();
    }

    // ── Event Binding ─────────────────────────────────────
    function bindEvents() {
        // Tara butonu
        if (btnScan) {
            btnScan.addEventListener('click', scanStrategy);
        }

        // Strateji secim degisikliginde aciklama goster
        if (strategySelect) {
            strategySelect.addEventListener('change', function () {
                var code = strategySelect.value;
                var descriptions = window.strategyDescriptions || {};
                if (code && descriptions[code]) {
                    strategyDescription.textContent = descriptions[code];
                    strategyDescription.style.display = '';
                } else {
                    strategyDescription.style.display = 'none';
                }
            });

            // Enter tusu ile tarama
            strategySelect.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    scanStrategy();
                }
            });
        }

        // Kolon siralama
        var sortHeaders = document.querySelectorAll('#resultsTable th.sortable');
        if (!sortHeaders || sortHeaders.length === 0) return;
        sortHeaders.forEach(function (th) {
            th.addEventListener('click', function () {
                var col = th.getAttribute('data-col');
                if (sortColumn === col) {
                    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = col;
                    sortOrder = 'desc';
                }

                // Ikon guncelle
                sortHeaders.forEach(function (h) {
                    var icon = h.querySelector('i');
                    if (icon) icon.className = 'ri-arrow-up-down-line text-muted fs-13';
                });
                var activeIcon = th.querySelector('i');
                if (activeIcon) {
                    activeIcon.className = sortOrder === 'asc'
                        ? 'ri-arrow-up-s-fill text-primary fs-13'
                        : 'ri-arrow-down-s-fill text-primary fs-13';
                }

                currentPage = 1;
                renderTable();
            });
        });
    }

    // ── AJAX Tarama ───────────────────────────────────────
    function scanStrategy() {
        var strategy = strategySelect ? strategySelect.value : '';
        if (!strategy) {
            showError('Lutfen bir strateji seciniz.');
            return;
        }

        // UI durum: yukleniyor
        hideAll();
        loadingSpinner.style.display = '';

        // 30 saniye timeout icin AbortController
        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, 30000);

        fetch('/ajax/hazir-taramalar/scan?strategy=' + encodeURIComponent(strategy), { signal: controller.signal })
            .then(function (response) {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error('Sunucu hatasi: ' + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                loadingSpinner.style.display = 'none';
                renderResults(data);
            })
            .catch(function (err) {
                clearTimeout(timeoutId);
                loadingSpinner.style.display = 'none';
                showError('Tarama sirasinda bir hata olustu: ' + err.message);
                initialState.style.display = '';
            });
    }

    // ── Sonuclari Render Et ───────────────────────────────
    function renderResults(data) {
        allStocks = (data && data.stocks) ? data.stocks : [];

        // Baslik guncelle
        if (data && data.strategyDisplayName) {
            resultsTitle.textContent = data.strategyDisplayName + ' Sonuclari';
        } else {
            resultsTitle.textContent = 'Tarama Sonuclari';
        }

        // Sonuc sayisi badge
        resultCountBadge.textContent = allStocks.length + ' kritere uygun hisse tespit edildi';

        // Sonuc varsa tabloyu goster
        if (allStocks.length > 0) {
            resultsSection.style.display = '';
            resultsTableContainer.style.display = '';
            emptyState.style.display = 'none';
        } else {
            resultsSection.style.display = '';
            resultsTableContainer.style.display = 'none';
            emptyState.style.display = '';
        }

        currentPage = 1;
        renderTable();
    }

    // ── Tablo Render ──────────────────────────────────────
    function renderTable() {
        // Sirala
        var sorted = allStocks.slice();
        sortStocks(sorted);

        // Sayfalama dilimi
        var start = (currentPage - 1) * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, sorted.length);
        var pageData = sorted.slice(start, end);

        // Tabloya yaz
        var fragment = document.createDocumentFragment();
        for (var i = 0; i < pageData.length; i++) {
            var stock = pageData[i];
            var rowNum = start + i + 1;
            var tr = createRow(stock, rowNum);
            fragment.appendChild(tr);
        }

        while (resultsTableBody.firstChild) {
            resultsTableBody.removeChild(resultsTableBody.firstChild);
        }
        resultsTableBody.appendChild(fragment);

        renderPagination(sorted.length);
    }

    function createRow(stock, rowNum) {
        var tr = document.createElement('tr');

        // # (sira)
        var tdNum = document.createElement('td');
        tdNum.textContent = rowNum;
        tr.appendChild(tdNum);

        // Hisse (logo + code + name)
        var tdStock = document.createElement('td');
        var stockDiv = document.createElement('div');
        stockDiv.className = 'd-flex align-items-center';

        // Logo
        var avatar = document.createElement('div');
        avatar.className = 'flex-shrink-0 avatar-xs me-2';

        if (stock.logoid) {
            var logoImg = document.createElement('img');
            logoImg.src = '/img/stock-logos/' + encodeURIComponent(stock.logoid);
            logoImg.alt = stock.stockCode || '';
            logoImg.className = 'avatar-xs rounded-circle';

            var fallbackSpan = document.createElement('span');
            fallbackSpan.className = 'avatar-title rounded-circle fw-semibold';
            fallbackSpan.style.cssText = 'display:none;background:transparent;color:#495057;border:1.5px solid #ced4da;font-size:0.55rem';
            fallbackSpan.textContent = stock.stockCode ? stock.stockCode.substring(0, Math.min(4, stock.stockCode.length)) : '?';

            (function (img, fallback) {
                img.onerror = function () {
                    img.style.display = 'none';
                    fallback.style.display = 'flex';
                };
            })(logoImg, fallbackSpan);

            avatar.appendChild(logoImg);
            avatar.appendChild(fallbackSpan);
        } else {
            var avatarInner = document.createElement('div');
            avatarInner.className = 'avatar-title rounded-circle fw-semibold';
            avatarInner.style.cssText = 'background:transparent;color:#495057;border:1.5px solid #ced4da;font-size:0.55rem';
            avatarInner.textContent = stock.stockCode ? stock.stockCode.substring(0, Math.min(4, stock.stockCode.length)) : '?';
            avatar.appendChild(avatarInner);
        }
        stockDiv.appendChild(avatar);

        // Hisse bilgisi (code + name)
        var stockInfo = document.createElement('div');
        var stockCodeLink = document.createElement('a');
        stockCodeLink.href = '/stock/detail/' + encodeURIComponent(stock.stockCode || '');
        stockCodeLink.className = 'fw-semibold text-primary';
        stockCodeLink.textContent = stock.stockCode || '-';
        stockInfo.appendChild(stockCodeLink);
        if (stock.katilim) {
            var kBadge = document.createElement('span');
            kBadge.className = 'badge bg-success bg-opacity-25 text-success ms-1';
            kBadge.style.cssText = 'font-size:0.65rem;padding:1px 4px;';
            kBadge.title = 'Katılım Endeksi';
            kBadge.textContent = 'K';
            stockInfo.appendChild(kBadge);
        }

        if (stock.stockName) {
            var stockNameSpan = document.createElement('div');
            stockNameSpan.className = 'text-muted fs-12';
            stockNameSpan.textContent = stock.stockName;
            stockInfo.appendChild(stockNameSpan);
        }

        stockDiv.appendChild(stockInfo);
        tdStock.appendChild(stockDiv);
        tr.appendChild(tdStock);

        // Fiyat
        var tdPrice = document.createElement('td');
        tdPrice.className = 'text-end';
        tdPrice.textContent = formatPrice(stock.price);
        tr.appendChild(tdPrice);

        // Degisim %
        var tdChange = document.createElement('td');
        tdChange.className = 'text-end fw-medium';
        tdChange.textContent = formatChange(stock.changePercent);
        if (stock.changePercent != null) {
            if (stock.changePercent > 0) {
                tdChange.classList.add('text-success');
            } else if (stock.changePercent < 0) {
                tdChange.classList.add('text-danger');
            }
        }
        tr.appendChild(tdChange);

        // Goreceli Hacim
        var tdRelVol = document.createElement('td');
        tdRelVol.className = 'text-end';
        tdRelVol.textContent = formatRelativeVolume(stock.relativeVolume);
        tr.appendChild(tdRelVol);

        // Ort. Hacim 10G
        var tdVol10 = document.createElement('td');
        tdVol10.className = 'text-end';
        tdVol10.textContent = formatVolume(stock.avgVolume10d);
        tr.appendChild(tdVol10);

        // Ort. Hacim 60G
        var tdVol60 = document.createElement('td');
        tdVol60.className = 'text-end';
        tdVol60.textContent = formatVolume(stock.avgVolume60d);
        tr.appendChild(tdVol60);

        // Ort. Hacim 90G
        var tdVol90 = document.createElement('td');
        tdVol90.className = 'text-end';
        tdVol90.textContent = formatVolume(stock.avgVolume90d);
        tr.appendChild(tdVol90);

        return tr;
    }

    // ── Siralama ──────────────────────────────────────────
    function sortStocks(arr) {
        if (!sortColumn) return;

        arr.sort(function (a, b) {
            var valA, valB;

            if (sortColumn === 'stockCode') {
                valA = (a.stockCode || '').toLocaleLowerCase('tr');
                valB = (b.stockCode || '').toLocaleLowerCase('tr');
            } else {
                valA = a[sortColumn] != null ? a[sortColumn] : null;
                valB = b[sortColumn] != null ? b[sortColumn] : null;
            }

            // Null degerleri sona it
            if (valA == null && valB == null) return 0;
            if (valA == null) return 1;
            if (valB == null) return -1;

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // ── Formatlama Fonksiyonlari ─────────────────────────

    /**
     * Fiyat formatlama: 123.45 -> "123,45 TL"
     */
    function formatPrice(val) {
        if (val == null) return '-';
        return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20BA';
    }

    /**
     * Degisim yuzdesi formatlama: 2.45 -> "+2.45%"
     */
    function formatChange(val) {
        if (val == null) return '-';
        var prefix = val > 0 ? '+' : '';
        return prefix + val.toFixed(2) + '%';
    }

    /**
     * Goreceli hacim formatlama: 2.45 -> "2.45x"
     */
    function formatRelativeVolume(val) {
        if (val == null) return '-';
        return val.toFixed(2) + 'x';
    }

    /**
     * Hacim formatlama (Turkce): Milyar, Milyon, Bin (B/M/K KULLANILMAZ)
     */
    function formatVolume(val) {
        if (val == null) return '-';
        if (val >= 1000000000) return (val / 1000000000).toFixed(2) + ' Milyar';
        if (val >= 1000000) return (val / 1000000).toFixed(2) + ' Milyon';
        if (val >= 1000) return (val / 1000).toFixed(1) + ' Bin';
        return val.toLocaleString('tr-TR');
    }

    // ── Sayfalama ─────────────────────────────────────────
    function renderPagination(totalItems) {
        var totalPages = Math.ceil(totalItems / PAGE_SIZE);

        // Info
        if (paginationInfo) {
            var start = totalItems > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
            var end = Math.min(currentPage * PAGE_SIZE, totalItems);
            paginationInfo.textContent = totalItems > 0
                ? start + '-' + end + ' / ' + totalItems + ' hisse'
                : '0 hisse';
        }

        if (!paginationNav) return;
        while (paginationNav.firstChild) {
            paginationNav.removeChild(paginationNav.firstChild);
        }

        if (totalPages <= 1) {
            paginationContainer.style.display = totalItems > 0 ? '' : 'none';
            return;
        }

        paginationContainer.style.display = '';

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

    function appendPageItem(label, page, isActive) {
        var li = document.createElement('li');
        li.className = 'page-item' + (isActive ? ' active' : '') + (page == null ? ' disabled' : '');
        var a = document.createElement('a');
        a.className = 'page-link';
        a.textContent = label;
        a.href = 'javascript:void(0);';
        if (page != null && !isActive) {
            (function (targetPage) {
                a.addEventListener('click', function () {
                    currentPage = targetPage;
                    renderTable();
                    var table = document.getElementById('resultsTable');
                    if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            })(page);
        }
        li.appendChild(a);
        paginationNav.appendChild(li);
    }

    function appendEllipsis() {
        var li = document.createElement('li');
        li.className = 'page-item disabled';
        var span = document.createElement('span');
        span.className = 'page-link';
        span.textContent = '...';
        li.appendChild(span);
        paginationNav.appendChild(li);
    }

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

    // ── UI Yardimci ───────────────────────────────────────
    function hideAll() {
        loadingSpinner.style.display = 'none';
        errorMessage.style.display = 'none';
        resultsSection.style.display = 'none';
        initialState.style.display = 'none';
    }

    function showError(msg) {
        hideAll();
        errorText.textContent = msg;
        errorMessage.style.display = '';
    }

    // ── Baslat ────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
