/**
 * Hisse Detay Sayfa Grafik Modülü
 *
 * <p>LightweightCharts v4.1.3 ile candlestick + volume histogram grafiği oluşturur.
 * scyborsaApi'ye STOMP WebSocket bağlantısı kurar, STOMP yoksa REST fallback kullanır.
 * Periyot değişikliği, real-time bar güncellemesi ve canlı fiyat güncellemesi sağlar.</p>
 */
(function() {
    'use strict';

    // ─── Config ─────────────────────────────────────────
    var _cfg = window.CHART_CONFIG || {};
    var SYMBOL = _cfg.symbol || window.STOCK_CHART_SYMBOL || 'THYAO';
    var API_BASE = _cfg.apiBase || ((typeof window.STOCK_CHART_API_BASE === 'string') ? window.STOCK_CHART_API_BASE : 'http://localhost:8081');
    var ASSET_TYPE = _cfg.assetType || 'STOCK';
    var CURRENCY = _cfg.currency || 'TL';
    var CURRENCY_PREFIX = _cfg.currencyPrefix || false;
    var WS_ENABLED = _cfg.wsEnabled !== false;
    var BINANCE_SYMBOL = _cfg.binanceSymbol || '';
    var WS_URL = API_BASE + '/ws';

    console.log('[CHART] ===== Modül yüklendi =====');
    console.log('[CHART] Config → SYMBOL=' + SYMBOL + ', API_BASE=' + API_BASE + ', WS_URL=' + WS_URL);
    console.log('[CHART] window.STOCK_CHART_SYMBOL=' + window.STOCK_CHART_SYMBOL);
    console.log('[CHART] window.STOCK_CHART_API_BASE=' + window.STOCK_CHART_API_BASE);

    // ─── State ──────────────────────────────────────────
    var currentPeriod = 'D';
    var chart = null;
    var candleSeries = null;
    var volumeSeries = null;
    var stompClient = null;
    var stompConnected = false;
    var restFallbackFired = false;  // C1/C2: REST fallback tetiklendi mi — race guard
    var currentBarSubscription = null;
    var currentBarTopic = null;
    var priceSubscription = null;
    var loadRequestId = 0;
    var lastKnownChp = null;   // Price stream'den gelen doğru günlük değişim %
    var prevTickPrice = null;  // Önceki fiyat — flash rengi için karşılaştırma
    var resizeObserver = null; // I1: Cleanup için referans
    var overlayFlashTimer = null; // I2: Flash timer stacking önleme
    var heroFlashTimer = null;    // I2: Hero flash timer stacking önleme

    // ─── Tema Renkleri (Velzon Light) ───────────────────
    // I5: Modül scope'da tek seferlik cache — her bar update'te yeni obje oluşturmaz
    var themeColors = {
        bg: '#ffffff',
        grid: '#f3f3f9',
        text: '#495057',
        border: '#e9ebec',
        green: '#0ab39c',
        red: '#f06548',
        greenAlpha: 'rgba(10,179,156,0.5)',
        redAlpha: 'rgba(240,101,72,0.5)'
    };

    // ─── Fiyat Overlay Oluşturma ────────────────────────
    function createPriceOverlay() {
        console.log('[CHART] ▶ createPriceOverlay() çağrıldı');
        var container = document.getElementById('chartContainer');
        if (!container) {
            console.error('[CHART] createPriceOverlay: #chartContainer bulunamadı');
            return;
        }

        var overlay = document.createElement('div');
        overlay.id = 'chartPriceOverlay';
        overlay.style.cssText = 'position:absolute; top:8px; left:12px; z-index:5; display:flex; ' +
            'align-items:center; gap:8px; padding:4px 12px; border-radius:6px; ' +
            'font-family:inherit; background:rgba(255,255,255,0.92); ' +
            'box-shadow:0 1px 3px rgba(0,0,0,0.08); transition:background 0.4s ease;';

        var priceSpan = document.createElement('span');
        priceSpan.id = 'chartLivePrice';
        priceSpan.style.cssText = 'font-size:15px; font-weight:600; color:#495057;';

        var changeSpan = document.createElement('span');
        changeSpan.id = 'chartLiveChange';
        changeSpan.style.cssText = 'font-size:12px; font-weight:600; padding:2px 6px; border-radius:4px;';

        overlay.appendChild(priceSpan);
        overlay.appendChild(changeSpan);
        container.appendChild(overlay);
        console.log('[CHART] ✓ Price overlay oluşturuldu (DOM API)');

        // Hero header'dan başlangıç değerlerini oku
        var heroPrice = document.getElementById('heroPrice');
        var heroPercent = document.getElementById('heroChangePercent');
        if (heroPrice && heroPercent) {
            var priceText = heroPrice.textContent.trim();
            var percentText = heroPercent.textContent.trim();
            priceSpan.textContent = priceText;
            changeSpan.textContent = percentText;

            var isPositive = !percentText.startsWith('%-');
            changeSpan.style.background = isPositive ? 'rgba(10,179,156,0.12)' : 'rgba(240,101,72,0.12)';
            changeSpan.style.color = isPositive ? '#0ab39c' : '#f06548';
            console.log('[CHART] Overlay başlangıç: ' + priceText + ' ' + percentText);
        } else {
            console.warn('[CHART] Hero header bulunamadı: heroPrice=' + !!heroPrice + ', heroPercent=' + !!heroPercent);
        }
    }

    function updateOverlayPrice(price, changePercent) {
        var priceEl = document.getElementById('chartLivePrice');
        var changeEl = document.getElementById('chartLiveChange');
        if (!priceEl) {
            console.log('[CHART] updateOverlayPrice: #chartLivePrice bulunamadı');
            return;
        }

        if (CURRENCY_PREFIX) {
            priceEl.textContent = '$' + price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: price >= 1 ? 2 : 6});
        } else {
            priceEl.textContent = price.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' TL';
        }

        if (changeEl && changePercent != null) {
            var isPositive = changePercent >= 0;
            var sign = isPositive ? '+' : '';
            changeEl.textContent = '%' + sign + changePercent.toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            changeEl.style.background = isPositive ? 'rgba(10,179,156,0.12)' : 'rgba(240,101,72,0.12)';
            changeEl.style.color = isPositive ? '#0ab39c' : '#f06548';
        }

        console.log('[CHART] Overlay güncellendi: ' + price + ' TL, %' + (changePercent != null ? changePercent.toFixed(2) : 'N/A'));
    }

    function flashOverlay(tickUp) {
        var overlay = document.getElementById('chartPriceOverlay');
        if (!overlay) return;
        // I2: Önceki timer'ı temizle — hızlı tick'lerde stacking önlenir
        if (overlayFlashTimer) clearTimeout(overlayFlashTimer);
        // 1) Parlak flash — tick bazlı (geçici)
        overlay.style.background = tickUp ? 'rgba(10,179,156,0.35)' : 'rgba(240,101,72,0.35)';
        // 2) Sonra kalıcı renk — chp bazlı (gün pozitif/negatif)
        overlayFlashTimer = setTimeout(function() {
            var dayPositive = lastKnownChp == null || lastKnownChp >= 0;
            overlay.style.background = dayPositive ? 'rgba(10,179,156,0.12)' : 'rgba(240,101,72,0.12)';
        }, 500);
    }

    // ─── Grafik Oluşturma ───────────────────────────────
    function createChart(containerId) {
        console.log('[CHART] ▶ createChart() çağrıldı: containerId=' + containerId);
        var container = document.getElementById(containerId);
        if (!container) {
            console.error('[CHART] createChart() → container bulunamadı: #' + containerId);
            return;
        }
        console.log('[CHART] createChart() → container boyut: ' + container.clientWidth + 'x' + container.clientHeight);
        var colors = themeColors;

        chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: { color: colors.bg },
                textColor: colors.text
            },
            grid: {
                vertLines: { color: colors.grid },
                horzLines: { color: colors.grid }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal
            },
            rightPriceScale: {
                borderColor: colors.border
            },
            timeScale: {
                borderColor: colors.border,
                timeVisible: true,
                secondsVisible: false
            }
        });
        console.log('[CHART] createChart() → LightweightCharts.createChart OK');

        candleSeries = chart.addCandlestickSeries({
            upColor: colors.green,
            downColor: colors.red,
            borderDownColor: colors.red,
            borderUpColor: colors.green,
            wickDownColor: colors.red,
            wickUpColor: colors.green
        });
        console.log('[CHART] createChart() → candleSeries oluşturuldu');

        volumeSeries = chart.addHistogramSeries({
            color: colors.green,
            priceFormat: { type: 'volume' },
            priceScaleId: ''
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 }
        });
        console.log('[CHART] createChart() → volumeSeries oluşturuldu');

        // I1: Referans sakla — cleanup'ta disconnect edilecek
        resizeObserver = new ResizeObserver(function(entries) {
            if (entries.length > 0) {
                var cr = entries[0].contentRect;
                chart.applyOptions({ width: cr.width });
                console.log('[CHART] ResizeObserver → width=' + cr.width);
            }
        });
        resizeObserver.observe(container);

        console.log('[CHART] ✓ createChart() tamamlandı');
    }

    // ─── Veri Dönüşümü ─────────────────────────────────
    function volumeColor(open, close) {
        var colors = themeColors;
        return close >= open ? colors.greenAlpha : colors.redAlpha;
    }

    function mapBarsToSeries(bars) {
        console.log('[CHART] mapBarsToSeries() → ' + bars.length + ' bar dönüştürülüyor');
        var candles = [];
        var volumes = [];
        bars.forEach(function(bar, idx) {
            // TradingView timestamp zaten Unix saniye — /1000 YAPMA
            // Crypto response'da timestamp 'time' key'inde olabilir
            var timeSec = bar.timestamp || bar.time || 0;
            candles.push({
                time: timeSec,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close
            });
            volumes.push({
                time: timeSec,
                value: bar.volume,
                color: volumeColor(bar.open, bar.close)
            });
            // İlk ve son bar'ı logla (raw timestamp + ISO date)
            if (idx === 0) {
                console.log('[CHART] mapBars → ilk bar: rawTs=' + bar.timestamp + ', time=' + timeSec + ', date=' + new Date(timeSec * 1000).toISOString() + ', O=' + bar.open + ', H=' + bar.high + ', L=' + bar.low + ', C=' + bar.close + ', V=' + bar.volume);
            }
            if (idx === bars.length - 1) {
                console.log('[CHART] mapBars → son bar: rawTs=' + bar.timestamp + ', time=' + timeSec + ', date=' + new Date(timeSec * 1000).toISOString() + ', O=' + bar.open + ', H=' + bar.high + ', L=' + bar.low + ', C=' + bar.close + ', V=' + bar.volume);
            }
        });
        console.log('[CHART] mapBarsToSeries() → ' + candles.length + ' candle + ' + volumes.length + ' volume hazır');
        return { candles: candles, volumes: volumes };
    }

    // ─── REST Bar Yükleme (Fallback) ───────────────────
    function loadBars(period) {
        currentPeriod = period;
        var requestId = ++loadRequestId;

        var url;
        if (ASSET_TYPE === 'CRYPTO') {
            // Crypto: vApi üzerinden Binance OHLCV
            var interval = period;
            var limit = 200;
            // Period → interval mapping
            if (period === 'D' || period === '1d') { interval = '1d'; limit = 365; }
            else if (period === 'W') { interval = '1w'; limit = 52; }
            else if (period === '15') { interval = '15m'; limit = 200; }
            else if (period === '30') { interval = '30m'; limit = 200; }
            else if (period === '60' || period === '1h') { interval = '1h'; limit = 200; }
            else if (period === '240' || period === '4h') { interval = '4h'; limit = 200; }
            url = '/ajax/kripto/ohlcv?symbol=' + encodeURIComponent(BINANCE_SYMBOL) + '&interval=' + interval + '&limit=' + limit;
        } else {
            url = API_BASE + '/api/v1/chart/' + encodeURIComponent(SYMBOL)
                    + '?period=' + encodeURIComponent(period) + '&bars=300';
        }

        console.log('[CHART] ▶ REST loadBars() başladı: requestId=' + requestId + ', period=' + period);
        console.log('[CHART] REST URL: ' + url);

        fetch(url)
            .then(function(r) {
                console.log('[CHART] REST response: status=' + r.status + ', ok=' + r.ok + ', requestId=' + requestId);
                if (r.status === 204) {
                    console.log('[CHART] REST 204 No Content');
                    return null;
                }
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(data) {
                if (requestId !== loadRequestId) {
                    console.warn('[CHART] REST stale requestId: ' + requestId + ' !== ' + loadRequestId + ', skip');
                    return;
                }
                if (!data) {
                    console.warn('[CHART] REST null data');
                    candleSeries.setData([]);
                    volumeSeries.setData([]);
                    hideLoading();
                    return;
                }
                // Crypto: bare JSON array, Stock: {bars: [...]}
                var bars = Array.isArray(data) ? data : (data.bars || []);
                console.log('[CHART] REST data alındı: bars=' + bars.length + ', assetType=' + ASSET_TYPE);
                if (!bars || bars.length === 0) {
                    candleSeries.setData([]);
                    volumeSeries.setData([]);
                    hideLoading();
                    console.warn('[CHART] REST boş bars dizisi');
                    return;
                }

                var mapped = mapBarsToSeries(bars);
                candleSeries.setData(mapped.candles);
                volumeSeries.setData(mapped.volumes);
                chart.timeScale().fitContent();
                hideLoading();

                // Overlay fiyatı güncelle (% sadece price stream'den gelir)
                if (bars.length > 0) {
                    var lastBar = bars[bars.length - 1];
                    updateOverlayPrice(lastBar.close, lastKnownChp);
                    flashOverlay(lastKnownChp == null || lastKnownChp >= 0);  // initial: chp bazlı
                }

                console.log('[CHART] ✓ REST yüklendi: ' + mapped.candles.length + ' mum, period=' + period);
            })
            .catch(function(err) {
                if (requestId !== loadRequestId) {
                    console.warn('[CHART] REST error stale requestId, skip');
                    return;
                }
                console.error('[CHART] ✗ REST bar yükleme hatası:', err);
                console.error('[CHART] REST hata detay: message=' + err.message);
                hideLoading();
            });
    }

    function hideLoading() {
        var el = document.getElementById('chartLoading');
        if (el) {
            el.style.display = 'none';
            console.log('[CHART] hideLoading() → spinner gizlendi');
        } else {
            console.log('[CHART] hideLoading() → #chartLoading bulunamadı');
        }
    }

    // ─── STOMP WebSocket Bağlantısı ─────────────────────
    function connectStomp() {
        if (!WS_ENABLED) { console.log('[CHART] WS devre dışı → REST fallback'); loadBars(currentPeriod); return; }
        console.log('[CHART] ▶ connectStomp() başladı');
        console.log('[CHART] STOMP WS_URL: ' + WS_URL);
        console.log('[CHART] STOMP state → stompConnected=' + stompConnected + ', stompClient=' + (stompClient ? 'var' : 'null'));
        try {
            stompClient = new StompJs.Client({
                webSocketFactory: function() {
                    console.log('[CHART] STOMP webSocketFactory → new SockJS(' + WS_URL + ')');
                    return new SockJS(WS_URL);
                },
                reconnectDelay: 5000,
                debug: function(msg) {
                    if (msg.indexOf('CONNECTED') !== -1 || msg.indexOf('ERROR') !== -1 ||
                        msg.indexOf('DISCONNECT') !== -1 || msg.indexOf('MESSAGE') !== -1) {
                        console.log('[CHART] STOMP debug: ' + msg.substring(0, 200));
                    }
                }
            });
            console.log('[CHART] StompJs.Client oluşturuldu');

            stompClient.onConnect = function(frame) {
                console.log('[CHART] ═══ STOMP onConnect ═══');
                console.log('[CHART] STOMP frame:', frame);
                stompConnected = true;
                console.log('[CHART] stompConnected = true, restFallbackFired=' + restFallbackFired);

                // C1: REST fallback zaten veri yüklediyse, STOMP sadece live update için abone ol
                // Initial data tekrar istenmez — race condition önlenir
                if (restFallbackFired) {
                    console.log('[CHART] REST fallback zaten yükledi → sadece price subscription');
                    subscribeToPriceUpdates();
                    // Bar topic'e de abone ol ama initial tekrar isteme
                    var topic = '/topic/bars/' + SYMBOL + '/' + currentPeriod;
                    subscribeToBarUpdates(topic);
                    console.log('[CHART] ═══ STOMP onConnect (REST-after) tamamlandı ═══');
                    return;
                }

                currentBarSubscription = null;
                currentBarTopic = null;
                priceSubscription = null;
                console.log('[CHART] Subscription state temizlendi');

                console.log('[CHART] sendSubscribeMessage(' + currentPeriod + ') çağrılıyor...');
                sendSubscribeMessage(currentPeriod);

                console.log('[CHART] subscribeToPriceUpdates() çağrılıyor...');
                subscribeToPriceUpdates();

                console.log('[CHART] ═══ STOMP onConnect tamamlandı ═══');
            };

            stompClient.onDisconnect = function(frame) {
                console.warn('[CHART] ═══ STOMP onDisconnect ═══');
                console.warn('[CHART] STOMP disconnect frame:', frame);
                stompConnected = false;
            };

            stompClient.onStompError = function(frame) {
                console.error('[CHART] ═══ STOMP onStompError ═══');
                console.error('[CHART] STOMP error headers:', JSON.stringify(frame.headers));
                console.error('[CHART] STOMP error body:', frame.body);
            };

            stompClient.onWebSocketError = function(event) {
                console.error('[CHART] ═══ STOMP onWebSocketError ═══');
                console.error('[CHART] WebSocket error event:', event);
            };

            stompClient.onWebSocketClose = function(event) {
                console.warn('[CHART] ═══ STOMP onWebSocketClose ═══');
                console.warn('[CHART] WebSocket close: code=' + event.code + ', reason=' + event.reason + ', wasClean=' + event.wasClean);
                stompConnected = false;
            };

            console.log('[CHART] stompClient.activate() çağrılıyor...');
            stompClient.activate();
            console.log('[CHART] stompClient.activate() çağrıldı (async bağlantı başladı)');
        } catch (e) {
            console.error('[CHART] ✗ connectStomp() exception:', e);
            console.error('[CHART] Exception stack:', e.stack || 'yok');
        }
    }

    // ─── Abonelik Yönetimi ──────────────────────────────
    function sendSubscribeMessage(period) {
        console.log('[CHART] ▶ sendSubscribeMessage(' + period + ') çağrıldı');
        console.log('[CHART] STOMP durumu → client=' + (stompClient ? 'var' : 'null') + ', connected=' + (stompClient ? stompClient.connected : 'N/A'));

        if (!stompClient || !stompClient.connected) {
            console.warn('[CHART] sendSubscribeMessage: STOMP bağlı değil, çıkılıyor');
            return;
        }

        var payload = { symbol: SYMBOL, period: period, bars: 300 };
        console.log('[CHART] STOMP publish → destination=/app/chart/subscribe, body=' + JSON.stringify(payload));

        stompClient.publish({
            destination: '/app/chart/subscribe',
            body: JSON.stringify(payload)
        });
        console.log('[CHART] STOMP publish OK');

        var topic = '/topic/bars/' + SYMBOL + '/' + period;
        console.log('[CHART] subscribeToBarUpdates(' + topic + ') çağrılıyor...');
        subscribeToBarUpdates(topic);
    }

    function subscribeToBarUpdates(topic) {
        console.log('[CHART] ▶ subscribeToBarUpdates(' + topic + ')');
        console.log('[CHART] Mevcut subscription → topic=' + currentBarTopic + ', sub=' + (currentBarSubscription ? 'var' : 'null'));

        if (currentBarTopic === topic && currentBarSubscription) {
            console.log('[CHART] Aynı topic, skip');
            return;
        }

        if (currentBarSubscription) {
            console.log('[CHART] Eski subscription unsubscribe ediliyor: ' + currentBarTopic);
            currentBarSubscription.unsubscribe();
            currentBarSubscription = null;
            currentBarTopic = null;
        }

        console.log('[CHART] stompClient.subscribe(' + topic + ') başlatılıyor...');
        currentBarSubscription = stompClient.subscribe(topic, function(message) {
            console.log('[CHART] ═══ STOMP BAR MESAJ GELDİ ═══');
            console.log('[CHART] Topic: ' + topic);
            console.log('[CHART] Raw body length: ' + message.body.length + ' bytes');
            console.log('[CHART] Headers:', JSON.stringify(message.headers));
            try {
                var data = JSON.parse(message.body);
                console.log('[CHART] Parsed → type=' + data.type + ', symbol=' + data.symbol + ', bars=' + (data.bars ? data.bars.length : 'null'));

                // Seans kapanış mesajı — badge göster, veri güncelleme yapma
                if (data.type === 'session_closed') {
                    showMarketClosedBadge();
                    console.log('[CHART] session_closed mesajı alındı');
                    return;
                }

                if (!data.bars || data.bars.length === 0) {
                    console.warn('[CHART] STOMP mesaj: boş bars, type=' + data.type);
                    return;
                }

                if (data.type === 'initial') {
                    console.log('[CHART] STOMP initial load: ' + data.bars.length + ' bar');
                    var mapped = mapBarsToSeries(data.bars);
                    candleSeries.setData(mapped.candles);
                    console.log('[CHART] candleSeries.setData() OK: ' + mapped.candles.length + ' mum');
                    volumeSeries.setData(mapped.volumes);
                    console.log('[CHART] volumeSeries.setData() OK: ' + mapped.volumes.length + ' volume');
                    chart.timeScale().fitContent();
                    hideLoading();

                    // Overlay fiyatı güncelle (% sadece price stream'den gelir)
                    if (data.bars.length > 0) {
                        var lastBar = data.bars[data.bars.length - 1];
                        updateOverlayPrice(lastBar.close, lastKnownChp);
                        flashOverlay(lastKnownChp == null || lastKnownChp >= 0);  // initial: chp bazlı
                    }

                    console.log('[CHART] ✓ STOMP initial tamamlandı: ' + mapped.candles.length + ' mum');
                } else {
                    console.log('[CHART] STOMP update: ' + data.bars.length + ' bar');
                    data.bars.forEach(function(bar, idx) {
                        var timeSec = bar.timestamp;
                        console.log('[CHART] STOMP update bar[' + idx + ']: rawTs=' + bar.timestamp + ', time=' + timeSec + ', date=' + new Date(timeSec * 1000).toISOString() + ', O=' + bar.open + ', H=' + bar.high + ', L=' + bar.low + ', C=' + bar.close + ', V=' + bar.volume);
                        candleSeries.update({
                            time: timeSec,
                            open: bar.open,
                            high: bar.high,
                            low: bar.low,
                            close: bar.close
                        });
                        volumeSeries.update({
                            time: timeSec,
                            value: bar.volume,
                            color: volumeColor(bar.open, bar.close)
                        });

                        // Son bar ile overlay fiyat güncelle
                        // % sadece price stream'den, fiyat bar'dan
                        updateOverlayPrice(bar.close, lastKnownChp);
                        // Flash: tick bazlı (geçici), sonra chp bazlı kalıcı
                        var barTickUp = prevTickPrice == null || bar.close >= prevTickPrice;
                        flashOverlay(barTickUp);
                        prevTickPrice = bar.close;
                    });
                    console.log('[CHART] ✓ STOMP update tamamlandı');
                }
            } catch (e) {
                console.error('[CHART] ✗ Bar parse hatası:', e);
                console.error('[CHART] Body ilk 500 char:', message.body.substring(0, 500));
            }
        });

        currentBarTopic = topic;
        console.log('[CHART] ✓ Bar subscription aktif: ' + topic);
    }

    function subscribeToPriceUpdates() {
        console.log('[CHART] ▶ subscribeToPriceUpdates() çağrıldı');
        if (priceSubscription) {
            console.log('[CHART] Eski price subscription unsubscribe ediliyor');
            priceSubscription.unsubscribe();
        }
        var priceTopic = '/topic/price/' + SYMBOL;
        console.log('[CHART] stompClient.subscribe(' + priceTopic + ') başlatılıyor...');

        priceSubscription = stompClient.subscribe(priceTopic, function(message) {
            console.log('[CHART] ═══ PRICE MESAJ GELDİ ═══');
            console.log('[CHART] Raw price body: ' + message.body);
            try {
                var data = JSON.parse(message.body);

                // Seans kapanış mesajı — price topic'te de gelebilir
                if (data.type === 'session_closed') {
                    showMarketClosedBadge();
                    console.log('[CHART] session_closed mesajı alındı (price topic)');
                    return;
                }

                console.log('[CHART] Price parsed → lp=' + data.lp + ', chp=' + data.chp + ', ch=' + data.ch + ', volume=' + data.volume + ', open=' + data.open);

                updatePriceDisplay(data);

                // Overlay da güncelle + flash (price stream = doğru günlük %)
                if (data.lp != null) {
                    var lp = parseFloat(data.lp);
                    var chp = parseFloat(data.chp) || 0;
                    lastKnownChp = chp;
                    updateOverlayPrice(lp, chp);
                    // Flash: tick bazlı (önceki fiyata göre), kalıcı: chp bazlı
                    var tickUp = prevTickPrice == null || lp >= prevTickPrice;
                    flashOverlay(tickUp);
                    prevTickPrice = lp;
                    console.log('[CHART] Price → lp=' + lp + ', %' + chp + ', tick=' + (tickUp ? '↑YEŞİL' : '↓KIRMIZI') + ', gün=' + (chp >= 0 ? '+YEŞİL' : '-KIRMIZI'));
                }
            } catch (e) {
                console.error('[CHART] ✗ Price parse hatası:', e);
                console.error('[CHART] Price raw: ' + message.body.substring(0, 300));
            }
        });
        console.log('[CHART] ✓ Price subscription aktif: ' + priceTopic);
    }

    // ─── Hero Header Canlı Fiyat Güncellemesi ───────────
    function flashHeroPrice(tickUp) {
        var priceEl = document.getElementById('heroPrice');
        if (!priceEl) return;
        // I2: Önceki timer'ı temizle — hızlı tick'lerde stacking önlenir
        if (heroFlashTimer) clearTimeout(heroFlashTimer);
        priceEl.style.transition = 'background 0.15s ease';
        priceEl.style.borderRadius = '4px';
        priceEl.style.padding = '0 4px';
        // 1) Parlak flash — tick bazlı (geçici)
        priceEl.style.background = tickUp ? 'rgba(10,179,156,0.35)' : 'rgba(240,101,72,0.35)';
        // 2) Sonra kalıcı renk — chp bazlı (gün pozitif/negatif)
        heroFlashTimer = setTimeout(function() {
            var dayPositive = lastKnownChp == null || lastKnownChp >= 0;
            priceEl.style.background = dayPositive ? 'rgba(10,179,156,0.15)' : 'rgba(240,101,72,0.15)';
        }, 500);
    }

    function updatePriceDisplay(data) {
        var priceEl = document.getElementById('heroPrice');
        var badgeEl = document.getElementById('heroChangeBadge');
        var percentEl = document.getElementById('heroChangePercent');
        var volumeEl = document.querySelector('.flex-shrink-0.text-end .text-muted span:last-child');

        console.log('[CHART] ▶ updatePriceDisplay(): lp=' + data.lp + ', chp=' + data.chp + ', vol=' + data.volume);

        if (!priceEl) {
            console.warn('[CHART] updatePriceDisplay: #heroPrice bulunamadı');
            return;
        }
        if (data.lp == null) {
            console.warn('[CHART] updatePriceDisplay: data.lp null');
            return;
        }

        var lp = parseFloat(data.lp);
        var chp = parseFloat(data.chp) || 0;

        // Fiyat flash — tick bazlı (geçici), sonra chp bazlı kalıcı
        var heroTickUp = prevTickPrice == null || lp >= prevTickPrice;
        flashHeroPrice(heroTickUp);
        console.log('[CHART] Hero flash: ' + (prevTickPrice || '?') + '→' + lp + ' tick=' + (heroTickUp ? '↑' : '↓') + ', gün=%' + chp);

        priceEl.textContent = lp.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' TL';

        if (badgeEl) {
            var isPositive = chp >= 0;
            badgeEl.className = isPositive
                ? 'badge bg-success-subtle text-success'
                : 'badge bg-danger-subtle text-danger';

            var iconEl = badgeEl.querySelector('i');
            if (iconEl) {
                iconEl.className = isPositive ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
            }
        }

        if (percentEl) {
            percentEl.textContent = '%' + Math.abs(chp).toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        // Hacim güncelle
        if (volumeEl && data.volume) {
            var vol = parseInt(data.volume);
            if (vol >= 1000000) {
                volumeEl.textContent = (vol / 1000000).toLocaleString('tr-TR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                }) + ' Milyon';
            } else {
                volumeEl.textContent = vol.toLocaleString('tr-TR');
            }
        }

        console.log('[CHART] ✓ Hero güncellendi: ' + lp + ' TL, %' + chp + ', vol=' + data.volume);
    }

    // ─── Periyot Seçici ─────────────────────────────────
    function initPeriodSelector() {
        console.log('[CHART] ▶ initPeriodSelector() çağrıldı');
        var selector = document.getElementById('chartPeriodSelector');
        if (!selector) {
            console.warn('[CHART] initPeriodSelector: #chartPeriodSelector bulunamadı');
            return;
        }

        var buttons = selector.querySelectorAll('[data-period]');
        console.log('[CHART] Periyot butonları: ' + buttons.length + ' adet');
        buttons.forEach(function(btn) {
            console.log('[CHART]   buton: period=' + btn.getAttribute('data-period') + ', text=' + btn.textContent.trim());
        });

        selector.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-period]');
            if (!btn) return;

            var period = btn.getAttribute('data-period');
            console.log('[CHART] Periyot butonuna tıklandı: ' + period + ' (current=' + currentPeriod + ')');

            if (period === currentPeriod) {
                console.log('[CHART] Aynı periyot, skip');
                return;
            }

            console.log('[CHART] Periyot değişiyor: ' + currentPeriod + ' → ' + period);

            selector.querySelectorAll('.btn').forEach(function(b) {
                b.classList.remove('btn-primary', 'active');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary', 'active');

            currentPeriod = period;
            console.log('[CHART] currentPeriod güncellendi: ' + currentPeriod);

            // Yeni periyot yüklenirken loading göster
            var loadingEl = document.getElementById('chartLoading');
            if (loadingEl) loadingEl.style.display = 'flex';

            if (stompClient && stompClient.connected) {
                console.log('[CHART] STOMP bağlı → sendSubscribeMessage(' + period + ')');
                sendSubscribeMessage(period);
            } else {
                console.log('[CHART] STOMP bağlı DEĞİL → REST fallback loadBars(' + period + ')');
                loadBars(period);
            }
        });

        console.log('[CHART] ✓ Periyot seçici hazır');
    }

    // ─── Seans Kapalı Badge ─────────────────────────────
    function showMarketClosedBadge() {
        var el = document.getElementById('chartMarketStatus');
        if (el) {
            el.className = 'badge fs-11 ms-2 bg-warning-subtle text-warning';
            el.textContent = 'Seans Kapalı';
        }
    }

    // ─── Temizlik ───────────────────────────────────────
    function cleanup() {
        console.log('[CHART] ▶ cleanup() çağrıldı');
        console.log('[CHART] stompClient=' + (stompClient ? 'var' : 'null') + ', stompConnected=' + stompConnected);
        // I2: Flash timer'ları temizle
        if (overlayFlashTimer) clearTimeout(overlayFlashTimer);
        if (heroFlashTimer) clearTimeout(heroFlashTimer);
        // STOMP bağlantısını kapat
        if (stompClient) {
            try {
                stompClient.deactivate();
                console.log('[CHART] stompClient.deactivate() OK');
            } catch (e) {
                console.error('[CHART] cleanup deactivate hatası:', e);
            }
        }
        // I1: ResizeObserver bağlantısını kes — memory leak önlenir
        if (resizeObserver) {
            resizeObserver.disconnect();
            console.log('[CHART] resizeObserver.disconnect() OK');
        }
        // I3: LightweightCharts canvas/DOM kaynaklarını serbest bırak
        if (chart) {
            chart.remove();
            console.log('[CHART] chart.remove() OK');
        }
        console.log('[CHART] ✓ cleanup tamamlandı');
    }

    // ─── Bootstrap ──────────────────────────────────────
    function init() {
        console.log('[CHART] ═══════════════════════════════════════');
        console.log('[CHART] ▶ INIT BAŞLADI');
        console.log('[CHART] Symbol=' + SYMBOL + ', Period=' + currentPeriod + ', API=' + API_BASE);
        console.log('[CHART] Zaman: ' + new Date().toISOString());
        console.log('[CHART] ═══════════════════════════════════════');

        console.log('[CHART] Kütüphane: LightweightCharts=' + (typeof LightweightCharts !== 'undefined' ? 'VAR' : 'YOK'));
        console.log('[CHART] Kütüphane: StompJs=' + (typeof StompJs !== 'undefined' ? 'VAR' : 'YOK'));
        console.log('[CHART] Kütüphane: SockJS=' + (typeof SockJS !== 'undefined' ? 'VAR' : 'YOK'));

        if (typeof LightweightCharts === 'undefined') {
            console.error('[CHART] ✗ LightweightCharts yüklenemedi');
            hideLoading();
            return;
        }

        console.log('[CHART] createChart() çağrılıyor...');
        createChart('chartContainer');
        if (!chart || !candleSeries || !volumeSeries) {
            console.error('[CHART] ✗ Grafik oluşturulamadı: chart=' + !!chart + ', candle=' + !!candleSeries + ', volume=' + !!volumeSeries);
            hideLoading();
            return;
        }
        console.log('[CHART] ✓ Grafik hazır');

        console.log('[CHART] createPriceOverlay() çağrılıyor...');
        createPriceOverlay();

        console.log('[CHART] initPeriodSelector() çağrılıyor...');
        initPeriodSelector();

        // Market durumu kontrol — sayfa yüklenirken kapalıysa badge göster
        var marketOpen = window.MARKET_OPEN !== false;
        if (!marketOpen) {
            showMarketClosedBadge();
            console.log('[CHART] Seans kapalı — cache/REST modunda');
        }

        // STOMP-first: sadece STOMP ile veri al, race condition önlenir
        if (typeof StompJs !== 'undefined' && typeof SockJS !== 'undefined') {
            console.log('[CHART] STOMP-first mod → connectStomp()');
            connectStomp();

            // C2: Timeout + stompConnected koordinasyonu — ikisi birden tetiklenmez
            console.log('[CHART] 5sn STOMP timeout başlatıldı');
            setTimeout(function() {
                console.log('[CHART] 5sn timeout tetiklendi → stompConnected=' + stompConnected + ', restFallbackFired=' + restFallbackFired);
                if (!stompConnected && !restFallbackFired) {
                    console.warn('[CHART] ⚠ STOMP 5sn timeout → REST fallback');
                    restFallbackFired = true;
                    loadBars(currentPeriod);
                } else {
                    console.log('[CHART] 5sn timeout: ' + (stompConnected ? 'STOMP bağlı' : 'REST zaten tetiklendi') + ', skip');
                }
            }, 5000);
        } else {
            console.warn('[CHART] ⚠ WebSocket kütüphaneleri yok → REST fallback');
            loadBars(currentPeriod);
        }

        console.log('[CHART] ═══════════════════════════════════════');
        console.log('[CHART] ✓ INIT TAMAMLANDI');
        console.log('[CHART] ═══════════════════════════════════════');
    }

    document.addEventListener('DOMContentLoaded', function() {
        console.log('[CHART] DOMContentLoaded event tetiklendi');
        init();
    });

    window.addEventListener('beforeunload', function() {
        console.log('[CHART] beforeunload event tetiklendi');
        cleanup();
    });
})();
