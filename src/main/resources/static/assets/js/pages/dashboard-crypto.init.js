/*
Template Name: Velzon - Admin & Dashboard Template
Author: Themesbrand
Website: https://Themesbrand.com/
Contact: Themesbrand@gmail.com
File: Crypto Dashboard init js
*/

// get colors array from the string
function getChartColorsArray(chartId) {
  if (document.getElementById(chartId) !== null) {
    var colors = document.getElementById(chartId).getAttribute("data-colors");
    if (colors) {
      colors = JSON.parse(colors);
      return colors.map(function (value) {
        var newValue = value.replace(" ", "");
        if (newValue.indexOf(",") === -1) {
          var color = getComputedStyle(document.documentElement).getPropertyValue(
            newValue
          );
          if (color) return color;
          else return newValue;
        } else {
          var val = value.split(",");
          if (val.length == 2) {
            var rgbaColor = getComputedStyle(
              document.documentElement
            ).getPropertyValue(val[0]);
            rgbaColor = "rgba(" + rgbaColor + "," + val[1] + ")";
            return rgbaColor;
          } else {
            return newValue;
          }
        }
      });
    } else {
      console.warn('data-colors Attribute not found on:', chartId);
    }
  }
}

// Piyasa Donut Chart — BIST endeks değerleri
var donutchartportfolioColors = getChartColorsArray("portfolio_donut_charts");
var donutChart;
// Endeks sırası: XU100, XU050, XU030, XUTUM (donut series ile aynı sıra)
var piyasaSymbols = ['XU100', 'XU050', 'XU030'];
var piyasaPrices = [0, 0, 0];

