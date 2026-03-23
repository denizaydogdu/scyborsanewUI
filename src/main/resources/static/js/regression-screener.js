/**
 * Regresyon Kanali tarama modulu.
 * Hazir Taramalar sayfasindaki 4. bolum icin client-side filtre, siralama ve sayfalama.
 *
 * API: GET /ajax/hazir-taramalar/regression-scan
 * Donus: { regressions: [...], totalCount: N }
 *
 * Filtre mantigi:
 * - Egim grubu (OR): selectedSlopes icinde slope degeri
 * - Pozisyon grubu (OR): selectedPositions icinde position degeri
 * - Trend Gucu (AND): strongTrendOnly true ise R² >= 0.7
 * - Gruplar arasi: AND
 * - Bos grup: bypass (herkes gecer)
 */
(function() {
    'use strict';

    /* ========== Sabitler ========== */

    var PAGE_SIZE = 20;

    var POSITION_LABELS = {
        above: 'Kanal Ustu',
        upper: 'Ust Bolge',
        middle: 'Orta Bolge',
        lower: 'Alt Bolge',
        below: 'Kanal Alti'
    };
    var POSITION_COLORS = {
        above: 'success',
        upper: 'success',
        middle: 'primary',
        lower: 'danger',
        below: 'danger'
    };
    var SLOPE_LABELS = { up: 'Yukselis', down: 'Dusus' };
    var SLOPE_COLORS = { up: 'success', down: 'danger' };
    var SLOPE_ICONS = { up: 'ri-arrow-up-line', down: 'ri-arrow-down-line' };

    /* ========== State ========== */

    var allStocks = [];
    var filteredStocks = [];
    var currentPage = 1;
    var sortColumn = 'r2';
    var sortOrder = 'desc';
    var currentController = null;
    var selectedSlopes = new Set();
    var selectedPositions = new Set();
    var strongTrendOnly = false;

    /* ========== DOM Refs ========== */

    var rcKpiCards, rcKpiTotal, rcKpiUptrend, rcKpiDowntrend, rcKpiStrong, rcKpiOutside;
    var rcLoading, rcError, rcErrorText, rcResults, rcEmpty;
    var rcTableBody, rcCountBadge;
    var rcPagination, rcPaginationInfo, rcPaginationNav;
    var btnRcScan, btnRcReset, btnRcStrong;
    var rcDetailModal, rcDetailModalTitle, rcDetailModalBody;

    /* ========== Init ========== */

    function init() {
        // DOM referanslarini al
        rcKpiCards = document.getElementById('rcKpiCards');
        rcKpiTotal = document.getElementById('rcKpiTotal');
        rcKpiUptrend = document.getElementById('rcKpiUptrend');
        rcKpiDowntrend = document.getElementById('rcKpiDowntrend');
        rcKpiStrong = document.getElementById('rcKpiStrong');
        rcKpiOutside = document.getElementById('rcKpiOutside');
        rcLoading = document.getElementById('rcLoading');
        rcError = document.getElementById('rcError');
        rcErrorText = document.getElementById('rcErrorText');
        rcResults = document.getElementById('rcResults');
        rcEmpty = document.getElementById('rcEmpty');
        rcTableBody = document.getElementById('rcTableBody');
        rcCountBadge = document.getElementById('rcCountBadge');
        rcPagination = document.getElementById('rcPagination');
        rcPaginationInfo = document.getElementById('rcPaginationInfo');
        rcPaginationNav = document.getElementById('rcPaginationNav');
        rcDetailModal = document.getElementById('rcDetailModal');
        rcDetailModalTitle = document.getElementById('rcDetailModalTitle');
        rcDetailModalBody = document.getElementById('rcDetailModalBody');
        btnRcScan = document.getElementById('btnRcScan');
        btnRcReset = document.getElementById('btnRcReset');
        btnRcStrong = document.getElementById('btnRcStrong');

        // Egim butonlari
        var slopeBtns = document.querySelectorAll('.rc-slope-btn');
        for (var i = 0; i < slopeBtns.length; i++) {
            (function(btn) {
                btn.addEventListener('click', function() {
                    var val = btn.getAttribute('data-rc-slope');
                    toggleSetFilter(selectedSlopes, val, btn);
                });
            })(slopeBtns[i]);
        }

        // Pozisyon butonlari
        var posBtns = document.querySelectorAll('.rc-position-btn');
        for (var j = 0; j < posBtns.length; j++) {
            (function(btn) {
                btn.addEventListener('click', function() {
                    var val = btn.getAttribute('data-rc-position');
                    toggleSetFilter(selectedPositions, val, btn);
                });
            })(posBtns[j]);
        }

        // Guclu Trend butonu
        if (btnRcStrong) {
            btnRcStrong.addEventListener('click', function() {
                strongTrendOnly = !strongTrendOnly;
                toggleButtonVisual(btnRcStrong, strongTrendOnly);
                if (allStocks.length > 0) {
                    applyFilters();
                    sortData();
                    currentPage = 1;
                    renderResults();
                }
            });
        }

        // Tara butonu
        if (btnRcScan) {
            btnRcScan.addEventListener('click', function() {
                fetchData();
            });
        }

        // Sifirla butonu
        if (btnRcReset) {
            btnRcReset.addEventListener('click', function() {
                resetFilters();
            });
        }

        // Siralama baslik tiklama
        var sortHeaders = document.querySelectorAll('.rc-sortable');
        for (var k = 0; k < sortHeaders.length; k++) {
            (function(th) {
                th.style.cursor = 'pointer';
                th.addEventListener('click', function() {
                    var col = th.getAttribute('data-col');
                    if (!col) return;
                    if (sortColumn === col) {
                        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                    } else {
                        sortColumn = col;
                        sortOrder = 'desc';
                    }
                    if (filteredStocks.length > 0) {
                        sortData();
                        currentPage = 1;
                        renderTable();
                        renderPagination();
                        updateSortIndicators();
                    }
                });
            })(sortHeaders[k]);
        }

        // Otomatik fetch
        fetchData();
    }

    /* ========== Veri Cekme ========== */

    function fetchData() {
        // Onceki istegi iptal et
        if (currentController) {
            try { currentController.abort(); } catch(e) { /* ignore */ }
        }
        currentController = new AbortController();

        hideAll();
        if (rcLoading) rcLoading.style.display = '';

        var timeoutId = setTimeout(function() {
            if (currentController) {
                try { currentController.abort(); } catch(e) { /* ignore */ }
            }
        }, 20000);

        fetch('/ajax/hazir-taramalar/regression-scan', {
            signal: currentController.signal
        })
        .then(function(resp) {
            clearTimeout(timeoutId);
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return resp.json();
        })
        .then(function(data) {
            currentController = null;
            if (!data) {
                allStocks = [];
            } else if (data.regressions) {
                allStocks = data.regressions;
            } else if (Array.isArray(data)) {
                allStocks = data;
            } else {
                // data.data.regressions fallback
                var inner = data.data;
                if (inner && inner.regressions) {
                    allStocks = inner.regressions;
                } else {
                    allStocks = [];
                }
            }
            applyFilters();
            sortData();
            currentPage = 1;
            renderResults();
        })
        .catch(function(err) {
            clearTimeout(timeoutId);
            currentController = null;
            if (err.name === 'AbortError') return;
            console.error('Regresyon veri hatasi:', err);
            hideAll();
            if (rcError) rcError.style.display = '';
            if (rcErrorText) rcErrorText.textContent = 'Regresyon kanali verileri yuklenirken hata olustu: ' + (err.message || 'Bilinmeyen hata');
        });
    }

    /* ========== Filtreleme ========== */

    function applyFilters() {
        filteredStocks = [];
        for (var i = 0; i < allStocks.length; i++) {
            var stock = allStocks[i];
            // Egim filtresi (OR — bos = bypass)
            var slopeOk = selectedSlopes.size === 0 || selectedSlopes.has(stock.slope);
            // Pozisyon filtresi (OR — bos = bypass)
            var posOk = selectedPositions.size === 0 || selectedPositions.has(stock.position);
            // Trend gucu filtresi (AND)
            var trendOk = !strongTrendOnly || (stock.r2 != null && stock.r2 >= 0.7);
            if (slopeOk && posOk && trendOk) {
                filteredStocks.push(stock);
            }
        }
    }

    function toggleSetFilter(set, value, btn) {
        if (set.has(value)) {
            set.delete(value);
            toggleButtonVisual(btn, false);
        } else {
            set.add(value);
            toggleButtonVisual(btn, true);
        }
        if (allStocks.length > 0) {
            applyFilters();
            sortData();
            currentPage = 1;
            renderResults();
        }
    }

    function toggleButtonVisual(btn, active) {
        if (!btn) return;
        // btn-outline-{color} <-> btn-{color} swap
        var classes = btn.className.match(/btn-outline-(\w+)/);
        var filledClass = btn.className.match(/btn-(?!outline|sm|lg)(\w+)/);
        if (active) {
            btn.classList.add('active');
            if (classes) {
                btn.classList.remove('btn-outline-' + classes[1]);
                btn.classList.add('btn-' + classes[1]);
            }
        } else {
            btn.classList.remove('active');
            if (filledClass) {
                btn.classList.remove('btn-' + filledClass[1]);
                btn.classList.add('btn-outline-' + filledClass[1]);
            }
        }
    }

    function resetFilters() {
        selectedSlopes.clear();
        selectedPositions.clear();
        strongTrendOnly = false;

        // Buton gorunumlerini sifirla
        var slopeBtns = document.querySelectorAll('.rc-slope-btn');
        for (var i = 0; i < slopeBtns.length; i++) {
            toggleButtonVisual(slopeBtns[i], false);
        }
        var posBtns = document.querySelectorAll('.rc-position-btn');
        for (var j = 0; j < posBtns.length; j++) {
            toggleButtonVisual(posBtns[j], false);
        }
        toggleButtonVisual(btnRcStrong, false);

        // Siralamayı sifirla
        sortColumn = 'r2';
        sortOrder = 'desc';

        if (allStocks.length > 0) {
            applyFilters();
            sortData();
            currentPage = 1;
            renderResults();
            updateSortIndicators();
        }
    }

    /* ========== Siralama ========== */

    function sortData() {
        filteredStocks.sort(function(a, b) {
            var va = getSortValue(a, sortColumn);
            var vb = getSortValue(b, sortColumn);

            // null / undefined → sona
            if (va == null && vb == null) return 0;
            if (va == null) return 1;
            if (vb == null) return -1;

            var cmp = 0;
            if (typeof va === 'string' && typeof vb === 'string') {
                cmp = va.localeCompare(vb, 'tr');
            } else {
                cmp = va < vb ? -1 : (va > vb ? 1 : 0);
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });
    }

    function getSortValue(stock, col) {
        switch(col) {
            case 'symbol': return stock.symbol || '';
            case 'slope': return stock.slope || '';
            case 'position': return getPositionOrder(stock.position);
            case 'r2': return stock.r2;
            case 'period': return stock.period;
            case 'pctPosition': return stock.pctPosition;
            default: return null;
        }
    }

    /**
     * Pozisyonu sayisal siraya cevirir (above=5, upper=4, middle=3, lower=2, below=1)
     */
    function getPositionOrder(pos) {
        var order = { above: 5, upper: 4, middle: 3, lower: 2, below: 1 };
        return order[pos] || 0;
    }

    /* ========== Render ========== */

    function renderResults() {
        hideAll();
        if (allStocks.length === 0) {
            if (rcEmpty) rcEmpty.style.display = '';
            if (rcResults) rcResults.style.display = '';
            return;
        }
        renderKpiCards();
        if (filteredStocks.length === 0) {
            if (rcResults) rcResults.style.display = '';
            if (rcEmpty) rcEmpty.style.display = '';
            if (rcCountBadge) rcCountBadge.textContent = '0 Hisse';
            return;
        }
        if (rcResults) rcResults.style.display = '';
        if (rcCountBadge) rcCountBadge.textContent = filteredStocks.length + ' Hisse';
        renderTable();
        renderPagination();
        updateSortIndicators();
    }

    function renderKpiCards() {
        if (!rcKpiCards) return;
        rcKpiCards.style.display = '';

        var totalUp = 0, totalDown = 0, totalStrong = 0, totalOutside = 0;
        for (var i = 0; i < allStocks.length; i++) {
            var s = allStocks[i];
            if (s.slope === 'up') totalUp++;
            if (s.slope === 'down') totalDown++;
            if (s.r2 != null && s.r2 >= 0.7) totalStrong++;
            if (s.position === 'above' || s.position === 'below') totalOutside++;
        }

        if (rcKpiTotal) rcKpiTotal.textContent = allStocks.length;
        if (rcKpiUptrend) rcKpiUptrend.textContent = totalUp;
        if (rcKpiDowntrend) rcKpiDowntrend.textContent = totalDown;
        if (rcKpiStrong) rcKpiStrong.textContent = totalStrong;
        if (rcKpiOutside) rcKpiOutside.textContent = totalOutside;
    }

    function renderTable() {
        if (!rcTableBody) return;
        // Temizle
        while (rcTableBody.firstChild) {
            rcTableBody.removeChild(rcTableBody.firstChild);
        }

        var start = (currentPage - 1) * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, filteredStocks.length);

        for (var i = start; i < end; i++) {
            var row = buildRow(filteredStocks[i], i + 1);
            rcTableBody.appendChild(row);
        }

        // Bos durum
        if (rcEmpty) {
            rcEmpty.style.display = filteredStocks.length === 0 ? '' : 'none';
        }
    }

    function buildRow(stock, rowNum) {
        var slopeColor = SLOPE_COLORS[stock.slope] || 'secondary';
        var posColor = POSITION_COLORS[stock.position] || 'secondary';
        var borderColor = slopeColor === 'success' ? '#0ab39c' : (slopeColor === 'danger' ? '#f06548' : '#878a99');

        var tr = document.createElement('tr');
        tr.style.borderLeft = '3px solid ' + borderColor;
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') return; // link tıklamalarını engelleme
            showDetailModal(stock);
        });

        // #1 — Row number
        var tdNum = document.createElement('td');
        tdNum.textContent = rowNum;
        tr.appendChild(tdNum);

        // #2 — Hisse (logo + link)
        var tdSymbol = document.createElement('td');
        var divFlex = document.createElement('div');
        divFlex.className = 'd-flex align-items-center';

        var divAvatar = document.createElement('div');
        divAvatar.className = 'avatar-xs me-2';

        var img = document.createElement('img');
        img.alt = '';
        img.className = 'rounded-circle';
        img.style.cssText = 'width:32px;height:32px;object-fit:cover;';

        var divFallback = document.createElement('div');
        divFallback.className = 'avatar-title rounded-circle bg-primary-subtle text-primary';
        divFallback.style.cssText = 'display:none;width:32px;height:32px;font-size:12px;';
        divFallback.textContent = (stock.symbol || '??').substring(0, 2);

        if (stock.logoid) {
            img.src = '/img/stock-logos/' + encodeURIComponent(stock.logoid);
            img.onerror = function() {
                this.style.display = 'none';
                divFallback.style.display = 'flex';
            };
        } else {
            img.style.display = 'none';
            divFallback.style.display = 'flex';
        }

        divAvatar.appendChild(img);
        divAvatar.appendChild(divFallback);

        var link = document.createElement('a');
        link.href = '/stock/detail/' + encodeURIComponent(stock.symbol);
        link.className = 'text-reset fw-medium';
        link.textContent = stock.symbol;

        divFlex.appendChild(divAvatar);
        divFlex.appendChild(link);
        tdSymbol.appendChild(divFlex);
        tr.appendChild(tdSymbol);

        // #3 — Egim badge
        var tdSlope = document.createElement('td');
        tdSlope.className = 'text-center';
        var slopeBadge = document.createElement('span');
        slopeBadge.className = 'badge bg-' + slopeColor + '-subtle text-' + slopeColor;
        var slopeIcon = document.createElement('i');
        slopeIcon.className = (SLOPE_ICONS[stock.slope] || 'ri-subtract-line') + ' me-1';
        slopeBadge.appendChild(slopeIcon);
        slopeBadge.appendChild(document.createTextNode(SLOPE_LABELS[stock.slope] || stock.slope || '-'));
        tdSlope.appendChild(slopeBadge);
        tr.appendChild(tdSlope);

        // #4 — Pozisyon badge
        var tdPos = document.createElement('td');
        tdPos.className = 'text-center';
        var posBadge = document.createElement('span');
        posBadge.className = 'badge bg-' + posColor + '-subtle text-' + posColor;
        posBadge.textContent = POSITION_LABELS[stock.position] || stock.position || '-';
        tdPos.appendChild(posBadge);
        tr.appendChild(tdPos);

        // #5 — R² degeri
        var tdR2 = document.createElement('td');
        tdR2.className = 'text-end';
        if (stock.r2 != null) {
            var r2Span = document.createElement('span');
            r2Span.className = 'fw-medium ' + (stock.r2 >= 0.7 ? 'text-success' : 'text-muted');
            r2Span.textContent = stock.r2.toFixed(4);
            tdR2.appendChild(r2Span);
        } else {
            tdR2.textContent = '-';
        }
        tr.appendChild(tdR2);

        // #6 — Periyot
        var tdPeriod = document.createElement('td');
        tdPeriod.className = 'text-end';
        tdPeriod.textContent = stock.period != null ? stock.period : '-';
        tr.appendChild(tdPeriod);

        // #7 — Kanal Pozisyonu (progress bar + yuzde)
        var tdPct = document.createElement('td');
        tdPct.className = 'text-center';
        if (stock.pctPosition != null) {
            var pctVal = stock.pctPosition;
            var clampedPct = Math.max(0, Math.min(100, pctVal));
            var barColor = POSITION_COLORS[stock.position] || 'primary';

            var wrapper = document.createElement('div');
            wrapper.className = 'd-flex align-items-center gap-2';

            var progressDiv = document.createElement('div');
            progressDiv.className = 'progress flex-grow-1';
            progressDiv.style.height = '8px';

            var bar = document.createElement('div');
            bar.className = 'progress-bar bg-' + barColor;
            bar.style.width = clampedPct + '%';
            bar.setAttribute('role', 'progressbar');
            progressDiv.appendChild(bar);

            var pctText = document.createElement('span');
            pctText.className = 'fw-medium fs-12';
            pctText.style.minWidth = '45px';
            pctText.style.textAlign = 'right';
            // Negatif veya 100+ gosteriminde isaret
            var prefix = pctVal > 100 ? '+' : '';
            pctText.textContent = prefix + pctVal.toFixed(1) + '%';

            wrapper.appendChild(progressDiv);
            wrapper.appendChild(pctText);
            tdPct.appendChild(wrapper);
        } else {
            tdPct.textContent = '-';
        }
        tr.appendChild(tdPct);

        return tr;
    }

    /* ========== Detay Modal ========== */

    function showDetailModal(stock) {
        if (!rcDetailModal || !rcDetailModalTitle || !rcDetailModalBody) return;

        var slopeColor = SLOPE_COLORS[stock.slope] || 'secondary';
        var posColor = POSITION_COLORS[stock.position] || 'secondary';
        var slopeLabel = SLOPE_LABELS[stock.slope] || stock.slope || '-';
        var posLabel = POSITION_LABELS[stock.position] || stock.position || '-';
        var r2Val = stock.r2 != null ? stock.r2.toFixed(4) : '-';
        var r2Pct = stock.r2 != null ? (stock.r2 * 100).toFixed(1) + '%' : '-';
        var pctVal = stock.pctPosition != null ? stock.pctPosition.toFixed(1) + '%' : '-';
        var r2Class = stock.r2 != null && stock.r2 >= 0.7 ? 'text-success' : 'text-muted';
        var trendStr = '';
        if (stock.r2 != null) {
            if (stock.r2 >= 0.9) trendStr = 'Çok Güçlü Trend';
            else if (stock.r2 >= 0.7) trendStr = 'Güçlü Trend';
            else if (stock.r2 >= 0.4) trendStr = 'Orta Trend';
            else trendStr = 'Zayıf Trend';
        }

        var posDesc = {
            'above': 'Fiyat regresyon kanalının üst bandının üzerinde. Aşırı alım bölgesi, geri çekilme riski yüksek.',
            'upper': 'Fiyat üst bölgede. Yükseliş momentumu güçlü, trend devam edebilir.',
            'middle': 'Fiyat merkez çizgisine yakın. Denge bölgesi, yön belirleme bekleniyor.',
            'lower': 'Fiyat alt bölgede. Destek bölgesine yakın, toparlanma fırsatı olabilir.',
            'below': 'Fiyat regresyon kanalının alt bandının altında. Aşırı satım bölgesi, toparlanma beklenir.'
        };

        var slopeDesc = stock.slope === 'up'
            ? 'Regresyon çizgisi yukarı yönlü. Genel eğilim yükseliş yönünde.'
            : 'Regresyon çizgisi aşağı yönlü. Genel eğilim düşüş yönünde.';

        rcDetailModalTitle.textContent = stock.symbol + ' \u2014 Regresyon Kanal\u0131';

        // Modal body — DOM-safe construction (no innerHTML, XSS-safe)
        while (rcDetailModalBody.firstChild) rcDetailModalBody.removeChild(rcDetailModalBody.firstChild);

        // Header row (logo + symbol + period)
        var headerDiv = document.createElement('div');
        headerDiv.className = 'd-flex align-items-center mb-3';
        if (stock.logoid) {
            var logoImg = document.createElement('img');
            logoImg.src = '/img/stock-logos/' + encodeURIComponent(stock.logoid);
            logoImg.className = 'rounded-circle me-2';
            logoImg.style.cssText = 'width:40px;height:40px;object-fit:cover;';
            logoImg.onerror = function() { this.style.display = 'none'; };
            headerDiv.appendChild(logoImg);
        }
        var headerText = document.createElement('div');
        var h5 = document.createElement('h5');
        h5.className = 'mb-0';
        h5.textContent = stock.symbol;
        var small = document.createElement('small');
        small.className = 'text-muted';
        small.textContent = 'Periyot: ' + (stock.period || '-') + ' mum';
        headerText.appendChild(h5);
        headerText.appendChild(small);
        headerDiv.appendChild(headerText);
        rcDetailModalBody.appendChild(headerDiv);

        // KPI grid (4 cards)
        var kpiRow = document.createElement('div');
        kpiRow.className = 'row g-2 mb-3';

        function addKpiCard(label, badgeHtml, badgeClass) {
            var col = document.createElement('div');
            col.className = 'col-6 col-md-3';
            var card = document.createElement('div');
            card.className = 'border rounded p-2 text-center';
            var labelDiv = document.createElement('div');
            labelDiv.className = 'text-muted fs-11 mb-1';
            labelDiv.textContent = label;
            card.appendChild(labelDiv);
            var badge = document.createElement('span');
            badge.className = badgeClass;
            badge.textContent = badgeHtml;
            card.appendChild(badge);
            col.appendChild(card);
            kpiRow.appendChild(col);
            return badge;
        }

        // Egim KPI
        var slopeBadge = addKpiCard('E\u011Fim', '', 'badge bg-' + slopeColor + '-subtle text-' + slopeColor + ' fs-13');
        var slopeI = document.createElement('i');
        slopeI.className = (SLOPE_ICONS[stock.slope] || 'ri-subtract-line') + ' me-1';
        slopeBadge.textContent = '';
        slopeBadge.appendChild(slopeI);
        slopeBadge.appendChild(document.createTextNode(slopeLabel));

        // Pozisyon KPI
        addKpiCard('Pozisyon', posLabel, 'badge bg-' + posColor + '-subtle text-' + posColor + ' fs-13');

        // R² KPI
        addKpiCard('R\u00B2', r2Val, 'fw-semibold fs-13 ' + r2Class);

        // Kanal % KPI
        addKpiCard('Kanal %', pctVal, 'fw-semibold fs-13');

        rcDetailModalBody.appendChild(kpiRow);

        // Detail list
        var listGroup = document.createElement('div');
        listGroup.className = 'list-group list-group-flush';

        function addDetailItem(iconClass, iconColor, title, desc) {
            var item = document.createElement('div');
            item.className = 'list-group-item px-0';
            var flex = document.createElement('div');
            flex.className = 'd-flex align-items-start';
            var icon = document.createElement('i');
            icon.className = iconClass + ' text-' + iconColor + ' fs-18 me-2 mt-1';
            var textDiv = document.createElement('div');
            var h6 = document.createElement('h6');
            h6.className = 'mb-1';
            h6.textContent = title;
            var p = document.createElement('p');
            p.className = 'text-muted mb-0 fs-12';
            p.textContent = desc;
            textDiv.appendChild(h6);
            textDiv.appendChild(p);
            flex.appendChild(icon);
            flex.appendChild(textDiv);
            item.appendChild(flex);
            listGroup.appendChild(item);
        }

        // Egim detay
        addDetailItem(SLOPE_ICONS[stock.slope] || 'ri-subtract-line', slopeColor, slopeLabel + ' Trendi', slopeDesc);

        // Pozisyon detay
        addDetailItem('ri-map-pin-line', posColor, posLabel, posDesc[stock.position] || '');

        // Trend gucu detay
        if (trendStr) {
            var trendDesc = '';
            if (stock.r2 >= 0.7) trendDesc = 'Fiyat regresyon \u00E7izgisine y\u00FCksek uyum g\u00F6steriyor. Kanal s\u0131n\u0131rlar\u0131 g\u00FCvenilir.';
            else if (stock.r2 >= 0.4) trendDesc = 'Orta d\u00FCzeyde uyum. Kanal s\u0131n\u0131rlar\u0131 k\u0131smen g\u00FCvenilir, ek teyit \u00F6nerilir.';
            else trendDesc = 'D\u00FC\u015F\u00FCk uyum. Fiyat kanalda d\u00FCzg\u00FCn hareket etmiyor, kanal g\u00FCvenilmez.';
            addDetailItem('ri-focus-2-line', stock.r2 >= 0.7 ? 'success' : 'muted', trendStr + ' (R\u00B2 = ' + r2Pct + ')', trendDesc);
        }

        rcDetailModalBody.appendChild(listGroup);

        // Visual progress bar for channel position
        if (stock.pctPosition != null) {
            var clamp = Math.max(0, Math.min(100, stock.pctPosition));
            var barSection = document.createElement('div');
            barSection.className = 'mt-3 pt-3 border-top';

            var labelsDiv = document.createElement('div');
            labelsDiv.className = 'd-flex justify-content-between mb-1';
            var lblLow = document.createElement('small');
            lblLow.className = 'text-danger';
            lblLow.textContent = 'Alt Bant (0%)';
            var lblMid = document.createElement('small');
            lblMid.className = 'text-muted';
            lblMid.textContent = 'Merkez (50%)';
            var lblHigh = document.createElement('small');
            lblHigh.className = 'text-success';
            lblHigh.textContent = '\u00DCst Bant (100%)';
            labelsDiv.appendChild(lblLow);
            labelsDiv.appendChild(lblMid);
            labelsDiv.appendChild(lblHigh);
            barSection.appendChild(labelsDiv);

            var progressDiv = document.createElement('div');
            progressDiv.className = 'progress';
            progressDiv.style.height = '12px';
            var bar = document.createElement('div');
            bar.className = 'progress-bar bg-' + posColor;
            bar.style.width = clamp + '%';
            progressDiv.appendChild(bar);
            barSection.appendChild(progressDiv);

            var centerBadge = document.createElement('div');
            centerBadge.className = 'text-center mt-1';
            var pctBadge = document.createElement('span');
            pctBadge.className = 'badge bg-' + posColor + '-subtle text-' + posColor;
            pctBadge.textContent = pctVal;
            centerBadge.appendChild(pctBadge);
            barSection.appendChild(centerBadge);

            rcDetailModalBody.appendChild(barSection);
        }

        var modal = new bootstrap.Modal(rcDetailModal);
        modal.show();
    }

    /* ========== Sayfalama ========== */

    function renderPagination() {
        if (!rcPaginationNav) return;
        var totalPages = Math.ceil(filteredStocks.length / PAGE_SIZE);

        if (totalPages <= 1) {
            if (rcPagination) rcPagination.style.display = 'none';
            if (rcPaginationInfo) rcPaginationInfo.textContent = filteredStocks.length + ' hisse';
            while (rcPaginationNav.firstChild) {
                rcPaginationNav.removeChild(rcPaginationNav.firstChild);
            }
            return;
        }

        if (rcPagination) rcPagination.style.display = 'flex';
        var start = (currentPage - 1) * PAGE_SIZE + 1;
        var end = Math.min(currentPage * PAGE_SIZE, filteredStocks.length);
        if (rcPaginationInfo) rcPaginationInfo.textContent = start + '-' + end + ' / ' + filteredStocks.length + ' hisse';

        // Temizle
        while (rcPaginationNav.firstChild) {
            rcPaginationNav.removeChild(rcPaginationNav.firstChild);
        }

        var maxVisible = 7;
        var startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        var endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        function createPageItem(page, content, disabled, active) {
            var li = document.createElement('li');
            li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
            var a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            if (typeof content === 'string' && content.startsWith('ri-')) {
                var icon = document.createElement('i');
                icon.className = content;
                a.appendChild(icon);
            } else {
                a.textContent = content;
            }
            a.addEventListener('click', function(e) {
                e.preventDefault();
                if (page >= 1 && page <= totalPages && page !== currentPage) {
                    currentPage = page;
                    renderTable();
                    renderPagination();
                }
            });
            li.appendChild(a);
            return li;
        }

        // Previous
        rcPaginationNav.appendChild(
            createPageItem(currentPage - 1, 'ri-arrow-left-s-line', currentPage === 1, false)
        );

        // Page numbers
        for (var i = startPage; i <= endPage; i++) {
            rcPaginationNav.appendChild(
                createPageItem(i, String(i), false, i === currentPage)
            );
        }

        // Next
        rcPaginationNav.appendChild(
            createPageItem(currentPage + 1, 'ri-arrow-right-s-line', currentPage === totalPages, false)
        );
    }

    /* ========== Siralama Gostergesi ========== */

    function updateSortIndicators() {
        var headers = document.querySelectorAll('.rc-sortable');
        for (var i = 0; i < headers.length; i++) {
            var th = headers[i];
            var col = th.getAttribute('data-col');
            var icon = th.querySelector('i');
            if (!icon) continue;

            if (col === sortColumn) {
                icon.className = sortOrder === 'asc'
                    ? 'ri-arrow-up-s-fill text-primary ms-1'
                    : 'ri-arrow-down-s-fill text-primary ms-1';
            } else {
                icon.className = 'ri-arrow-up-down-line text-muted ms-1';
            }
        }
    }

    /* ========== Yardimci ========== */

    function hideAll() {
        if (rcLoading) rcLoading.style.display = 'none';
        if (rcError) rcError.style.display = 'none';
        if (rcResults) rcResults.style.display = 'none';
        if (rcKpiCards) rcKpiCards.style.display = 'none';
        if (rcEmpty) rcEmpty.style.display = 'none';
    }

    /* ========== DOMContentLoaded ========== */

    document.addEventListener('DOMContentLoaded', init);

})();
