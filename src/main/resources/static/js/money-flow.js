/**
 * Para Akisi Dashboard Widget
 *
 * Para girisi ve cikisi verilerini gosterir.
 * 60 saniye aralikla API'den guncel veri ceker.
 * fetchWithRetry (dashboard-crypto.init.js) kullanir.
 */
(function () {
    'use strict';

    var REFRESH_INTERVAL = 60000; // 60 saniye

    /**
     * Ticker harflerinden fallback avatar olusturur.
     * @param {string} ticker - Hisse kodu
     * @returns {HTMLElement} Avatar span elementi
     */
    function createTickerAvatar(ticker) {
        var initials = (ticker || '??').substring(0, 4);
        var span = document.createElement('span');
        span.className = 'avatar-title rounded-circle fw-semibold';
        span.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:10px;background:transparent;color:#495057;border:1.5px solid #ced4da;';
        span.textContent = initials;
        return span;
    }

    /**
     * Logo avatar elementi olusturur (logoid varsa img, yoksa ticker fallback).
     * @param {string} logoid - TradingView logo ID
     * @param {string} ticker - Hisse kodu
     * @returns {HTMLElement} Avatar container div
     */
    function createAvatarElement(logoid, ticker) {
        var avatarDiv = document.createElement('div');
        avatarDiv.className = 'flex-shrink-0 avatar-xs';

        if (logoid) {
            var img = document.createElement('img');
            img.src = '/img/stock-logos/' + encodeURIComponent(logoid);
            img.alt = ticker;
            img.className = 'rounded-circle';
            img.style.width = '32px';
            img.style.height = '32px';
            img.onerror = function () {
                this.parentNode.replaceChild(createTickerAvatar(ticker), this);
            };
            avatarDiv.appendChild(img);
        } else {
            avatarDiv.appendChild(createTickerAvatar(ticker));
        }

        return avatarDiv;
    }

    /**
     * Liste icerigini temizler (DOM ile).
     * @param {HTMLElement} el - Temizlenecek element
     */
    function clearChildren(el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
    }

    /**
     * Para akisi listesini render eder.
     * @param {string} containerId - Liste container ID'si
     * @param {Array} stocks - Hisse verileri
     * @param {boolean} isInflow - Para girisi mi?
     */
    function renderMoneyFlowList(containerId, stocks, isInflow) {
        var list = document.getElementById(containerId);
        if (!list) return;

        clearChildren(list);

        if (!stocks || stocks.length === 0) {
            var emptyLi = document.createElement('li');
            emptyLi.className = 'list-group-item';
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-center text-muted py-3';
            emptyDiv.textContent = 'Veri bulunamadı';
            emptyLi.appendChild(emptyDiv);
            list.appendChild(emptyLi);
            return;
        }

        stocks.forEach(function (stock) {
            var pct = stock.changePercent != null ? stock.changePercent : 0;
            var changePositive = pct >= 0;
            var changeSign = changePositive ? '+' : '';
            var badgeClass = isInflow ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';
            var displayPrice = stock.price != null ? Number(stock.price) : null;

            var li = document.createElement('li');
            li.className = 'list-group-item d-flex align-items-center';

            // Avatar
            var avatarDiv = createAvatarElement(stock.logoid, stock.ticker);

            // Info (ticker + description)
            var infoDiv = document.createElement('div');
            infoDiv.className = 'flex-grow-1 ms-3 overflow-hidden';

            var tickerEl = document.createElement('h6');
            tickerEl.className = 'mb-1';
            tickerEl.textContent = stock.ticker || '--';

            var descEl = document.createElement('p');
            descEl.className = 'text-muted mb-0 fs-13 text-truncate';
            descEl.textContent = stock.description || '';

            infoDiv.appendChild(tickerEl);
            infoDiv.appendChild(descEl);

            // Price + change + turnover
            var rightDiv = document.createElement('div');
            rightDiv.className = 'flex-shrink-0 text-end ms-2';

            var priceEl = document.createElement('h6');
            priceEl.className = 'mb-1';
            priceEl.textContent = displayPrice != null
                ? displayPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' \u20BA'
                : '--';

            var changeEl = document.createElement('span');
            changeEl.className = 'badge ' + badgeClass + ' fs-11';
            changeEl.textContent = changeSign + pct.toFixed(2) + '%';

            var turnoverEl = document.createElement('p');
            turnoverEl.className = 'text-muted mb-0 fs-12';
            turnoverEl.textContent = stock.turnoverFormatted || '';

            rightDiv.appendChild(priceEl);
            rightDiv.appendChild(changeEl);
            rightDiv.appendChild(turnoverEl);

            li.appendChild(avatarDiv);
            li.appendChild(infoDiv);
            li.appendChild(rightDiv);
            list.appendChild(li);
        });
    }

    /**
     * API'den para akisi verisi ceker ve kartlari gunceller.
     */
    function fetchMoneyFlow() {
        if (typeof fetchWithRetry !== 'function') {
            console.warn('[MONEY-FLOW] fetchWithRetry bulunamadı');
            return;
        }

        fetchWithRetry('/ajax/dashboard/money-flow')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data) {
                    renderMoneyFlowList('money-inflow-list', data.inflow, true);
                    renderMoneyFlowList('money-outflow-list', data.outflow, false);
                }
            })
            .catch(function (err) {
                console.error('[MONEY-FLOW] Veri yüklenemedi:', err);
            });
    }

    /**
     * Widget baslatma.
     */
    function init() {
        // Ilk yukleme
        fetchMoneyFlow();

        // 60sn polling
        setInterval(fetchMoneyFlow, REFRESH_INTERVAL);
    }

    // DOMContentLoaded ile baslat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