if (donutchartportfolioColors) {
  var options = {
    series: [1, 1, 1],
    labels: ["BIST 100", "BIST 50", "BIST 30"],
    chart: {
      type: "donut",
      height: 260,
    },
    plotOptions: {
      pie: {
        size: 100,
        offsetX: 0,
        offsetY: 0,
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: "18px",
              offsetY: -5,
            },
            value: {
              show: true,
              fontSize: "20px",
              color: "#343a40",
              fontWeight: 500,
              offsetY: 5,
              formatter: function (val) {
                return Number(val).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
              },
            },
            total: {
              show: true,
              fontSize: "13px",
              label: "BIST 100",
              color: "#9599ad",
              fontWeight: 500,
              formatter: function () {
                return piyasaPrices[0] > 0
                  ? Number(piyasaPrices[0]).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                  : '--';
              },
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    yaxis: {
      labels: {
        formatter: function (value) {
          return Number(value).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        },
      },
    },
    stroke: {
      lineCap: "round",
      width: 2,
    },
    colors: donutchartportfolioColors,
  };
  donutChart = new ApexCharts(document.querySelector("#portfolio_donut_charts"), options);
  donutChart.render();
}

// Market Chart Candlestick — BIST100 (XU100)
var API_BASE = (typeof window.API_BASE === 'string') ? window.API_BASE : 'http://localhost:8081';
var marketChart;
var seriesData = [];
var restLoaded = false;

var MarketchartColors = getChartColorsArray("Market_chart");
if (MarketchartColors) {
  var options = {
    series: [{
      data: []
    }],
    chart: {
      type: "candlestick",
      height: 294,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      selection: {
        enabled: false,
      },
      animations: {
        enabled: false,
      },
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: MarketchartColors[0],
          downward: MarketchartColors[1],
        },
      },
    },
    xaxis: {
      type: "category",
      tickAmount: 10,
      labels: {
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true,
        style: {
          fontSize: '10px',
        },
      },
      tickPlacement: 'on',
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      tooltip: {
        enabled: true,
      },
      labels: {
        formatter: function (value) {
          return value.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        },
      },
    },
    tooltip: {
      shared: true,
    },
  };
  marketChart = new ApexCharts(document.querySelector("#Market_chart"), options);
  marketChart.render();

  // REST: İlk 500 bar yükle (10s timeout)
  var fetchController = new AbortController();
  var fetchTimeout = setTimeout(function() { fetchController.abort(); }, 10000);

  fetchWithRetry(API_BASE + '/api/v1/chart/XU100?period=30&bars=500', { signal: fetchController.signal })
    .then(function(res) {
      clearTimeout(fetchTimeout);
      return res.json();
    })
    .then(function(data) {
      if (data.bars && data.bars.length > 0) {
        seriesData = data.bars.map(function(bar) {
          return {
            x: formatBarLabel(bar.timestamp),
            y: [bar.open, bar.high, bar.low, bar.close]
          };
        });
        marketChart.updateSeries([{ data: seriesData }]);
        restLoaded = true;

        // Stats bar güncelle (son işlem günü high/low + change%)
        var lastBarDate = new Date(data.bars[data.bars.length - 1].timestamp * 1000);
        var lastDayBars = data.bars.filter(function(bar) {
          var d = new Date(bar.timestamp * 1000);
          return d.getFullYear() === lastBarDate.getFullYear() &&
                 d.getMonth() === lastBarDate.getMonth() &&
                 d.getDate() === lastBarDate.getDate();
        });
        var barsForChange = lastDayBars.length > 0 ? lastDayBars : data.bars.slice(-1);
        var firstBar = barsForChange[0];
        var lastBar = barsForChange[barsForChange.length - 1];
        var changePercent = ((lastBar.close - firstBar.open) / firstBar.open) * 100;
        updateStatsFromBars(lastBar.close, changePercent, lastDayBars);

        // Piyasa kartı XU100 satırını da REST'ten doldur
        updatePiyasaCard('XU100', lastBar.close, changePercent);
      }
    })
    .catch(function(err) {
      clearTimeout(fetchTimeout);
      console.error('[CHART] REST bar yükleme hatası:', err);
      showToast('BIST100 grafik verisi yüklenemedi', 'error');
      restLoaded = true;
    });

  // Diğer endeksler için REST'ten ilk fiyat bilgisi al (XUTUM bar desteklemiyor)
  ['XU050', 'XU030'].forEach(function(sym) {
    fetchWithRetry(API_BASE + '/api/v1/chart/' + sym + '?period=30&bars=10')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.bars && data.bars.length > 0) {
          var lastBarDate = new Date(data.bars[data.bars.length - 1].timestamp * 1000);
          var dayBars = data.bars.filter(function(bar) {
            var d = new Date(bar.timestamp * 1000);
            return d.getFullYear() === lastBarDate.getFullYear() &&
                   d.getMonth() === lastBarDate.getMonth() &&
                   d.getDate() === lastBarDate.getDate();
          });
          var barsForCalc = dayBars.length > 0 ? dayBars : data.bars.slice(-1);
          var first = barsForCalc[0];
          var last = barsForCalc[barsForCalc.length - 1];
          var chp = ((last.close - first.open) / first.open) * 100;
          updatePiyasaCard(sym, last.close, chp);
        }
      })
      .catch(function(err) {
        console.error('[CHART] REST ' + sym + ' yükleme hatası:', err);
        showToast(sym + ' verisi yüklenemedi', 'error');
      });
  });

  // Market Movers - ilk yükleme
  fetchWithRetry(API_BASE + '/api/v1/market/movers')
      .then(function(res) { return res.json(); })
      .then(function(data) {
          if (data.rising) renderGainersList(data.rising);
          if (data.falling) renderLosersList(data.falling);
      })
      .catch(function(err) {
          console.error('[MOVERS] Yükleme hatası:', err);
          showToast('Piyasa verileri yüklenemedi', 'error');
      });

  // Volume Leaders - ilk yükleme
  fetchWithRetry(API_BASE + '/api/v1/market/volume')
      .then(function(res) { return res.json(); })
      .then(function(data) {
          renderVolumeList(data);
      })
      .catch(function(err) {
          console.error('[VOLUME] Yükleme hatası:', err);
          showToast('Hacim verileri yüklenemedi', 'error');
      });

  // KAP Haberleri - ilk yükleme (canlı TradingView news-mediator API)
  fetchWithRetry(API_BASE + '/api/v1/kap/news')
      .then(function(res) { return res.json(); })
      .then(function(data) {
          renderKapNewsList(data.items || []);
      })
      .catch(function(err) {
          console.error('[NEWS] KAP haberleri yüklenemedi:', err);
          showFetchError('kap-news-list', 'KAP bildirimleri yüklenemedi');
          showToast('KAP bildirimleri yüklenemedi', 'error');
      });

  // Piyasa Haberleri - ilk yükleme
  fetchWithRetry(API_BASE + '/api/v1/kap/market-news')
      .then(function(res) { return res.json(); })
      .then(function(data) {
          renderNewsList('news-list', data.items || [], 'ri-newspaper-line',
              'bg-primary-subtle text-primary', 'Henüz piyasa haberi yok',
              'Tüm Haberler', '/market-news');
      })
      .catch(function(err) {
          console.error('[NEWS] Piyasa haberleri yüklenemedi:', err);
          showFetchError('news-list', 'Haberler yüklenemedi');
          showToast('Piyasa haberleri yüklenemedi', 'error');
      });

  // Dünya Haberleri - ilk yükleme
  fetchWithRetry(API_BASE + '/api/v1/kap/world-news')
      .then(function(res) { return res.json(); })
      .then(function(data) {
          renderNewsList('world-news-list', data.items || [], 'ri-global-line',
              'bg-info-subtle text-info', 'Henüz dünya haberi yok',
              'Tüm Dünya Haberleri', '/world-news');
      })
      .catch(function(err) {
          console.error('[NEWS] Dünya haberleri yüklenemedi:', err);
          showFetchError('world-news-list', 'Dünya haberleri yüklenemedi');
          showToast('Dünya haberleri yüklenemedi', 'error');
      });

  // ==================== Haber Kartları 60sn Polling ====================
  setInterval(function() {
      // KAP Haberleri
      fetchWithRetry(API_BASE + '/api/v1/kap/news')
          .then(function(res) { return res.json(); })
          .then(function(data) {
              renderKapNewsList(data.items || []);
          })
          .catch(function(err) {
              console.error('[NEWS-POLL] KAP haberleri güncellenemedi:', err);
          });

      // Piyasa Haberleri
      fetchWithRetry(API_BASE + '/api/v1/kap/market-news')
          .then(function(res) { return res.json(); })
          .then(function(data) {
              renderNewsList('news-list', data.items || [], 'ri-newspaper-line',
                  'bg-primary-subtle text-primary', 'Henüz piyasa haberi yok',
                  'Tüm Haberler', '/market-news');
          })
          .catch(function(err) {
              console.error('[NEWS-POLL] Piyasa haberleri güncellenemedi:', err);
          });

      // Dünya Haberleri
      fetchWithRetry(API_BASE + '/api/v1/kap/world-news')
          .then(function(res) { return res.json(); })
          .then(function(data) {
              renderNewsList('world-news-list', data.items || [], 'ri-global-line',
                  'bg-info-subtle text-info', 'Henüz dünya haberi yok',
                  'Tüm Dünya Haberleri', '/world-news');
          })
          .catch(function(err) {
              console.error('[NEWS-POLL] Dünya haberleri güncellenemedi:', err);
          });
  }, 60000);

  // STOMP WebSocket bağlantısı (reconnect destekli)
  var reconnectDelay = 2000;
  var isConnecting = false;

  function connectStomp() {
    if (isConnecting) return;
    isConnecting = true;

    var socket = new SockJS(API_BASE + '/ws');
    var stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, function(frame) {
      console.log('[STOMP] Connected');
      isConnecting = false;
      reconnectDelay = 2000;

      // Bar subscription isteği (XU100 — ana grafik için 500 bar)
      stompClient.send('/app/chart/subscribe', {}, JSON.stringify({
        symbol: 'XU100',
        period: '30',
        bars: 500
      }));

      // Diğer endeksler için quote verisi al (1 bar yeterli — quote subscription tetikler)
      ['XU050', 'XU030'].forEach(function(sym) {
        stompClient.send('/app/chart/subscribe', {}, JSON.stringify({
          symbol: sym,
          period: '30',
          bars: 1
        }));
      });

      // Bar güncellemelerini dinle (ana grafik)
      stompClient.subscribe('/topic/bars/XU100/30', function(message) {
        var data = JSON.parse(message.body);
        if (data.bars && data.bars.length > 0) {
          handleBarUpdate(data);
        }
      });

      // Fiyat tiklerini dinle (tüm endeksler)
      piyasaSymbols.forEach(function(sym) {
        stompClient.subscribe('/topic/price/' + sym, function(message) {
          var quote = JSON.parse(message.body);
          handlePiyasaTick(sym, quote);
        });
      });

      // Market Movers - En Çok Yükselenler/Düşenler
      stompClient.subscribe('/topic/market/rising', function(msg) {
          renderGainersList(JSON.parse(msg.body));
      });
      stompClient.subscribe('/topic/market/falling', function(msg) {
          renderLosersList(JSON.parse(msg.body));
      });
      stompClient.subscribe('/topic/market/volume', function(msg) {
          renderVolumeList(JSON.parse(msg.body));
      });
    }, function(error) {
      isConnecting = false;
      console.error('[STOMP] Connection error, reconnecting in ' + reconnectDelay + 'ms...');
      setTimeout(connectStomp, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    });
  }

  connectStomp();
}

