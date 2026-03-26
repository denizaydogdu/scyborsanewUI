/**
 * Analist Tavsiyeleri sayfasi istemci tarafi mantigi.
 *
 * SSR ile gelen window.tavsiyelerData uzerinde filtreleme, siralama ve sayfalama yapar.
 * Type tab filtreleme (AL/TUT/SAT/Diger), arama (debounce), araci kurum dropdown,
 * model portfoy toggle, kolon siralama ve sayfalama ozellikleri icerir.
 */
(function () {
    'use strict';

    // ── Sabitler ──────────────────────────────────────────
    var PAGE_SIZE = 30;
    var DEBOUNCE_MS = 300;
    var MAX_VISIBLE_PAGES = 7;

    // Temel tavsiye tipleri (bunlar disindakiler "Diger" grubuna girer)
    var KNOWN_TYPES = ['AL', 'TUT', 'SAT'];

    // ── Durum ─────────────────────────────────────────────
    var allData = [];
    var filteredData = [];
    var currentType = 'ALL';
    var currentSearch = '';
    var currentBrokerage = 'ALL';
    var currentPage = 1;
    var sortCol = null;
    var sortAscending = true;
    var debounceTimer = null;

    // ── DOM Referanslari ──────────────────────────────────
    var searchInput = document.getElementById('searchInput');
    var brokerageFilter = document.getElementById('brokerageFilter');
    var tableBody = document.getElementById('tableBody');
    var emptyState = document.getElementById('emptyState');
    var tableContainer = document.getElementById('tableContainer');
    var paginationNav = document.getElementById('paginationNav');
    var paginationInfo = document.getElementById('paginationInfo');
    var filteredCountBadge = document.getElementById('filteredCountBadge');

    // ── KPI Referanslari ──────────────────────────────────
    var kpiTotal = document.getElementById('kpi-total');
    var kpiAlCount = document.getElementById('kpi-al-count');
    var kpiLastDate = document.getElementById('kpi-last-date');

    // ── Baslangic ─────────────────────────────────────────
    function init() {
        allData = window.tavsiyelerData || [];
        bindEvents();
        applyFilters();
    }

    // ── Event Binding ─────────────────────────────────────
    function bindEvents() {
        // Type tab tiklamalari
        var tabs = document.querySelectorAll('#typeTabs .nav-link');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                currentType = tab.getAttribute('data-tavsiye-type');
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

        // Araci kurum dropdown
        if (brokerageFilter) {
            brokerageFilter.addEventListener('change', function () {
                currentBrokerage = brokerageFilter.value;
                currentPage = 1;
                applyFilters();
            });
        }

        // Model portfoy toggle kaldirildi

        // Kolon siralama
        var sortHeaders = document.querySelectorAll('#tavsiyeTable th.sortable');
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
        var result = allData;

        // Type filtre (API kucuk harf doner: al, tut, sat)
        if (currentType !== 'ALL') {
            if (currentType === 'OTHER') {
                result = result.filter(function (t) {
                    var upper = t.ratingType ? t.ratingType.toUpperCase() : '';
                    return !upper || KNOWN_TYPES.indexOf(upper) === -1;
                });
            } else {
                result = result.filter(function (t) {
                    return t.ratingType && t.ratingType.toUpperCase() === currentType;
                });
            }
        }

        // Arama filtre (sadece stockCode — API title donmuyor)
        if (currentSearch.length >= 2) {
            var q = currentSearch.toLocaleLowerCase('tr');
            result = result.filter(function (t) {
                return t.stockCode && t.stockCode.toLocaleLowerCase('tr').indexOf(q) >= 0;
            });
        }

        // Araci kurum filtre
        if (currentBrokerage !== 'ALL') {
            result = result.filter(function (t) {
                return t.brokerage && t.brokerage.shortTitle === currentBrokerage;
            });
        }

        filteredData = result;
        sortData();
        updateKPIs();
        renderTable();
        renderPagination();
    }

    // ── Siralama ──────────────────────────────────────────
    function sortData() {
        if (!sortCol) return;

        filteredData.sort(function (a, b) {
            var valA, valB;

            if (sortCol === 'stockCode') {
                valA = (a.stockCode || '').toLocaleLowerCase('tr');
                valB = (b.stockCode || '').toLocaleLowerCase('tr');
            } else if (sortCol === 'ratingType') {
                valA = (a.ratingType || '').toLocaleLowerCase('tr');
                valB = (b.ratingType || '').toLocaleLowerCase('tr');
            } else if (sortCol === 'targetPrice') {
                valA = a.targetPrice != null ? a.targetPrice : null;
                valB = b.targetPrice != null ? b.targetPrice : null;
            } else if (sortCol === 'brokerage') {
                valA = (a.brokerage && a.brokerage.shortTitle ? a.brokerage.shortTitle : '').toLocaleLowerCase('tr');
                valB = (b.brokerage && b.brokerage.shortTitle ? b.brokerage.shortTitle : '').toLocaleLowerCase('tr');
            } else if (sortCol === 'date') {
                valA = a.date || '';
                valB = b.date || '';
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
        var end = Math.min(start + PAGE_SIZE, filteredData.length);
        var pageData = filteredData.slice(start, end);

        // Badge guncelle
        if (filteredCountBadge) {
            filteredCountBadge.textContent = filteredData.length;
        }

        if (pageData.length === 0) {
            tableContainer.style.display = 'none';
            emptyState.style.display = '';
            return;
        }

        tableContainer.style.display = '';
        emptyState.style.display = 'none';

        var fragment = document.createDocumentFragment();
        for (var i = 0; i < pageData.length; i++) {
            var item = pageData[i];
            var rowNum = start + i + 1;
            var tr = createRow(item, rowNum);
            fragment.appendChild(tr);
        }

        // Mevcut satirlari temizle ve yenilerini ekle
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        tableBody.appendChild(fragment);
    }

    function createRow(item, rowNum) {
        var tr = document.createElement('tr');

        // #
        var tdNum = document.createElement('td');
        tdNum.textContent = rowNum;
        tr.appendChild(tdNum);

        // Hisse (stockCode + title, first-letter avatar)
        var tdStock = document.createElement('td');
        var stockDiv = document.createElement('div');
        stockDiv.className = 'd-flex align-items-center';

        var avatar = document.createElement('div');
        avatar.className = 'flex-shrink-0 avatar-xs me-2';
        var logoid = (window.stockLogos || {})[item.stockCode];
        if (logoid) {
            var logoImg = document.createElement('img');
            logoImg.src = '/img/stock-logos/' + encodeURIComponent(logoid);
            logoImg.alt = item.stockCode || '';
            logoImg.className = 'avatar-xs rounded-circle';
            var fallbackSpan = document.createElement('span');
            fallbackSpan.className = 'avatar-title rounded-circle fw-semibold';
            fallbackSpan.style.cssText = 'display:none;background:transparent;color:#495057;border:1.5px solid #ced4da;font-size:0.55rem';
            fallbackSpan.textContent = item.stockCode ? item.stockCode.substring(0, Math.min(4, item.stockCode.length)) : '?';
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
            avatarInner.textContent = item.stockCode ? item.stockCode.substring(0, Math.min(4, item.stockCode.length)) : '?';
            avatar.appendChild(avatarInner);
        }
        stockDiv.appendChild(avatar);

        var stockInfo = document.createElement('div');
        var stockCode = document.createElement('div');
        stockCode.className = 'fw-semibold';
        var stockLink = document.createElement('a');
        stockLink.href = '/analist-tavsiyeleri/' + item.stockCode;
        stockLink.textContent = item.stockCode || '-';
        stockLink.className = 'fw-semibold text-primary';
        stockCode.textContent = '';
        stockCode.appendChild(stockLink);
        if (item.katilim) {
            var kBadge = document.createElement('span');
            kBadge.className = 'badge bg-success bg-opacity-25 text-success ms-1';
            kBadge.style.cssText = 'font-size:0.65rem;padding:1px 4px;';
            kBadge.title = 'Katılım Endeksi';
            kBadge.textContent = 'K';
            stockCode.appendChild(kBadge);
        }
        stockInfo.appendChild(stockCode);

        // API title alani donmuyor, sadece stockCode gosterilir

        stockDiv.appendChild(stockInfo);
        tdStock.appendChild(stockDiv);
        tr.appendChild(tdStock);

        // Tavsiye (badge — uppercase gosterim)
        var tdRating = document.createElement('td');
        var badge = document.createElement('span');
        var ratingUpper = item.ratingType ? item.ratingType.toUpperCase() : '';
        badge.className = 'badge ' + getRatingBadgeClass(ratingUpper);
        badge.textContent = ratingUpper || '-';
        tdRating.appendChild(badge);
        tr.appendChild(tdRating);

        // Hedef Fiyat
        var tdPrice = document.createElement('td');
        tdPrice.className = 'fw-semibold';
        tdPrice.textContent = item.targetPrice != null ? formatPrice(item.targetPrice) : '-';
        tr.appendChild(tdPrice);

        // Araci Kurum (logo + shortTitle)
        var tdBrokerage = document.createElement('td');
        if (item.brokerage) {
            var bDiv = document.createElement('div');
            bDiv.className = 'd-flex align-items-center';
            if (item.brokerage.logo) {
                var logo = document.createElement('img');
                var brokerageFilename = item.brokerage.logo.substring(item.brokerage.logo.lastIndexOf('/') + 1).split('?')[0];
                logo.src = '/img/brokerage-logos/' + encodeURIComponent(brokerageFilename);
                logo.alt = item.brokerage.shortTitle || '';
                logo.style.width = '20px';
                logo.style.height = '20px';
                logo.style.objectFit = 'contain';
                logo.className = 'me-2 rounded';
                (function (imgEl, brokerageItem) {
                    imgEl.onerror = function () {
                        imgEl.style.display = 'none';
                        var fallback = document.createElement('span');
                        fallback.className = 'avatar-xs rounded d-inline-flex align-items-center justify-content-center me-2';
                        fallback.style.width = '20px';
                        fallback.style.height = '20px';
                        fallback.style.fontSize = '10px';
                        fallback.style.backgroundColor = '#e8f5e9';
                        fallback.style.color = '#4caf50';
                        fallback.style.borderRadius = '4px';
                        fallback.style.flexShrink = '0';
                        var shortTitle = brokerageItem.shortTitle || brokerageItem.title || '?';
                        fallback.textContent = shortTitle.charAt(0).toUpperCase();
                        imgEl.parentNode.insertBefore(fallback, imgEl);
                    };
                })(logo, item.brokerage);
                bDiv.appendChild(logo);
            }
            var bName = document.createElement('span');
            bName.className = 'fs-13';
            bName.textContent = item.brokerage.shortTitle || item.brokerage.title || '-';
            bDiv.appendChild(bName);
            tdBrokerage.appendChild(bDiv);
        } else {
            tdBrokerage.textContent = '-';
        }
        tr.appendChild(tdBrokerage);

        // Tarih (dd.MM.yyyy Turkish format)
        var tdDate = document.createElement('td');
        tdDate.textContent = formatDate(item.date);
        tr.appendChild(tdDate);

        return tr;
    }

    // ── Yardimci Fonksiyonlar ─────────────────────────────

    function getRatingBadgeClass(ratingType) {
        if (!ratingType) return 'bg-secondary-subtle text-secondary';
        var upper = ratingType.toUpperCase();
        if (upper === 'AL') return 'bg-success-subtle text-success';
        if (upper === 'TUT') return 'bg-warning-subtle text-warning';
        if (upper === 'SAT') return 'bg-danger-subtle text-danger';
        if (upper === 'ENDEKSE PARALEL') return 'bg-info-subtle text-info';
        if (upper.indexOf('ENDEKS') >= 0 && upper.indexOf('UST') >= 0) return 'bg-primary-subtle text-primary';
        if (upper.indexOf('ENDEKS') >= 0 && upper.indexOf('ALT') >= 0) return 'bg-danger-subtle text-danger';
        return 'bg-secondary-subtle text-secondary';
    }

    function formatPrice(val) {
        if (val == null) return '-';
        return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20BA';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        // ISO-8601: 2026-03-06T14:34:49Z → 06.03.2026
        var datePart = dateStr.split('T')[0];
        var parts = datePart.split('-');
        if (parts.length === 3) {
            return parts[2] + '.' + parts[1] + '.' + parts[0];
        }
        return dateStr;
    }

    // ── KPI Guncelleme ──────────────────────────────────
    function updateKPIs() {
        // KPI'lar her zaman tum veri uzerinden hesaplanir (filtreden bagimsiz)
        if (kpiTotal) {
            kpiTotal.textContent = allData.length;
        }

        // AL tavsiyesi sayisi (tum veri — API kucuk harf doner)
        if (kpiAlCount) {
            var alCount = allData.filter(function (t) {
                return t.ratingType && t.ratingType.toUpperCase() === 'AL';
            }).length;
            kpiAlCount.textContent = alCount;
        }

        // Son guncelleme tarihi (en son tarih — tum veri)
        if (kpiLastDate) {
            var latestDate = '';
            for (var i = 0; i < allData.length; i++) {
                if (allData[i].date && allData[i].date > latestDate) {
                    latestDate = allData[i].date;
                }
            }
            kpiLastDate.textContent = latestDate ? formatDate(latestDate) : '-';
        }
    }

    // ── Sayfalama ─────────────────────────────────────────
    function renderPagination() {
        var totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

        // Info
        if (paginationInfo) {
            var start = filteredData.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
            var end = Math.min(currentPage * PAGE_SIZE, filteredData.length);
            paginationInfo.textContent = filteredData.length > 0
                ? start + '-' + end + ' / ' + filteredData.length + ' tavsiye'
                : '0 tavsiye';
        }

        if (!paginationNav) return;
        // Mevcut sayfalama elemanlarini temizle
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
                var table = document.getElementById('tavsiyeTable');
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

    // ── Baslat ────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
