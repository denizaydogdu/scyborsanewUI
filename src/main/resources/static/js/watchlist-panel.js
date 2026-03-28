/**
 * Takip Listesi Sag Panel (TradingView-style sliding panel).
 *
 * Tum sayfalarda layout.html uzerinden yuklenir. Toggle ile acilip kapanan,
 * kompakt hisse listesi + canli fiyat guncelleme + drag-drop siralama destekler.
 *
 * Gereksinimler:
 * - body[data-user-email] attribute (GlobalModelAdvice)
 * - body[data-api-base] attribute (GlobalModelAdvice)
 * - SockJS + StompJs kutuphane (layout.html)
 * - SortableJS (layout.html CDN)
 * - CSRF meta tag'leri (head-css.html)
 * - #watchlist-panel HTML (partials/watchlist-panel.html)
 */
(function() {
    'use strict';

    // ── State ──────────────────────────────────────────────
    var panelEl = null;
    var selectEl = null;
    var stockListEl = null;
    var currentWatchlistId = null;
    var dataLoaded = false;
    var stompClient = null;
    var stockCache = null;
    var isFetching = false;

    // ── CSRF ───────────────────────────────────────────────
    var csrfToken = document.querySelector('meta[name="_csrf"]')
        ? document.querySelector('meta[name="_csrf"]').getAttribute('content')
        : null;
    var csrfHeader = document.querySelector('meta[name="_csrf_header"]')
        ? document.querySelector('meta[name="_csrf_header"]').getAttribute('content')
        : null;

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

    // ── Format Helpers (Turkce, kompakt) ───────────────────

    /**
     * Fiyat degerini Turkce formata cevirir (TL eki yok, kompakt).
     * @param {number} val fiyat degeri
     * @returns {string} "245,60" formati
     */
    function formatPrice(val) {
        if (val == null || isNaN(val)) return '-';
        return Number(val).toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Degisim yuzdesini Turkce formata cevirir.
     * @param {number} val degisim yuzdesi
     * @returns {string} "+2,34%" veya "-0,52%" formati
     */
    function formatChange(val) {
        if (val == null || isNaN(val)) return '-';
        var prefix = val >= 0 ? '+' : '';
        return prefix + Number(val).toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + '%';
    }

    // ── Panel Open / Close ─────────────────────────────────

    /**
     * Paneli acar. Ilk acilista veri yukler ve STOMP baglar.
     */
    function openPanel() {
        if (!panelEl) return;
        document.body.classList.add('watchlist-panel-open');
        panelEl.classList.add('open');
        localStorage.setItem('wp_open', 'true');

        // Backdrop (mobile)
        var backdrop = document.getElementById('watchlist-panel-backdrop');
        if (backdrop) backdrop.classList.add('show');

        if (!dataLoaded) {
            loadData();
            connectStomp();
        }
    }

    /**
     * Paneli kapatir.
     */
    function closePanel() {
        if (!panelEl) return;
        document.body.classList.remove('watchlist-panel-open');
        panelEl.classList.remove('open');
        localStorage.setItem('wp_open', 'false');

        var backdrop = document.getElementById('watchlist-panel-backdrop');
        if (backdrop) backdrop.classList.remove('show');
    }

    /**
     * Panel durumunu toggle eder (acik ise kapatir, kapali ise acar).
     */
    function togglePanel() {
        if (!panelEl) return;
        if (panelEl.classList.contains('open')) {
            closePanel();
        } else {
            openPanel();
        }
    }

    // ── Data Loading ───────────────────────────────────────

    /**
     * Watchlist listesini yukler, dropdown'u doldurur, ilk listeyi acar.
     */
    function loadData() {
        fetch('/ajax/watchlists')
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(watchlists) {
                dataLoaded = true;
                if (!selectEl) return;

                // Dropdown'u temizle
                while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);

                if (!watchlists || watchlists.length === 0) {
                    var emptyOpt = document.createElement('option');
                    emptyOpt.value = '';
                    emptyOpt.textContent = 'Liste yok';
                    emptyOpt.disabled = true;
                    emptyOpt.selected = true;
                    selectEl.appendChild(emptyOpt);
                    renderStockList([]);
                    return;
                }

                var foundSaved = false;
                for (var i = 0; i < watchlists.length; i++) {
                    var wl = watchlists[i];
                    var opt = document.createElement('option');
                    opt.value = wl.id;
                    opt.textContent = wl.name || ('Liste #' + wl.id);
                    selectEl.appendChild(opt);

                    if (currentWatchlistId && parseInt(wl.id, 10) === currentWatchlistId) {
                        foundSaved = true;
                        opt.selected = true;
                    }
                }

                // Kaydedilmis ID yoksa ilk listeyi sec
                if (!foundSaved) {
                    currentWatchlistId = parseInt(watchlists[0].id, 10);
                }
                selectEl.value = String(currentWatchlistId);
                localStorage.setItem('wp_active_wl', String(currentWatchlistId));

                loadStocks(currentWatchlistId);
            })
            .catch(function(err) {
                dataLoaded = false; // Retry izni ver
                console.warn('[WP] Watchlist listesi yüklenemedi:', err);
                renderStockList([]);
            });
    }

    /**
     * Belirli bir watchlist'in hisselerini yukler.
     * @param {number} wlId watchlist ID
     */
    function loadStocks(wlId) {
        if (!wlId) {
            renderStockList([]);
            return;
        }

        fetch('/ajax/watchlists/' + wlId + '/stocks')
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(stocks) {
                renderStockList(stocks || []);
                initSortable();
            })
            .catch(function(err) {
                console.warn('[WP] Hisseler yüklenemedi:', err);
                renderStockList([]);
            });
    }

    /**
     * Hisse listesini panel icerisine render eder (DOM API, XSS-safe).
     * @param {Array} stocks hisse dizisi
     */
    function renderStockList(stocks) {
        if (!stockListEl) return;

        // Temizle
        while (stockListEl.firstChild) stockListEl.removeChild(stockListEl.firstChild);

        if (!stocks || stocks.length === 0) {
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-center text-muted py-5';
            var emptyIcon = document.createElement('i');
            emptyIcon.className = 'ri-list-check fs-24 d-block mb-2';
            emptyDiv.appendChild(emptyIcon);
            emptyDiv.appendChild(document.createTextNode('Bu listede henüz hisse yok.'));
            stockListEl.appendChild(emptyDiv);
            return;
        }

        for (var i = 0; i < stocks.length; i++) {
            stockListEl.appendChild(createStockItem(stocks[i]));
        }
    }

    /**
     * Tek bir hisse satiri icin kompakt DOM elementi olusturur (XSS-safe, innerHTML yok).
     * @param {Object} stock hisse verisi (stockCode, stockName, id, price, changePercent)
     * @returns {HTMLElement} .wp-stock-item div
     */
    function createStockItem(stock) {
        var code = stock.stockCode || '';
        var itemId = stock.id != null ? String(stock.id) : '';

        var div = document.createElement('div');
        div.className = 'wp-stock-item';
        div.setAttribute('data-code', code);
        div.setAttribute('data-item-id', itemId);

        // Hisse logosu (avatar)
        var avatarWrap = document.createElement('div');
        avatarWrap.className = 'wp-stock-avatar flex-shrink-0';

        var fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'avatar-title rounded-circle fw-semibold';
        fallbackDiv.style.cssText = 'width:28px;height:28px;font-size:0.5rem;background:transparent;color:#495057;border:1.5px solid #ced4da;';
        fallbackDiv.textContent = code.length > 4 ? code.substring(0, 4) : code;

        if (stock.logoid) {
            var img = document.createElement('img');
            img.src = '/img/stock-logos/' + stock.logoid;
            img.alt = code;
            img.className = 'rounded-circle';
            img.style.cssText = 'width:28px;height:28px;';
            img.onerror = function() {
                img.style.display = 'none';
                fallbackDiv.style.display = 'flex';
            };
            fallbackDiv.style.display = 'none';
            avatarWrap.appendChild(img);
        }
        avatarWrap.appendChild(fallbackDiv);
        div.appendChild(avatarWrap);

        // Hisse kodu link
        var link = document.createElement('a');
        link.className = 'wp-stock-link';
        link.href = '/stock/detail/' + encodeURIComponent(code);
        var codeSpan = document.createElement('span');
        codeSpan.className = 'wp-stock-code';
        codeSpan.textContent = code;
        link.appendChild(codeSpan);
        div.appendChild(link);

        // Spacer (flex-grow ile saga itme)
        var spacer = document.createElement('span');
        spacer.style.flex = '1';
        div.appendChild(spacer);

        // Fiyat
        var priceSpan = document.createElement('span');
        priceSpan.className = 'wp-stock-price';
        priceSpan.textContent = formatPrice(stock.lastPrice);
        div.appendChild(priceSpan);

        // Degisim
        var changeSpan = document.createElement('span');
        changeSpan.className = 'wp-stock-change';
        if (stock.changePercent != null && !isNaN(stock.changePercent)) {
            changeSpan.classList.add(stock.changePercent >= 0 ? 'text-success' : 'text-danger');
            changeSpan.textContent = formatChange(stock.changePercent);
        } else {
            changeSpan.textContent = '-';
        }
        div.appendChild(changeSpan);

        // Sil butonu
        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'wp-remove-btn btn btn-sm p-0 border-0';
        removeBtn.title = 'Listeden çıkar';
        var removeIcon = document.createElement('i');
        removeIcon.className = 'ri-close-line';
        removeBtn.appendChild(removeIcon);
        div.appendChild(removeBtn);

        return div;
    }

    // ── CRUD ───────────────────────────────────────────────

    /**
     * Aktif watchlist'e hisse ekler.
     * @param {string} code hisse kodu
     * @param {string} name hisse adi
     */
    function addStock(code, name) {
        if (!currentWatchlistId || !code) return;

        fetch('/ajax/watchlists/' + currentWatchlistId + '/stocks', {
            method: 'POST',
            headers: getCsrfHeaders(),
            body: JSON.stringify({ stockCode: code, stockName: name || '' })
        })
        .then(function(r) {
            if (!r.ok) return r.text().then(function(t) { throw new Error(t || 'Ekleme başarısız'); });
            return r.json();
        })
        .then(function(stock) {
            if (!stockListEl) return;

            // Empty state'i kaldir
            var emptyState = stockListEl.querySelector('.text-center.text-muted');
            if (emptyState) emptyState.remove();

            // Duplicate guard
            var escaped = CSS.escape(stock.stockCode || code);
            var existing = stockListEl.querySelector('.wp-stock-item[data-code="' + escaped + '"]');
            if (!existing) {
                stockListEl.appendChild(createStockItem(stock));
            }

            // Basari mesaji
            var successEl = document.getElementById('wp-add-stock-success');
            if (successEl) {
                successEl.textContent = (stock.stockCode || code) + ' başarıyla eklendi';
                successEl.classList.remove('d-none');
                setTimeout(function() { successEl.classList.add('d-none'); }, 2000);
            }

            // Arama alanini temizle
            clearSearchInput();
        })
        .catch(function(err) {
            console.warn('[WP] Hisse eklenemedi:', err);
            var errorEl = document.getElementById('wp-add-stock-error');
            if (errorEl) {
                errorEl.textContent = err.message || 'Hisse eklenemedi';
                errorEl.classList.remove('d-none');
                setTimeout(function() { errorEl.classList.add('d-none'); }, 3000);
            }
        });
    }

    /**
     * Aktif watchlist'ten hisse cikarir.
     * @param {string} code hisse kodu
     */
    function removeStock(code) {
        if (!currentWatchlistId || !code) return;

        fetch('/ajax/watchlists/' + currentWatchlistId + '/stocks/' + encodeURIComponent(code), {
            method: 'DELETE',
            headers: getCsrfHeadersNoContent()
        })
        .then(function(r) {
            if (!r.ok) throw new Error('Çıkarma başarısız');

            // DOM'dan kaldir
            var escaped = CSS.escape(code);
            var item = stockListEl
                ? stockListEl.querySelector('.wp-stock-item[data-code="' + escaped + '"]')
                : null;
            if (item) item.remove();

            // Bos kaldiysa empty state goster
            if (stockListEl && !stockListEl.querySelector('.wp-stock-item')) {
                renderStockList([]);
            }
        })
        .catch(function(err) {
            console.warn('[WP] Hisse çıkarılamadı:', err);
        });
    }

    /**
     * Yeni watchlist olusturur.
     * @param {string} name liste adi
     */
    function createWatchlist(name) {
        if (!name || name.trim().length === 0) return;

        fetch('/ajax/watchlists', {
            method: 'POST',
            headers: getCsrfHeaders(),
            body: JSON.stringify({ name: name.trim(), description: '' })
        })
        .then(function(r) {
            if (!r.ok) return r.text().then(function(t) { throw new Error(t || 'Oluşturma başarısız'); });
            return r.json();
        })
        .then(function(wl) {
            if (!selectEl) return;

            // Dropdown'a ekle ve sec
            var opt = document.createElement('option');
            opt.value = wl.id;
            opt.textContent = wl.name;
            selectEl.appendChild(opt);
            selectEl.value = String(wl.id);
            currentWatchlistId = parseInt(wl.id, 10);
            localStorage.setItem('wp_active_wl', String(currentWatchlistId));

            renderStockList([]);

            // Modal'ı kapat ve input'u temizle
            var modalInput = document.getElementById('wp-new-list-name');
            if (modalInput) modalInput.value = '';
            if (window._wpCloseNewListModal) window._wpCloseNewListModal();
        })
        .catch(function(err) {
            console.warn('[WP] Liste oluşturulamadı:', err);
            var errorEl = document.getElementById('wp-new-list-error');
            if (errorEl) {
                errorEl.textContent = err.message || 'Liste oluşturulamadı';
                errorEl.classList.remove('d-none');
                setTimeout(function() { errorEl.classList.add('d-none'); }, 3000);
            }
        });
    }

    /**
     * Hisse siralamasini gunceller.
     * @param {Array<number>} itemIds sirali item ID listesi
     */
    function reorderStocks(itemIds) {
        if (!currentWatchlistId || !itemIds || itemIds.length === 0) return;

        fetch('/ajax/watchlists/' + currentWatchlistId + '/stocks/reorder', {
            method: 'PUT',
            headers: getCsrfHeaders(),
            body: JSON.stringify({ itemIds: itemIds })
        })
        .catch(function() {
            // Siralama kaydetme basarisiz — sessizce atla
        });
    }

    // ── Stock Search (Panel Ici Hisse Ekle) ────────────────

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
     * Arama sonuclarini dropdown container'a render eder (DOM API, XSS-safe).
     * @param {HTMLElement} container sonuc container'i
     * @param {Array} results filtrelenmis hisse listesi
     */
    function renderSearchResults(container, results) {
        while (container.firstChild) container.removeChild(container.firstChild);
        if (results.length === 0) {
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'wp-search-result-item text-muted text-center py-2';
            emptyDiv.textContent = 'Sonuç bulunamadı';
            container.appendChild(emptyDiv);
            container.style.display = 'block';
            return;
        }
        container.style.display = 'block';

        for (var i = 0; i < results.length; i++) {
            (function(stock) {
                var item = document.createElement('button');
                item.type = 'button';
                item.className = 'wp-search-result-item';

                var ticker = stock.ticker || '';

                var tickerSpan = document.createElement('span');
                tickerSpan.className = 'fw-semibold';
                tickerSpan.textContent = ticker;
                item.appendChild(tickerSpan);

                var descSpan = document.createElement('span');
                descSpan.className = 'text-muted fs-12 ms-2 text-truncate';
                descSpan.style.maxWidth = '160px';
                descSpan.textContent = stock.description || '';
                item.appendChild(descSpan);

                item.addEventListener('click', function() {
                    addStock(ticker, stock.description || '');
                });

                container.appendChild(item);
            })(results[i]);
        }
    }

    /**
     * Hisse arama alanini ve sonuclarini temizler.
     */
    function clearSearchInput() {
        var input = document.getElementById('wp-add-stock-search');
        var results = document.getElementById('wp-add-stock-results');
        if (input) input.value = '';
        if (results) {
            results.style.display = 'none';
            while (results.firstChild) results.removeChild(results.firstChild);
        }
    }

    // ── STOMP WebSocket (ayri baglanti, lazy) ──────────────

    /**
     * STOMP WebSocket baglantisi kurar. Panel ilk acildiginda cagirilir.
     * /user/queue/watchlist kanalini dinler.
     */
    function connectStomp() {
        var USER_EMAIL = document.body.getAttribute('data-user-email') || '';
        var API_BASE = document.body.getAttribute('data-api-base') || '';

        if (!USER_EMAIL) return;
        if (typeof SockJS === 'undefined' || typeof StompJs === 'undefined') return;
        if (stompClient) return; // Zaten bagli

        try {
            stompClient = new StompJs.Client({
                webSocketFactory: function() {
                    return new SockJS(API_BASE + '/ws');
                },
                connectHeaders: { email: USER_EMAIL },
                reconnectDelay: 10000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000
            });

            stompClient.onConnect = function() {
                stompClient.subscribe('/user/queue/watchlist', function(msg) {
                    try {
                        var data = JSON.parse(msg.body);
                        updateStockPrice(data);
                    } catch (e) {
                        // JSON parse hatasi — sessizce atla
                    }
                });
            };

            stompClient.onStompError = function() {
                stompClient = null; // Retry izni ver
            };

            stompClient.activate();
        } catch (e) {
            console.warn('[WP] STOMP bağlantı hatası:', e);
        }
    }

    /**
     * Hisse fiyat/degisim bilgisini gunceller ve flash animasyonu uygular.
     * @param {Object} data fiyat guncelleme verisi (stockCode, lastPrice, changePercent)
     */
    function updateStockPrice(data) {
        if (!stockListEl || !data || !data.stockCode) return;

        var escaped = CSS.escape(data.stockCode);
        var item = stockListEl.querySelector(
            '.wp-stock-item[data-code="' + escaped + '"]'
        );
        if (!item) return;

        // Fiyat guncelle
        if (data.lastPrice != null) {
            var priceSpan = item.querySelector('.wp-stock-price');
            if (priceSpan) {
                priceSpan.textContent = formatPrice(data.lastPrice);
            }
        }

        // Degisim guncelle
        if (data.changePercent != null) {
            var changeSpan = item.querySelector('.wp-stock-change');
            if (changeSpan) {
                changeSpan.classList.remove('text-success', 'text-danger');
                changeSpan.classList.add(
                    data.changePercent >= 0 ? 'text-success' : 'text-danger'
                );
                changeSpan.textContent = formatChange(data.changePercent);
            }
        }

        // Flash animasyonu
        item.classList.add('wp-price-flash');
        setTimeout(function() {
            item.classList.remove('wp-price-flash');
        }, 600);
    }

    // ── SortableJS ─────────────────────────────────────────

    /**
     * Stock list uzerinde drag-drop siralamay baslatir.
     */
    function initSortable() {
        if (!stockListEl || typeof Sortable === 'undefined') return;

        // Onceki instance'i temizle
        if (stockListEl._sortableInstance) {
            stockListEl._sortableInstance.destroy();
        }

        stockListEl._sortableInstance = new Sortable(stockListEl, {
            handle: '.wp-stock-avatar',
            animation: 150,
            ghostClass: 'wp-drag-ghost',
            onEnd: function() {
                var items = stockListEl.querySelectorAll('.wp-stock-item');
                var ids = [];
                for (var i = 0; i < items.length; i++) {
                    var raw = items[i].getAttribute('data-item-id');
                    if (raw !== null && raw !== '') {
                        ids.push(parseInt(raw, 10));
                    }
                }
                if (ids.length > 0) {
                    reorderStocks(ids);
                }
            }
        });
    }

    // ── Init ───────────────────────────────────────────────

    /**
     * Paneli baslatir, event listener'lari baglar.
     */
    function init() {
        panelEl = document.getElementById('watchlist-panel');
        if (!panelEl) return; // Login sayfasi, panel yok

        selectEl = document.getElementById('wp-watchlist-select');
        stockListEl = document.getElementById('wp-stock-list');

        // Kaydedilmis aktif liste
        var savedWlId = localStorage.getItem('wp_active_wl');
        if (savedWlId) {
            currentWatchlistId = parseInt(savedWlId, 10);
        }

        // Toggle butonu (topbar)
        var toggleBtn = document.getElementById('watchlist-panel-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', togglePanel);
        }

        // Kapat butonu (panel header)
        var closeBtn = document.getElementById('watchlist-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closePanel);
        }

        // Sağ şerit — takip listesi ikonu paneli açar
        var stripWatchlist = document.getElementById('wp-strip-watchlist');
        if (stripWatchlist) {
            stripWatchlist.addEventListener('click', function(e) {
                e.stopPropagation();
                openPanel();
            });
        }

        // Backdrop (mobile)
        var backdrop = document.getElementById('watchlist-panel-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', closePanel);
        }

        // ESC ile kapat
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && panelEl && panelEl.classList.contains('open')) {
                closePanel();
            }
        });

        // Watchlist dropdown degisikligi
        if (selectEl) {
            selectEl.addEventListener('change', function() {
                currentWatchlistId = parseInt(this.value, 10);
                localStorage.setItem('wp_active_wl', String(currentWatchlistId));
                loadStocks(currentWatchlistId);
            });
        }

        // Event delegation: hisse sil butonu
        if (stockListEl) {
            stockListEl.addEventListener('click', function(e) {
                var btn = e.target.closest('.wp-remove-btn');
                if (btn) {
                    var item = btn.closest('.wp-stock-item');
                    if (item) {
                        removeStock(item.getAttribute('data-code'));
                    }
                }
            });
        }

        // ── Yeni Liste Modal ──────────────────────────────
        wireNewListModal();

        // ── Hisse Ekle (arama) ────────────────────────────
        wireAddStockSearch();

        // ── Panel zaten acik mi (localStorage + inline script) ──
        var savedOpen = localStorage.getItem('wp_open');
        if (savedOpen === 'true' || panelEl.classList.contains('open') || document.body.classList.contains('watchlist-panel-open')) {
            panelEl.classList.add('open');
            document.body.classList.add('watchlist-panel-open');
            loadData();
            connectStomp();
        }
    }

    /**
     * Yeni Liste modal'inin event handler'larini baglar.
     */
    function wireNewListModal() {
        var newListBtn = document.getElementById('wp-new-list-btn');
        var newListModalEl = document.getElementById('wp-new-list-modal');
        var newListSave = document.getElementById('wp-new-list-save');
        var newListInput = document.getElementById('wp-new-list-name');
        var bsNewListModal = newListModalEl ? new bootstrap.Modal(newListModalEl) : null;

        if (newListBtn && bsNewListModal) {
            newListBtn.addEventListener('click', function() {
                if (newListInput) { newListInput.value = ''; }
                var errorEl = document.getElementById('wp-new-list-error');
                if (errorEl) errorEl.classList.add('d-none');
                bsNewListModal.show();
                setTimeout(function() { if (newListInput) newListInput.focus(); }, 300);
            });
        }

        if (newListSave && newListInput) {
            newListSave.addEventListener('click', function() {
                createWatchlist(newListInput.value);
            });
        }

        if (newListInput) {
            newListInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    createWatchlist(newListInput.value);
                }
            });
        }

        // Başarılı oluşturma sonrası modalı kapat
        window._wpCloseNewListModal = function() {
            if (bsNewListModal) bsNewListModal.hide();
        };
    }

    /**
     * Hisse Ekle arama alaninin event handler'larini baglar.
     */
    function wireAddStockSearch() {
        var addStockBtn = document.getElementById('wp-add-stock-btn');
        var addStockModalEl = document.getElementById('wp-add-stock-modal');
        var searchInput = document.getElementById('wp-add-stock-search');
        var searchResults = document.getElementById('wp-add-stock-results');
        var bsAddStockModal = addStockModalEl ? new bootstrap.Modal(addStockModalEl) : null;

        if (addStockBtn && bsAddStockModal) {
            addStockBtn.addEventListener('click', function() {
                if (searchInput) searchInput.value = '';
                if (searchResults) { searchResults.style.display = 'none'; while (searchResults.firstChild) searchResults.removeChild(searchResults.firstChild); }
                var successEl = document.getElementById('wp-add-stock-success');
                var errorEl = document.getElementById('wp-add-stock-error');
                if (successEl) successEl.classList.add('d-none');
                if (errorEl) errorEl.classList.add('d-none');
                bsAddStockModal.show();
                setTimeout(function() { if (searchInput) searchInput.focus(); }, 300);
            });
        }

        // Modal kapandığında arama temizle
        if (addStockModalEl) {
            addStockModalEl.addEventListener('hidden.bs.modal', function() {
                clearSearchInput();
            });
        }

        if (searchInput && searchResults) {
            searchInput.addEventListener('input', function() {
                var query = (searchInput.value || '').trim().toLowerCase();
                if (query.length < 1) {
                    searchResults.style.display = 'none';
                    while (searchResults.firstChild) {
                        searchResults.removeChild(searchResults.firstChild);
                    }
                    return;
                }

                ensureStockCache(function(stocks) {
                    var results = filterStocks(stocks, query);
                    renderSearchResults(searchResults, results);
                });
            });

            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && addStockModal) {
                    addStockModal.style.display = 'none';
                    clearSearchInput();
                }
            });
        }
    }

    // ── beforeunload: STOMP temizligi ──────────────────────
    window.addEventListener('beforeunload', function() {
        if (stompClient && stompClient.active) {
            try {
                stompClient.deactivate();
            } catch (e) {
                // Sessizce atla
            }
        }
    });

    // ── Global API (sidebar link ve dis erisim icin) ───────
    window.WatchlistPanel = {
        toggle: togglePanel,
        open: openPanel,
        close: closePanel
    };

    // ── Baslatma ───────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);

})();
