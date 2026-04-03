/**
 * Temel Analiz Tarama Sayfası JavaScript
 *
 * Tüm finansal oranları AJAX ile alır, client-side hisse bazında pivot yapar,
 * filtre uygular (F/K, PD/DD, ROE) ve sayfalı tablo render eder.
 * DOM API kullanılır (innerHTML yok, XSS koruması).
 */
(function () {
    'use strict';

    /** Sayfa başına satır sayısı. */
    var PAGE_SIZE = 20;

    /** Tüm oranlar (API'den gelen ham veri). */
    var allOranlar = [];

    /** Filtrelenmiş ve pivotlanmış sonuçlar. */
    var filteredResults = [];

    /** Mevcut sayfa numarası (0-indexed). */
    var currentPage = 0;

    /** Veri yüklendi mi? */
    var dataLoaded = false;

    /**
     * Sayfa yüklendiğinde çalışır.
     */
    function init() {
        var btnScan = document.getElementById('btnScan');
        var btnClear = document.getElementById('btnClear');

        if (btnScan) {
            btnScan.addEventListener('click', function () {
                if (!dataLoaded) {
                    loadData();
                } else {
                    applyFilter();
                }
            });
        }

        if (btnClear) {
            btnClear.addEventListener('click', function () {
                document.getElementById('fkMax').value = '';
                document.getElementById('pdddMax').value = '';
                document.getElementById('roeMin').value = '';
                hideError();
                if (dataLoaded) {
                    applyFilter();
                }
            });
        }
    }

    /**
     * API'den tüm finansal oranları yükler.
     */
    function loadData() {
        showLoading(true);
        hideError();
        hideEmpty();
        hideTable();

        fetch('/ajax/temel-analiz/scan')
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function (data) {
                allOranlar = data || [];
                dataLoaded = true;
                showLoading(false);
                applyFilter();
            })
            .catch(function () {
                showLoading(false);
                showError();
            });
    }

    /**
     * Oranları hisse bazında pivotlar ve filtre uygular.
     * Her hisse için F/K, PD/DD, ROE değerlerini bulur.
     */
    function applyFilter() {
        var fkMaxInput = document.getElementById('fkMax');
        var pdddMaxInput = document.getElementById('pdddMax');
        var roeMinInput = document.getElementById('roeMin');

        var fkMax = fkMaxInput && fkMaxInput.value ? parseFloat(fkMaxInput.value) : null;
        var pdddMax = pdddMaxInput && pdddMaxInput.value ? parseFloat(pdddMaxInput.value) : null;
        var roeMin = roeMinInput && roeMinInput.value ? parseFloat(roeMinInput.value) : null;

        // Hisse bazında pivot: { GARAN: { fk: ..., pddd: ..., roe: ... } }
        var pivotMap = {};

        for (var i = 0; i < allOranlar.length; i++) {
            var row = allOranlar[i];
            var code = row.hisseSenediKodu;
            if (!code) continue;

            if (!pivotMap[code]) {
                pivotMap[code] = { hisse: code, fk: null, pddd: null, roe: null };
            }

            var oranName = (row.oran || '').toLowerCase();
            var val = row.deger;

            if (oranName.indexOf('f/k') !== -1 || oranName.indexOf('fiyat/kazanç') !== -1 || oranName === 'fk') {
                pivotMap[code].fk = val;
            } else if (oranName.indexOf('pd/dd') !== -1 || oranName.indexOf('piyasa değeri/defter değeri') !== -1 || oranName === 'pddd') {
                pivotMap[code].pddd = val;
            } else if (oranName.indexOf('roe') !== -1 || oranName.indexOf('özsermaye kârlılığı') !== -1 || oranName.indexOf('özsermaye karlılığı') !== -1) {
                pivotMap[code].roe = val;
            }
        }

        // Pivot map → array
        var results = [];
        var keys = Object.keys(pivotMap);
        for (var k = 0; k < keys.length; k++) {
            var item = pivotMap[keys[k]];

            // En az bir oran değeri olan hisseleri dahil et
            if (item.fk == null && item.pddd == null && item.roe == null) continue;

            // Filtre uygula
            if (fkMax != null && (item.fk == null || item.fk > fkMax)) continue;
            if (pdddMax != null && (item.pddd == null || item.pddd > pdddMax)) continue;
            if (roeMin != null && (item.roe == null || item.roe < roeMin)) continue;

            results.push(item);
        }

        // ROE'ye göre azalan sırala
        results.sort(function (a, b) {
            var aRoe = a.roe != null ? a.roe : -Infinity;
            var bRoe = b.roe != null ? b.roe : -Infinity;
            return bRoe - aRoe;
        });

        filteredResults = results;
        currentPage = 0;

        updateResultCount(filteredResults.length);

        if (filteredResults.length === 0) {
            hideTable();
            showEmpty();
        } else {
            hideEmpty();
            renderTable();
        }
    }

    /**
     * Tabloyu mevcut sayfa için render eder.
     */
    function renderTable() {
        var tbody = document.getElementById('resultTableBody');
        var container = document.getElementById('resultTableContainer');
        if (!tbody || !container) return;

        // Tbody temizle
        while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

        var start = currentPage * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, filteredResults.length);

        for (var i = start; i < end; i++) {
            var item = filteredResults[i];
            var tr = document.createElement('tr');

            // # sıra
            var tdNo = document.createElement('td');
            tdNo.textContent = String(i + 1);
            tr.appendChild(tdNo);

            // Hisse
            var tdHisse = document.createElement('td');
            var hisseLink = document.createElement('a');
            hisseLink.href = '/bilancolar/' + encodeURIComponent(item.hisse);
            hisseLink.className = 'fw-semibold text-primary';
            hisseLink.textContent = item.hisse;
            tdHisse.appendChild(hisseLink);
            tr.appendChild(tdHisse);

            // F/K
            var tdFk = document.createElement('td');
            tdFk.className = 'text-end';
            tdFk.textContent = item.fk != null ? formatNumber(item.fk) : '-';
            tr.appendChild(tdFk);

            // PD/DD
            var tdPddd = document.createElement('td');
            tdPddd.className = 'text-end';
            tdPddd.textContent = item.pddd != null ? formatNumber(item.pddd) : '-';
            tr.appendChild(tdPddd);

            // ROE
            var tdRoe = document.createElement('td');
            tdRoe.className = 'text-end';
            if (item.roe != null) {
                tdRoe.textContent = formatNumber(item.roe);
                tdRoe.classList.add(item.roe >= 15 ? 'text-success' : (item.roe >= 0 ? 'text-body' : 'text-danger'));
            } else {
                tdRoe.textContent = '-';
            }
            tr.appendChild(tdRoe);

            tbody.appendChild(tr);
        }

        container.style.display = '';
        renderPagination();
    }

    /**
     * Sayfalama UI'ını render eder.
     */
    function renderPagination() {
        var nav = document.getElementById('paginationNav');
        var list = document.getElementById('paginationList');
        if (!nav || !list) return;

        while (list.firstChild) list.removeChild(list.firstChild);

        var totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);
        if (totalPages <= 1) {
            nav.style.display = 'none';
            return;
        }

        nav.style.display = '';

        // Onceki
        var liPrev = document.createElement('li');
        liPrev.className = 'page-item' + (currentPage === 0 ? ' disabled' : '');
        var aPrev = document.createElement('a');
        aPrev.className = 'page-link';
        aPrev.href = '#';
        aPrev.textContent = 'Önceki';
        aPrev.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentPage > 0) {
                currentPage--;
                renderTable();
            }
        });
        liPrev.appendChild(aPrev);
        list.appendChild(liPrev);

        // Sayfa numaraları (max 7 göster)
        var startPage = Math.max(0, currentPage - 3);
        var endPage = Math.min(totalPages, startPage + 7);
        if (endPage - startPage < 7) {
            startPage = Math.max(0, endPage - 7);
        }

        for (var p = startPage; p < endPage; p++) {
            (function (pageNum) {
                var li = document.createElement('li');
                li.className = 'page-item' + (pageNum === currentPage ? ' active' : '');
                var a = document.createElement('a');
                a.className = 'page-link';
                a.href = '#';
                a.textContent = String(pageNum + 1);
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    currentPage = pageNum;
                    renderTable();
                });
                li.appendChild(a);
                list.appendChild(li);
            })(p);
        }

        // Sonraki
        var liNext = document.createElement('li');
        liNext.className = 'page-item' + (currentPage >= totalPages - 1 ? ' disabled' : '');
        var aNext = document.createElement('a');
        aNext.className = 'page-link';
        aNext.href = '#';
        aNext.textContent = 'Sonraki';
        aNext.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentPage < totalPages - 1) {
                currentPage++;
                renderTable();
            }
        });
        liNext.appendChild(aNext);
        list.appendChild(liNext);
    }

    // =========================================================================
    // UI HELPERS
    // =========================================================================

    /**
     * Sayıyı Türkçe formatlar.
     *
     * @param {number} val - Sayı değeri
     * @return {string} Formatlı sayı
     */
    function formatNumber(val) {
        if (val == null) return '-';
        return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    }

    /**
     * Sonuç sayısını günceller.
     *
     * @param {number} count - Sonuç sayısı
     */
    function updateResultCount(count) {
        var badge = document.getElementById('resultCount');
        if (badge) {
            badge.textContent = String(count);
            badge.style.display = count > 0 ? '' : 'none';
        }
    }

    function showLoading(show) {
        var el = document.getElementById('loadingSpinner');
        if (el) el.style.display = show ? '' : 'none';
    }

    function showError() {
        var el = document.getElementById('errorMessage');
        if (el) el.style.display = '';
    }

    function hideError() {
        var el = document.getElementById('errorMessage');
        if (el) el.style.display = 'none';
    }

    function showEmpty() {
        var el = document.getElementById('emptyState');
        if (el) el.style.display = '';
    }

    function hideEmpty() {
        var el = document.getElementById('emptyState');
        if (el) el.style.display = 'none';
    }

    function hideTable() {
        var el = document.getElementById('resultTableContainer');
        if (el) el.style.display = 'none';
        var nav = document.getElementById('paginationNav');
        if (nav) nav.style.display = 'none';
    }

    document.addEventListener('DOMContentLoaded', init);
})();
