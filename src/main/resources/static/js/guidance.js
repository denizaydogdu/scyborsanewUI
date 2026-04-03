/**
 * Sirket Beklentileri (Guidance) sayfa JS.
 *
 * Client-side arama, yil filtre ve sayfalama.
 * Beklentiler detayi AJAX ile hisse bazli cekilir ve modal'da gosterilir.
 */
(function() {
    'use strict';

    var data = window.guidanceData || [];
    var PAGE_SIZE = 20;
    var currentPage = 1;

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

            // Islem kolonu — Detay butonu
            var tdAction = document.createElement('td');
            var detayBtn = document.createElement('button');
            detayBtn.className = 'btn btn-sm btn-soft-primary';
            detayBtn.textContent = 'Detay';
            detayBtn.addEventListener('click', (function(code, yil) {
                return function() {
                    fetchAndShowDetail(code, yil);
                };
            })(item.hisseSenediKodu || '', item.yil || ''));
            tdAction.appendChild(detayBtn);
            tr.appendChild(tdAction);

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

        // Onceki
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

    /**
     * AJAX ile hisse bazli raw guidance metnini getirir ve modal'da gosterir.
     */
    function fetchAndShowDetail(stockCode, yil) {
        var modalTitle = document.getElementById('beklentiModalTitle');
        var modalBody = document.getElementById('beklentiModalBody');

        modalTitle.textContent = stockCode + ' (' + yil + ') Beklentileri';

        // Yukleniyor goster
        while (modalBody.firstChild) modalBody.removeChild(modalBody.firstChild);
        var spinner = document.createElement('div');
        spinner.className = 'text-center py-4';
        spinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2 text-muted">Yükleniyor...</span>';
        modalBody.appendChild(spinner);

        var modal = new bootstrap.Modal(document.getElementById('beklentiModal'));
        modal.show();

        var csrfMeta = document.querySelector('meta[name="_csrf"]');
        var csrfHeaderMeta = document.querySelector('meta[name="_csrf_header"]');
        var headers = {};
        if (csrfMeta && csrfHeaderMeta) {
            headers[csrfHeaderMeta.content] = csrfMeta.content;
        }

        fetch('/ajax/guidance/' + encodeURIComponent(stockCode), { headers: headers })
            .then(function(response) {
                if (response.status === 204) {
                    return null;
                }
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.text();
            })
            .then(function(rawText) {
                while (modalBody.firstChild) modalBody.removeChild(modalBody.firstChild);

                if (!rawText) {
                    var emptyMsg = document.createElement('div');
                    emptyMsg.className = 'text-center text-muted py-4';
                    emptyMsg.textContent = 'Bu hisse için beklenti verisi bulunamadı.';
                    modalBody.appendChild(emptyMsg);
                    return;
                }

                // Markdown tablo -> HTML tablo cevir
                var tableEl = markdownTableToHtml(rawText);
                if (tableEl) {
                    var wrapper = document.createElement('div');
                    wrapper.className = 'table-responsive';
                    wrapper.appendChild(tableEl);
                    modalBody.appendChild(wrapper);
                } else {
                    // Fallback: duz metin
                    var pre = document.createElement('pre');
                    pre.className = 'mb-0';
                    pre.style.whiteSpace = 'pre-wrap';
                    pre.textContent = rawText;
                    modalBody.appendChild(pre);
                }
            })
            .catch(function(err) {
                while (modalBody.firstChild) modalBody.removeChild(modalBody.firstChild);
                var errMsg = document.createElement('div');
                errMsg.className = 'alert alert-warning mb-0';
                errMsg.textContent = 'Beklenti verisi alınamadı. Lütfen tekrar deneyin.';
                modalBody.appendChild(errMsg);
            });
    }

    /**
     * Markdown tabloyu HTML <table> elementine donusturur.
     * Ic ice tablolar ve **bold** markdown destekler.
     * XSS koruması: textContent kullanir.
     *
     * @param {string} text - Raw markdown tablo metni
     * @returns {HTMLTableElement|null} HTML tablo veya null
     */
    function markdownTableToHtml(text) {
        if (!text) return null;

        var lines = text.split(/\r?\n/).filter(function(l) { return l.trim().length > 0; });
        if (lines.length < 2) return null;

        // En az bir satir pipe icermeli
        var hasPipe = false;
        for (var k = 0; k < lines.length; k++) {
            if (lines[k].indexOf('|') !== -1) { hasPipe = true; break; }
        }
        if (!hasPipe) return null;

        var table = document.createElement('table');
        table.className = 'table table-sm table-bordered mb-0';

        var isHeader = true;
        var headerDone = false;
        var thead = document.createElement('thead');
        var tbodyEl = document.createElement('tbody');

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();

            // Ayirici satirini atla (| --- | --- |)
            if (/^\|?\s*[-:]+\s*(\|\s*[-:]+\s*)*\|?\s*$/.test(line)) {
                if (isHeader) {
                    isHeader = false;
                    headerDone = true;
                }
                continue;
            }

            // Pipe ile basla/bitir temizligi
            if (line.startsWith('|')) line = line.substring(1);
            if (line.endsWith('|')) line = line.substring(0, line.length - 1);

            var cells = line.split('|');
            var tr = document.createElement('tr');

            for (var j = 0; j < cells.length; j++) {
                var cellTag = (isHeader && !headerDone) ? 'th' : 'td';
                var cell = document.createElement(cellTag);
                var cellText = cells[j].trim();

                // **bold** markdown -> <strong>
                if (cellText.indexOf('**') !== -1) {
                    cell.innerHTML = '';
                    var parts = cellText.split(/\*\*/);
                    for (var p = 0; p < parts.length; p++) {
                        if (p % 2 === 1) {
                            // Bold kisim
                            var strong = document.createElement('strong');
                            strong.textContent = parts[p];
                            cell.appendChild(strong);
                        } else {
                            cell.appendChild(document.createTextNode(parts[p]));
                        }
                    }
                } else {
                    cell.textContent = cellText;
                }

                if (cellTag === 'th') {
                    cell.className = 'bg-light';
                }
                tr.appendChild(cell);
            }

            if (isHeader && !headerDone) {
                thead.appendChild(tr);
            } else {
                tbodyEl.appendChild(tr);
            }
        }

        if (thead.childNodes.length > 0) {
            table.appendChild(thead);
        }
        if (tbodyEl.childNodes.length > 0) {
            table.appendChild(tbodyEl);
        } else {
            return null; // Veri satiri yoksa null don
        }

        return table;
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

    // Ilk render
    render();
})();