// Bar güncelleme handler
function handleBarUpdate(data) {
  if (!marketChart) return;

  // Initial type: REST zaten yüklendiyse atla, yoksa series'i değiştir
  if (data.type === 'initial') {
    if (restLoaded) return;
    seriesData = data.bars.map(function(bar) {
      return {
        x: formatBarLabel(bar.timestamp),
        y: [bar.open, bar.high, bar.low, bar.close]
      };
    });
    marketChart.updateSeries([{ data: seriesData }], false);
    restLoaded = true;
    return;
  }

  // Update/new_bar: incremental merge
  data.bars.forEach(function(bar) {
    var label = formatBarLabel(bar.timestamp);
    var point = {
      x: label,
      y: [bar.open, bar.high, bar.low, bar.close]
    };

    if (seriesData.length > 0) {
      var lastPoint = seriesData[seriesData.length - 1];

      if (lastPoint.x === label) {
        seriesData[seriesData.length - 1] = point;
      } else {
        seriesData.push(point);
        if (seriesData.length > 500) seriesData.shift();
      }
    } else {
      seriesData.push(point);
    }
  });

  marketChart.updateSeries([{ data: seriesData }], false);
}

// Piyasa fiyat tiki handler — tüm endeksler (XU100, XU050, XU030, XUTUM)
function handlePiyasaTick(symbol, quote) {
  var symLower = symbol.toLowerCase();

  // Piyasa kartı fiyat ve değişim güncelle
  var piyasaPriceEl = document.getElementById('piyasa-' + symLower + '-price');
  var piyasaChangeEl = document.getElementById('piyasa-' + symLower + '-change');

  if (quote.lp != null && piyasaPriceEl) {
    var oldText = piyasaPriceEl.textContent;
    piyasaPriceEl.textContent = Number(quote.lp).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (oldText !== '--' && oldText !== piyasaPriceEl.textContent) {
      var oldVal = parseFloat(oldText.replace(/\./g, '').replace(',', '.'));
      flashElement(piyasaPriceEl, quote.lp >= oldVal ? 'up' : 'down');
    }
  }
  if (quote.chp != null && piyasaChangeEl) {
    var isPositive = quote.chp >= 0;
    piyasaChangeEl.textContent = '%' + (isPositive ? '+' : '') + Number(quote.chp).toFixed(2);
    piyasaChangeEl.className = 'fs-13 mb-0 ' + (isPositive ? 'text-success' : 'text-danger');
  }

  // Donut chart güncelle
  if (quote.lp != null && donutChart) {
    var idx = piyasaSymbols.indexOf(symbol);
    if (idx !== -1) {
      piyasaPrices[idx] = Number(quote.lp);
      var hasData = piyasaPrices.some(function(p) { return p > 0; });
      if (hasData) {
        donutChart.updateSeries(piyasaPrices);
      }
    }
  }

  // XU100 ise stats bar'ı da güncelle (ana grafik üstündeki Yüksek/Düşük)
  if (symbol === 'XU100') {
    var priceEl = document.getElementById('bist100-price');
    var changeEl = document.getElementById('bist100-change');
    var highEl = document.getElementById('bist100-high');
    var lowEl = document.getElementById('bist100-low');

    if (quote.lp != null && priceEl) {
      var oldPrice = priceEl.textContent;
      priceEl.textContent = Number(quote.lp).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (oldPrice !== '--' && oldPrice !== priceEl.textContent) {
        var oldPriceVal = parseFloat(oldPrice.replace(/\./g, '').replace(',', '.'));
        flashElement(priceEl, quote.lp >= oldPriceVal ? 'up' : 'down');
      }
    }
    if (quote.high_price != null && highEl) {
      var oldHigh = highEl.textContent;
      highEl.textContent = Number(quote.high_price).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (oldHigh !== '--' && oldHigh !== highEl.textContent) {
        flashElement(highEl, 'up');
      }
    }
    if (quote.low_price != null && lowEl) {
      var oldLow = lowEl.textContent;
      lowEl.textContent = Number(quote.low_price).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (oldLow !== '--' && oldLow !== lowEl.textContent) {
        flashElement(lowEl, 'down');
      }
    }
    if (quote.chp != null && changeEl) {
      var isPos = quote.chp >= 0;
      changeEl.textContent = (isPos ? '+' : '') + Number(quote.chp).toFixed(2) + '%';
      changeEl.className = 'fs-13 ms-1 ' + (isPos ? 'text-success' : 'text-danger');
    }
  }
}

