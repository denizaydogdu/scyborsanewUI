/**
 * Açığa Satış İstatistikleri - client-side arama, sıralama, pagination.
 */
(function () {
    'use strict';

    var PAGE_SIZE = 20;
    var currentPage = 1;
    var sortField = 'lot';
    var sortAsc = false;
    var searchTerm = '';

    var data = window.acigaSatisData || [];

    var searchInput = document.getElementById('searchInput');
    var tableBody = document.getElementById('acigaSatisTableBody');
    var pagination = document.getElementById('pagination');
    var pageInfo = document.getElementById('pageInfo');

    if (!tableBody) return;

    // Arama
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            searchTerm = this.value.trim().toUpperCase();
            currentPage = 1;
            render();
        });
    }

    // Sıralama
    document.querySelectorAll('.sortable').forEach(function (th) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', function () {
            var field = this.getAttribute('data-sort');
            if (sortField === field) {
                sortAsc = !sortAsc;
            } else {
                sortField = field;
                sortAsc = true;
            }
            render();
        });
    });

    function getFilteredData() {
        var filtered = data;
        if (searchTerm) {
            filtered = filtered.filter(function (d) {
                return d.hisseSenediKodu && d.hisseSenediKodu.toUpperCase().indexOf(searchTerm) !== -1;
            });
        }
        filtered.sort(function (a, b) {
            var va, vb;
            switch (sortField) {
                case 'hisse':
                    va = a.hisseSenediKodu || '';
                    vb = b.hisseSenediKodu || '';
                    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
                case 'lot':
                    va = a.acigaSatisLotu || 0;
                    vb = b.acigaSatisLotu || 0;
                    break;
                case 'toplamLot':
                    va = a.toplamIslemHacmiLot || 0;
                    vb = b.toplamIslemHacmiLot || 0;
                    break;
                case 'oran':
                    va = (a.acigaSatisLotu && a.toplamIslemHacmiLot && a.toplamIslemHacmiLot > 0) ? (a.acigaSatisLotu / a.toplamIslemHacmiLot) : 0;
                    vb = (b.acigaSatisLotu && b.toplamIslemHacmiLot && b.toplamIslemHacmiLot > 0) ? (b.acigaSatisLotu / b.toplamIslemHacmiLot) : 0;
                    break;
                case 'fiyat':
                    va = a.ortalamaAcigaSatisFiyati || 0;
                    vb = b.ortalamaAcigaSatisFiyati || 0;
                    break;
                case 'hacim':
                    va = a.acigaSatisHacmiTl || 0;
                    vb = b.acigaSatisHacmiTl || 0;
                    break;
                default:
                    va = a.acigaSatisLotu || 0;
                    vb = b.acigaSatisLotu || 0;
            }
            return sortAsc ? va - vb : vb - va;
        });
        return filtered;
    }

    function formatNumber(val) {
        if (val == null) return '-';
        return val.toLocaleString('tr-TR');
    }

    function formatDecimal(val, decimals) {
        if (val == null) return '-';
        return val.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    function escapeHtml(text) {
        if (!text) return '-';
        var div = document.createElement('div');
        div.textContent = text;
        return div.textContent;
    }

    function render() {
        var filtered = getFilteredData();
        var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;

        var start = (currentPage - 1) * PAGE_SIZE;
        var pageData = filtered.slice(start, start + PAGE_SIZE);

        // Tablo — DOM ile oluştur
        while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);

        pageData.forEach(function (d, i) {
            var oran = (d.acigaSatisLotu != null && d.toplamIslemHacmiLot != null && d.toplamIslemHacmiLot > 0)
                ? (d.acigaSatisLotu * 100.0 / d.toplamIslemHacmiLot) : null;

            var tr = document.createElement('tr');

            var td0 = document.createElement('td');
            td0.textContent = (start + i + 1);
            tr.appendChild(td0);

            var td1 = document.createElement('td');
            var link = document.createElement('a');
            link.href = '/stock/detail/' + encodeURIComponent(d.hisseSenediKodu || '');
            link.className = 'fw-semibold text-primary';
            link.textContent = escapeHtml(d.hisseSenediKodu);
            td1.appendChild(link);
            tr.appendChild(td1);

            var td2 = document.createElement('td');
            td2.className = 'text-end';
            td2.textContent = formatNumber(d.acigaSatisLotu);
            tr.appendChild(td2);

            var td3 = document.createElement('td');
            td3.className = 'text-end';
            td3.textContent = formatNumber(d.toplamIslemHacmiLot);
            tr.appendChild(td3);

            var td4 = document.createElement('td');
            td4.className = 'text-end';
            td4.textContent = oran != null ? formatDecimal(oran, 2) + '%' : '-';
            tr.appendChild(td4);

            var td5 = document.createElement('td');
            td5.className = 'text-end';
            td5.textContent = formatDecimal(d.ortalamaAcigaSatisFiyati, 2);
            tr.appendChild(td5);

            var td6 = document.createElement('td');
            td6.className = 'text-end';
            td6.textContent = formatNumber(d.acigaSatisHacmiTl);
            tr.appendChild(td6);

            tableBody.appendChild(tr);
        });

        // Page info
        if (pageInfo) {
            pageInfo.textContent = filtered.length + ' sonuçtan ' + (start + 1) + '-' + Math.min(start + PAGE_SIZE, filtered.length) + ' arası gösteriliyor';
        }

        // Pagination
        if (pagination) {
            renderPagination(totalPages);
        }
    }

    function renderPagination(totalPages) {
        while (pagination.firstChild) pagination.removeChild(pagination.firstChild);

        addPageItem(currentPage - 1, '\u00AB', currentPage === 1, false, totalPages);

        for (var p = 1; p <= totalPages; p++) {
            if (totalPages <= 7 || p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
                addPageItem(p, String(p), false, p === currentPage, totalPages);
            } else if (Math.abs(p - currentPage) === 2) {
                var ellipsis = document.createElement('li');
                ellipsis.className = 'page-item disabled';
                var span = document.createElement('span');
                span.className = 'page-link';
                span.textContent = '...';
                ellipsis.appendChild(span);
                pagination.appendChild(ellipsis);
            }
        }

        addPageItem(currentPage + 1, '\u00BB', currentPage === totalPages, false, totalPages);
    }

    function addPageItem(page, label, disabled, active, totalPages) {
        var li = document.createElement('li');
        li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
        var a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = label;
        if (!disabled && !active) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                if (page >= 1 && page <= totalPages) {
                    currentPage = page;
                    render();
                }
            });
        }
        li.appendChild(a);
        pagination.appendChild(li);
    }

    render();
})();
