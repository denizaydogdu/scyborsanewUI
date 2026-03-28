/**
 * Takip Listeleri sayfasi JavaScript.
 *
 * Watchlist CRUD, hisse ekleme/cikarma, drag-drop siralama,
 * STOMP WebSocket canli fiyat guncellemesi ve autocomplete arama.
 *
 * Gereksinimler:
 * - body[data-user-email] attribute (GlobalModelAdvice)
 * - body[data-api-base] attribute (GlobalModelAdvice)
 * - SockJS + StompJs kutuphane (layout.html)
 * - SortableJS (CDN, watchlist.html pagejs)
 * - CSRF meta tag'leri (head-css.html)
 */
(function() {
    'use strict';

    // ── State ──────────────────────────────────────────────
    var currentWatchlistId = null;
    var stockCache = null;
    var isFetching = false;
    var stompClient = null;

    // ── CSRF ───────────────────────────────────────────────
    var csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
    var csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');

    /**
     * CSRF header'li fetch headers olusturur.
     * @returns {Object} Content-Type + CSRF header
     */
    function getCsrfHeaders() {
        var h = { 'Content-Type': 'application/json' };
        if (csrfHeader && csrfToken) h[csrfHeader] = csrfToken;
        return h;
    }

    /**
     * CSRF header'li (Content-Type'siz) fetch headers olusturur.
     * @returns {Object} Sadece CSRF header
     */
    function getCsrfHeadersNoContent() {
        var h = {};
        if (csrfHeader && csrfToken) h[csrfHeader] = csrfToken;
        return h;
    }

    // ── Format Helpers (Turkce) ────────────────────────────

    /**
     * Fiyat degerini Turkce formata cevirir.
     * @param {number} val fiyat degeri
     * @returns {string} "245,60 TL" formatinda
     */
    function formatPrice(val) {
        if (val == null || isNaN(val)) return '-';
        return Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
    }

    /**
     * Degisim yuzdesini Turkce formata cevirir.
     * @param {number} val degisim yuzdesi
     * @returns {string} "+2,34%" veya "-0,52%" formatinda
     */
    function formatChange(val) {
        if (val == null || isNaN(val)) return '-';
        var prefix = val >= 0 ? '+' : '';
        return prefix + Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }

    /**
     * Hacim degerini Turkce formata cevirir (Milyar/Milyon/Bin).
     * @param {number} val hacim degeri
     * @returns {string} "1,2 Milyar" / "890 Milyon" / "125 Bin" formatinda
     */
    function formatVolume(val) {
        if (val == null || isNaN(val) || val === 0) return '-';
        var absVal = Math.abs(val);
        if (absVal >= 1e9) {
            return (val / 1e9).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Milyar';
        }
        if (absVal >= 1e6) {
            return (val / 1e6).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' Milyon';
        }
        if (absVal >= 1e3) {
            return (val / 1e3).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' Bin';
        }
        return Number(val).toLocaleString('tr-TR');
    }

    // ── DOM Helpers ────────────────────────────────────────

    /**
     * Tek bir hisse satiri icin DOM elementi olusturur (XSS-safe, innerHTML yok).
     * @param {Object} stock hisse verisi (stockCode, stockName, logoid, price, changePercent, volume, sortOrder)
     * @returns {HTMLElement} <tr> elementi
     */
    function createStockRow(stock) {
        var tr = document.createElement('tr');
        tr.setAttribute('data-stock-code', stock.stockCode || '');
        tr.setAttribute('data-item-id', stock.id != null ? String(stock.id) : '');

        // Drag handle
        var tdDrag = document.createElement('td');
        tdDrag.className = 'drag-handle';
        tdDrag.style.cursor = 'grab';
        var dragIcon = document.createElement('i');
        dragIcon.className = 'ri-drag-move-2-line text-muted';
        tdDrag.appendChild(dragIcon);
        tr.appendChild(tdDrag);

        // Logo
        var tdLogo = document.createElement('td');
        var avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar-xs';

        var fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'avatar-title rounded-circle bg-light text-dark fw-semibold';
        fallbackDiv.style.cssText = 'font-size:0.55rem;width:32px;height:32px;';
        var code = stock.stockCode || '?';
        fallbackDiv.textContent = code.length > 4 ? code.substring(0, 4) : code;

        if (stock.logoid) {
            var img = document.createElement('img');
            img.src = '/img/stock-logos/' + stock.logoid;
            img.className = 'rounded-circle';
            img.style.cssText = 'width:32px;height:32px;';
            img.onerror = function() {
                img.style.display = 'none';
                fallbackDiv.style.display = 'flex';
            };
            fallbackDiv.style.display = 'none';
            avatarDiv.appendChild(img);
        }
        avatarDiv.appendChild(fallbackDiv);
        tdLogo.appendChild(avatarDiv);
        tr.appendChild(tdLogo);

        // Hisse bilgisi
        var tdStock = document.createElement('td');
        var link = document.createElement('a');
        link.href = '/stock/detail/' + encodeURIComponent(stock.stockCode || '');
        link.className = 'fw-semibold text-primary';
        link.textContent = stock.stockCode || '';
        tdStock.appendChild(link);
        var nameP = document.createElement('p');
        nameP.className = 'text-muted mb-0 fs-12';
        nameP.textContent = stock.stockName || '';
        tdStock.appendChild(nameP);
        tr.appendChild(tdStock);

        // Fiyat
        var tdPrice = document.createElement('td');
        tdPrice.className = 'text-end price-cell';
        tdPrice.textContent = formatPrice(stock.price);
        tr.appendChild(tdPrice);

        // Degisim
        var tdChange = document.createElement('td');
        tdChange.className = 'text-end change-cell';
        if (stock.changePercent != null) {
            var changeSpan = document.createElement('span');
            changeSpan.className = stock.changePercent >= 0 ? 'text-success' : 'text-danger';
            changeSpan.textContent = formatChange(stock.changePercent);
            tdChange.appendChild(changeSpan);
        } else {
            tdChange.textContent = '-';
        }
        tr.appendChild(tdChange);

        // Hacim
        var tdVolume = document.createElement('td');
        tdVolume.className = 'text-end volume-cell';
        tdVolume.textContent = formatVolume(stock.volume);
        tr.appendChild(tdVolume);

        // Sil butonu
        var tdAction = document.createElement('td');
        tdAction.className = 'text-center';
        var removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-sm btn-soft-danger remove-stock-btn';
        removeBtn.setAttribute('data-stock-code', stock.stockCode || '');
        removeBtn.title = 'Listeden Cikar';
        var removeIcon = document.createElement('i');
        removeIcon.className = 'ri-close-line';
        removeBtn.appendChild(removeIcon);
        tdAction.appendChild(removeBtn);
        tr.appendChild(tdAction);

        return tr;
    }

    /**
     * Hisse listesini tabloya render eder.
     * @param {Array} stocks hisse dizisi
     */
    function renderStocks(stocks) {
        var tbody = document.getElementById('watchlistTableBody');
        if (!tbody) return;

        // Mevcut satirlari temizle
        while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

        if (!stocks || stocks.length === 0) {
            var emptyTr = document.createElement('tr');
            emptyTr.id = 'emptyRow';
            var emptyTd = document.createElement('td');
            emptyTd.colSpan = 7;
            emptyTd.className = 'text-center text-muted py-4';
            var emptyIcon = document.createElement('i');
            emptyIcon.className = 'ri-list-check fs-24 d-block mb-2';
            emptyTd.appendChild(emptyIcon);
            emptyTd.appendChild(document.createTextNode('Bu listede henuz hisse yok. "Hisse Ekle" ile baslayin.'));
            emptyTr.appendChild(emptyTd);
            tbody.appendChild(emptyTr);
            return;
        }

        for (var i = 0; i < stocks.length; i++) {
            tbody.appendChild(createStockRow(stocks[i]));
        }
    }

    /**
     * Belirli bir hisse satirini tablodan kaldirir.
     * @param {string} code hisse kodu
     */
    function removeStockRow(code) {
        var row = document.querySelector('#watchlistTableBody tr[data-stock-code="' + code + '"]');
        if (row) row.remove();

        // Tablo bos kaldiysa empty state goster
        var remaining = document.querySelectorAll('#watchlistTableBody tr[data-stock-code]');
        if (remaining.length === 0) {
            renderStocks([]);
        }
    }

    // ── Watchlist CRUD ─────────────────────────────────────

    /**
     * Belirli bir watchlist'in hisselerini yukler.
     * @param {number} wlId watchlist ID
     */
    function loadWatchlistStocks(wlId) {
        fetch('/ajax/watchlists/' + wlId + '/stocks')
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(stocks) {
                renderStocks(stocks);
                initSortable();
            })
            .catch(function() {
                renderStocks([]);
            });
    }

    /**
     * Yeni watchlist olusturur.
     * @param {string} name liste adi
     * @param {string} desc aciklama
     */
    function createWatchlist(name, desc) {
        var errorEl = document.getElementById('createWlError');
        var successEl = document.getElementById('createWlSuccess');
        var saveBtn = document.getElementById('saveNewWatchlistBtn');
        errorEl.classList.add('d-none');
        successEl.classList.add('d-none');

        if (!name || name.trim().length === 0) {
            errorEl.textContent = 'Liste adi bos olamaz.';
            errorEl.classList.remove('d-none');
            return;
        }

        saveBtn.disabled = true;

        fetch('/ajax/watchlists', {
            method: 'POST',
            headers: getCsrfHeaders(),
            body: JSON.stringify({ name: name.trim(), description: (desc || '').trim() })
        })
        .then(function(r) {
            if (!r.ok) return r.text().then(function(t) { throw new Error(t || 'Olusturma basarisiz'); });
            return r.json();
        })
        .then(function(wl) {
            successEl.textContent = 'Liste olusturuldu.';
            successEl.classList.remove('d-none');

            // Dropdown'a ekle ve sec
            var select = document.getElementById('watchlistSelect');
            if (select) {
                var opt = document.createElement('option');
                opt.value = wl.id;
                opt.textContent = wl.name;
                opt.setAttribute('data-description', desc || '');
                select.appendChild(opt);
                select.value = wl.id;
                currentWatchlistId = wl.id;
                loadWatchlistStocks(wl.id);
            }

            saveBtn.disabled = false;
            setTimeout(function() {
                var modal = bootstrap.Modal.getInstance(document.getElementById('createWatchlistModal'));
                if (modal) modal.hide();
                document.getElementById('newWlName').value = '';
                document.getElementById('newWlDesc').value = '';
                successEl.classList.add('d-none');
            }, 600);
        })
        .catch(function(err) {
            errorEl.textContent = err.message || 'Liste olusturulamadi.';
            errorEl.classList.remove('d-none');
            saveBtn.disabled = false;
        });
    }

    /**
     * Mevcut watchlist'i gunceller.
     * @param {number} id watchlist ID
     * @param {string} name yeni ad
     * @param {string} desc yeni aciklama
     */
    function updateWatchlist(id, name, desc) {
        var errorEl = document.getElementById('editWlError');
        var successEl = document.getElementById('editWlSuccess');
        var saveBtn = document.getElementById('saveEditWlBtn');
        errorEl.classList.add('d-none');
        successEl.classList.add('d-none');

        if (!name || name.trim().length === 0) {
            errorEl.textContent = 'Liste adi bos olamaz.';
            errorEl.classList.remove('d-none');
            return;
        }

        saveBtn.disabled = true;

        fetch('/ajax/watchlists/' + id, {
            method: 'PUT',
            headers: getCsrfHeaders(),
            body: JSON.stringify({ name: name.trim(), description: (desc || '').trim() })
        })
        .then(function(r) {
            if (!r.ok) return r.text().then(function(t) { throw new Error(t || 'Guncelleme basarisiz'); });
            return r.json();
        })
        .then(function(wl) {
            successEl.textContent = 'Liste guncellendi.';
            successEl.classList.remove('d-none');

            // Dropdown option textini guncelle
            var select = document.getElementById('watchlistSelect');
            if (select) {
                var opts = select.options;
                for (var i = 0; i < opts.length; i++) {
                    if (String(opts[i].value) === String(id)) {
                        opts[i].textContent = wl.name;
                        opts[i].setAttribute('data-description', desc || '');
                        break;
                    }
                }
            }

            saveBtn.disabled = false;
            setTimeout(function() {
                var modal = bootstrap.Modal.getInstance(document.getElementById('editWatchlistModal'));
                if (modal) modal.hide();
                successEl.classList.add('d-none');
            }, 600);
        })
        .catch(function(err) {
            errorEl.textContent = err.message || 'Liste guncellenemedi.';
            errorEl.classList.remove('d-none');
            saveBtn.disabled = false;
        });
    }

    /**
     * Watchlist'i siler.
     * @param {number} id watchlist ID
     */
    function deleteWatchlist(id) {
        if (!id) return;
        var errorEl = document.getElementById('deleteWlError');
        var confirmBtn = document.getElementById('confirmDeleteWlBtn');
        errorEl.classList.add('d-none');
        confirmBtn.disabled = true;

        fetch('/ajax/watchlists/' + id, {
            method: 'DELETE',
            headers: getCsrfHeadersNoContent()
        })
        .then(function(r) {
            if (!r.ok) return r.text().then(function(t) { throw new Error(t || 'Silme basarisiz'); });
            // Dropdown'dan kaldir
            var select = document.getElementById('watchlistSelect');
            if (select) {
                var opts = select.options;
                for (var i = 0; i < opts.length; i++) {
                    if (String(opts[i].value) === String(id)) {
                        select.remove(i);
                        break;
                    }
                }
                // Ilk listeye gec
                if (select.options.length > 0) {
                    select.selectedIndex = 0;
                    currentWatchlistId = parseInt(select.value);
                    loadWatchlistStocks(currentWatchlistId);
                } else {
                    currentWatchlistId = null;
                    renderStocks([]);
                }
            }

            confirmBtn.disabled = false;
            var modal = bootstrap.Modal.getInstance(document.getElementById('deleteWatchlistModal'));
            if (modal) modal.hide();
        })
        .catch(function(err) {
            errorEl.textContent = err.message || 'Liste silinemedi.';
            errorEl.classList.remove('d-none');
            confirmBtn.disabled = false;
        });
    }

    // ── Stock CRUD ─────────────────────────────────────────

    /**
     * Watchlist'e hisse ekler.
     * @param {number} wlId watchlist ID
     * @param {string} stockCode hisse kodu
     * @param {string} stockName hisse adi
     */
    function addStockToWatchlist(wlId, stockCode, stockName) {
        var errorEl = document.getElementById('addStockError');
        var successEl = document.getElementById('addStockSuccess');
        errorEl.classList.add('d-none');
        successEl.classList.add('d-none');

        fetch('/ajax/watchlists/' + wlId + '/stocks', {
            method: 'POST',
            headers: getCsrfHeaders(),
            body: JSON.stringify({ stockCode: stockCode, stockName: stockName || '' })
        })
        .then(function(r) {
            if (!r.ok) return r.text().then(function(t) { throw new Error(t || 'Ekleme basarisiz'); });
            return r.json();
        })
        .then(function(stock) {
            successEl.textContent = stockCode + ' basariyla eklendi.';
            successEl.classList.remove('d-none');
            setTimeout(function() { successEl.classList.add('d-none'); }, 2000);

            // Empty state'i kaldir
            var emptyRow = document.getElementById('emptyRow');
            if (emptyRow) emptyRow.remove();

            // Yeni satiri ekle
            var tbody = document.getElementById('watchlistTableBody');
            if (tbody) tbody.appendChild(createStockRow(stock));
        })
        .catch(function(err) {
            errorEl.textContent = err.message || 'Hisse eklenemedi.';
            errorEl.classList.remove('d-none');
            setTimeout(function() { errorEl.classList.add('d-none'); }, 3000);
        });
    }

    /**
     * Watchlist'ten hisse cikarir.
     * @param {number} wlId watchlist ID
     * @param {string} stockCode hisse kodu
     */
    function removeStockFromWatchlist(wlId, stockCode) {
        if (!wlId || !stockCode) return;

        fetch('/ajax/watchlists/' + wlId + '/stocks/' + encodeURIComponent(stockCode), {
            method: 'DELETE',
            headers: getCsrfHeadersNoContent()
        })
        .then(function(r) {
            if (!r.ok) throw new Error('Cikarma basarisiz');
            removeStockRow(stockCode);
        })
        .catch(function(err) {
            console.warn('[WATCHLIST] Hisse cikarilamadi:', err);
            alert('Hisse listeden cikarilirken bir hata olustu.');
        });
    }

    /**
     * Hisse siralamasini gunceller.
     * @param {number} wlId watchlist ID
     * @param {Array<number>} itemIds sirali item ID listesi
     */
    function reorderStocks(wlId, itemIds) {
        fetch('/ajax/watchlists/' + wlId + '/stocks/reorder', {
            method: 'PUT',
            headers: getCsrfHeaders(),
            body: JSON.stringify({ itemIds: itemIds })
        })
        .catch(function() {
            // Siralama kaydetme basarisiz — sessizce atla
        });
    }

    // ── Stock Search (Hisse Ekle Modal) ────────────────────

    /**
     * Hisse listesini API'den ceker ve cache'ler.
     * @param {Function} cb veri hazir oldugunda cagirilacak fonksiyon
     */
    function ensureStockCache(cb) {
        if (stockCache) {
            cb(stockCache);
            return;
        }
        if (isFetching) {
            setTimeout(function() { ensureStockCache(cb); }, 100);
            return;
        }
        isFetching = true;
        fetch('/ajax/stocks/search')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                stockCache = data || [];
                isFetching = false;
                cb(stockCache);
            })
            .catch(function() {
                isFetching = false;
                stockCache = [];
                cb(stockCache);
            });
    }

    /**
     * Hisse listesini sorgu metnine gore filtreler. Ticker eslesmesi once.
     * @param {Array} stocks hisse listesi
     * @param {string} query arama metni (kucuk harf)
     * @returns {Array} filtrelenmis liste (max 8)
     */
    function filterStocks(stocks, query) {
        var tickerMatches = [];
        var descMatches = [];
        var MAX = 8;

        for (var i = 0; i < stocks.length; i++) {
            var s = stocks[i];
            var ticker = (s.ticker || '').toLowerCase();
            var desc = (s.description || '').toLowerCase();

            if (ticker.indexOf(query) === 0) {
                tickerMatches.push(s);
            } else if (desc.indexOf(query) !== -1) {
                descMatches.push(s);
            }

            if (tickerMatches.length + descMatches.length >= MAX * 2) break;
        }

        return tickerMatches.concat(descMatches).slice(0, MAX);
    }

    /**
     * Arama sonuclarini dropdown'a render eder (DOM API, XSS-safe).
     * @param {HTMLElement} container sonuc container'i
     * @param {Array} results filtrelenmis hisse listesi
     */
    function renderSearchResults(container, results) {
        while (container.firstChild) container.removeChild(container.firstChild);

        if (results.length === 0) {
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'list-group-item text-muted text-center py-3';
            emptyDiv.textContent = 'Sonuc bulunamadi';
            container.appendChild(emptyDiv);
            return;
        }

        for (var i = 0; i < results.length; i++) {
            (function(stock) {
                var item = document.createElement('button');
                item.type = 'button';
                item.className = 'list-group-item list-group-item-action d-flex align-items-center';

                // Logo veya fallback
                var ticker = stock.ticker || '';
                if (stock.logoid) {
                    var img = document.createElement('img');
                    img.src = '/img/stock-logos/' + stock.logoid;
                    img.className = 'rounded-circle me-2';
                    img.style.cssText = 'width:28px;height:28px;min-width:28px;object-fit:contain;';
                    img.onerror = function() {
                        var fb = document.createElement('div');
                        fb.className = 'rounded-circle me-2 d-flex align-items-center justify-content-center border';
                        fb.style.cssText = 'width:28px;height:28px;min-width:28px;font-size:10px;font-weight:600;background:#fff;';
                        fb.textContent = ticker.substring(0, 4);
                        img.parentNode.replaceChild(fb, img);
                    };
                    item.appendChild(img);
                } else {
                    var fbDiv = document.createElement('div');
                    fbDiv.className = 'rounded-circle me-2 d-flex align-items-center justify-content-center border';
                    fbDiv.style.cssText = 'width:28px;height:28px;min-width:28px;font-size:10px;font-weight:600;background:#fff;';
                    fbDiv.textContent = ticker.substring(0, 4);
                    item.appendChild(fbDiv);
                }

                var textDiv = document.createElement('div');
                textDiv.className = 'overflow-hidden';
                var tickerSpan = document.createElement('span');
                tickerSpan.className = 'fw-semibold';
                tickerSpan.textContent = ticker;
                var descP = document.createElement('p');
                descP.className = 'text-muted mb-0 fs-12 text-truncate';
                descP.style.maxWidth = '280px';
                descP.textContent = stock.description || '';
                textDiv.appendChild(tickerSpan);
                textDiv.appendChild(descP);
                item.appendChild(textDiv);

                item.addEventListener('click', function() {
                    if (currentWatchlistId) {
                        addStockToWatchlist(currentWatchlistId, ticker, stock.description || '');
                    }
                });

                container.appendChild(item);
            })(results[i]);
        }
    }

    // ── SortableJS ─────────────────────────────────────────

    /**
     * Tablo satirlarinda drag-drop siralamayi baslatir.
     */
    function initSortable() {
        var tbody = document.getElementById('watchlistTableBody');
        if (!tbody || typeof Sortable === 'undefined') return;

        // Onceki Sortable instance'i temizle
        if (tbody._sortableInstance) {
            tbody._sortableInstance.destroy();
        }

        tbody._sortableInstance = new Sortable(tbody, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'table-active',
            onEnd: function() {
                var rows = tbody.querySelectorAll('tr[data-stock-code]');
                var ids = [];
                rows.forEach(function(r) {
                    var itemId = parseInt(r.getAttribute('data-item-id'));
                    if (itemId) ids.push(itemId);
                });
                if (currentWatchlistId && ids.length > 0) {
                    reorderStocks(currentWatchlistId, ids);
                }
            }
        });
    }

    // ── STOMP WebSocket ────────────────────────────────────

    /**
     * STOMP WebSocket baglantisi kurar ve watchlist fiyat guncellemelerini dinler.
     */
    function initWebSocket() {
        var USER_EMAIL = document.body.getAttribute('data-user-email') || '';
        var API_BASE = document.body.getAttribute('data-api-base') || '';

        if (!USER_EMAIL || typeof SockJS === 'undefined' || typeof StompJs === 'undefined') return;

        stompClient = new StompJs.Client({
            webSocketFactory: function() { return new SockJS(API_BASE + '/ws'); },
            connectHeaders: { email: USER_EMAIL },
            reconnectDelay: 10000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000
        });

        stompClient.onConnect = function() {
            stompClient.subscribe('/user/queue/watchlist', function(msg) {
                try {
                    var data = JSON.parse(msg.body);
                    updateRowPrices(data);
                } catch(e) {
                    // JSON parse hatasi — sessizce atla
                }
            });
        };

        stompClient.onStompError = function() {
            // STOMP hatasi — reconnect otomatik
        };

        stompClient.activate();

        window.addEventListener('beforeunload', function() {
            if (stompClient && stompClient.active) {
                stompClient.deactivate();
            }
        });
    }

    /**
     * Tablo satirindaki fiyat/degisim/hacim degerlerini gunceller (DOM API, XSS-safe).
     * @param {Object} data fiyat guncelleme verisi (stockCode, lastPrice, changePercent, volume)
     */
    function updateRowPrices(data) {
        var row = document.querySelector('#watchlistTableBody tr[data-stock-code="' + data.stockCode + '"]');
        if (!row) return;

        // Fiyat hucresini guncelle
        var priceCell = row.querySelector('.price-cell');
        if (priceCell && data.lastPrice != null) {
            priceCell.textContent = formatPrice(data.lastPrice);
            priceCell.classList.add('bg-soft-warning');
            setTimeout(function() { priceCell.classList.remove('bg-soft-warning'); }, 800);
        }

        // Degisim hucresini guncelle (DOM API, innerHTML yok)
        var changeCell = row.querySelector('.change-cell');
        if (changeCell && data.changePercent != null) {
            while (changeCell.firstChild) changeCell.removeChild(changeCell.firstChild);
            var span = document.createElement('span');
            span.className = data.changePercent >= 0 ? 'text-success' : 'text-danger';
            span.textContent = formatChange(data.changePercent);
            changeCell.appendChild(span);
        }

        // Hacim hucresini guncelle
        var volumeCell = row.querySelector('.volume-cell');
        if (volumeCell && data.volume != null) {
            volumeCell.textContent = formatVolume(data.volume);
        }
    }

    // ── Initialization ─────────────────────────────────────

    /**
     * Sayfa baslatma fonksiyonu. Event listener'lari baglar.
     */
    function init() {
        var selectEl = document.getElementById('watchlistSelect');
        if (selectEl && selectEl.value) {
            currentWatchlistId = parseInt(selectEl.value);
        }

        // Dropdown degisince hisseleri yukle
        if (selectEl) {
            selectEl.addEventListener('change', function() {
                currentWatchlistId = parseInt(this.value);
                loadWatchlistStocks(currentWatchlistId);
            });
        }

        // ── Yeni Liste Olustur ──
        var saveNewBtn = document.getElementById('saveNewWatchlistBtn');
        if (saveNewBtn) {
            saveNewBtn.addEventListener('click', function() {
                var name = document.getElementById('newWlName').value;
                var desc = document.getElementById('newWlDesc').value;
                createWatchlist(name, desc);
            });
        }

        // ── Liste Duzenle Modal — show'da doldur ──
        var editModal = document.getElementById('editWatchlistModal');
        if (editModal) {
            editModal.addEventListener('show.bs.modal', function() {
                var select = document.getElementById('watchlistSelect');
                if (!select || !select.value) return;
                var selectedOpt = select.options[select.selectedIndex];
                document.getElementById('editWlId').value = select.value;
                document.getElementById('editWlName').value = selectedOpt ? selectedOpt.textContent : '';
                document.getElementById('editWlDesc').value = selectedOpt ? (selectedOpt.getAttribute('data-description') || '') : '';
                document.getElementById('editWlError').classList.add('d-none');
                document.getElementById('editWlSuccess').classList.add('d-none');
            });
        }

        var saveEditBtn = document.getElementById('saveEditWlBtn');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', function() {
                var id = document.getElementById('editWlId').value;
                var name = document.getElementById('editWlName').value;
                var desc = document.getElementById('editWlDesc').value;
                if (id) updateWatchlist(parseInt(id), name, desc);
            });
        }

        // ── Liste Sil Modal — show'da adi goster ──
        var deleteModal = document.getElementById('deleteWatchlistModal');
        if (deleteModal) {
            deleteModal.addEventListener('show.bs.modal', function() {
                var select = document.getElementById('watchlistSelect');
                var nameEl = document.getElementById('deleteWlName');
                if (select && nameEl) {
                    var selectedOpt = select.options[select.selectedIndex];
                    nameEl.textContent = selectedOpt ? selectedOpt.textContent : '';
                }
                document.getElementById('deleteWlError').classList.add('d-none');
            });
        }

        var confirmDeleteBtn = document.getElementById('confirmDeleteWlBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', function() {
                if (currentWatchlistId) deleteWatchlist(currentWatchlistId);
            });
        }

        // ── Hisse Ekle — Arama ──
        var searchInput = document.getElementById('addStockSearch');
        var searchResults = document.getElementById('addStockResults');
        if (searchInput && searchResults) {
            searchInput.addEventListener('input', function() {
                var query = (searchInput.value || '').trim().toLowerCase();
                if (query.length < 1) {
                    while (searchResults.firstChild) searchResults.removeChild(searchResults.firstChild);
                    return;
                }

                ensureStockCache(function(stocks) {
                    var results = filterStocks(stocks, query);
                    renderSearchResults(searchResults, results);
                });
            });
        }

        // Modal kapandiginda arama alanini temizle
        var addStockModal = document.getElementById('addStockModal');
        if (addStockModal) {
            addStockModal.addEventListener('hidden.bs.modal', function() {
                if (searchInput) searchInput.value = '';
                if (searchResults) {
                    while (searchResults.firstChild) searchResults.removeChild(searchResults.firstChild);
                }
                var errorEl = document.getElementById('addStockError');
                var successEl = document.getElementById('addStockSuccess');
                if (errorEl) errorEl.classList.add('d-none');
                if (successEl) successEl.classList.add('d-none');
            });
        }

        // ── Hisse Sil (event delegation) ──
        var tbody = document.getElementById('watchlistTableBody');
        if (tbody) {
            tbody.addEventListener('click', function(e) {
                var btn = e.target.closest('.remove-stock-btn');
                if (btn) {
                    var stockCode = btn.getAttribute('data-stock-code');
                    removeStockFromWatchlist(currentWatchlistId, stockCode);
                }
            });
        }

        // ── Ilk yukleme: hacim hucreleri formatlama ──
        document.querySelectorAll('.volume-cell[data-volume]').forEach(function(cell) {
            var v = parseFloat(cell.getAttribute('data-volume'));
            if (!isNaN(v)) cell.textContent = formatVolume(v);
        });

        initSortable();
        initWebSocket();
    }

    // ── DOMContentLoaded guard ─────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
