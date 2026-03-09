/*
 * Scyborsa - Analistler Sparkline Chart Init
 *
 * Analist kartlarindaki sparkline area chart'larini dinamik olarak
 * olusturur. Velzon2 sellers.init.js'in dinamik versiyonu.
 *
 * Bagimliliklari:
 *   - apexcharts.min.js
 *   - getChartColorsArray() (dashboard-crypto.init.js veya bu dosyada tanimli)
 */

// getChartColorsArray tanimli degilse fallback olarak tanimla
if (typeof getChartColorsArray === 'undefined') {
    function getChartColorsArray(chartId) {
        if (document.getElementById(chartId) !== null) {
            var colors = document.getElementById(chartId).getAttribute("data-colors");
            if (colors) {
                colors = JSON.parse(colors);
                return colors.map(function (value) {
                    var newValue = value.replace(" ", "");
                    if (newValue.indexOf(",") === -1) {
                        var color = getComputedStyle(document.documentElement).getPropertyValue(newValue);
                        if (color) return color;
                        else return newValue;
                    } else {
                        var val = value.split(",");
                        if (val.length == 2) {
                            var rgbaColor = getComputedStyle(document.documentElement).getPropertyValue(val[0]);
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
}

// Tum analist chart'larini dinamik olarak olustur
document.querySelectorAll('[id^="chart-analist-"]').forEach(function (el) {
    var chartColors = getChartColorsArray(el.id);
    if (!chartColors) return;

    var rawData = el.getAttribute("data-chart-data") || "[]";
    var chartData;
    try {
        chartData = JSON.parse(rawData);
    } catch (e) {
        console.warn('[ANALIST-CHART] JSON parse hatasi:', el.id, e);
        chartData = [];
    }

    if (!chartData || chartData.length === 0) return;

    var options = {
        series: [{
            data: chartData
        }],
        chart: {
            type: "area",
            height: 50,
            sparkline: {
                enabled: true
            }
        },
        stroke: {
            curve: "smooth",
            width: 2
        },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                inverseColors: false,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [20, 100, 100, 100]
            }
        },
        colors: chartColors,
        tooltip: {
            fixed: {
                enabled: false
            },
            x: {
                show: false
            },
            y: {
                title: {
                    formatter: function () {
                        return "";
                    }
                }
            },
            marker: {
                show: false
            }
        }
    };

    new ApexCharts(el, options).render();
});