// Piyasa kartı satırını güncelle (REST veya hesaplanan veriden)
function updatePiyasaCard(symbol, price, changePercent) {
  var symLower = symbol.toLowerCase();
  var priceEl = document.getElementById('piyasa-' + symLower + '-price');
  var changeEl = document.getElementById('piyasa-' + symLower + '-change');

  if (priceEl) {
    priceEl.textContent = Number(price).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
  if (changeEl) {
    var isPositive = changePercent >= 0;
    changeEl.textContent = '%' + (isPositive ? '+' : '') + Number(changePercent).toFixed(2);
    changeEl.className = 'fs-13 mb-0 ' + (isPositive ? 'text-success' : 'text-danger');
  }

  // Donut chart güncelle
  var idx = piyasaSymbols.indexOf(symbol);
  if (idx !== -1) {
    piyasaPrices[idx] = Number(price);
    var hasData = piyasaPrices.some(function(p) { return p > 0; });
    if (hasData && donutChart) {
      donutChart.updateSeries(piyasaPrices);
    }
  }
}

// Timestamp → category label (gün değişiminde tarih, aynı günde saat)
function formatBarLabel(timestamp) {
  var d = new Date(timestamp * 1000);
  var day = d.getDate().toString().padStart(2, '0');
  var month = (d.getMonth() + 1).toString().padStart(2, '0');
  var hours = d.getHours().toString().padStart(2, '0');
  var minutes = d.getMinutes().toString().padStart(2, '0');
  return day + '/' + month + ' ' + hours + ':' + minutes;
}

// Stats bar'ı bar verisinden güncelle (son işlem günü high/low)
function updateStatsFromBars(lastPrice, changePercent, lastDayBars) {
  var priceEl = document.getElementById('bist100-price');
  var changeEl = document.getElementById('bist100-change');
  var highEl = document.getElementById('bist100-high');
  var lowEl = document.getElementById('bist100-low');

  if (priceEl) {
    priceEl.textContent = Number(lastPrice).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
  if (changeEl) {
    var isPositive = changePercent >= 0;
    changeEl.textContent = (isPositive ? '+' : '') + changePercent.toFixed(2) + '%';
    changeEl.className = 'fs-13 ms-1 ' + (isPositive ? 'text-success' : 'text-danger');
  }

  var maxHigh = -Infinity, minLow = Infinity;
  lastDayBars.forEach(function(bar) {
    if (bar.high > maxHigh) maxHigh = bar.high;
    if (bar.low < minLow) minLow = bar.low;
  });

  if (highEl && maxHigh !== -Infinity) {
    highEl.textContent = Number(maxHigh).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
  if (lowEl && minLow !== Infinity) {
    lowEl.textContent = Number(minLow).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
}

// Sektor Endeksleri Sparkline Charts
var sectorIndices = [
  'xfink','xakur','xmadn','xutek','xumal','xinsa','xktum','xyort',
  'xgmyo','xmana','xk050','xk030','xbank','xhold','xk100','xutum',
  'xu100','xgida','xusin','xtcrt','xelkt','xteks','xkmya','xmesy',
  'xiltm','xblsm','xuhiz','xsgrt','xtrzm','xkagt','xtast','xulas','xspor'
];

sectorIndices.forEach(function(code) {
  var chartId = 'sparkline_' + code;
  var colors = getChartColorsArray(chartId);
  if (colors) {
    // SSR verisinden gercek performans datasi al
    var data = [];
    var realData = null;
    if (window.initialIndexData) {
      for (var j = 0; j < window.initialIndexData.length; j++) {
        if (window.initialIndexData[j].symbol &&
            window.initialIndexData[j].symbol.toLowerCase() === code) {
          realData = window.initialIndexData[j];
          break;
        }
      }
    }
    if (realData) {
      data = [
        realData.weeklyChange || 0,
        realData.monthlyChange || 0,
        realData.quarterlyChange || 0,
        realData.sixMonthChange || 0,
        realData.yearlyChange || 0
      ];
    } else {
      // Fallback: random placeholder data (5 nokta — gercek veriyle ayni boyut)
      for (var i = 0; i < 5; i++) data.push(Math.floor(Math.random() * 80) + 10);
    }

    var options = {
      series: [{ name: code.toUpperCase(), data: data }],
      chart: { width: 130, height: 46, type: "area", sparkline: { enabled: true }, toolbar: { show: false } },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 1.5 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, inverseColors: false, opacityFrom: 0.45, opacityTo: 0.05, stops: [50, 100, 100, 100] } },
      colors: colors,
    };
    var chart = new ApexCharts(document.querySelector("#" + chartId), options);
    chart.render();

    // Chart instance'i index-swiper.js'e kaydet (canli guncelleme icin)
    if (typeof window.indexSwiperRegisterChart === 'function') {
      window.indexSwiperRegisterChart(code, chart);
    }
  }
});

// Swiper Slider
var swiper = new Swiper(".cryptoSlider", {
  slidesPerView: 1,
  loop: false,
  spaceBetween: 24,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
  autoplay: {
    delay: 2500,
    disableOnInteraction: false,
  },
  breakpoints: {
    640: {
      slidesPerView: 2,
    },
    768: {
      slidesPerView: 2.5,
    },
    1024: {
      slidesPerView: 3,
    },
    1200: {
      slidesPerView: 5,
    },
  },
});

// ==================== Market Movers Render ====================

/**
 * Ticker harflerinden harf-bazli fallback avatar olusturur.
 * Logoid olmayan veya CDN hatasi veren hisseler icin kullanilir.
 */
function createTickerAvatar(ticker) {
    var initials = (ticker || '??').substring(0, 2);
    var span = document.createElement('span');
    span.className = 'avatar-title rounded-circle fw-semibold';
    span.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:11px;background:transparent;color:#495057;border:1.5px solid #ced4da;';
    span.textContent = initials;
    return span;
}

function renderMoversList(listId, stocks, isGainer) {
    var list = document.getElementById(listId);
    if (!list || !stocks || stocks.length === 0) return;
    list.innerHTML = '';

    var avatarBg = isGainer ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';

    stocks.forEach(function(stock) {
        var pct = stock.changePercent != null ? stock.changePercent : 0;
        var changePositive = pct >= 0;
        var changeClass = changePositive ? 'text-success' : 'text-danger';
        var changeIcon = changePositive ? 'ri-arrow-up-s-fill' : 'ri-arrow-down-s-fill';
        var changeSign = changePositive ? '+' : '';
        var displayPrice = stock.price != null ? Number(stock.price) : null;

        var li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action d-flex align-items-center';
        li.style.cursor = 'pointer';
        li.onclick = function() { window.location.href = '/stock/detail/' + encodeURIComponent(stock.ticker); };

        // Avatar — logoid varsa TradingView CDN logosu, yoksa ticker harfli avatar
        var avatarDiv = document.createElement('div');
        avatarDiv.className = 'flex-shrink-0 avatar-xs';
        if (stock.logoid) {
            var img = document.createElement('img');
            img.src = '/img/stock-logos/' + encodeURIComponent(stock.logoid);
            img.alt = stock.ticker;
            img.className = 'rounded-circle';
            img.style.width = '32px';
            img.style.height = '32px';
            img.onerror = function() {
                this.parentNode.replaceChild(createTickerAvatar(stock.ticker), this);
            };
            avatarDiv.appendChild(img);
        } else {
            avatarDiv.appendChild(createTickerAvatar(stock.ticker));
        }

        // Info (ticker + description)
        var infoDiv = document.createElement('div');
        infoDiv.className = 'flex-grow-1 ms-3';
        var tickerEl = document.createElement('h6');
        tickerEl.className = 'mb-1';
        tickerEl.textContent = stock.ticker;
        var descEl = document.createElement('p');
        descEl.className = 'text-muted mb-0 fs-13';
        descEl.textContent = stock.description || '';
        infoDiv.appendChild(tickerEl);
        infoDiv.appendChild(descEl);

        // Price + change
        var priceDiv = document.createElement('div');
        priceDiv.className = 'flex-shrink-0 text-end';
        var priceEl = document.createElement('h6');
        priceEl.className = 'mb-1';
        priceEl.textContent = displayPrice != null ? displayPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' \u20BA' : '--';
        var changeEl = document.createElement('p');
        changeEl.className = changeClass + ' fs-13 mb-0';
        var changeI = document.createElement('i');
        changeI.className = changeIcon;
        changeEl.appendChild(changeI);
        changeEl.appendChild(document.createTextNode(changeSign + pct.toFixed(2) + '%'));
        priceDiv.appendChild(priceEl);
        priceDiv.appendChild(changeEl);

        li.appendChild(avatarDiv);
        li.appendChild(infoDiv);
        li.appendChild(priceDiv);
        list.appendChild(li);
    });
}

function renderGainersList(stocks) {
    renderMoversList('top-gainers-list', stocks, true);
}

function renderLosersList(stocks) {
    renderMoversList('top-losers-list', stocks, false);
}

// ==================== Volume Leaders Render ====================

function renderVolumeList(stocks) {
    var list = document.getElementById('top-volume-list');
    if (!list || !stocks || stocks.length === 0) return;
    list.innerHTML = '';

    stocks.forEach(function(stock) {
        var pct = stock.changePercent != null ? stock.changePercent : 0;
        var changePositive = pct >= 0;
        var changeClass = changePositive ? 'text-success' : 'text-danger';
        var changeIcon = changePositive ? 'ri-arrow-up-s-fill' : 'ri-arrow-down-s-fill';
        var changeSign = changePositive ? '+' : '';
        var displayPrice = stock.price != null ? Number(stock.price) : null;

        var li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action d-flex align-items-center';
        li.style.cursor = 'pointer';
        li.onclick = function() { window.location.href = '/stock/detail/' + encodeURIComponent(stock.ticker); };

        // Avatar — logoid varsa TradingView CDN logosu, yoksa ticker harfli avatar
        var avatarDiv = document.createElement('div');
        avatarDiv.className = 'flex-shrink-0 avatar-xs';
        if (stock.logoid) {
            var img = document.createElement('img');
            img.src = '/img/stock-logos/' + encodeURIComponent(stock.logoid);
            img.alt = stock.ticker;
            img.className = 'rounded-circle';
            img.style.width = '32px';
            img.style.height = '32px';
            img.onerror = function() {
                this.parentNode.replaceChild(createTickerAvatar(stock.ticker), this);
            };
            avatarDiv.appendChild(img);
        } else {
            avatarDiv.appendChild(createTickerAvatar(stock.ticker));
        }

        // Info (ticker + description)
        var infoDiv = document.createElement('div');
        infoDiv.className = 'flex-grow-1 ms-3';
        var tickerEl = document.createElement('h6');
        tickerEl.className = 'mb-1';
        tickerEl.textContent = stock.ticker;
        var descEl = document.createElement('p');
        descEl.className = 'text-muted mb-0 fs-13';
        descEl.textContent = stock.description || '';
        infoDiv.appendChild(tickerEl);
        infoDiv.appendChild(descEl);

        // Price + volume
        var priceDiv = document.createElement('div');
        priceDiv.className = 'flex-shrink-0 text-end';
        var priceEl = document.createElement('h6');
        priceEl.className = 'mb-1';
        priceEl.textContent = displayPrice != null ? displayPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' \u20BA' : '--';
        var volEl = document.createElement('p');
        volEl.className = changeClass + ' fs-13 mb-0';
        var volI = document.createElement('i');
        volI.className = changeIcon;
        volEl.appendChild(volI);
        volEl.appendChild(document.createTextNode(changeSign + pct.toFixed(2) + '%'));
        priceDiv.appendChild(priceEl);
        priceDiv.appendChild(volEl);

        li.appendChild(avatarDiv);
        li.appendChild(infoDiv);
        li.appendChild(priceDiv);
        list.appendChild(li);
    });
}

// ==================== Haber Fetch Hata Gösterimi ====================

/**
 * Fetch hatası durumunda loading spinner yerine hata mesajı gösterir.
 */
function showFetchError(containerId, message) {
    var container = document.getElementById(containerId);
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    var errDiv = document.createElement('div');
    errDiv.className = 'text-center text-muted py-4';
    var errIcon = document.createElement('i');
    errIcon.className = 'ri-error-warning-line fs-24';
    var errText = document.createElement('p');
    errText.className = 'mt-2 mb-0';
    errText.textContent = message;
    errDiv.appendChild(errIcon);
    errDiv.appendChild(errText);
    container.appendChild(errDiv);
}

/**
 * Fetch ile retry mekanizması. Başarısız olursa belirtilen sayıda tekrar dener.
 * @param {string} url - Fetch URL
 * @param {object} options - Fetch options
 * @param {number} retries - Kalan deneme (default 3)
 * @param {number} delay - Denemeler arası bekleme ms (default 5000)
 * @returns {Promise<Response>}
 */
function fetchWithRetry(url, options, retries, delay) {
    retries = retries != null ? retries : 3;
    delay = delay || 5000;
    var shortUrl = url.replace(API_BASE, '');
    console.log('[FETCH] ' + shortUrl + (retries < 3 ? ' (retry ' + (3 - retries) + ')' : ''));
    return fetch(url, options).then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        console.log('[FETCH] ✓ ' + shortUrl + ' → ' + res.status);
        return res;
    }).catch(function(err) {
        if (err.name === 'AbortError') throw err;
        if (retries <= 1) throw err;
        console.warn('[RETRY] ' + url + ' başarısız (' + err.message + '), ' + (retries - 1) + ' deneme kaldı...');
        return new Promise(function(resolve) {
            setTimeout(resolve, delay);
        }).then(function() {
            return fetchWithRetry(url, options, retries - 1, delay);
        });
    });
}

