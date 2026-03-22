/**
 * Bilancolar Liste Sayfasi JavaScript
 *
 * SSR ile gelen rapor verisini client-side filtre, siralama ve sayfalama
 * ile tabloya render eder. KPI kartlarini hesaplar.
 * Sayfa bazli lazy-load ile rasyo verilerini (PD/DD, F/K, FD/FAVOK) yukler.
 *
 * Thymeleaf inline JS'den window global degiskenleri bekler:
 * - window.RAPOR_DATA (Array of {symbol, year, period, time, link, consolidation, disclosureIndex})
 */
(function () {
    'use strict';

    var PAGE_SIZE = 25;
    var currentPage = 1;
    var sortField = 'symbol';
    var sortDir = 'asc';
    var filteredData = [];

    /** Aktif filtreler. */
    var filters = {
        search: '',
        year: '',
        period: '',
        cons: '',
        pddd: '',
        fk: ''
    };

    /** Donem numarasina karsilik gelen ay (yil/ay formati icin). */
    var PERIOD_MONTH_MAP = {1: '03', 2: '06', 3: '09', 4: '12'};

    /** Sayfa bazli rasyo cache: symbol -> {fk, pddd, fdfavok}. */
    var rasyoCache = {};

    /** Sayfa bazli rasyo yukleme durumu. */
    var currentLoadEpoch = 0;
    var rasyoLoadedCount = 0;
    var rasyoTotalCount = 0;

    /**
     * Sayfa yuklendiginde calisir.
     */
    function init() {
        var data = window.RAPOR_DATA || [];
        filteredData = data.slice();

        updateKpiCards(data);
        populateYearFilter(data);
        bindEvents();
        sortAndRender();
    }

    /**
     * Yil filtresini benzersiz yillarla doldurur.
     * @param {Array} data - Rapor verisi
     */
    function populateYearFilter(data) {
        var years = {};
        for (var i = 0; i < data.length; i++) {
            if (data[i].year) years[data[i].year] = true;
        }
        var sortedYears = Object.keys(years).sort(function(a, b) { return b - a; });
        var select = document.getElementById('filterYear');
        if (!select) return;
        for (var y = 0; y < sortedYears.length; y++) {
            var opt = document.createElement('option');
            opt.value = sortedYears[y];
            opt.textContent = sortedYears[y];
            select.appendChild(opt);
        }
    }

    /**
     * KPI kartlarini gunceller.
     *
     * @param {Array} data - Tum rapor verisi
     */
    function updateKpiCards(data) {
        // Toplam Rapor
        var totalEl = document.getElementById('kpiTotal');
        if (totalEl) totalEl.textContent = data.length;

        // Konsolide Rapor
        var consolidatedCount = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i].consolidation === 'CS') consolidatedCount++;
        }
        var consEl = document.getElementById('kpiConsolidated');
        if (consEl) consEl.textContent = consolidatedCount;

        // Son 30 Gun
        var now = new Date();
        var thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        var last30Count = 0;
        for (var j = 0; j < data.length; j++) {
            if (data[j].time) {
                var d = new Date(data[j].time);
                if (!isNaN(d.getTime()) && d >= thirtyDaysAgo) last30Count++;
            }
        }
        var last30El = document.getElementById('kpiLast30');
        if (last30El) last30El.textContent = last30Count;
    }

    /**
     * Rasyo KPI kartini gunceller (yukleme durumu).
     *
     * @param {number} loaded - Yuklenen rasyo sayisi
     * @param {number} total - Toplam rasyo sayisi
     */
    function updateRasyoKpi(loaded, total) {
        var statusEl = document.getElementById('kpiRasyoStatus');
        var iconEl = document.getElementById('kpiRasyoIcon');
        if (!statusEl) return;

        if (loaded >= total && total > 0) {
            statusEl.innerHTML = '';
            statusEl.textContent = loaded + '/' + total;
            if (iconEl) {
                iconEl.className = 'ri-checkbox-circle-line text-success';
            }
        } else if (total > 0) {
            statusEl.innerHTML = '';
            var span = document.createElement('span');
            span.className = 'fs-14';
            span.textContent = loaded + '/' + total;
            statusEl.appendChild(span);

            if (iconEl) {
                iconEl.className = 'ri-loader-4-line text-info';
            }
        } else {
            statusEl.innerHTML = '';
            var waiting = document.createElement('span');
            waiting.className = 'text-muted fs-14';
            waiting.textContent = 'Bekleniyor';
            statusEl.appendChild(waiting);
        }
    }

    /**
     * Olay dinleyicilerini baglar.
     */
    function bindEvents() {
        // Arama
        var searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keyup', function () {
                applyFilters();
            });
        }

        // Siralama header'lari
        var headers = document.querySelectorAll('#bilancoTable thead th[data-sort]');
        headers.forEach(function (th) {
            th.addEventListener('click', function (e) {
                if (e.target.closest('[data-bs-toggle="tooltip"]')) return;
                var field = th.getAttribute('data-sort');
                if (sortField === field) {
                    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    sortField = field;
                    sortDir = 'asc';
                }
                sortAndRender();
            });
        });

        // Filtre selectbox'lar
        var filterIds = ['filterYear', 'filterPeriod', 'filterCons', 'filterPddd', 'filterFk'];
        filterIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', function() {
                    applyFilters();
                });
            }
        });

        // Temizle butonu
        var clearBtn = document.getElementById('clearFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                var ids = ['filterYear', 'filterPeriod', 'filterCons', 'filterPddd', 'filterFk', 'searchInput'];
                for (var i = 0; i < ids.length; i++) {
                    var el = document.getElementById(ids[i]);
                    if (el) el.value = '';
                }
                applyFilters();
            });
        }
    }

    /**
     * Tum filtreleri uygular ve tabloyu yeniden render eder.
     */
    function applyFilters() {
        var searchVal = (document.getElementById('searchInput').value || '').toUpperCase().trim();
        var yearVal = document.getElementById('filterYear').value;
        var periodVal = document.getElementById('filterPeriod').value;
        var consVal = document.getElementById('filterCons').value;
        var pdddVal = document.getElementById('filterPddd').value;
        var fkVal = document.getElementById('filterFk').value;

        var allData = window.RAPOR_DATA || [];
        filteredData = [];

        for (var i = 0; i < allData.length; i++) {
            var r = allData[i];

            // Arama filtresi
            if (searchVal && (!r.symbol || r.symbol.toUpperCase().indexOf(searchVal) === -1)) continue;

            // Yil filtresi
            if (yearVal && String(r.year) !== yearVal) continue;

            // Donem filtresi
            if (periodVal && String(r.period) !== periodVal) continue;

            // Konsolidasyon filtresi
            if (consVal && r.consolidation !== consVal) continue;

            // PD/DD aralik filtresi (rasyo cache gerekli)
            if (pdddVal) {
                var cached = rasyoCache[r.symbol];
                if (cached) {
                    var pddd = cached.pddd;
                    if (!matchRange(pddd, pdddVal)) continue;
                }
                // If not cached yet, don't filter out — include the row
            }

            // F/K aralik filtresi
            if (fkVal) {
                var cachedFk = rasyoCache[r.symbol];
                if (cachedFk) {
                    var fk = cachedFk.fk;
                    if (!matchRange(fk, fkVal)) continue;
                }
                // If not cached yet, don't filter out — include the row
            }

            filteredData.push(r);
        }

        currentPage = 1;
        updateActiveFilters(searchVal, yearVal, periodVal, consVal, pdddVal, fkVal);
        sortAndRender();
    }

    /**
     * Sayisal degerin belirtilen aralikta olup olmadigini kontrol eder.
     * @param {number|null} val - Deger
     * @param {string} range - Aralik ("min-max" formati)
     * @return {boolean}
     */
    function matchRange(val, range) {
        if (val == null) return false;
        var parts = range.split('-');
        var min = parseFloat(parts[0]);
        var max = parts.length > 1 ? parseFloat(parts[1]) : Infinity;
        if (max >= 999) max = Infinity;  // Treat 999+ as unbounded
        return val >= min && (max === Infinity ? true : val < max);
    }

    /**
     * Aktif filtre badge'lerini gunceller.
     */
    function updateActiveFilters(search, year, period, cons, pddd, fk) {
        var container = document.getElementById('activeFilters');
        var badges = document.getElementById('activeFilterBadges');
        if (!container || !badges) return;

        // Clear
        while (badges.firstChild) badges.removeChild(badges.firstChild);

        var filterLabels = [];

        if (search) filterLabels.push('Arama: ' + search);
        if (year) filterLabels.push('Yil: ' + year);
        if (period) {
            var periodNames = {'1': '3 Aylik', '2': '6 Aylik', '3': '9 Aylik', '4': 'Yillik'};
            filterLabels.push('Donem: ' + (periodNames[period] || period));
        }
        if (cons) filterLabels.push(cons === 'CS' ? 'Konsolide' : 'Solo');
        if (pddd) filterLabels.push('PD/DD: ' + pddd.replace('-', ' - '));
        if (fk) filterLabels.push('F/K: ' + fk.replace('-', ' - '));

        if (filterLabels.length > 0) {
            for (var i = 0; i < filterLabels.length; i++) {
                var badge = document.createElement('span');
                badge.className = 'badge bg-primary-subtle text-primary me-1 fs-11';
                badge.textContent = filterLabels[i];
                badges.appendChild(badge);
            }

            // Kayit sayisi
            var countBadge = document.createElement('span');
            countBadge.className = 'badge bg-dark-subtle text-dark ms-2 fs-11';
            countBadge.textContent = filteredData.length + ' / ' + (window.RAPOR_DATA || []).length + ' kayit';
            badges.appendChild(countBadge);

            container.classList.remove('d-none');
        } else {
            container.classList.add('d-none');
        }
    }

    /**
     * Veriyi siralar. 'donem' alani icin year+period birlesimine gore siralar.
     */
    function sortData() {
        filteredData.sort(function (a, b) {
            var va, vb;

            if (sortField === 'donem') {
                va = (a.year || 0) * 10 + (a.period || 0);
                vb = (b.year || 0) * 10 + (b.period || 0);
            } else {
                va = a[sortField];
                vb = b[sortField];
            }

            // Null handling
            if (va == null && vb == null) return 0;
            if (va == null) return 1;  // nulls always last
            if (vb == null) return -1;

            // String comparison
            if (typeof va === 'string' || typeof vb === 'string') {
                va = String(va).toUpperCase();
                vb = String(vb).toUpperCase();
            }

            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * Donem formatlar. period numarasini yil/ay formatina donusturur.
     *
     * @param {number} year - Yil (orn. 2025)
     * @param {number} period - Donem (1-4)
     * @return {string} Formatli donem (orn. "2025/12")
     */
    function formatDonem(year, period) {
        if (!year) return '-';
        var month = PERIOD_MONTH_MAP[period];
        if (month) {
            return year + '/' + month;
        }
        return year + '/' + (period || '?');
    }

    /**
     * Tabloyu render eder. Tum external veri textContent ile korunur.
     */
    function renderTable() {
        var tbody = document.getElementById('tableBody');
        var emptyState = document.getElementById('emptyState');
        if (!tbody) return;

        var start = (currentPage - 1) * PAGE_SIZE;
        var pageData = filteredData.slice(start, start + PAGE_SIZE);

        // Onceki icerik temizle
        while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

        if (filteredData.length === 0) {
            if (emptyState) emptyState.classList.remove('d-none');
            renderPagination();
            hideAvgBar();
            return;
        }
        if (emptyState) emptyState.classList.add('d-none');

        for (var i = 0; i < pageData.length; i++) {
            var r = pageData[i];
            var sym = r.symbol || '';

            var tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.setAttribute('data-symbol', sym);
            tr.addEventListener('click', function () {
                window.location = '/bilancolar/' + encodeURIComponent(this.getAttribute('data-symbol'));
            });

            // Hisse Kodu
            var tdSymbol = document.createElement('td');
            var linkEl = document.createElement('a');
            linkEl.href = '/bilancolar/' + encodeURIComponent(sym);
            linkEl.className = 'fw-semibold text-primary';
            linkEl.textContent = sym;
            tdSymbol.appendChild(linkEl);
            tr.appendChild(tdSymbol);

            // Donem (yil/ay birlesiik)
            var tdDonem = document.createElement('td');
            var donemText = formatDonem(r.year, r.period);
            var donemSpan = document.createElement('span');
            donemSpan.className = 'badge bg-soft-primary text-primary fs-12';
            donemSpan.textContent = donemText;
            tdDonem.appendChild(donemSpan);
            tr.appendChild(tdDonem);

            // PD/DD (rasyo - lazy load)
            var tdPddd = document.createElement('td');
            tdPddd.className = 'text-end';
            tdPddd.setAttribute('data-rasyo-symbol', sym);
            tdPddd.setAttribute('data-rasyo-field', 'pddd');
            renderRasyoCell(tdPddd, sym, 'pddd');
            tr.appendChild(tdPddd);

            // F/K (rasyo - lazy load)
            var tdFk = document.createElement('td');
            tdFk.className = 'text-end';
            tdFk.setAttribute('data-rasyo-symbol', sym);
            tdFk.setAttribute('data-rasyo-field', 'fk');
            renderRasyoCell(tdFk, sym, 'fk');
            tr.appendChild(tdFk);

            // FD/FAVOK (rasyo - lazy load)
            var tdFdfavok = document.createElement('td');
            tdFdfavok.className = 'text-end';
            tdFdfavok.setAttribute('data-rasyo-symbol', sym);
            tdFdfavok.setAttribute('data-rasyo-field', 'fdfavok');
            renderRasyoCell(tdFdfavok, sym, 'fdfavok');
            tr.appendChild(tdFdfavok);

            // Tarih
            var tdDate = document.createElement('td');
            tdDate.textContent = formatDate(r.time);
            tdDate.className = 'text-muted fs-12';
            tr.appendChild(tdDate);

            // Konsolidasyon
            var tdCons = document.createElement('td');
            var badge = document.createElement('span');
            if (r.consolidation === 'CS') {
                badge.className = 'badge bg-success-subtle text-success';
                badge.textContent = 'Konsolide';
            } else {
                badge.className = 'badge bg-warning-subtle text-warning';
                badge.textContent = 'Solo';
            }
            tdCons.appendChild(badge);
            tr.appendChild(tdCons);

            // KAP link
            var tdKap = document.createElement('td');
            if (isSafeUrl(r.link)) {
                var kapLink = document.createElement('a');
                kapLink.href = r.link;
                kapLink.target = '_blank';
                kapLink.className = 'text-muted';
                kapLink.addEventListener('click', function (e) { e.stopPropagation(); });
                var icon = document.createElement('i');
                icon.className = 'ri-external-link-line';
                kapLink.appendChild(icon);
                tdKap.appendChild(kapLink);
            }
            tr.appendChild(tdKap);

            tbody.appendChild(tr);
        }
        renderPagination();

        // Sayfa degistiyse rasyo yeniden yukle
        loadPageRasyos(pageData);
    }

    /**
     * Tek bir rasyo hucresini render eder. Cache'de varsa degeri gosterir,
     * yoksa spinner gosterir.
     *
     * @param {HTMLElement} td - Hedef hucre
     * @param {string} symbol - Hisse kodu
     * @param {string} field - Rasyo alani (fk, pddd, fdfavok)
     */
    function renderRasyoCell(td, symbol, field) {
        var cached = rasyoCache[symbol];
        if (cached) {
            setRasyoValue(td, cached[field]);
        } else {
            // Spinner goster
            var spinner = document.createElement('span');
            spinner.className = 'spinner-border spinner-border-sm text-muted';
            spinner.style.width = '12px';
            spinner.style.height = '12px';
            td.appendChild(spinner);
        }
    }

    /**
     * Rasyo degerini hucreye yazar. Negatif degerleri kirmizi, null ise '-' gosterir.
     *
     * @param {HTMLElement} td - Hedef hucre
     * @param {number|null} value - Rasyo degeri
     */
    function setRasyoValue(td, value) {
        // Onceki icerigi temizle
        while (td.firstChild) td.removeChild(td.firstChild);

        if (value == null || isNaN(value)) {
            td.textContent = '-';
            td.className = 'text-end text-muted';
            return;
        }

        var formatted = formatNumber(value);
        td.textContent = formatted;
        td.className = 'text-end fw-medium';
        if (value < 0) {
            td.classList.add('text-danger');
        }
    }

    /**
     * Sayi formatlar (Turkce locale, 2 ondalik).
     *
     * @param {number} num - Formatlanacak sayi
     * @return {string} Turkce formatta sayi
     */
    function formatNumber(num) {
        if (num == null || isNaN(num)) return '-';
        return num.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    /**
     * Sayfadaki tum semboller icin rasyo verilerini AJAX ile yukler.
     * Ayni anda en fazla 5 paralel istek atar, rate limit koruması icin.
     *
     * @param {Array} pageData - Sayfadaki rapor verisi
     */
    function loadPageRasyos(pageData) {
        var epoch = ++currentLoadEpoch;

        if (!pageData || pageData.length === 0) {
            hideAvgBar();
            return;
        }

        // Benzersiz semboller (ayni sayfada tekrar olabilir)
        var seen = {};
        var symbols = [];
        for (var i = 0; i < pageData.length; i++) {
            var s = pageData[i].symbol;
            if (s && !seen[s]) {
                seen[s] = true;
                // Cache'de yoksa yukle
                if (!rasyoCache[s]) {
                    symbols.push(s);
                }
            }
        }

        // Hepsi cache'deyse hemen ortalama hesapla
        if (symbols.length === 0) {
            updateAvgBar();
            updateRasyoKpi(0, 0);
            return;
        }

        rasyoLoadedCount = 0;
        rasyoTotalCount = symbols.length;
        updateRasyoKpi(0, rasyoTotalCount);

        // Batch AJAX: 5 paralel istek (rate limit korumasi)
        var BATCH_SIZE = 5;
        var idx = 0;

        function nextBatch() {
            if (idx >= symbols.length) return;
            var end = Math.min(idx + BATCH_SIZE, symbols.length);
            for (var b = idx; b < end; b++) {
                fetchRasyo(symbols[b]);
            }
            idx = end;
        }

        function updateKpiProgress() {
            updateRasyoKpi(rasyoLoadedCount, rasyoTotalCount);
        }

        function fetchRasyo(symbol) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/ajax/bilanco/' + encodeURIComponent(symbol) + '/rasyo');
            xhr.timeout = 15000;
            xhr.onload = function () {
                if (epoch !== currentLoadEpoch) return; // stale page, discard

                if (xhr.status === 200) {
                    try {
                        var resp = JSON.parse(xhr.responseText);
                        var rasyo = (resp && resp.data) || resp || {};
                        rasyoCache[symbol] = {
                            fk: parseRasyoValue(rasyo.fk),
                            pddd: parseRasyoValue(rasyo.pddd),
                            fdfavok: parseRasyoValue(rasyo.fdfavok)
                        };
                    } catch (e) {
                        rasyoCache[symbol] = {fk: null, pddd: null, fdfavok: null};
                    }
                } else {
                    rasyoCache[symbol] = {fk: null, pddd: null, fdfavok: null};
                }
                updateRasyoCells(symbol);
                rasyoLoadedCount++;
                updateKpiProgress();

                if (rasyoLoadedCount >= rasyoTotalCount) {
                    updateAvgBar();
                    // Enable rasyo filter selects
                    var pdddSelect = document.getElementById('filterPddd');
                    var fkSelect = document.getElementById('filterFk');
                    if (pdddSelect) pdddSelect.disabled = false;
                    if (fkSelect) fkSelect.disabled = false;
                    // Re-apply filters in case user already set them
                    applyFilters();
                    return; // all done, don't trigger nextBatch
                }

                if (rasyoLoadedCount % BATCH_SIZE === 0) {
                    nextBatch();
                }
            };
            xhr.onerror = function () {
                if (epoch !== currentLoadEpoch) return; // stale page, discard

                rasyoCache[symbol] = {fk: null, pddd: null, fdfavok: null};
                updateRasyoCells(symbol);
                rasyoLoadedCount++;
                updateKpiProgress();

                if (rasyoLoadedCount >= rasyoTotalCount) {
                    updateAvgBar();
                    // Enable rasyo filter selects
                    var pdddSelect = document.getElementById('filterPddd');
                    var fkSelect = document.getElementById('filterFk');
                    if (pdddSelect) pdddSelect.disabled = false;
                    if (fkSelect) fkSelect.disabled = false;
                    // Re-apply filters in case user already set them
                    applyFilters();
                    return; // all done, don't trigger nextBatch
                }

                if (rasyoLoadedCount % BATCH_SIZE === 0) {
                    nextBatch();
                }
            };
            xhr.ontimeout = xhr.onerror;
            xhr.send();
        }

        nextBatch();
    }

    /**
     * Rasyo degerini parse eder. String veya number olabilir.
     *
     * @param {*} val - Ham deger
     * @return {number|null} Parse edilmis deger
     */
    function parseRasyoValue(val) {
        if (val == null) return null;
        if (typeof val === 'number') return isNaN(val) ? null : val;
        var n = parseFloat(val);
        return isNaN(n) ? null : n;
    }

    /**
     * Belirli bir sembolun tum rasyo hucrelerini gunceller.
     *
     * @param {string} symbol - Hisse kodu
     */
    function updateRasyoCells(symbol) {
        var cached = rasyoCache[symbol];
        if (!cached) return;

        var fields = ['pddd', 'fk', 'fdfavok'];
        for (var f = 0; f < fields.length; f++) {
            var cells = document.querySelectorAll(
                'td[data-rasyo-symbol="' + symbol + '"][data-rasyo-field="' + fields[f] + '"]'
            );
            for (var c = 0; c < cells.length; c++) {
                setRasyoValue(cells[c], cached[fields[f]]);
            }
        }
    }

    /**
     * Sayfa ortalamalari barini gunceller.
     */
    function updateAvgBar() {
        var avgBar = document.getElementById('avgBar');
        if (!avgBar) return;

        // Sayfadaki benzersiz sembolleri topla
        var rows = document.querySelectorAll('#tableBody tr[data-symbol]');
        var sums = {fk: 0, pddd: 0, fdfavok: 0};
        var counts = {fk: 0, pddd: 0, fdfavok: 0};

        for (var i = 0; i < rows.length; i++) {
            var sym = rows[i].getAttribute('data-symbol');
            var cached = rasyoCache[sym];
            if (!cached) continue;

            if (cached.pddd != null && !isNaN(cached.pddd)) {
                sums.pddd += cached.pddd;
                counts.pddd++;
            }
            if (cached.fk != null && !isNaN(cached.fk)) {
                sums.fk += cached.fk;
                counts.fk++;
            }
            if (cached.fdfavok != null && !isNaN(cached.fdfavok)) {
                sums.fdfavok += cached.fdfavok;
                counts.fdfavok++;
            }
        }

        var avgPdddEl = document.getElementById('avgPddd');
        var avgFkEl = document.getElementById('avgFk');
        var avgFdfavokEl = document.getElementById('avgFdfavok');

        if (avgPdddEl) avgPdddEl.textContent = counts.pddd > 0 ? formatNumber(sums.pddd / counts.pddd) : '-';
        if (avgFkEl) avgFkEl.textContent = counts.fk > 0 ? formatNumber(sums.fk / counts.fk) : '-';
        if (avgFdfavokEl) avgFdfavokEl.textContent = counts.fdfavok > 0 ? formatNumber(sums.fdfavok / counts.fdfavok) : '-';

        // Herhangi bir deger varsa goster
        if (counts.pddd > 0 || counts.fk > 0 || counts.fdfavok > 0) {
            avgBar.classList.remove('d-none');
        } else {
            avgBar.classList.add('d-none');
        }
    }

    /**
     * Ortalamalar barini gizler.
     */
    function hideAvgBar() {
        var avgBar = document.getElementById('avgBar');
        if (avgBar) avgBar.classList.add('d-none');
    }

    /**
     * URL'nin guvenli bir protokol kullanip kullanmadigini kontrol eder.
     *
     * @param {string} url - Kontrol edilecek URL
     * @return {boolean} Guvenli ise true
     */
    function isSafeUrl(url) {
        return url && (url.startsWith('https://') || url.startsWith('http://'));
    }

    /**
     * Tarih formatlar.
     *
     * @param {string} dateStr - ISO tarih string
     * @return {string} Turkce formatta tarih
     */
    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            var d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('tr-TR', {day: '2-digit', month: '2-digit', year: 'numeric'});
        } catch (e) {
            return dateStr;
        }
    }

    /**
     * Sayfalama render eder.
     */
    function renderPagination() {
        var pageInfo = document.getElementById('pageInfo');
        var paginationNav = document.getElementById('paginationNav');
        var totalItems = filteredData.length;
        var totalPages = Math.ceil(totalItems / PAGE_SIZE);

        if (pageInfo) {
            if (totalItems === 0) {
                pageInfo.textContent = '';
            } else {
                var start = (currentPage - 1) * PAGE_SIZE + 1;
                var end = Math.min(currentPage * PAGE_SIZE, totalItems);
                pageInfo.textContent = start + '-' + end + ' / ' + totalItems + ' rapor';
            }
        }

        if (!paginationNav) return;

        // Temizle
        while (paginationNav.firstChild) paginationNav.removeChild(paginationNav.firstChild);

        if (totalPages <= 1) return;

        // Onceki
        var prevLi = createPageItem('<i class="ri-arrow-left-s-line"></i>', currentPage - 1, false, currentPage === 1);
        paginationNav.appendChild(prevLi);

        // Sayfa numaralari
        var startPage = Math.max(1, currentPage - 2);
        var endPage = Math.min(totalPages, currentPage + 2);
        for (var p = startPage; p <= endPage; p++) {
            var li = createPageItem(String(p), p, p === currentPage, false);
            paginationNav.appendChild(li);
        }

        // Sonraki
        var nextLi = createPageItem('<i class="ri-arrow-right-s-line"></i>', currentPage + 1, false, currentPage === totalPages);
        paginationNav.appendChild(nextLi);
    }

    /**
     * Sayfalama butonu olusturur.
     *
     * @param {string} label - Buton etiketi (sayi veya hardcoded ikon HTML)
     * @param {number} page - Sayfa numarasi
     * @param {boolean} active - Aktif sayfa mi
     * @param {boolean} disabled - Devre disi mi
     * @return {HTMLElement} li elementi
     */
    function createPageItem(label, page, active, disabled) {
        var li = document.createElement('li');
        li.className = 'page-item' + (active ? ' active' : '') + (disabled ? ' disabled' : '');
        var a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';

        // If label starts with '<' it's an icon (hardcoded, safe)
        if (typeof label === 'string' && label.charAt(0) === '<') {
            // Only hardcoded icon HTML is passed here, safe
            a.innerHTML = label;
        } else {
            a.textContent = String(label);
        }

        if (!disabled && !active) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                currentPage = page;
                sortAndRender();
                var table = document.getElementById('bilancoTable');
                if (table) table.scrollIntoView({behavior: 'smooth', block: 'start'});
            });
        }
        li.appendChild(a);
        return li;
    }

    /**
     * Siralar ve tabloyu render eder.
     */
    function sortAndRender() {
        sortData();
        renderTable();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
