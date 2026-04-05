/**
 * Halka Arz Takvimi - geçmiş tab: arama, sıralama, pagination.
 * Aktif tab: server-side render (th:each).
 */
(function () {
    'use strict';

    var PAGE_SIZE = 20;
    var currentPage = 1;
    var sortField = 'talepBitis';
    var sortAsc = false;
    var searchTerm = '';

    var data = window.halkaArzData || [];

    var searchInput = document.getElementById('gecmisSearchInput');
    var tableBody = document.getElementById('gecmisTableBody');
    var pagination = document.getElementById('gecmisPagination');
    var pageInfo = document.getElementById('gecmisPageInfo');

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
    document.querySelectorAll('#gecmisPanel .sortable').forEach(function (th) {
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
                var code = d.hisseSenediKodu ? d.hisseSenediKodu.toUpperCase() : '';
                var baslik = d.baslik ? d.baslik.toUpperCase() : '';
                return code.indexOf(searchTerm) !== -1 || baslik.indexOf(searchTerm) !== -1;
            });
        }
        filtered.sort(function (a, b) {
            var va, vb;
            switch (sortField) {
                case 'hisse':
                    va = a.hisseSenediKodu || '';
                    vb = b.hisseSenediKodu || '';
                    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
                case 'fiyat':
                    va = a.halkaArzFiyati || 0;
                    vb = b.halkaArzFiyati || 0;
                    break;
                case 'tarih':
                    va = a.ilkIslemTarihi || '';
                    vb = b.ilkIslemTarihi || '';
                    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
                case 'talepBitis':
                    va = a.talepToplamaBitisTarihi || '';
                    vb = b.talepToplamaBitisTarihi || '';
                    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
                case 'katilimci':
                    va = a.katilimciSayisi || 0;
                    vb = b.katilimciSayisi || 0;
                    break;
                default:
                    va = a.talepToplamaBitisTarihi || a.ilkIslemTarihi || '';
                    vb = b.talepToplamaBitisTarihi || b.ilkIslemTarihi || '';
                    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
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

    function formatDate(dateStr) {
        if (!dateStr || dateStr.length < 10) return '-';
        // 2022-12-15T00:00:00.000Z → 15.12.2022
        return dateStr.substring(8, 10) + '.' + dateStr.substring(5, 7) + '.' + dateStr.substring(0, 4);
    }

    function escapeHtml(text) {
        if (!text) return '-';
        var div = document.createElement('div');
        div.textContent = text;
        return div.textContent;
    }

    function getDurumBadge(durum, item) {
        var span = document.createElement('span');
        if (!durum) {
            span.className = 'badge bg-secondary';
            span.textContent = '-';
            return span;
        }
        var cls = 'bg-secondary';
        var label = durum;
        var d = durum.toUpperCase();
        if (d === 'W') {
            // ilkIslemTarihi yoksa henüz işlem görmüyor
            if (item && !item.ilkIslemTarihi) {
                cls = 'bg-warning';
                label = 'Talep Tamamlandı';
            } else {
                cls = 'bg-success';
                label = 'İşlem Görüyor';
            }
        } else if (d === 'F') {
            cls = 'bg-primary';
            label = 'Tamamlandı';
        } else if (d === 'C') {
            cls = 'bg-info';
            label = 'Tamamlandı';
        } else if (d === 'D') {
            cls = 'bg-warning';
            label = 'Dağıtım';
        }
        span.className = 'badge ' + cls;
        span.textContent = label;
        return span;
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
            var tr = document.createElement('tr');

            var td0 = document.createElement('td');
            td0.textContent = (start + i + 1);
            tr.appendChild(td0);

            var td1 = document.createElement('td');
            if (d.hisseSenediKodu) {
                var wrapper = document.createElement('div');
                wrapper.className = 'd-flex align-items-center';
                // Logo veya harf avatarı
                var logos = window.stockLogos || {};
                var logoid = logos[d.hisseSenediKodu];
                if (logoid) {
                    var img = document.createElement('img');
                    img.src = '/img/stock-logos/' + encodeURIComponent(logoid);
                    img.style.cssText = 'width:24px;height:24px;object-fit:contain;margin-right:8px;border-radius:50%;';
                    img.onerror = function() {
                        // Logo yüklenemezse harf avatarı göster
                        var fallback = document.createElement('span');
                        fallback.className = 'avatar-xs rounded-circle bg-light d-inline-flex align-items-center justify-content-center';
                        fallback.style.cssText = 'width:24px;height:24px;margin-right:8px;font-size:10px;font-weight:600;color:#495057;';
                        fallback.textContent = d.hisseSenediKodu.substring(0, 2);
                        this.parentNode.replaceChild(fallback, this);
                    };
                    wrapper.appendChild(img);
                } else {
                    // Logo yok — harf avatarı
                    var avatar = document.createElement('span');
                    avatar.className = 'avatar-xs rounded-circle bg-light d-inline-flex align-items-center justify-content-center';
                    avatar.style.cssText = 'width:24px;height:24px;margin-right:8px;font-size:10px;font-weight:600;color:#495057;';
                    avatar.textContent = d.hisseSenediKodu.substring(0, 2);
                    wrapper.appendChild(avatar);
                }
                var link = document.createElement('a');
                link.href = '/stock/detail/' + encodeURIComponent(d.hisseSenediKodu);
                link.className = 'fw-semibold text-primary';
                link.textContent = d.hisseSenediKodu;
                wrapper.appendChild(link);
                td1.appendChild(wrapper);
            } else {
                td1.textContent = '-';
            }
            tr.appendChild(td1);

            var td2 = document.createElement('td');
            td2.textContent = escapeHtml(d.baslik);
            td2.style.maxWidth = '200px';
            td2.className = 'text-truncate';
            tr.appendChild(td2);

            var td3 = document.createElement('td');
            td3.className = 'text-end';
            td3.textContent = d.halkaArzFiyati != null ? formatDecimal(d.halkaArzFiyati, 2) + ' TL' : '-';
            tr.appendChild(td3);

            var td4 = document.createElement('td');
            td4.textContent = formatDate(d.ilkIslemTarihi);
            tr.appendChild(td4);

            var td5 = document.createElement('td');
            td5.textContent = escapeHtml(d.araciKurum);
            td5.style.maxWidth = '150px';
            td5.className = 'text-truncate';
            tr.appendChild(td5);

            var td6 = document.createElement('td');
            td6.className = 'text-end';
            td6.textContent = formatNumber(d.katilimciSayisi);
            tr.appendChild(td6);

            var td7 = document.createElement('td');
            td7.appendChild(getDurumBadge(d.durumKodu, d));
            tr.appendChild(td7);

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