/**
 * Kullanıcıya toast bildirimi gösterir (Toastify-JS).
 * Toastify henüz yüklenmemişse kuyruğa alır, yüklenince gösterir.
 * Aynı mesaj 5 saniye içinde tekrar gelirse yok sayılır (flooding koruması).
 * @param {string} message - Gösterilecek mesaj
 * @param {string} type - 'error' | 'warning' | 'success'
 */
var _toastQueue = [];
var _toastShown = {};
var _toastFlushStarted = false;

function showToast(message, type) {
    // Dedup: aynı mesajı 5s içinde tekrar gösterme
    if (_toastShown[message]) return;
    _toastShown[message] = true;
    setTimeout(function() { delete _toastShown[message]; }, 5000);

    if (typeof Toastify !== 'function') {
        _toastQueue.push({ message: message, type: type });
        _startToastFlush();
        return;
    }
    _doShowToast(message, type);
}

function _startToastFlush() {
    if (_toastFlushStarted) return;
    _toastFlushStarted = true;
    var checkInterval = setInterval(function() {
        if (typeof Toastify === 'function') {
            clearInterval(checkInterval);
            _toastQueue.forEach(function(t) { _doShowToast(t.message, t.type); });
            _toastQueue = [];
        }
    }, 200);
    // 10s sonra vazgeç (CDN yüklenemezse sonsuz polling olmasın)
    setTimeout(function() { clearInterval(checkInterval); }, 10000);
}

