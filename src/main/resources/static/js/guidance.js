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

    // Katılım set
    var katilimSet = {};
    var kCodes = window.KATILIM_CODES || [];
    if (Array.isArray(kCodes)) {
        kCodes.forEach(function(c) { katilimSet[c] = true; });
    } else if (typeof kCodes === 'object') {
        Object.keys(kCodes).forEach(function(c) { katilimSet[c] = true; });
    }
    function isKatilim(code) { return code && katilimSet[code] === true; }

    var searchInput = document.getElementById('searchInput');
    var yearFilter = document.getElementById('yearFilter');
    var katilimFilter = document.getElementById('katilimFilter');
    var tbody = document.getElementById('guidanceTableBody');
    var paginationUl = document.getElementById('paginationUl');

    if (!tbody || data.length === 0) return;

    function getFiltered() {
        var search = (searchInput.value || '').trim().toUpperCase();
        var year = yearFilter.value ? parseInt(yearFilter.value) : null;
        var katilimOnly = katilimFilter ? katilimFilter.checked : false;

        return data.filter(function(item) {
            if (katilimOnly && !isKatilim(item.hisseSenediKodu)) {
                return false;
            }
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

    /**
     * Hisse kodu hucresini logo ile birlikte olusturur.
     * stockLogos haritasindan logoid bulunursa avatar-xs logo gosterilir,
     * bulunamazsa harf fallback gosterilir.
     *
     * @param {string} code - Hisse kodu
     * @returns {HTMLTableCellElement} td elementi
     */
    function createStockCodeCell(code) {
        var td = document.createElement('td');
        var wrapper = document.createElement('div');
        wrapper.className = 'd-flex align-items-center';

        var avatarDiv = document.createElement('div');
        avatarDiv.className = 'flex-shrink-0 avatar-xs me-2';
        var logoid = (window.stockLogos || {})[code];
        if (logoid) {
            var logoImg = document.createElement('img');
            logoImg.src = '/img/stock-logos/' + encodeURIComponent(logoid);
            logoImg.alt = code || '';
            logoImg.className = 'avatar-xs rounded-circle';
            var fallbackSpan = document.createElement('span');
            fallbackSpan.className = 'avatar-title rounded-circle fw-semibold';
            fallbackSpan.style.cssText = 'display:none;background:transparent;color:#495057;border:1.5px solid #ced4da;font-size:0.55rem';
            fallbackSpan.textContent = code ? code.substring(0, Math.min(4, code.length)) : '?';
            (function(img, fallback) {
                img.onerror = function() {
                    img.style.display = 'none';
                    fallback.style.display = 'flex';
                };
            })(logoImg, fallbackSpan);
            avatarDiv.appendChild(logoImg);
            avatarDiv.appendChild(fallbackSpan);
        } else {
            var avatarInner = document.createElement('div');
            avatarInner.className = 'avatar-title rounded-circle fw-semibold';
            avatarInner.style.cssText = 'background:transparent;color:#495057;border:1.5px solid #ced4da;font-size:0.55rem';
            avatarInner.textContent = code ? code.substring(0, Math.min(4, code.length)) : '?';
            avatarDiv.appendChild(avatarInner);
        }
        wrapper.appendChild(avatarDiv);

        var link = document.createElement('a');
        link.href = '/stock/detail/' + encodeURIComponent(code || '');
        link.className = 'fw-semibold text-primary';
        link.textContent = code || '-';
        wrapper.appendChild(link);

        // Katılım K badge
        if (isKatilim(code)) {
            var kBadge = document.createElement('span');
            kBadge.className = 'badge bg-success bg-opacity-25 text-success ms-1 katilim-badge';
            kBadge.style.cssText = 'font-size:0.65rem;padding:1px 4px';
            kBadge.title = 'Katılım Endeksi';
            kBadge.textContent = 'K';
            wrapper.appendChild(kBadge);
        }

        td.appendChild(wrapper);
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

            // Hisse Kodu kolonu (logo ile)
            tr.appendChild(createStockCodeCell(item.hisseSenediKodu || ''));

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

        // Dinamik modal başlığı
        modalTitle.textContent = stockCode + ' \u2014 ' + yil + ' Y\u0131l\u0131 Beklentileri';

        // Yukleniyor goster
        while (modalBody.firstChild) modalBody.removeChild(modalBody.firstChild);
        var spinner = document.createElement('div');
        spinner.className = 'text-center py-4';
        spinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2 text-muted">Y\u00fckleniyor...</span>';
        modalBody.appendChild(spinner);

        var modal = new bootstrap.Modal(document.getElementById('beklentiModal'));
        modal.show();

        var csrfMeta = document.querySelector('meta[name="_csrf"]');
        var csrfHeaderMeta = document.querySelector('meta[name="_csrf_header"]');
        var headers = {};
        if (csrfMeta && csrfHeaderMeta) {
            headers[csrfHeaderMeta.content] = csrfMeta.content;
        }

        fetch('/ajax/guidance/' + encodeURIComponent(stockCode) + '?yil=' + encodeURIComponent(yil), { headers: headers })
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
                    emptyMsg.textContent = 'Bu hisse i\u00e7in beklenti verisi bulunamad\u0131.';
                    modalBody.appendChild(emptyMsg);
                    return;
                }

                // Markdown tablo -> HTML tablo cevir
                var result = markdownTableToHtml(rawText);
                if (result) {
                    modalBody.appendChild(result);
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
                errMsg.textContent = 'Beklenti verisi al\u0131namad\u0131. L\u00fctfen tekrar deneyin.';
                modalBody.appendChild(errMsg);
            });
    }

    /**
     * MCP raw text formatindan hisse+yil bazli kartlar olusturur.
     *
     * Raw format:
     * | hisse_senedi_kodu | yil | beklentiler |
     * | --- | --- | --- |
     * | AEFES | 2026 | | Beklenti Konusu | 2026 Beklenti | \r\n| --- | --- | \r\n| Konu | Deger | ...
     *
     * Her hisse+yil icin ayri kart olusturulur. Ic tablo parse edilir.
     * XSS koruması: DOM API ile olusturulur.
     *
     * @param {string} text - Raw markdown tablo metni
     * @returns {DocumentFragment|null} Kartlar iceren fragment veya null
     */
    function markdownTableToHtml(text) {
        if (!text) return null;

        var lines = text.split('\n');
        if (lines.length < 3) return null;

        var STOCK_RE = /^[A-Z0-9]{2,10}$/;
        var SEP_RE = /^[-:\s|]+$/;

        // Satır bazlı parse: hisse kodu olan satır = yeni bölüm, olmayan = iç tablo satırı
        var sections = []; // [{stockCode, yil, innerLines: []}]
        var currentSection = null;
        var skippedOuterHeader = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            // Pipe temizle
            var cleaned = line;
            if (cleaned.charAt(0) === '|') cleaned = cleaned.substring(1);
            if (cleaned.charAt(cleaned.length - 1) === '|') cleaned = cleaned.substring(0, cleaned.length - 1);

            var parts = cleaned.split('|').map(function(s) { return s.trim(); });

            // Dış tablo header satırını atla (hisse_senedi_kodu | yil | beklentiler)
            if (!skippedOuterHeader && parts[0] === 'hisse_senedi_kodu') {
                skippedOuterHeader = true;
                continue;
            }

            // Separator satırını atla (--- | --- | ---)
            if (SEP_RE.test(cleaned.replace(/\|/g, ' '))) {
                // Ama iç tablo separator'ı currentSection'a eklenmemeli
                continue;
            }

            // Hisse kodu tespiti: ilk kolon BIST kodu mu?
            if (parts.length >= 2 && STOCK_RE.test(parts[0])) {
                // Yeni bölüm başlat
                currentSection = {
                    stockCode: parts[0],
                    yil: parts[1],
                    innerLines: []
                };
                sections.push(currentSection);

                // 3. kolondan sonrası iç tablonun ilk satırı (header)
                if (parts.length > 2) {
                    currentSection.innerLines.push(parts.slice(2));
                }
            } else if (currentSection) {
                // İç tablo data satırı
                currentSection.innerLines.push(parts);
            }
        }

        if (sections.length === 0) return null;

        var fragment = document.createDocumentFragment();

        for (var s = 0; s < sections.length; s++) {
            if (s > 0) {
                fragment.appendChild(document.createElement('hr'));
            }

            var sec = sections[s];

            // Başlık
            var heading = document.createElement('h6');
            heading.className = 'fw-bold text-primary mb-3';
            heading.textContent = '\uD83D\uDCCB ' + sec.stockCode + ' \u2014 ' + sec.yil + ' Y\u0131l\u0131 Beklentileri';
            fragment.appendChild(heading);

            if (sec.innerLines.length === 0) {
                var noData = document.createElement('p');
                noData.className = 'text-muted';
                noData.textContent = 'Detay verisi bulunamad\u0131.';
                fragment.appendChild(noData);
                continue;
            }

            // İç tablo oluştur
            var tableDiv = document.createElement('div');
            tableDiv.className = 'table-responsive';
            var table = document.createElement('table');
            table.className = 'table table-sm table-bordered mb-0';
            var thead = document.createElement('thead');
            thead.className = 'table-light';
            var tbodyInner = document.createElement('tbody');
            var isFirst = true;

            for (var r = 0; r < sec.innerLines.length; r++) {
                var cols = sec.innerLines[r];
                // Boş satır filtrele
                if (cols.length === 0 || cols.every(function(c) { return !c; })) continue;

                var tr = document.createElement('tr');
                for (var c = 0; c < cols.length; c++) {
                    var cellText = (cols[c] || '').replace(/\*\*/g, '').replace(/\\-/g, '-').trim();
                    if (isFirst) {
                        var th = document.createElement('th');
                        th.className = 'fw-semibold';
                        th.textContent = cellText;
                        tr.appendChild(th);
                    } else {
                        var td = document.createElement('td');
                        td.textContent = cellText;
                        if (c === 0) td.className = 'fw-medium';
                        tr.appendChild(td);
                    }
                }

                if (isFirst) {
                    thead.appendChild(tr);
                    isFirst = false;
                } else {
                    tbodyInner.appendChild(tr);
                }
            }

            if (thead.childNodes.length > 0) table.appendChild(thead);
            if (tbodyInner.childNodes.length > 0) table.appendChild(tbodyInner);

            var wrapper = document.createElement('div');
            wrapper.className = 'table-responsive mb-3';
            wrapper.appendChild(table);
            fragment.appendChild(wrapper);
        }

        return fragment;
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

    if (katilimFilter) {
        katilimFilter.addEventListener('change', function() {
            currentPage = 1;
            render();
        });
    }

    // İlk render
    render();
})();
