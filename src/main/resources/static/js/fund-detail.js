/**
 * Fon Detay Sayfasi JavaScript
 *
 * Fon detay sayfasindaki grafikleri (fiyat gecmisi, varlik dagilimi,
 * nakit akisi, yatirimci sayisi) olusturur ve portfoy buyuklugu
 * ile getiri bar genisliklerini hesaplar.
 *
 * Thymeleaf inline JS'den window global degiskenleri bekler:
 * - window.fundPriceHistory (Array of {date, value})
 * - window.fundAllocation (Allocation object)
 * - window.fundCode (String)
 */
(function () {
    'use strict';

    /**
     * Container icine bilgi mesaji yerlestirir (DOM API ile).
     *
     * @param {HTMLElement} container - Hedef element
     * @param {string} message - Gosterilecek mesaj
     */
    function showMessage(container, message) {
        // Veri yoksa parent card'i gizle
        var card = container.closest('.card');
        if (card) {
            var col = card.closest('[class*="col-"]');
            if (col) {
                col.style.display = 'none';
                // Ayni row'daki tum col'lar gizliyse row'u da gizle
                var row = col.closest('.row');
                if (row) {
                    var visibleCols = row.querySelectorAll('[class*="col-"]');
                    var allHidden = true;
                    visibleCols.forEach(function(c) { if (c.style.display !== 'none') allHidden = false; });
                    if (allHidden) row.style.display = 'none';
                }
            }
        }
    }

    /**
     * Container icerigini temizler (DOM API ile).
     *
     * @param {HTMLElement} container - Hedef element
     */
    function clearContainer(container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    /**
     * Portfoy buyuklugu degerlerini K/M/B Turkce formatina donusturur.
     * '.portfolio-size' sinifli tum elementleri bulur ve formatlar.
     */
    function formatPortfolioSize() {
        document.querySelectorAll('.portfolio-size').forEach(function (el) {
            var val = parseFloat(el.getAttribute('data-value'));
            if (isNaN(val)) return;
            if (val >= 1e9) {
                el.textContent = (val / 1e9).toFixed(2).replace('.', ',') + ' Milyar';
            } else if (val >= 1e6) {
                el.textContent = (val / 1e6).toFixed(2).replace('.', ',') + ' Milyon';
            } else if (val >= 1e3) {
                el.textContent = (val / 1e3).toFixed(1).replace('.', ',') + ' Bin';
            }
        });
    }

    /**
     * Holding piyasa degeri degerlerini K/M/B Turkce formatina donusturur.
     * '.holding-market-value' sinifli tum elementleri bulur ve formatlar.
     */
    function formatHoldingMarketValues() {
        document.querySelectorAll('.holding-market-value').forEach(function (el) {
            var val = parseFloat(el.getAttribute('data-value'));
            if (isNaN(val)) return;
            if (val >= 1e9) {
                el.textContent = (val / 1e9).toFixed(2).replace('.', ',') + ' Milyar';
            } else if (val >= 1e6) {
                el.textContent = (val / 1e6).toFixed(2).replace('.', ',') + ' Milyon';
            } else if (val >= 1e3) {
                el.textContent = (val / 1e3).toFixed(1).replace('.', ',') + ' Bin';
            }
        });
    }

    /**
     * Getiri barlarinin genisliklerini oransal olarak hesaplar.
     * En buyuk mutlak degeri referans alarak diger barlari oranlar.
     */
    function calculateReturnBars() {
        var bars = document.querySelectorAll('.return-bar');
        if (bars.length === 0) return;

        var maxAbsVal = 0;
        bars.forEach(function (bar) {
            var absVal = Math.abs(parseFloat(bar.getAttribute('data-value')));
            if (absVal > maxAbsVal) maxAbsVal = absVal;
        });

        if (maxAbsVal === 0) return;

        bars.forEach(function (bar) {
            var val = parseFloat(bar.getAttribute('data-value'));
            var widthPercent = (Math.abs(val) / maxAbsVal) * 100;
            bar.style.width = widthPercent + '%';
        });
    }

    /**
     * Fiyat gecmisi grafigini ApexCharts area chart olarak olusturur.
     *
     * @param {Array} data - Fiyat gecmisi dizisi [{date: "YYYY-MM-DD", value: 1.23}]
     */
    function renderPriceChart(data) {
        var container = document.querySelector('#priceChart');
        if (!container) return;

        if (!data || data.length === 0) {
            showMessage(container, 'Fiyat verisi bulunamadi');
            return;
        }

        clearContainer(container);

        var seriesData = data.map(function (p) {
            return { x: new Date(p.date).getTime(), y: p.value };
        });

        var options = {
            chart: {
                type: 'area',
                height: 350,
                zoom: { enabled: false },
                animations: { enabled: false },
                toolbar: {
                    show: true,
                    tools: {
                        download: true,
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: false
                    }
                }
            },
            series: [{ name: 'NAV', data: seriesData }],
            xaxis: {
                type: 'datetime',
                labels: {
                    format: 'dd MMM yy'
                }
            },
            yaxis: {
                labels: {
                    formatter: function (value) {
                        return value.toFixed(6);
                    }
                }
            },
            tooltip: {
                x: {
                    format: 'dd MMM yyyy'
                }
            },
            colors: ['#405189'],
            fill: {
                type: 'gradient',
                gradient: {
                    opacityFrom: 0.4,
                    opacityTo: 0.1
                }
            },
            stroke: {
                curve: 'smooth',
                width: 2
            },
            dataLabels: {
                enabled: false
            }
        };

        var chart = new ApexCharts(container, options);
        chart.render();
    }

    /**
     * Varlik dagilimi grafigini ApexCharts donut chart olarak olusturur.
     *
     * @param {Object} allocation - Varlik dagilimi bilgisi
     */
    function renderAllocationChart(allocation) {
        var container = document.querySelector('#allocationChart');
        if (!container) return;

        if (!allocation) {
            showMessage(container, 'Dagilim verisi bulunamadi');
            return;
        }

        var mapping = [
            { key: 'stockPercentage', label: 'Hisse' },
            { key: 'bondPercentage', label: 'Tahvil/Bono' },
            { key: 'cashPercentage', label: 'Nakit' },
            { key: 'repoPercentage', label: 'Repo' },
            { key: 'foreignCurrencyPercentage', label: 'Doviz' },
            { key: 'otherPercentage', label: 'Diger' }
        ];

        var series = [];
        var labels = [];

        mapping.forEach(function (m) {
            var val = allocation[m.key];
            if (val != null && val !== 0) {
                series.push(val);
                labels.push(m.label);
            }
        });

        if (series.length === 0) {
            showMessage(container, 'Dagilim verisi bulunamadi');
            return;
        }

        var options = {
            chart: {
                type: 'donut',
                height: 250
            },
            series: series,
            labels: labels,
            colors: ['#405189', '#0ab39c', '#f7b84b', '#f06548', '#299cdb', '#6c757d'],
            legend: {
                position: 'bottom'
            },
            dataLabels: {
                enabled: true,
                formatter: function (val) {
                    return val.toFixed(1) + '%';
                }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%'
                    }
                }
            }
        };

        var chart = new ApexCharts(container, options);
        chart.render();
    }

    /**
     * AJAX ile zaman serisi verisi cekip grafik olusturur.
     *
     * @param {string} url - Veri endpoint URL'i
     * @param {string} containerId - Grafik container element ID'si
     * @param {string} chartType - Grafik tipi ('bar' veya 'line')
     * @param {string} seriesName - Seri adi (grafik legend'inda gorunur)
     */
    function fetchAndRenderChart(url, containerId, chartType, seriesName) {
        var container = document.getElementById(containerId);
        if (!container) return;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 15000;

        xhr.onload = function () {
            clearContainer(container);

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var items = JSON.parse(xhr.responseText);

                    if (!items || items.length === 0) {
                        showMessage(container, 'Veri bulunamadi');
                        return;
                    }

                    var seriesData = items.map(function (i) {
                        return { x: i.date, y: i.value };
                    });

                    var options = {
                        chart: {
                            type: chartType === 'bar' ? 'bar' : 'line',
                            height: 300,
                            zoom: { enabled: false },
                            animations: { enabled: false },
                            toolbar: {
                                show: true,
                                tools: {
                                    download: true,
                                    selection: false,
                                    zoom: false,
                                    zoomin: false,
                                    zoomout: false,
                                    pan: false,
                                    reset: false
                                }
                            }
                        },
                        series: [{ name: seriesName, data: seriesData }],
                        xaxis: {
                            type: 'category'
                        },
                        dataLabels: {
                            enabled: false
                        }
                    };

                    if (chartType === 'bar') {
                        options.colors = ['#405189'];
                    } else {
                        options.colors = ['#0ab39c'];
                        options.stroke = { width: 2 };
                    }

                    var chart = new ApexCharts(container, options);
                    chart.render();

                } catch (e) {
                    showMessage(container, 'Veri yuklenemedi');
                }
            } else {
                showMessage(container, 'Veri yuklenemedi');
            }
        };

        xhr.onerror = function () {
            showMessage(container, 'Veri yuklenemedi');
        };

        xhr.ontimeout = function () {
            showMessage(container, 'Veri yuklenemedi');
        };

        xhr.send();
    }

    /**
     * Sayfa baslatma fonksiyonu.
     * Tum grafikleri olusturur ve AJAX cagrilerini baslatir.
     */
    function init() {
        formatPortfolioSize();
        formatHoldingMarketValues();
        calculateReturnBars();
        renderPriceChart(window.fundPriceHistory);
        renderAllocationChart(window.fundAllocation);

        if (window.fundCode) {
            fetchAndRenderChart('/ajax/fonlar/' + window.fundCode + '/cashflow', 'cashflowChart', 'bar', 'Nakit Akisi');
            fetchAndRenderChart('/ajax/fonlar/' + window.fundCode + '/investors', 'investorChart', 'line', 'Yatirimci Sayisi');
        }
    }

    // DOMContentLoaded ile baslat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
