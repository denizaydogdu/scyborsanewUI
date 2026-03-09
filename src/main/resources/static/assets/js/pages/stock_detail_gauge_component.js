class GaugeCharts {
    constructor() {
        this.gauges = {
            'short-term-gauge': null,
            'medium-term-gauge': null,
            'long-term-gauge': null
        };
        this.init();
    }

    init() {
        Object.keys(this.gauges).forEach(gaugeId => {
            const container = document.getElementById(gaugeId);
            if (container) {
                this.createGauge(gaugeId, container);
            }
        });
    }

    createGauge(gaugeId, container) {
        const svg = `
            <svg viewBox="-100 -100 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                <path d="M -75,0 A 75 75 0 0 1 -53,-53" stroke="#ef4444" stroke-width="6" fill="none"/>
                <path d="M -53,-53 A 75 75 0 0 1 -23,-71" stroke="#f97316" stroke-width="6" fill="none"/>
                <path d="M -23,-71 A 75 75 0 0 1 23,-71" stroke="#a3a3a3" stroke-width="6" fill="none"/>
                <path d="M 23,-71 A 75 75 0 0 1 53,-53" stroke="#22c55e" stroke-width="6" fill="none"/>
                <path d="M 53,-53 A 75 75 0 0 1 75,0" stroke="#16a34a" stroke-width="6" fill="none"/>

                <text x="-75" y="10" fill="#ef4444" font-size="10" text-anchor="middle">Güçlü Sat</text>
                <text x="-60" y="-45" fill="#f97316" font-size="10" text-anchor="end">Sat</text>
                <text x="0" y="-80" fill="#a3a3a3" font-size="10" text-anchor="middle">Nötr</text>
                <text x="60" y="-45" fill="#22c55e" font-size="10" text-anchor="start">Al</text>
                <text x="75" y="10" fill="#16a34a" font-size="10" text-anchor="middle">Güçlü Al</text>

                <g class="needle ${gaugeId}-needle">
                    <line x1="0" y1="0" x2="0" y2="-60" stroke="black" stroke-width="2.5" stroke-linecap="round"/>
                    <circle cx="0" cy="0" r="5" fill="#1f2937"/>
                </g>
            </svg>
        `;
        container.innerHTML = svg;
        const needle = container.querySelector(`.${gaugeId}-needle`);
        if (needle) {
            this.gauges[gaugeId] = needle;
        }
    }

    getDegreeFromSignal(signal) {
        switch (signal) {
            case "Güçlü Sat": return -72;
            case "Sat":       return -36;
            case "Nötr":      return 0;
            case "Al":        return 36;
            case "Güçlü Al":  return 72;
            default:          return 0;
        }
    }

    updateGauge(gaugeId, degree) {
        const needle = this.gauges[gaugeId];
        if (needle) {
            const normalizedDegree = Math.max(-90, Math.min(90, degree));
            needle.setAttribute('transform', `rotate(${normalizedDegree})`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const gaugeCharts = new GaugeCharts();
    gaugeCharts.updateGauge('short-term-gauge', gaugeCharts.getDegreeFromSignal(shortTermSignal));
    gaugeCharts.updateGauge('medium-term-gauge', gaugeCharts.getDegreeFromSignal(mediumTermSignal));
    gaugeCharts.updateGauge('long-term-gauge', gaugeCharts.getDegreeFromSignal(longTermSignal));
});
