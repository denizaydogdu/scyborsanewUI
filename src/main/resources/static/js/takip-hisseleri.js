/**
 * Takip Hisseleri sayfasi istemci tarafi mantigi.
 *
 * SSR ile gelen window.takipData uzerinde filtreleme, siralama ve sayfalama yapar.
 * Vade tab filtreleme (Kisa/Orta/Uzun), arama (debounce), kolon siralama
 * ve sayfalama ozellikleri icerir.
 */
(function () {
    'use strict';

    // ── Sabitler ──────────────────────────────────────────
    var PAGE_SIZE = 30;
    var DEBOUNCE_MS = 300;
    var MAX_VISIBLE_PAGES = 7;
    var POLL_INTERVAL_MS = 30000; // 30 saniye
    var MAX_CONSECUTIVE_ERRORS = 3;
    var ERROR_RETRY_DELAY = 120000; // 2 dakika
    var consecutiveErrors = 0;

    // Vade etiketleri
    var VADE_LABELS = {
        'KISA_VADE': 'Kısa Vade',
        'ORTA_VADE': 'Orta Vade',
        'UZUN_VADE': 'Uzun Vade'
    };

    var VADE_BADGE_CLASS = {
        'KISA_VADE': 'bg-info-subtle text-info',
        'ORTA_VADE': 'bg-warning-subtle text-warning',
        'UZUN_VADE': 'bg-primary-subtle text-primary'
    };

    // ── Durum ─────────────────────────────────────────────
    var allData = [];
    var filteredData = [];
    var currentVade = 'ALL';
    var currentSearch = '';
    var currentPage = 1;
    var sortCol = null;
    var sortAscending = true;
    var debounceTimer = null;

    // ── DOM Referanslari ──────────────────────────────────
    var searchInput = document.getElementById('searchInput');
    var tableBody = document.getElementById('tableBody');
    var emptyState = document.getElementById('emptyState');
    var tableContainer = document.getElementById('tableContainer');
    var paginationNav = document.getElementById('paginationNav');
    var paginationInfo = document.getElementById('paginationInfo');

    // ── KPI Referanslari ──────────────────────────────────
    var kpiTotal = document.getElementById('kpi-total');
    var kpiProfitable = document.getElementById('kpi-profitable');
    var kpiLosing = document.getElementById('kpi-losing');

    // ── Baslangic ─────────────────────────────────────────
    function init() {
        allData = window.takipData || [];
        bindEvents();
        applyFilters();
    }

    // ── Event Binding ─────────────────────────────────────
    function bindEvents() {
        // Vade tab tiklamalari
        var tabs = document.querySelectorAll('#vadeTabs .nav-link');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                currentVade = tab.getAttribute('data-vade');
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

        // Kolon siralama
        var sortHeaders = document.querySelectorAll('#takipTable th.sortable');
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

        // Vade filtre
        if (currentVade !== 'ALL') {
            result = result.filter(function (t) {
                return t.vade === currentVade;
            });
        }

        // Arama filtre (hisseKodu ve hisseAdi)
        if (currentSearch.length >= 2) {
            var q = currentSearch.toLocaleLowerCase('tr');
            result = result.filter(function (t) {
                var kod = t.hisseKodu ? t.hisseKodu.toLocaleLowerCase('tr') : '';
                var ad = t.hisseAdi ? t.hisseAdi.toLocaleLowerCase('tr') : '';
                return kod.indexOf(q) >= 0 || ad.indexOf(q) >= 0;
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

            if (sortCol === 'hisseKodu') {
                valA = (a.hisseKodu || '').toLocaleLowerCase('tr');
                valB = (b.hisseKodu || '').toLocaleLowerCase('tr');
            } else if (sortCol === 'vade') {
                valA = a.vade || '';
                valB = b.vade || '';
            } else if (sortCol === 'girisTarihi') {
                valA = a.girisTarihi || '';
                valB = b.girisTarihi || '';
            } else {
                // Numerik alanlar
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

    // ── KPI Guncelleme ──────────────────────────────────
    function updateKPIs() {
        if (kpiTotal) {
            kpiTotal.textContent = filteredData.length;
        }
        if (kpiProfitable) {
            var profitableCount = filteredData.filter(function (t) {
                return t.getiriYuzde != null && t.getiriYuzde > 0;
            }).length;
            kpiProfitable.textContent = profitableCount;
        }
        if (kpiLosing) {
            var losingCount = filteredData.filter(function (t) {
                return t.getiriYuzde != null && t.getiriYuzde < 0;
            }).length;
            kpiLosing.textContent = losingCount;
        }
    }

    // ── Tablo Render ──────────────────────────────────────
    function renderTable() {
        var start = (currentPage - 1) * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, filteredData.length);
        var pageData = filteredData.slice(start, end);

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

        // Hisse (avatar + hisseKodu + hisseAdi)
        var tdStock = document.createElement('td');
        var stockDiv = document.createElement('div');
        stockDiv.className = 'd-flex align-items-center';

        var avatar = document.createElement('div');
        avatar.className = 'flex-shrink-0 avatar-xs me-2';
        if (item.logoid) {
            var avatarImg = document.createElement('img');
            avatarImg.src = '/img/stock-logos/' + encodeURIComponent(item.logoid);
            avatarImg.alt = item.hisseKodu || '';
            avatarImg.className = 'rounded-circle';
            avatarImg.style.cssText = 'width:32px;height:32px;object-fit:cover;';
            avatarImg.onerror = function () {
                this.style.display = 'none';
                var fallback = document.createElement('div');
                fallback.className = 'avatar-title rounded-circle bg-light fw-semibold';
                fallback.style.cssText = 'color:#495057;border:1.5px solid #ced4da;font-size:0.7rem;width:32px;height:32px;display:flex;align-items:center;justify-content:center;';
                fallback.textContent = (item.hisseKodu || '?').charAt(0);
                avatar.appendChild(fallback);
            };
            avatar.appendChild(avatarImg);
        } else {
            var avatarInner = document.createElement('div');
            avatarInner.className = 'avatar-title rounded-circle bg-light fw-semibold';
            avatarInner.style.cssText = 'color:#495057;border:1.5px solid #ced4da;font-size:0.7rem';
            avatarInner.textContent = item.hisseKodu ? item.hisseKodu.charAt(0) : '?';
            avatar.appendChild(avatarInner);
        }
        stockDiv.appendChild(avatar);

        var stockInfo = document.createElement('div');
        var stockCode = document.createElement('div');
        stockCode.className = 'fw-semibold';
        var stockLink = document.createElement('a');
        stockLink.href = '/stock/detail/' + (item.hisseKodu || '');
        stockLink.textContent = item.hisseKodu || '-';
        stockLink.className = 'fw-semibold text-primary';
        stockCode.appendChild(stockLink);
        stockInfo.appendChild(stockCode);

        if (item.hisseAdi) {
            var stockName = document.createElement('div');
            stockName.className = 'text-muted fs-12';
            stockName.textContent = item.hisseAdi;
            stockInfo.appendChild(stockName);
        }

        stockDiv.appendChild(stockInfo);
        tdStock.appendChild(stockDiv);
        tr.appendChild(tdStock);

        // Vade (badge)
        var tdVade = document.createElement('td');
        var vadeBadge = document.createElement('span');
        vadeBadge.className = 'badge ' + (VADE_BADGE_CLASS[item.vade] || 'bg-secondary-subtle text-secondary');
        vadeBadge.textContent = VADE_LABELS[item.vade] || item.vade || '-';
        tdVade.appendChild(vadeBadge);
        tr.appendChild(tdVade);

        // Eklenme Tarihi
        var tdDate = document.createElement('td');
        tdDate.textContent = formatDate(item.girisTarihi);
        tr.appendChild(tdDate);

        // Giriş Fiyatı
        var tdGiris = document.createElement('td');
        tdGiris.className = 'fw-semibold';
        tdGiris.textContent = formatPrice(item.girisFiyati);
        tr.appendChild(tdGiris);

        // Güncel Fiyat
        var tdGuncel = document.createElement('td');
        tdGuncel.className = 'fw-semibold';
        tdGuncel.textContent = formatPrice(item.guncelFiyat);
        tr.appendChild(tdGuncel);

        // Getiri %
        var tdGetiri = document.createElement('td');
        tdGetiri.className = 'fw-bold';
        if (item.getiriYuzde != null) {
            tdGetiri.textContent = formatPercent(item.getiriYuzde);
            if (item.getiriYuzde > 0) {
                tdGetiri.classList.add('text-success');
            } else if (item.getiriYuzde < 0) {
                tdGetiri.classList.add('text-danger');
            }
        } else {
            tdGetiri.textContent = '-';
            tdGetiri.classList.add('text-muted');
        }
        tr.appendChild(tdGetiri);

        // Hedef Fiyat
        var tdHedef = document.createElement('td');
        tdHedef.textContent = formatPrice(item.hedefFiyat);
        tr.appendChild(tdHedef);

        // Stop Loss
        var tdStop = document.createElement('td');
        tdStop.textContent = formatPrice(item.zararDurdur);
        tr.appendChild(tdStop);

        // Açıklama
        var tdAciklama = document.createElement('td');
        if (item.notAciklama) {
            var aciklamaSpan = document.createElement('span');
            aciklamaSpan.className = 'text-muted fs-12';
            aciklamaSpan.textContent = item.notAciklama.length > 80 ? item.notAciklama.substring(0, 80) + '...' : item.notAciklama;
            if (item.notAciklama.length > 80) {
                aciklamaSpan.title = item.notAciklama;
                aciklamaSpan.style.cursor = 'help';
            }
            tdAciklama.appendChild(aciklamaSpan);
        } else {
            tdAciklama.textContent = '-';
            tdAciklama.className = 'text-muted';
        }
        tr.appendChild(tdAciklama);

        // Maliyet Fiyatı
        var tdMaliyet = document.createElement('td');
        tdMaliyet.className = 'fw-semibold';
        tdMaliyet.textContent = formatPrice(item.maliyetFiyati);
        tr.appendChild(tdMaliyet);

        // Maliyet Getiri %
        var tdMaliyetGetiri = document.createElement('td');
        tdMaliyetGetiri.className = 'fw-bold';
        if (item.maliyetGetiriYuzde != null) {
            tdMaliyetGetiri.textContent = formatPercent(item.maliyetGetiriYuzde);
            if (item.maliyetGetiriYuzde > 0) {
                tdMaliyetGetiri.classList.add('text-success');
            } else if (item.maliyetGetiriYuzde < 0) {
                tdMaliyetGetiri.classList.add('text-danger');
            }
        } else {
            tdMaliyetGetiri.textContent = '-';
            tdMaliyetGetiri.classList.add('text-muted');
        }
        tr.appendChild(tdMaliyetGetiri);

        // Grafik (resim thumbnail)
        var tdGrafik = document.createElement('td');
        if (item.resimUrl) {
            var imgThumb = document.createElement('img');
            imgThumb.src = '/takip-hisseleri/images/' + item.resimUrl;
            imgThumb.alt = 'Grafik';
            imgThumb.className = 'rounded';
            imgThumb.style.cssText = 'width:40px;height:40px;object-fit:cover;cursor:pointer;';
            imgThumb.addEventListener('click', function () {
                var modalTitle = document.getElementById('imageModalTitle');
                var modalImg = document.getElementById('imageModalImg');
                if (modalTitle) modalTitle.textContent = (item.hisseKodu || '') + ' Grafik';
                if (modalImg) modalImg.src = '/takip-hisseleri/images/' + item.resimUrl;
                var modal = new bootstrap.Modal(document.getElementById('imageModal'));
                modal.show();
            });
            tdGrafik.appendChild(imgThumb);
        } else {
            tdGrafik.textContent = '-';
            tdGrafik.className = 'text-muted';
        }
        tr.appendChild(tdGrafik);

        // Durum
        var tdDurum = document.createElement('td');
        var durumBadge = document.createElement('span');
        if (item.hedefUlasildi) {
            durumBadge.className = 'badge bg-success-subtle text-success';
            durumBadge.textContent = 'Hedefe Ulaştı';
        } else if (item.zararDurdurUlasildi) {
            durumBadge.className = 'badge bg-danger-subtle text-danger';
            durumBadge.textContent = 'Stop Vuruldu';
        } else {
            durumBadge.className = 'badge bg-primary-subtle text-primary';
            durumBadge.textContent = 'Aktif';
        }
        tdDurum.appendChild(durumBadge);
        tr.appendChild(tdDurum);

        return tr;
    }

    // ── Yardimci Fonksiyonlar ─────────────────────────────

    function formatPrice(val) {
        if (val == null) return '-';
        return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20BA';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        // yyyy-MM-dd → dd.MM.yyyy
        var parts = dateStr.split('-');
        if (parts.length === 3) {
            return parts[2] + '.' + parts[1] + '.' + parts[0];
        }
        // ISO-8601 fallback
        var datePart = dateStr.split('T')[0];
        var dateParts = datePart.split('-');
        if (dateParts.length === 3) {
            return dateParts[2] + '.' + dateParts[1] + '.' + dateParts[0];
        }
        return dateStr;
    }

    function formatPercent(val) {
        if (val == null) return '-';
        return '%' + val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ── Sayfalama ─────────────────────────────────────────
    function renderPagination() {
        var totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

        // Info
        if (paginationInfo) {
            var start = filteredData.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
            var end = Math.min(currentPage * PAGE_SIZE, filteredData.length);
            paginationInfo.textContent = filteredData.length > 0
                ? start + '-' + end + ' / ' + filteredData.length + ' öneri'
                : '0 öneri';
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
                var table = document.getElementById('takipTable');
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

    // ── Polling ────────────────────────────────────────────

    /**
     * Periyodik polling — API'den güncel takip hissesi verilerini çeker.
     * Fiyat ve getiri bilgilerini tazeler, mevcut filtre/sıralama korunur.
     * Ardışık 3 hatada 2 dakika bekleme (backoff).
     */
    function startPolling() {
        scheduleNextPoll(POLL_INTERVAL_MS);
    }

    function scheduleNextPoll(delay) {
        setTimeout(function () {
            fetch('/ajax/takip-hisseleri')
                .then(function (response) {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.json();
                })
                .then(function (data) {
                    if (data && Array.isArray(data)) {
                        allData = data;
                        applyFilters();
                    }
                    consecutiveErrors = 0;
                    scheduleNextPoll(POLL_INTERVAL_MS);
                })
                .catch(function () {
                    consecutiveErrors++;
                    var nextDelay = consecutiveErrors >= MAX_CONSECUTIVE_ERRORS
                        ? ERROR_RETRY_DELAY
                        : POLL_INTERVAL_MS;
                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        consecutiveErrors = 0;
                    }
                    scheduleNextPoll(nextDelay);
                });
        }, delay);
    }

    // ── Başlat ────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            init();
            startPolling();
        });
    } else {
        init();
        startPolling();
    }
})();
