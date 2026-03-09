/**
 * Fonlar (TEFAS Fon Listesi) sayfasi istemci tarafi mantigi.
 *
 * SSR ile gelen window.fonlarData uzerinde filtreleme, siralama ve sayfalama yapar.
 * Tab filtreleme (YAT/EMK/BYF), arama (debounce), katilim fonu toggle,
 * donem secici, kolon siralama ve sayfalama ozellikleri icerir.
 */
(function () {
    'use strict';

    // ── Sabitler ──────────────────────────────────────────
    var PAGE_SIZE = 50;
    var DEBOUNCE_MS = 300;
    var MAX_VISIBLE_PAGES = 7;

    // ── Durum ─────────────────────────────────────────────
    var allFunds = [];
    var filteredFunds = [];
    var currentType = 'ALL';
    var currentSearch = '';
    var participationOnly = false;
    var currentPeriod = 'returnYTD';
    var currentPage = 1;
    var sortCol = null;
    var sortAscending = true;
    var debounceTimer = null;

    // ── DOM Referanslari ──────────────────────────────────
    var searchInput = document.getElementById('searchInput');
    var participationToggle = document.getElementById('participationToggle');
    var fundTableBody = document.getElementById('fundTableBody');
    var emptyState = document.getElementById('emptyState');
    var fundTableContainer = document.getElementById('fundTableContainer');
    var paginationNav = document.getElementById('paginationNav');
    var paginationInfo = document.getElementById('paginationInfo');
    var filteredCountBadge = document.getElementById('filteredCountBadge');

    // ── KPI Referanslari ──────────────────────────────────
    var kpiTotalFunds = document.getElementById('kpi-total-funds');
    var kpiAvgReturn = document.getElementById('kpi-avg-return');
    var kpiBestFund = document.getElementById('kpi-best-fund');

    // ── Baslangic ─────────────────────────────────────────
    function init() {
        allFunds = window.fonlarData || [];
        bindEvents();
        applyFilters();
    }

    // ── Event Binding ─────────────────────────────────────
    function bindEvents() {
        // Tab tiklamalari
        var tabs = document.querySelectorAll('#fundTypeTabs .nav-link');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                currentType = tab.getAttribute('data-fund-type');
                currentPage = 1;
                applyFilters();
            });
        });

        // Arama
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function () {
                    currentSearch = searchInput.value.trim();
                    currentPage = 1;
                    applyFilters();
                }, DEBOUNCE_MS);
            });
        }

        // Katilim toggle
        if (participationToggle) {
            participationToggle.addEventListener('change', function () {
                participationOnly = participationToggle.checked;
                currentPage = 1;
                applyFilters();
            });
        }

        // Donem secici
        var periodBtns = document.querySelectorAll('#periodSelector button');
        periodBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                periodBtns.forEach(function (b) {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                currentPeriod = btn.getAttribute('data-period');
                applyFilters();
            });
        });

        // Kolon siralama
        var sortHeaders = document.querySelectorAll('#fundTable th.sortable');
        sortHeaders.forEach(function (th) {
            th.addEventListener('click', function () {
                var col = th.getAttribute('data-col');
                if (sortCol === col) {
                    sortAscending = !sortAscending;
                } else {
                    sortCol = col;
                    sortAscending = true;
                }

                // Ikon guncelle
                sortHeaders.forEach(function (h) {
                    var icon = h.querySelector('i');
                    if (icon) icon.className = 'ri-arrow-up-down-line text-muted fs-13';
                });
                var activeIcon = th.querySelector('i');
                if (activeIcon) {
                    activeIcon.className = sortAscending
                        ? 'ri-arrow-up-s-fill text-primary fs-13'
                        : 'ri-arrow-down-s-fill text-primary fs-13';
                }

                currentPage = 1;
                applyFilters();
            });
        });
    }

    // ── Filtreleme Pipeline ───────────────────────────────
    function applyFilters() {
        var result = allFunds;

        // Tip filtre
        if (currentType !== 'ALL') {
            result = result.filter(function (f) {
                return f.fundType === currentType;
            });
        }

        // Katilim filtre
        if (participationOnly) {
            result = result.filter(function (f) {
                return f.participation === true;
            });
        }

        // Arama filtre
        if (currentSearch.length >= 2) {
            var q = currentSearch.toLocaleLowerCase('tr');
            result = result.filter(function (f) {
                return (f.tefasCode && f.tefasCode.toLocaleLowerCase('tr').indexOf(q) >= 0) ||
                       (f.fundName && f.fundName.toLocaleLowerCase('tr').indexOf(q) >= 0);
            });
        }

        filteredFunds = result;
        sortFunds();
        updateStats();
        renderTable();
        renderPagination();
    }

    // ── Siralama ──────────────────────────────────────────
    function sortFunds() {
        if (!sortCol) return;

        filteredFunds.sort(function (a, b) {
            var valA, valB;

            if (sortCol === 'currentPeriod') {
                valA = getReturnValue(a, currentPeriod);
                valB = getReturnValue(b, currentPeriod);
            } else if (sortCol === 'tefasCode' || sortCol === 'fundName') {
                valA = (a[sortCol] || '').toLocaleLowerCase('tr');
                valB = (b[sortCol] || '').toLocaleLowerCase('tr');
            } else {
                valA = a[sortCol] != null ? a[sortCol] : null;
                valB = b[sortCol] != null ? b[sortCol] : null;
            }

            // Null degerleri sona it
            if (valA == null && valB == null) return 0;
            if (valA == null) return 1;
            if (valB == null) return -1;

            if (valA < valB) return sortAscending ? -1 : 1;
            if (valA > valB) return sortAscending ? 1 : -1;
            return 0;
        });
    }

    // ── Tablo Render ──────────────────────────────────────
    function renderTable() {
        var start = (currentPage - 1) * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, filteredFunds.length);
        var pageData = filteredFunds.slice(start, end);

        // Badge guncelle
        if (filteredCountBadge) {
            filteredCountBadge.textContent = filteredFunds.length + ' Fon';
        }

        if (pageData.length === 0) {
            fundTableContainer.style.display = 'none';
            emptyState.style.display = '';
            return;
        }

        fundTableContainer.style.display = '';
        emptyState.style.display = 'none';

        var fragment = document.createDocumentFragment();
        for (var i = 0; i < pageData.length; i++) {
            var fund = pageData[i];
            var rowNum = start + i + 1;
            var tr = createRow(fund, rowNum);
            fragment.appendChild(tr);
        }

        // Mevcut satirlari temizle ve yenilerini ekle
        while (fundTableBody.firstChild) {
            fundTableBody.removeChild(fundTableBody.firstChild);
        }
        fundTableBody.appendChild(fragment);
    }

    function createRow(fund, rowNum) {
        var tr = document.createElement('tr');

        // #
        var tdNum = document.createElement('td');
        tdNum.textContent = rowNum;
        tr.appendChild(tdNum);

        // Kod
        var tdCode = document.createElement('td');
        var a = document.createElement('a');
        a.href = '/fonlar/' + encodeURIComponent(fund.tefasCode || '');
        a.className = 'fw-semibold text-primary';
        a.textContent = fund.tefasCode || '-';
        tdCode.appendChild(a);
        tr.appendChild(tdCode);

        // Fon Adi
        var tdName = document.createElement('td');
        tdName.style.maxWidth = '300px';
        tdName.style.overflow = 'hidden';
        tdName.style.textOverflow = 'ellipsis';
        tdName.style.whiteSpace = 'nowrap';
        tdName.textContent = fund.fundName || '-';
        tdName.title = fund.fundName || '';
        tr.appendChild(tdName);

        // NAV
        var tdNav = document.createElement('td');
        tdNav.textContent = fund.latestPrice != null ? fund.latestPrice.toFixed(6) : '-';
        tr.appendChild(tdNav);

        // Degisim % (gunluk)
        var tdChange = document.createElement('td');
        formatReturnCell(tdChange, fund.return1D);
        tr.appendChild(tdChange);

        // Getiri (secili donem)
        var tdReturn = document.createElement('td');
        var returnVal = getReturnValue(fund, currentPeriod);
        formatReturnCell(tdReturn, returnVal);
        tr.appendChild(tdReturn);

        // Portfoy
        var tdPortfolio = document.createElement('td');
        tdPortfolio.textContent = formatMoney(fund.portfolioSize);
        tr.appendChild(tdPortfolio);

        // Yatirimci
        var tdInvestor = document.createElement('td');
        tdInvestor.textContent = fund.investorCount != null
            ? fund.investorCount.toLocaleString('tr-TR')
            : '-';
        tr.appendChild(tdInvestor);

        // Risk
        var tdRisk = document.createElement('td');
        var badge = document.createElement('span');
        badge.className = 'badge ' + getRiskBadgeClass(fund.riskLevel);
        badge.textContent = fund.riskLevel || '-';
        tdRisk.appendChild(badge);
        tr.appendChild(tdRisk);

        return tr;
    }

    // ── Yardimci Fonksiyonlar ─────────────────────────────

    function getReturnValue(fund, period) {
        if (!fund || !period) return null;
        return fund[period] != null ? fund[period] : null;
    }

    function formatReturnCell(td, val) {
        if (val == null) {
            td.textContent = '-';
            td.className = 'text-muted';
            return;
        }
        var prefix = val > 0 ? '+' : '';
        td.textContent = prefix + val.toFixed(2) + '%';
        td.className = val > 0 ? 'text-success' : (val < 0 ? 'text-danger' : 'text-muted');
    }

    function formatMoney(val) {
        if (val == null) return '-';
        if (val === 0) return '0 TL';
        if (val >= 1e9) return (val / 1e9).toFixed(1) + ' Milyar TL';
        if (val >= 1e6) return (val / 1e6).toFixed(1) + ' Milyon TL';
        if (val >= 1e3) return (val / 1e3).toFixed(0) + ' Bin TL';
        return val.toLocaleString('tr-TR') + ' TL';
    }

    function getRiskBadgeClass(level) {
        if (level == null) return 'bg-secondary-subtle text-secondary';
        if (level <= 3) return 'bg-success-subtle text-success';
        if (level <= 5) return 'bg-warning-subtle text-warning';
        return 'bg-danger-subtle text-danger';
    }

    // ── Istatistik Guncelleme ─────────────────────────────
    function updateStats() {
        // Toplam fon
        if (kpiTotalFunds) {
            kpiTotalFunds.textContent = filteredFunds.length;
        }

        // Ortalama getiri (secili donem)
        if (kpiAvgReturn) {
            var sum = 0;
            var count = 0;
            for (var i = 0; i < filteredFunds.length; i++) {
                var val = getReturnValue(filteredFunds[i], currentPeriod);
                if (val != null) {
                    sum += val;
                    count++;
                }
            }
            if (count > 0) {
                var avg = sum / count;
                var prefix = avg >= 0 ? '+' : '';
                kpiAvgReturn.textContent = prefix + avg.toFixed(2) + '%';
                kpiAvgReturn.className = 'fs-22 fw-semibold ff-secondary mb-4 ' + (avg >= 0 ? 'text-success' : 'text-danger');
            } else {
                kpiAvgReturn.textContent = '-';
                kpiAvgReturn.className = 'fs-22 fw-semibold ff-secondary mb-4';
            }
        }

        // En iyi performans (secili donem)
        if (kpiBestFund) {
            var best = null;
            var bestVal = -Infinity;
            for (var j = 0; j < filteredFunds.length; j++) {
                var v = getReturnValue(filteredFunds[j], currentPeriod);
                if (v != null && v > bestVal) {
                    bestVal = v;
                    best = filteredFunds[j];
                }
            }
            if (best) {
                kpiBestFund.textContent = best.tefasCode + ' (' + (bestVal > 0 ? '+' : '') + bestVal.toFixed(2) + '%)';
                var colorClass = bestVal >= 0 ? 'text-success' : 'text-danger';
                kpiBestFund.className = 'fs-14 fw-semibold ff-secondary mb-4 ' + colorClass;
            } else {
                kpiBestFund.textContent = '-';
                kpiBestFund.className = 'fs-14 fw-semibold ff-secondary mb-4';
            }
        }
    }

    // ── Sayfalama ─────────────────────────────────────────
    function renderPagination() {
        var totalPages = Math.ceil(filteredFunds.length / PAGE_SIZE);

        // Info
        if (paginationInfo) {
            var start = filteredFunds.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
            var end = Math.min(currentPage * PAGE_SIZE, filteredFunds.length);
            paginationInfo.textContent = filteredFunds.length > 0
                ? start + '-' + end + ' / ' + filteredFunds.length + ' fon'
                : '0 fon';
        }

        if (!paginationNav) return;
        // Mevcut sayfalama elemanlarini temizle
        while (paginationNav.firstChild) {
            paginationNav.removeChild(paginationNav.firstChild);
        }

        if (totalPages <= 1) return;

        // Onceki (\u00AB = «)
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

        // Sonraki (\u00BB = »)
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
            a.addEventListener('click', function () {
                currentPage = page;
                renderTable();
                renderPagination();
                // Tabloya scroll
                var table = document.getElementById('fundTable');
                if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
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
            // Basta
            for (var j = 1; j <= MAX_VISIBLE_PAGES - 2; j++) pages.push(j);
            pages.push('...');
            pages.push(totalPages);
        } else if (currentPage >= totalPages - half) {
            // Sonda
            pages.push(1);
            pages.push('...');
            for (var k = totalPages - MAX_VISIBLE_PAGES + 3; k <= totalPages; k++) pages.push(k);
        } else {
            // Ortada
            pages.push(1);
            pages.push('...');
            for (var m = currentPage - 1; m <= currentPage + 1; m++) pages.push(m);
            pages.push('...');
            pages.push(totalPages);
        }

        return pages;
    }

    // ── Baslat ────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
