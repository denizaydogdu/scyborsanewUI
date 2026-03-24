/**
 * Kripto Para detay sayfasi istemci tarafi mantigi.
 *
 * SSR ile gelen COIN_DATA, BINANCE_SYMBOL ve INITIAL_TECHNICAL uzerinde
 * hero guncelleme, teknik analiz render, candlestick grafik ve
 * piyasa verileri render islemlerini yapar.
 * 2dk detail polling + 1dk technical polling.
 */
(function () {
    'use strict';

    // ── Sabitler ──────────────────────────────────────────
    var DETAIL_REFRESH = 120000; // 2dk
    var TECHNICAL_REFRESH = 60000; // 1dk
    var MAX_ERRORS = 3;

    // ── Durum ─────────────────────────────────────────────
    var coinId = '';
    var binanceSymbol = '';
    var candleChart = null;
    var currentInterval = '1d';
    var currentLimit = 365;
    var consecutiveErrors = 0;

    // ── Formatlama Yardimcilari ──────────────────────────

    /**
     * USD para birimi formatlar. Buyukluge gore ondalik hassasiyet ayarlar.
     * @param {number|null} val - Formatlanacak deger
     * @returns {string} Formatlanmis USD degeri
     */
    function formatUsd(val) {
        if (val == null || isNaN(val)) return '--';
        if (val >= 1000) return '$' + val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (val >= 1) return '$' + val.toFixed(2);
        return '$' + val.toFixed(6);
    }

    /**
     * Buyuk sayilari kisaltilmis formatta gosterir (Trilyon/Milyar/Milyon/Bin).
     * @param {number|null} val - Formatlanacak deger
     * @returns {string} Kisaltilmis USD degeri
     */
    function formatCompact(val) {
        if (val == null || isNaN(val)) return '--';
        if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + ' Trilyon';
        if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + ' Milyar';
        if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + ' Milyon';
        if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + ' Bin';
        return '$' + val.toLocaleString('en-US');
    }

    /**
     * Arz degerlerini kisaltilmis formatta gosterir (para birimi olmadan).
     * @param {number|null} val - Formatlanacak deger
     * @returns {string} Kisaltilmis arz degeri
     */
    function formatSupply(val) {
        if (val == null || isNaN(val)) return '--';
        if (val >= 1e9) return (val / 1e9).toFixed(2) + ' Milyar';
        if (val >= 1e6) return (val / 1e6).toFixed(2) + ' Milyon';
        return val.toLocaleString('en-US');
    }

    /**
     * Yuzde degerini isaret ile formatlar.
     * @param {number|null} val - Formatlanacak yuzde degeri
     * @returns {string} Formatlanmis yuzde
     */
    function formatPercent(val) {
        if (val == null || isNaN(val)) return '--';
        return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
    }

    /**
     * Degere gore renk sinifi dondurur.
     * @param {number|null} val - Kontrol edilecek deger
     * @returns {string} CSS sinif adi
     */
    function colorClass(val) {
        if (val == null || isNaN(val)) return 'text-muted';
        return val >= 0 ? 'text-success' : 'text-danger';
    }

    /**
     * Indikatordegerini formatlar.
     * @param {*} val - Formatlanacak deger
     * @returns {string} Formatlanmis deger
     */
    function formatIndicator(val) {
        if (val == null || isNaN(val)) return '--';
        if (typeof val === 'string') return val;
        return Number(val).toFixed(2);
    }

    // ── Sinyal Mantigi ──────────────────────────────────

    var SIG_AL = {text: 'Al', cls: 'bg-success-subtle text-success'};
    var SIG_SAT = {text: 'Sat', cls: 'bg-danger-subtle text-danger'};
    var SIG_NOTR = {text: 'N\u00f6tr', cls: 'bg-warning-subtle text-warning'};
    var SIG_ASIRI_ALIM = {text: 'A\u015f\u0131r\u0131 Al\u0131m', cls: 'bg-danger-subtle text-danger'};
    var SIG_ASIRI_SATIM = {text: 'A\u015f\u0131r\u0131 Sat\u0131m', cls: 'bg-success-subtle text-success'};

    function sigRsi(v) {
        if (v == null) return null;
        if (v > 70) return SIG_ASIRI_ALIM;
        if (v < 30) return SIG_ASIRI_SATIM;
        return SIG_NOTR;
    }

    function sigStoch(v) {
        if (v == null) return null;
        if (v > 80) return SIG_ASIRI_ALIM;
        if (v < 20) return SIG_ASIRI_SATIM;
        return SIG_NOTR;
    }

    function sigCci(v) {
        if (v == null) return null;
        if (v > 100) return SIG_ASIRI_ALIM;
        if (v < -100) return SIG_ASIRI_SATIM;
        return SIG_NOTR;
    }

    function sigMom(v) {
        if (v == null) return null;
        return v > 0 ? SIG_AL : SIG_SAT;
    }

    function sigWr(v) {
        if (v == null) return null;
        if (v > -20) return SIG_ASIRI_ALIM;
        if (v < -80) return SIG_ASIRI_SATIM;
        return SIG_NOTR;
    }

    function sigMacd(macd, signal) {
        if (macd == null || signal == null) return null;
        return macd > signal ? SIG_AL : SIG_SAT;
    }

    function sigMa(price, ma) {
        if (price == null || ma == null) return null;
        return price > ma ? SIG_AL : SIG_SAT;
    }

    function sigBb(close, upper, lower) {
        if (close == null || upper == null || lower == null) return null;
        if (close > upper) return SIG_ASIRI_ALIM;
        if (close < lower) return SIG_ASIRI_SATIM;
        return SIG_NOTR;
    }

    /**
     * Tum sinyalleri toplayarak genel sinyal hesaplar.
     * @param {Array} signals - Sinyal dizisi
     * @returns {Object} Genel sinyal (text, cls, al, sat, notr)
     */
    function calcAggregate(signals) {
        var al = 0, sat = 0, notr = 0;
        for (var i = 0; i < signals.length; i++) {
            if (!signals[i]) continue;
            var t = signals[i].text;
            if (t === 'Al' || t.indexOf('Sat\u0131m') !== -1) al++;
            else if (t === 'Sat' || t.indexOf('Al\u0131m') !== -1) sat++;
            else notr++;
        }
        var total = al + sat + notr;
        if (total === 0) return {text: 'Veri Yok', cls: 'bg-secondary', al: 0, sat: 0, notr: 0};
        if (al > sat + notr) return {text: 'G\u00fc\u00e7l\u00fc Al', cls: 'bg-success text-white', al: al, sat: sat, notr: notr};
        if (al > sat) return {text: 'Al', cls: 'bg-success-subtle text-success', al: al, sat: sat, notr: notr};
        if (sat > al + notr) return {text: 'G\u00fc\u00e7l\u00fc Sat', cls: 'bg-danger text-white', al: al, sat: sat, notr: notr};
        if (sat > al) return {text: 'Sat', cls: 'bg-danger-subtle text-danger', al: al, sat: sat, notr: notr};
        return {text: 'N\u00f6tr', cls: 'bg-warning-subtle text-warning', al: al, sat: sat, notr: notr};
    }

    // ── Hero Guncelleme ──────────────────────────────────

    /**
     * Hero bolumundeki fiyat, degisim, KPI ve high/low bar'i gunceller.
     * @param {Object} coin - Coin detay verisi
     */
    function updateHero(coin) {
        if (!coin) return;
        var priceEl = document.getElementById('detail-price');
        var changeEl = document.getElementById('detail-change');
        var mcapEl = document.getElementById('detail-mcap');
        var volEl = document.getElementById('detail-volume');
        var supplyEl = document.getElementById('detail-supply');
        var highEl = document.getElementById('detail-high');
        var lowEl = document.getElementById('detail-low');
        var barEl = document.getElementById('detail-highlow-bar');

        if (priceEl) priceEl.textContent = formatUsd(coin.currentPrice);
        if (changeEl) {
            var chg = coin.priceChangePercentage24h;
            changeEl.textContent = formatPercent(chg);
            changeEl.className = 'badge ' + (chg >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger');
        }
        if (mcapEl) mcapEl.textContent = formatCompact(coin.marketCap);
        if (volEl) volEl.textContent = formatCompact(coin.totalVolume);
        if (supplyEl) supplyEl.textContent = formatSupply(coin.circulatingSupply);
        if (highEl) highEl.textContent = formatUsd(coin.high24h);
        if (lowEl) lowEl.textContent = formatUsd(coin.low24h);
        if (barEl && coin.high24h && coin.low24h && coin.currentPrice) {
            var range = coin.high24h - coin.low24h;
            var pct = range > 0 ? ((coin.currentPrice - coin.low24h) / range) * 100 : 50;
            barEl.style.width = Math.max(0, Math.min(100, pct)) + '%';
        }
    }

    // ── Teknik Analiz Render ──────────────────────────────────

    /**
     * Teknik gosterge satirini container'a ekler.
     * @param {HTMLElement} container - Hedef container
     * @param {string} name - Gosterge adi
     * @param {*} value - Gosterge degeri
     * @param {Object|null} signal - Sinyal objesi (text, cls)
     */
    function renderIndicatorRow(container, name, value, signal) {
        var div = document.createElement('div');
        div.className = 'list-group-item d-flex justify-content-between align-items-center py-2';
        var left = document.createElement('div');
        var nameSpan = document.createElement('span');
        nameSpan.className = 'fw-medium fs-13';
        nameSpan.textContent = name;
        var valSpan = document.createElement('span');
        valSpan.className = 'text-muted ms-2 fs-12';
        valSpan.textContent = formatIndicator(value);
        left.appendChild(nameSpan);
        left.appendChild(valSpan);
        div.appendChild(left);
        if (signal) {
            var badge = document.createElement('span');
            badge.className = 'badge ' + signal.cls;
            badge.textContent = signal.text;
            div.appendChild(badge);
        }
        container.appendChild(div);
    }

    /**
     * Teknik analiz verilerini 4 kart + aggregate sinyal olarak render eder.
     * @param {Object} data - Teknik analiz verileri
     */
    function renderTechnical(data) {
        if (!data || Object.keys(data).length === 0) return;
        var close = Number(data['close']) || null;
        var allSignals = [];

        // Momentum
        var momContainer = document.getElementById('momentum-indicators');
        if (momContainer) {
            momContainer.textContent = '';
            var indicators = [
                {name: 'RSI(14)', val: data['RSI'], sig: sigRsi(data['RSI'])},
                {name: 'Stochastic K(14)', val: data['Stoch.K'], sig: sigStoch(data['Stoch.K'])},
                {name: 'CCI(20)', val: data['CCI20'], sig: sigCci(data['CCI20'])},
                {name: 'Momentum(10)', val: data['Mom'], sig: sigMom(data['Mom'])},
                {name: 'ROC(10)', val: data['ROC'], sig: sigMom(data['ROC'])},
                {name: 'Williams %R(14)', val: data['W.R'], sig: sigWr(data['W.R'])}
            ];
            for (var i = 0; i < indicators.length; i++) {
                renderIndicatorRow(momContainer, indicators[i].name, indicators[i].val, indicators[i].sig);
                allSignals.push(indicators[i].sig);
            }
        }

        // Trend
        var trendContainer = document.getElementById('trend-indicators');
        if (trendContainer) {
            trendContainer.textContent = '';
            var trendInds = [
                {name: 'ADX(14)', val: data['ADX'], sig: data['ADX'] != null ? (data['ADX'] > 25 ? {text: 'G\u00fc\u00e7l\u00fc', cls: 'bg-info-subtle text-info'} : {text: 'Zay\u0131f', cls: 'bg-warning-subtle text-warning'}) : null},
                {name: 'MACD', val: data['MACD.macd'], sig: sigMacd(data['MACD.macd'], data['MACD.signal'])},
                {name: 'Parabolic SAR', val: data['P.SAR'], sig: close != null && data['P.SAR'] != null ? (close > data['P.SAR'] ? SIG_AL : SIG_SAT) : null},
                {name: 'Aroon', val: data['Aroon.Up'], sig: data['Aroon.Up'] != null && data['Aroon.Down'] != null ? (data['Aroon.Up'] > data['Aroon.Down'] ? SIG_AL : SIG_SAT) : null},
                {name: '+DI / -DI', val: data['ADX+DI'], sig: data['ADX+DI'] != null && data['ADX-DI'] != null ? (data['ADX+DI'] > data['ADX-DI'] ? SIG_AL : SIG_SAT) : null}
            ];
            for (var j = 0; j < trendInds.length; j++) {
                renderIndicatorRow(trendContainer, trendInds[j].name, trendInds[j].val, trendInds[j].sig);
                allSignals.push(trendInds[j].sig);
            }
        }

        // Volatilite
        var volContainer = document.getElementById('volatility-indicators');
        if (volContainer) {
            volContainer.textContent = '';
            var volInds = [
                {name: 'ATR(14)', val: data['ATR'], sig: null},
                {name: 'Bollinger Bands', val: data['BB.basis'], sig: sigBb(close, data['BB.upper'], data['BB.lower'])},
                {name: 'BB Power', val: data['BBPower'], sig: data['BBPower'] != null ? sigMom(data['BBPower']) : null},
                {name: 'Stoch RSI K', val: data['Stoch.RSI.K'], sig: sigStoch(data['Stoch.RSI.K'])}
            ];
            for (var k = 0; k < volInds.length; k++) {
                renderIndicatorRow(volContainer, volInds[k].name, volInds[k].val, volInds[k].sig);
                allSignals.push(volInds[k].sig);
            }
        }

        // Hareketli Ortalamalar
        var maBody = document.getElementById('ma-table-body');
        if (maBody) {
            maBody.textContent = '';
            var periods = [5, 10, 20, 50, 200];
            for (var m = 0; m < periods.length; m++) {
                var p = periods[m];
                var emaKey = 'EMA' + p;
                var smaKey = 'SMA' + p;
                var emaVal = data[emaKey];
                var smaVal = data[smaKey];
                var emaSig = sigMa(close, emaVal);
                var smaSig = sigMa(close, smaVal);
                allSignals.push(emaSig);
                allSignals.push(smaSig);

                var tr = document.createElement('tr');
                var tdP = document.createElement('td');
                tdP.className = 'fw-medium';
                tdP.textContent = p;
                tr.appendChild(tdP);

                var tdEma = document.createElement('td');
                tdEma.textContent = formatIndicator(emaVal);
                tr.appendChild(tdEma);

                var tdEmaSig = document.createElement('td');
                if (emaSig) {
                    var b1 = document.createElement('span');
                    b1.className = 'badge ' + emaSig.cls;
                    b1.textContent = emaSig.text;
                    tdEmaSig.appendChild(b1);
                }
                tr.appendChild(tdEmaSig);

                var tdSma = document.createElement('td');
                tdSma.textContent = formatIndicator(smaVal);
                tr.appendChild(tdSma);

                var tdSmaSig = document.createElement('td');
                if (smaSig) {
                    var b2 = document.createElement('span');
                    b2.className = 'badge ' + smaSig.cls;
                    b2.textContent = smaSig.text;
                    tdSmaSig.appendChild(b2);
                }
                tr.appendChild(tdSmaSig);

                maBody.appendChild(tr);
            }
        }

        // Aggregate sinyal
        var agg = calcAggregate(allSignals);
        var aggEl = document.getElementById('aggregate-signal');
        var countsEl = document.getElementById('aggregate-counts');
        if (aggEl) {
            aggEl.textContent = agg.text;
            aggEl.className = 'badge fs-14 px-4 py-2 ' + agg.cls;
        }
        if (countsEl) countsEl.textContent = agg.al + ' Al \u2022 ' + agg.sat + ' Sat \u2022 ' + agg.notr + ' N\u00f6tr';
    }

    // ── Piyasa Verileri Render ──────────────────────────────────

    /**
     * ATH/ATL, arz bilgisi ve fiyat degisim tablosunu render eder.
     * @param {Object} coin - Coin detay verisi
     */
    function renderMarketData(coin) {
        if (!coin) return;

        // ATH / ATL
        var athAtlEl = document.getElementById('ath-atl-content');
        if (athAtlEl) {
            athAtlEl.textContent = '';

            // ATH
            var athDiv = document.createElement('div');
            athDiv.className = 'mb-3';
            var athLabel = document.createElement('div');
            athLabel.className = 'd-flex justify-content-between';
            var athL = document.createElement('span');
            athL.className = 'text-muted';
            athL.textContent = 'ATH (T\u00fcm Zamanlar\u0131n En Y\u00fckse\u011fi)';
            var athV = document.createElement('span');
            athV.className = 'fw-medium';
            athV.textContent = formatUsd(coin.ath);
            athLabel.appendChild(athL);
            athLabel.appendChild(athV);
            athDiv.appendChild(athLabel);
            if (coin.athDate) {
                var athDate = document.createElement('small');
                athDate.className = 'text-muted';
                athDate.textContent = coin.athDate.substring(0, 10);
                athDiv.appendChild(athDate);
            }
            if (coin.athChangePercentage != null) {
                var athChg = document.createElement('span');
                athChg.className = 'ms-2 badge ' + (coin.athChangePercentage >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger');
                athChg.textContent = formatPercent(coin.athChangePercentage);
                athDiv.appendChild(athChg);
            }
            athAtlEl.appendChild(athDiv);

            // ATL
            var atlDiv = document.createElement('div');
            var atlLabel = document.createElement('div');
            atlLabel.className = 'd-flex justify-content-between';
            var atlL = document.createElement('span');
            atlL.className = 'text-muted';
            atlL.textContent = 'ATL (T\u00fcm Zamanlar\u0131n En D\u00fc\u015f\u00fc\u011f\u00fc)';
            var atlV = document.createElement('span');
            atlV.className = 'fw-medium';
            atlV.textContent = formatUsd(coin.atl);
            atlLabel.appendChild(atlL);
            atlLabel.appendChild(atlV);
            atlDiv.appendChild(atlLabel);
            if (coin.atlDate) {
                var atlDate = document.createElement('small');
                atlDate.className = 'text-muted';
                atlDate.textContent = coin.atlDate.substring(0, 10);
                atlDiv.appendChild(atlDate);
            }
            if (coin.atlChangePercentage != null) {
                var atlChg = document.createElement('span');
                atlChg.className = 'ms-2 badge bg-success-subtle text-success';
                atlChg.textContent = formatPercent(coin.atlChangePercentage);
                atlDiv.appendChild(atlChg);
            }
            athAtlEl.appendChild(atlDiv);
        }

        // Arz Bilgisi
        var supplyEl = document.getElementById('supply-content');
        if (supplyEl) {
            supplyEl.textContent = '';
            var items = [
                {label: 'Dola\u015f\u0131mdaki Arz', val: formatSupply(coin.circulatingSupply)},
                {label: 'Toplam Arz', val: formatSupply(coin.totalSupply)},
                {label: 'Maksimum Arz', val: coin.maxSupply ? formatSupply(coin.maxSupply) : 'S\u0131n\u0131r Yok'},
                {label: 'FDV', val: formatCompact(coin.fullyDilutedValuation)}
            ];
            for (var s = 0; s < items.length; s++) {
                var row = document.createElement('div');
                row.className = 'd-flex justify-content-between py-2' + (s < items.length - 1 ? ' border-bottom' : '');
                var lbl = document.createElement('span');
                lbl.className = 'text-muted';
                lbl.textContent = items[s].label;
                var val = document.createElement('span');
                val.className = 'fw-medium';
                val.textContent = items[s].val;
                row.appendChild(lbl);
                row.appendChild(val);
                supplyEl.appendChild(row);
            }
        }

        // Fiyat Degisimleri
        var changes = [
            {id: 'change-24h', val: coin.priceChangePercentage24h},
            {id: 'change-7d', val: coin.priceChangePercentage7d},
            {id: 'change-30d', val: coin.priceChangePercentage30d},
            {id: 'change-1y', val: coin.priceChangePercentage1y}
        ];
        for (var c = 0; c < changes.length; c++) {
            var el = document.getElementById(changes[c].id);
            if (el) {
                el.textContent = formatPercent(changes[c].val);
                el.className = colorClass(changes[c].val);
            }
        }
    }

    // ── Candlestick Grafik ──────────────────────────────────

    /**
     * OHLCV verisini AJAX ile ceker ve grafigi olusturur/gunceller.
     * @param {string} interval - Zaman araligi (1h, 4h, 1d)
     * @param {number} limit - Veri miktari
     */
    function loadChart(interval, limit) {
        var loadingEl = document.getElementById('crypto-chart-loading');
        if (loadingEl) loadingEl.style.display = '';

        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/ajax/kripto/ohlcv?symbol=' + encodeURIComponent(binanceSymbol) + '&interval=' + interval + '&limit=' + limit, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 15000;
        xhr.onload = function () {
            if (loadingEl) loadingEl.style.display = 'none';
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data && data.length > 0) {
                        var series = data.map(function (d) {
                            return {x: (d.time || 0) * 1000, y: [d.open, d.high, d.low, d.close]};
                        });
                        if (candleChart) {
                            candleChart.updateSeries([{data: series}]);
                        } else {
                            initCandleChart(series);
                        }
                    }
                } catch (e) { /* silent */ }
            }
        };
        xhr.onerror = xhr.ontimeout = function () {
            if (loadingEl) loadingEl.style.display = 'none';
        };
        xhr.send();
    }

    /**
     * ApexCharts candlestick grafigini baslatir.
     * @param {Array} seriesData - OHLCV seri verisi
     */
    function initCandleChart(seriesData) {
        var container = document.getElementById('crypto-chart-container');
        if (!container || typeof ApexCharts === 'undefined') return;
        var loadingEl = document.getElementById('crypto-chart-loading');
        if (loadingEl) loadingEl.style.display = 'none';

        candleChart = new ApexCharts(container, {
            series: [{name: binanceSymbol, data: seriesData}],
            chart: {
                type: 'candlestick',
                height: 400,
                toolbar: {show: true},
                animations: {enabled: false},
                background: 'transparent'
            },
            xaxis: {
                type: 'datetime',
                labels: {datetimeUTC: false}
            },
            yaxis: {
                tooltip: {enabled: true},
                labels: {
                    formatter: function (v) {
                        return formatUsd(v);
                    }
                }
            },
            plotOptions: {
                candlestick: {
                    colors: {upward: '#0ab39c', downward: '#f06548'},
                    wick: {useFillColor: true}
                }
            },
            grid: {borderColor: '#e9ebec', strokeDashArray: 3},
            tooltip: {enabled: true}
        });
        candleChart.render();
    }

    // ── Periyot Butonlari ──────────────────────────────────

    /**
     * Grafik periyot butonlarini dinler ve tiklamada grafigi yeniden yukler.
     */
    function bindPeriodButtons() {
        var selector = document.getElementById('chartPeriodSelector');
        if (!selector) return;
        selector.addEventListener('click', function (e) {
            var btn = e.target.closest('button[data-interval]');
            if (!btn) return;
            selector.querySelectorAll('button').forEach(function (b) {
                b.classList.remove('btn-primary', 'active');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary', 'active');
            currentInterval = btn.getAttribute('data-interval');
            currentLimit = parseInt(btn.getAttribute('data-limit') || '200');
            loadChart(currentInterval, currentLimit);
        });
    }

    // ── Polling ──────────────────────────────────

    /**
     * Coin detay verisini AJAX ile ceker ve hero + piyasa verilerini gunceller.
     */
    function fetchDetail() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/ajax/kripto/' + encodeURIComponent(coinId) + '/detail', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 15000;
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    updateHero(data);
                    renderMarketData(data);
                    consecutiveErrors = 0;
                } catch (e) {
                    consecutiveErrors++;
                }
            } else {
                consecutiveErrors++;
            }
        };
        xhr.onerror = xhr.ontimeout = function () {
            consecutiveErrors++;
        };
        xhr.send();
    }

    /**
     * Teknik analiz verisini AJAX ile ceker ve render eder.
     */
    function fetchTechnical() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/ajax/kripto/' + encodeURIComponent(coinId) + '/technical', true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 10000;
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    renderTechnical(JSON.parse(xhr.responseText));
                } catch (e) { consecutiveErrors++; }
            } else {
                consecutiveErrors++;
            }
        };
        xhr.onerror = xhr.ontimeout = function () { consecutiveErrors++; };
        xhr.send();
    }

    // ── Baslangic ──────────────────────────────────

    /**
     * Sayfa yuklendiginde tum bilesenleri baslatir.
     */
    function init() {
        coinId = window.COIN_DATA ? window.COIN_DATA.id || '' : '';
        binanceSymbol = window.BINANCE_SYMBOL || '';

        if (window.COIN_DATA) {
            updateHero(window.COIN_DATA);
            renderMarketData(window.COIN_DATA);
        }
        if (window.INITIAL_TECHNICAL) {
            renderTechnical(window.INITIAL_TECHNICAL);
        }

        bindPeriodButtons();
        if (binanceSymbol) {
            loadChart(currentInterval, currentLimit);
        } else {
            var loadingEl = document.getElementById('crypto-chart-loading');
            if (loadingEl) {
                loadingEl.textContent = '';
                var msg = document.createElement('p');
                msg.className = 'text-muted mb-0';
                msg.textContent = 'Grafik verisi mevcut de\u011fil';
                loadingEl.appendChild(msg);
            }
        }

        // Polling baslat (error backoff: MAX_ERRORS asildiysa polling durur)
        setInterval(function () {
            if (consecutiveErrors < MAX_ERRORS && coinId) fetchDetail();
        }, DETAIL_REFRESH);
        setInterval(function () {
            if (consecutiveErrors < MAX_ERRORS && coinId) fetchTechnical();
        }, TECHNICAL_REFRESH);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