function _doShowToast(message, type) {
    var bgColor = type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#198754';
    Toastify({
        text: message,
        duration: 4000,
        gravity: 'top',
        position: 'right',
        style: { background: bgColor },
        close: true
    }).showToast();
}

/**
 * Fiyat değişiminde elementi kısa süre yeşil/kırmızı flash yapar.
 * @param {HTMLElement} el - Flash yapılacak element
 * @param {string} direction - 'up' veya 'down'
 */
function flashElement(el, direction) {
    if (!el) return;
    var cls = direction === 'up' ? 'price-flash-up' : 'price-flash-down';
    el.classList.remove('price-flash-up', 'price-flash-down');
    // Force reflow — aynı class tekrar eklendiğinde animasyon yeniden tetiklenir
    void el.offsetWidth;
    el.classList.add(cls);
}

// ==================== KAP Haberleri Render ====================

function renderKapNewsList(items) {
    var container = document.getElementById('kap-news-list');
    if (!container) return;

    // Mevcut içeriği temizle
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    if (!items || items.length === 0) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'text-center text-muted py-4';
        var emptyIcon = document.createElement('i');
        emptyIcon.className = 'ri-file-list-3-line fs-24';
        var emptyText = document.createElement('p');
        emptyText.className = 'mt-2 mb-0';
        emptyText.textContent = 'Henüz KAP bildirimi yok';
        emptyDiv.appendChild(emptyIcon);
        emptyDiv.appendChild(emptyText);
        container.appendChild(emptyDiv);
        return;
    }

    var maxItems = 10;
    items.slice(0, maxItems).forEach(function(item, index) {
        var wrapper = document.createElement('div');
        wrapper.className = index === 0 ? '' : 'mt-3';

        // Hisse kodu badge + saat (üst satır)
        var headerDiv = document.createElement('div');
        headerDiv.className = 'd-flex align-items-center mb-1';

        // Kaynak badge (KAP)
        var sourceBadge = document.createElement('span');
        sourceBadge.className = 'badge bg-warning-subtle text-warning me-1';
        sourceBadge.textContent = item.source || 'KAP';
        headerDiv.appendChild(sourceBadge);

        // Hisse kodu (relatedSymbols'dan)
        if (item.relatedSymbols && item.relatedSymbols.length > 0) {
            item.relatedSymbols.slice(0, 2).forEach(function(sym) {
                var stockBadge = document.createElement('span');
                stockBadge.className = 'badge bg-light text-body me-1';
                // "BIST:THYAO" -> "THYAO"
                var ticker = sym.symbol ? sym.symbol.replace('BIST:', '') : '';
                stockBadge.textContent = ticker;
                headerDiv.appendChild(stockBadge);
            });
        }

        // Saat (sağa yasla)
        var timeSpan = document.createElement('span');
        timeSpan.className = 'text-muted fs-11 ms-auto';
        timeSpan.textContent = item.formattedPublished || '';
        headerDiv.appendChild(timeSpan);

        wrapper.appendChild(headerDiv);

        // Başlık özeti (alt satır)
        var titleP = document.createElement('p');
        titleP.className = 'text-muted fs-13 mb-0 lh-base';
        // "KAP:   [THYAO ] ... Açıklama" -> temizle
        var rawTitle = item.title || '';
        // "KAP: HISSE [CODE] SIRKET ADI  Konu" formatını temizle
        var cleanTitle = rawTitle.replace(/^KAP:\s*/, '').replace(/\s*\[.*?\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
        // Kartın taşmaması için kırp
        if (cleanTitle.length > 100) {
            cleanTitle = cleanTitle.substring(0, 100) + '...';
        }
        titleP.textContent = cleanTitle;
        wrapper.appendChild(titleP);

        // Ayırıcı çizgi (son item hariç)
        if (index < Math.min(items.length, maxItems) - 1) {
            var hr = document.createElement('hr');
            hr.className = 'my-0 mt-3 text-muted opacity-25';
            wrapper.appendChild(hr);
        }

        container.appendChild(wrapper);
    });

    // "Tüm KAP Bildirimleri" linki
    var viewAllDiv = document.createElement('div');
    viewAllDiv.className = 'mt-3 text-center';
    var viewAllLink = document.createElement('a');
    viewAllLink.href = '/kap-news';
    viewAllLink.className = 'text-muted text-decoration-underline';
    viewAllLink.textContent = 'Tüm KAP Bildirimleri';
    viewAllDiv.appendChild(viewAllLink);
    container.appendChild(viewAllDiv);
}

/**
 * Ortak haber listesi render fonksiyonu (Piyasa Haberleri + Dünya Haberleri).
 * Haberleri Gelecek / Bugun olarak gruplar, alt basliklar ile gosterir.
 */
function renderNewsList(containerId, items, iconClass, colorClass, emptyMsg, viewAllText, viewAllHref) {
    var container = document.getElementById(containerId);
    if (!container) return;

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    if (!items || items.length === 0) {
        var emptyDiv = document.createElement('div');
        emptyDiv.className = 'text-center text-muted py-4';
        var emptyIcon = document.createElement('i');
        emptyIcon.className = 'ri-file-list-3-line fs-24';
        var emptyText = document.createElement('p');
        emptyText.className = 'mt-2 mb-0';
        emptyText.textContent = emptyMsg;
        emptyDiv.appendChild(emptyIcon);
        emptyDiv.appendChild(emptyText);
        container.appendChild(emptyDiv);
        return;
    }

    // Turkiye saat dilimine gore bugunun tarihini al
    var todayStr = _getNewsTodayStr();

    // Haberleri grupla
    var futureItems = [];
    var todayItems = [];
    var pastItems = [];
    items.forEach(function(item) {
        var dateStr = _getNewsItemDateStr(item);
        if (dateStr > todayStr) futureItems.push(item);
        else if (dateStr === todayStr) todayItems.push(item);
        else pastItems.push(item);
    });

    // Her grubun max gosterim sayisi — toplam ~10
    var maxPerGroup = 5;

    // Gelecek bolumu
    if (futureItems.length > 0) {
        _renderNewsGroupHeader(container, 'Gelecek', 'ri-calendar-event-line', 'text-warning', futureItems.length);
        _renderNewsGroupItems(container, futureItems.slice(0, maxPerGroup), iconClass);
    }

    // Bugun bolumu
    if (todayItems.length > 0) {
        if (futureItems.length > 0) {
            var sep = document.createElement('hr');
            sep.className = 'my-3 text-muted opacity-50';
            container.appendChild(sep);
        }
        _renderNewsGroupHeader(container, 'Bug\u00FCn', 'ri-calendar-check-line', 'text-success', todayItems.length);
        _renderNewsGroupItems(container, todayItems.slice(0, maxPerGroup), iconClass);
    }

    // Gecmis bolumu (sadece gelecek ve bugun az ise goster)
    var shownCount = Math.min(futureItems.length, maxPerGroup) + Math.min(todayItems.length, maxPerGroup);
    if (pastItems.length > 0 && shownCount < 6) {
        var pastMax = Math.min(pastItems.length, 10 - shownCount);
        if (pastMax > 0) {
            var sep2 = document.createElement('hr');
            sep2.className = 'my-3 text-muted opacity-50';
            container.appendChild(sep2);
            _renderNewsGroupHeader(container, 'Ge\u00E7mi\u015F', 'ri-history-line', 'text-secondary', pastItems.length);
            _renderNewsGroupItems(container, pastItems.slice(0, pastMax), iconClass);
        }
    }

    // Hic haber yoksa
    if (futureItems.length === 0 && todayItems.length === 0 && pastItems.length === 0) {
        var noData = document.createElement('div');
        noData.className = 'text-center text-muted py-3';
        noData.textContent = emptyMsg;
        container.appendChild(noData);
    }

    // "Tumu" linki
    var viewAllDiv = document.createElement('div');
    viewAllDiv.className = 'mt-3 text-center';
    var viewAllLink = document.createElement('a');
    viewAllLink.href = viewAllHref;
    viewAllLink.className = 'text-muted text-decoration-underline';
    viewAllLink.textContent = viewAllText;
    viewAllDiv.appendChild(viewAllLink);
    container.appendChild(viewAllDiv);
}

/** Alt baslik render helper */
function _renderNewsGroupHeader(container, label, iconCls, colorCls, count) {
    var header = document.createElement('div');
    header.className = 'd-flex align-items-center mb-2';
    var icon = document.createElement('i');
    icon.className = iconCls + ' me-1 ' + colorCls;
    var span = document.createElement('span');
    span.className = 'fw-semibold fs-13 ' + colorCls;
    span.textContent = label;
    var badge = document.createElement('span');
    badge.className = 'badge bg-light text-body ms-1 fs-10';
    badge.textContent = count;
    header.appendChild(icon);
    header.appendChild(span);
    header.appendChild(badge);
    container.appendChild(header);
}

/** Haber item listesi render helper */
function _renderNewsGroupItems(container, items, iconClass) {
    items.forEach(function(item, index) {
        var wrapper = document.createElement('div');
        wrapper.className = index === 0 ? 'd-flex align-items-center' : 'd-flex align-items-center mt-3';

        var iconDiv = document.createElement('div');
        iconDiv.className = 'flex-shrink-0';
        var avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar-xs';
        var avatarSpan = document.createElement('span');
        avatarSpan.className = 'avatar-title rounded';
        avatarSpan.style.cssText = 'background:transparent; color:#495057; border:1px solid #ced4da;';
        var avatarI = document.createElement('i');
        avatarI.className = iconClass + ' fs-14';
        avatarSpan.appendChild(avatarI);
        avatarDiv.appendChild(avatarSpan);
        iconDiv.appendChild(avatarDiv);

        var contentDiv = document.createElement('div');
        contentDiv.className = 'flex-grow-1 ms-2';
        var titleEl = document.createElement('p');
        titleEl.className = 'mb-0 fs-13 lh-base';
        var displayTitle = item.title || 'Haber';
        if (displayTitle.length > 80) {
            displayTitle = displayTitle.substring(0, 80) + '...';
        }
        titleEl.textContent = displayTitle;

        var metaEl = document.createElement('span');
        metaEl.className = 'text-muted fs-11';
        metaEl.textContent = item.formattedPublished || '';
        contentDiv.appendChild(titleEl);
        contentDiv.appendChild(metaEl);

        wrapper.appendChild(iconDiv);
        wrapper.appendChild(contentDiv);
        container.appendChild(wrapper);
    });
}

/** Bugunun tarih string'ini dondurur (YYYY-MM-DD, Turkiye saati) */
function _getNewsTodayStr() {
    var now = new Date();
    var turkeyOffset = 3 * 60;
    var utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    var turkeyNow = new Date(utcMs + (turkeyOffset * 60000));
    return turkeyNow.getFullYear() + '-' +
        String(turkeyNow.getMonth() + 1).padStart(2, '0') + '-' +
        String(turkeyNow.getDate()).padStart(2, '0');
}

/** Haber item'inin tarih string'ini dondurur (YYYY-MM-DD) */
function _getNewsItemDateStr(item) {
    var todayStr = _getNewsTodayStr();
    if (item.published) {
        var turkeyOffset = 3 * 60;
        var d = new Date(item.published * 1000);
        var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        var tr = new Date(utc + (turkeyOffset * 60000));
        return tr.getFullYear() + '-' +
            String(tr.getMonth() + 1).padStart(2, '0') + '-' +
            String(tr.getDate()).padStart(2, '0');
    }
    // formattedPublished'ten parse: "03 Nisan 2026 14:30"
    var str = item.formattedPublished;
    if (!str || str === '-') return todayStr;
    var months = {
        'Ocak':'01','\u015Eubat':'02','Mart':'03','Nisan':'04',
        'May\u0131s':'05','Haziran':'06','Temmuz':'07','A\u011Fustos':'08',
        'Eyl\u00FCl':'09','Ekim':'10','Kas\u0131m':'11','Aral\u0131k':'12'
    };
    var parts = str.trim().split(/\s+/);
    if (parts.length >= 3) {
        var day = parts[0].padStart(2, '0');
        var month = months[parts[1]] || '01';
        var year = parts[2];
        return year + '-' + month + '-' + day;
    }
    return todayStr;
}