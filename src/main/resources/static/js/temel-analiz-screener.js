/**
 * Temel Analiz Screener — Hazir Taramalar 5. bolum.
 *
 * AJAX ile finansal oran verilerini getirir, istemci tarafinda F/K, PD/DD, ROE filtresi
 * uygular ve sayfalama ile gosterir.
 */
(function () {
    'use strict';

    var PAGE_SIZE = 20;
    var allData = [];
    var filteredData = [];
    var currentPage = 1;

    // DOM referanslari
    var btnScan = document.getElementById('btnTemelAnalizScan');
    var btnClear = document.getElementById('btnTemelAnalizClear');
    var fkMax = document.getElementById('taFkMax');
    var pdddMax = document.getElementById('taPdddMax');
    var roeMin = document.getElementById('taRoeMin');
    var loadingSpinner = document.getElementById('taLoadingSpinner');
    var errorMessage = document.getElementById('taErrorMessage');
    var errorText = document.getElementById('taErrorText');
    var resultsSection = document.getElementById('taResultsSection');
    var resultCount = document.getElementById('taResultCount');
    var tableBody = document.getElementById('taResultsTableBody');
    var paginationContainer = document.getElementById('taPaginationContainer');
    var paginationInfo = document.getElementById('taPaginationInfo');
    var paginationNav = document.getElementById('taPaginationNav');

    function init() {
        if (btnScan) btnScan.addEventListener('click', scan);
        if (btnClear) btnClear.addEventListener('click', clearFilters);
    }

    function scan() {
        showLoading(true);
        hideError();
        hideResults();

        fetch('/ajax/hazir-taramalar/temel-analiz')
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                allData = Array.isArray(data) ? data : [];
                applyFilters();
                showLoading(false);
            })
            .catch(function (err) {
                showLoading(false);
                showError('Temel analiz verileri yüklenirken hata oluştu: ' + err.message);
            });
    }

    function applyFilters() {
        var fk = fkMax.value ? parseFloat(fkMax.value) : null;
        var pd = pdddMax.value ? parseFloat(pdddMax.value) : null;
        var roe = roeMin.value ? parseFloat(roeMin.value) : null;

        // F/K, PD/DD ve ROE verilerini hisse bazinda pivot et
        var stockMap = {};
        allData.forEach(function (item) {
            var code = item.hisseSenediKodu;
            if (!code) return;
            if (!stockMap[code]) {
                stockMap[code] = { hisse: code, fk: null, pddd: null, roe: null, kategori: item.kategori || '' };
            }
            var oranLower = (item.oran || '').toLowerCase();
            if (oranLower.indexOf('f/k') > -1 || oranLower.indexOf('fiyat/kazan') > -1) {
                stockMap[code].fk = item.deger;
            } else if (oranLower.indexOf('pd/dd') > -1 || oranLower.indexOf('piyasa de') > -1) {
                stockMap[code].pddd = item.deger;
            } else if (oranLower.indexOf('roe') > -1 || oranLower.indexOf('zkaynak') > -1) {
                stockMap[code].roe = item.deger;
            }
        });

        var stocks = Object.values(stockMap);

        // Filtre uygula
        filteredData = stocks.filter(function (s) {
            if (fk !== null && (s.fk === null || s.fk > fk)) return false;
            if (pd !== null && (s.pddd === null || s.pddd > pd)) return false;
            if (roe !== null && (s.roe === null || s.roe < roe)) return false;
            return true;
        });

        // ROE'ye gore azalan sirala (null en sona)
        filteredData.sort(function (a, b) {
            var aRoe = a.roe != null ? a.roe : -Infinity;
            var bRoe = b.roe != null ? b.roe : -Infinity;
            return bRoe - aRoe;
        });

        currentPage = 1;
        renderTable();
        showResults();
    }

    function renderTable() {
        if (!tableBody) return;
        // Tabloyu temizle
        while (tableBody.firstChild) { tableBody.removeChild(tableBody.firstChild); }

        var totalItems = filteredData.length;
        if (resultCount) resultCount.textContent = totalItems + ' hisse';

        if (totalItems === 0) {
            var tr = document.createElement('tr');
            var td = document.createElement('td');
            td.colSpan = 5;
            td.className = 'text-center text-muted py-4';
            td.textContent = 'Filtreye uygun hisse bulunamadı.';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            hidePagination();
            return;
        }

        var start = (currentPage - 1) * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, totalItems);
        var pageData = filteredData.slice(start, end);

        pageData.forEach(function (s, idx) {
            var tr = document.createElement('tr');

            // #
            var tdNum = document.createElement('td');
            tdNum.textContent = String(start + idx + 1);
            tr.appendChild(tdNum);

            // Hisse
            var tdHisse = document.createElement('td');
            var link = document.createElement('a');
            link.href = '/stock/detail/' + encodeURIComponent(s.hisse);
            link.className = 'fw-semibold';
            link.textContent = s.hisse;
            tdHisse.appendChild(link);
            tr.appendChild(tdHisse);

            // Kategori
            var tdKat = document.createElement('td');
            var katSpan = document.createElement('span');
            katSpan.className = 'text-muted fs-12';
            katSpan.textContent = s.kategori || '-';
            tdKat.appendChild(katSpan);
            tr.appendChild(tdKat);

            // Oranlar (badge'ler)
            var tdOran = document.createElement('td');
            var bFk = document.createElement('span');
            bFk.className = 'badge bg-primary-subtle text-primary me-1';
            bFk.textContent = 'F/K: ' + formatVal(s.fk);
            var bPd = document.createElement('span');
            bPd.className = 'badge bg-info-subtle text-info me-1';
            bPd.textContent = 'PD/DD: ' + formatVal(s.pddd);
            var bRoe = document.createElement('span');
            bRoe.className = 'badge bg-success-subtle text-success';
            bRoe.textContent = 'ROE: ' + formatVal(s.roe) + '%';
            tdOran.appendChild(bFk);
            tdOran.appendChild(bPd);
            tdOran.appendChild(bRoe);
            tr.appendChild(tdOran);

            // Deger
            var tdVal = document.createElement('td');
            tdVal.className = 'text-end';
            tdVal.textContent = formatVal(s.roe) + '%';
            tr.appendChild(tdVal);

            tableBody.appendChild(tr);
        });

        renderPagination(totalItems);
    }

    function formatVal(v) {
        if (v === null || v === undefined) return '-';
        return v.toFixed(2).replace('.', ',');
    }

    function renderPagination(total) {
        if (total <= PAGE_SIZE) {
            hidePagination();
            return;
        }
        paginationContainer.style.display = '';
        var totalPages = Math.ceil(total / PAGE_SIZE);
        var startItem = (currentPage - 1) * PAGE_SIZE + 1;
        var endItem = Math.min(currentPage * PAGE_SIZE, total);
        paginationInfo.textContent = startItem + '-' + endItem + ' / ' + total + ' sonuç';

        while (paginationNav.firstChild) { paginationNav.removeChild(paginationNav.firstChild); }

        // Onceki
        var liPrev = document.createElement('li');
        liPrev.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        var aPrev = document.createElement('a');
        aPrev.className = 'page-link';
        aPrev.href = '#';
        aPrev.textContent = 'Önceki';
        aPrev.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentPage > 1) { currentPage--; renderTable(); }
        });
        liPrev.appendChild(aPrev);
        paginationNav.appendChild(liPrev);

        // Sayfa numaralari (max 7 goster, sliding window)
        var maxVisible = 7;
        var startPage = Math.max(1, currentPage - 3);
        var endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (var i = startPage; i <= endPage; i++) {
            (function (pageNum) {
                var li = document.createElement('li');
                li.className = 'page-item' + (pageNum === currentPage ? ' active' : '');
                var a = document.createElement('a');
                a.className = 'page-link';
                a.href = '#';
                a.textContent = pageNum;
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    currentPage = pageNum;
                    renderTable();
                });
                li.appendChild(a);
                paginationNav.appendChild(li);
            })(i);
        }

        // Sonraki
        var liNext = document.createElement('li');
        liNext.className = 'page-item' + (currentPage >= totalPages ? ' disabled' : '');
        var aNext = document.createElement('a');
        aNext.className = 'page-link';
        aNext.href = '#';
        aNext.textContent = 'Sonraki';
        aNext.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentPage < totalPages) { currentPage++; renderTable(); }
        });
        liNext.appendChild(aNext);
        paginationNav.appendChild(liNext);
    }

    function hidePagination() {
        if (paginationContainer) paginationContainer.style.display = 'none';
    }

    function clearFilters() {
        if (fkMax) fkMax.value = '';
        if (pdddMax) pdddMax.value = '';
        if (roeMin) roeMin.value = '';
        if (allData.length > 0) {
            applyFilters();
        }
    }

    function showLoading(show) {
        if (loadingSpinner) loadingSpinner.style.display = show ? '' : 'none';
    }

    function showError(msg) {
        if (errorText) errorText.textContent = msg;
        if (errorMessage) errorMessage.style.display = '';
    }

    function hideError() {
        if (errorMessage) errorMessage.style.display = 'none';
    }

    function showResults() {
        if (resultsSection) resultsSection.style.display = '';
    }

    function hideResults() {
        if (resultsSection) resultsSection.style.display = 'none';
    }

    document.addEventListener('DOMContentLoaded', init);
})();
