/**
 * Şirket Beklentileri (Guidance) sayfa JS.
 *
 * Client-side arama, yıl filtre ve sayfalama.
 */
(function() {
    'use strict';

    var data = window.guidanceData || [];
    var PAGE_SIZE = 20;
    var currentPage = 1;
    var MAX_TEXT = 100;

    var searchInput = document.getElementById('searchInput');
    var yearFilter = document.getElementById('yearFilter');
    var tbody = document.getElementById('guidanceTableBody');
    var paginationUl = document.getElementById('paginationUl');

    if (!tbody || data.length === 0) return;

    function getFiltered() {
        var search = (searchInput.value || '').trim().toUpperCase();
        var year = yearFilter.value ? parseInt(yearFilter.value) : null;

        return data.filter(function(item) {
            if (search && (!item.hisseSenediKodu || item.hisseSenediKodu.toUpperCase().indexOf(search) === -1)) {
                return false;
            }
            if (year && item.yil !== year) {
                return false;
            }
            return true;
        });
    }

    function truncate(text, max) {
        if (!text) return '-';
        if (text.length <= max) return text;
        return text.substring(0, max) + '...';
    }

    function createTextCell(text) {
        var td = document.createElement('td');
        td.textContent = text;
        return td;
    }

    function render() {
        var filtered = getFiltered();
        var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;

        var start = (currentPage - 1) * PAGE_SIZE;
        var pageData = filtered.slice(start, start + PAGE_SIZE);

        // Tabloyu temizle
        while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

        if (filtered.length === 0) {
            var emptyRow = document.createElement('tr');
            var emptyTd = document.createElement('td');
            emptyTd.setAttribute('colspan', '4');
            emptyTd.className = 'text-center text-muted py-4';
            emptyTd.textContent = 'Sonuç bulunamadı';
            emptyRow.appendChild(emptyTd);
            tbody.appendChild(emptyRow);
            renderPagination(1);
            return;
        }

        pageData.forEach(function(item, i) {
            var tr = document.createElement('tr');

            // # kolonu
            tr.appendChild(createTextCell(start + i + 1));

            // Hisse Kodu kolonu
            var tdCode = document.createElement('td');
            var link = document.createElement('a');
            link.href = '/stock/detail/' + encodeURIComponent(item.hisseSenediKodu || '');
            link.className = 'fw-semibold text-primary';
            link.textContent = item.hisseSenediKodu || '-';
            tdCode.appendChild(link);
            tr.appendChild(tdCode);

            // Yil kolonu
            var tdYear = document.createElement('td');
            var badge = document.createElement('span');
            badge.className = 'badge bg-primary';
            badge.textContent = item.yil || '-';
            tdYear.appendChild(badge);
            tr.appendChild(tdYear);

            // Beklentiler kolonu
            var tdBeklenti = document.createElement('td');
            var fullText = item.beklentiler || '-';
            var shortText = truncate(fullText, MAX_TEXT);
            var textSpan = document.createElement('span');
            textSpan.textContent = shortText;
            tdBeklenti.appendChild(textSpan);

            if (fullText.length > MAX_TEXT) {
                var expandLink = document.createElement('a');
                expandLink.href = 'javascript:void(0)';
                expandLink.className = 'text-primary fw-semibold ms-1';
                expandLink.textContent = 'Devamı';
                expandLink.addEventListener('click', (function(code, yil, text) {
                    return function() {
                        showBeklenti(code + ' (' + yil + ')', text);
                    };
                })(item.hisseSenediKodu || '', item.yil || '', fullText));
                tdBeklenti.appendChild(expandLink);
            }
            tr.appendChild(tdBeklenti);

            tbody.appendChild(tr);
        });

        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        while (paginationUl.firstChild) paginationUl.removeChild(paginationUl.firstChild);

        if (totalPages <= 1) return;

        function createPageItem(page, label, disabled, active) {
            var li = document.createElement('li');
            li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
            var a = document.createElement('a');
            a.className = 'page-link';
            a.href = 'javascript:void(0)';
            if (label) {
                a.textContent = label;
            } else {
                a.textContent = page;
            }
            if (!disabled && !active) {
                a.addEventListener('click', function(e) {
                    e.preventDefault();
                    currentPage = page;
                    render();
                });
            }
            li.appendChild(a);
            return li;
        }

        // Önceki
        paginationUl.appendChild(createPageItem(currentPage - 1, '\u00AB', currentPage === 1, false));

        for (var p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
                paginationUl.appendChild(createPageItem(p, null, false, p === currentPage));
            } else if (p === currentPage - 3 || p === currentPage + 3) {
                var dotLi = document.createElement('li');
                dotLi.className = 'page-item disabled';
                var dotSpan = document.createElement('span');
                dotSpan.className = 'page-link';
                dotSpan.textContent = '...';
                dotLi.appendChild(dotSpan);
                paginationUl.appendChild(dotLi);
            }
        }

        // Sonraki
        paginationUl.appendChild(createPageItem(currentPage + 1, '\u00BB', currentPage === totalPages, false));
    }

    function showBeklenti(title, text) {
        document.getElementById('beklentiModalTitle').textContent = title;
        document.getElementById('beklentiModalBody').textContent = text;
        var modal = new bootstrap.Modal(document.getElementById('beklentiModal'));
        modal.show();
    }

    // Event listeners
    searchInput.addEventListener('input', function() {
        currentPage = 1;
        render();
    });

    yearFilter.addEventListener('change', function() {
        currentPage = 1;
        render();
    });

    // İlk render
    render();
})();
