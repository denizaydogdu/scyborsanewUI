(function() {
    'use strict';

    var PAGE_SIZE = 20;
    var allPatterns = [];
    var filteredPatterns = [];
    var currentPage = 1;
    var sortColumn = 'score';
    var sortOrder = 'desc';

    // Formasyon yon siniflandirmasi
    var BULLISH_PATTERNS = ['Yükselen Kanal', 'Yükselen Kama', 'Yükselen Üçgen'];
    var BEARISH_PATTERNS = ['Düşen Kanal', 'Düşen Kama', 'Düşen Üçgen'];

    function getPatternDirection(name) {
        if (BULLISH_PATTERNS.indexOf(name) !== -1) return 'bullish';
        if (BEARISH_PATTERNS.indexOf(name) !== -1) return 'bearish';
        return 'neutral';
    }
    function getDirectionColor(dir) {
        return { bullish: 'success', bearish: 'danger', neutral: 'warning' }[dir] || 'warning';
    }
    function getDirectionIcon(dir) {
        return { bullish: 'ri-arrow-up-line', bearish: 'ri-arrow-down-line', neutral: 'ri-arrow-left-right-line' }[dir] || 'ri-arrow-left-right-line';
    }
    function getDirectionBorder(dir) {
        return { bullish: '#0ab39c', bearish: '#ef476e', neutral: '#f9a825' }[dir] || '#f9a825';
    }

    // Formasyon SVG ikonlari
    var PATTERN_SVGS = {
        'Yükselen Kanal': '<svg width="48" height="28" viewBox="0 0 48 28"><polygon points="2,18 46,2 46,8 2,26" fill="#0ab39c" opacity="0.08"/><line x1="2" y1="26" x2="46" y2="8" stroke="#0ab39c" stroke-width="1" opacity="0.6"/><line x1="2" y1="18" x2="46" y2="2" stroke="#0ab39c" stroke-width="1" opacity="0.6"/><polyline points="4,24 8,19 12,23 16,17 20,21 24,14 28,18 32,11 36,15 40,9 44,5" stroke="#0ab39c" stroke-width="1.5" fill="none"/></svg>',
        'Düşen Kanal': '<svg width="48" height="28" viewBox="0 0 48 28"><polygon points="2,2 46,20 46,26 2,8" fill="#f06548" opacity="0.08"/><line x1="2" y1="2" x2="46" y2="20" stroke="#f06548" stroke-width="1" opacity="0.6"/><line x1="2" y1="8" x2="46" y2="26" stroke="#f06548" stroke-width="1" opacity="0.6"/><polyline points="4,4 8,7 12,5 16,10 20,8 24,13 28,11 32,17 36,14 40,21 44,23" stroke="#f06548" stroke-width="1.5" fill="none"/></svg>',
        'Yatay Kanal': '<svg width="48" height="28" viewBox="0 0 48 28"><polygon points="2,6 46,6 46,22 2,22" fill="#f7b84b" opacity="0.08"/><line x1="2" y1="6" x2="46" y2="6" stroke="#f7b84b" stroke-width="1" opacity="0.6"/><line x1="2" y1="22" x2="46" y2="22" stroke="#f7b84b" stroke-width="1" opacity="0.6"/><polyline points="4,18 8,8 12,20 16,9 20,19 24,8 28,20 32,9 36,18 40,10 44,14" stroke="#f7b84b" stroke-width="1.5" fill="none"/></svg>',
        'Yükselen Kama': '<svg width="48" height="28" viewBox="0 0 48 28"><polygon points="2,26 2,8 42,10 42,14" fill="#f06548" opacity="0.08"/><line x1="2" y1="8" x2="42" y2="10" stroke="#f06548" stroke-width="1" opacity="0.6"/><line x1="2" y1="26" x2="42" y2="14" stroke="#f06548" stroke-width="1" opacity="0.6"/><polyline points="4,22 8,10 12,20 16,11 20,18 24,11 28,15 32,11 36,14 40,12 44,20" stroke="#f06548" stroke-width="1.5" fill="none"/></svg>',
        'Düşen Kama': '<svg width="48" height="28" viewBox="0 0 48 28"><polygon points="2,2 2,26 42,16 42,12" fill="#0ab39c" opacity="0.08"/><line x1="2" y1="2" x2="42" y2="12" stroke="#0ab39c" stroke-width="1" opacity="0.6"/><line x1="2" y1="26" x2="42" y2="16" stroke="#0ab39c" stroke-width="1" opacity="0.6"/><polyline points="4,22 8,6 12,20 16,10 20,18 24,12 28,17 32,13 36,16 40,14 44,8" stroke="#0ab39c" stroke-width="1.5" fill="none"/></svg>',
        'Simetrik Üçgen': '<svg width="48" height="28" viewBox="0 0 48 28"><polygon points="2,2 2,26 44,14 44,14" fill="#f7b84b" opacity="0.08"/><line x1="2" y1="2" x2="44" y2="14" stroke="#f7b84b" stroke-width="1" opacity="0.6"/><line x1="2" y1="26" x2="44" y2="14" stroke="#f7b84b" stroke-width="1" opacity="0.6"/><polyline points="4,22 8,5 12,20 16,8 20,18 24,10 28,17 32,12 36,15 40,13 44,14" stroke="#f7b84b" stroke-width="1.5" fill="none"/></svg>',
        'Düşen Üçgen': '<svg width="48" height="28" viewBox="0 0 48 28"><polygon points="2,2 46,22 46,22 2,22" fill="#f06548" opacity="0.08"/><line x1="2" y1="22" x2="46" y2="22" stroke="#f06548" stroke-width="1" opacity="0.6"/><line x1="2" y1="2" x2="46" y2="22" stroke="#f06548" stroke-width="1" opacity="0.6"/><polyline points="4,4 8,20 12,6 16,21 20,10 24,21 28,14 32,21 36,18 40,21 44,26" stroke="#f06548" stroke-width="1.5" fill="none"/></svg>',
        'Yükselen Üçgen': '<svg width="48" height="28" viewBox="0 0 48 28"><polygon points="2,26 46,6 46,6 2,6" fill="#0ab39c" opacity="0.08"/><line x1="2" y1="6" x2="46" y2="6" stroke="#0ab39c" stroke-width="1" opacity="0.6"/><line x1="2" y1="26" x2="46" y2="6" stroke="#0ab39c" stroke-width="1" opacity="0.6"/><polyline points="4,24 8,8 12,22 16,7 20,18 24,7 28,15 32,7 36,12 40,7 44,3" stroke="#0ab39c" stroke-width="1.5" fill="none"/></svg>',
        'Dikdörtgen': '<svg width="48" height="28" viewBox="0 0 48 28"><polygon points="2,6 46,6 46,22 2,22" fill="#f7b84b" opacity="0.08"/><line x1="2" y1="6" x2="46" y2="6" stroke="#f7b84b" stroke-width="1" opacity="0.6"/><line x1="2" y1="22" x2="46" y2="22" stroke="#f7b84b" stroke-width="1" opacity="0.6"/><polyline points="4,12 8,20 12,8 16,20 20,8 24,18 28,8 32,20 36,8 40,18 44,14" stroke="#f7b84b" stroke-width="1.5" fill="none"/></svg>'
    };

    var PATTERN_INFO = {
        'Yükselen Kanal': {
            desc: 'Fiyat iki paralel yukarı eğimli çizgi arasında hareket eder. Trend devam formasyonudur.',
            direction: 'Yükseliş', dirColor: 'success', reliability: 'Orta', category: 'Devam',
            action: 'Destek çizgisinden alış, direnç çizgisinde kâr al. Kanal aşağı kırılırsa satış sinyali.',
            warning: 'Kanalın aşağı kırılması trend dönüşüne işaret edebilir.'
        },
        'Düşen Kanal': {
            desc: 'Fiyat iki paralel aşağı eğimli çizgi arasında hareket eder. Trend devam formasyonudur.',
            direction: 'Düşüş', dirColor: 'danger', reliability: 'Orta', category: 'Devam',
            action: 'Direnç çizgisinden satış, destek çizgisinde kısmi kâr al. Kanal yukarı kırılırsa alış sinyali.',
            warning: 'Kanalın yukarı kırılması trend dönüşüne işaret edebilir.'
        },
        'Yatay Kanal': {
            desc: 'Fiyat yatay destek ve direnç seviyeleri arasında sıkışır.',
            direction: 'Belirsiz', dirColor: 'warning', reliability: 'Yüksek', category: 'Nötr',
            action: 'Destekten alış, dirençten satış. Kırılma yönünde pozisyon alın.',
            warning: 'Uzun süreli yatay kanallar güçlü kırılmalara yol açabilir.'
        },
        'Yükselen Kama': {
            desc: 'Daralarak yukarı giden fiyat yapısı. Genellikle düşüş habercisidir.',
            direction: 'Düşüş', dirColor: 'danger', reliability: '%72-81', category: 'Dönüş',
            action: 'Kama aşağı kırıldığında satış sinyali. Stop-loss kama tepesinin üstünde.',
            warning: 'Yükselen kama yükseliş trendi içinde oluşabilir — kırılma beklenmelidir.'
        },
        'Düşen Kama': {
            desc: 'Daralarak aşağı giden fiyat yapısı. Genellikle yükseliş habercisidir.',
            direction: 'Yükseliş', dirColor: 'success', reliability: '%68-74', category: 'Dönüş',
            action: 'Kama yukarı kırıldığında alış sinyali. Stop-loss kama dibinin altında.',
            warning: 'Düşüş trendi içinde oluşur — kırılma öncesi erken giriş risklidir.'
        },
        'Simetrik Üçgen': {
            desc: 'Fiyat her iki yönden daralıyor. Kırılma yönü önceden bilinemez.',
            direction: 'Belirsiz', dirColor: 'warning', reliability: '%55-70', category: 'Devam',
            action: 'Kırılma yönüne göre pozisyon alın. Hacim artışı kırılmayı teyit eder.',
            warning: 'Yanlış kırılma (false breakout) riski yüksektir. Hacim teyidi şart.'
        },
        'Düşen Üçgen': {
            desc: 'Yatay destek üzerinde düşen direnç çizgisi. Genellikle aşağı kırılır.',
            direction: 'Düşüş', dirColor: 'danger', reliability: '%58-87', category: 'Devam',
            action: 'Destek kırıldığında satış. Hedef: üçgen yüksekliği kadar aşağı.',
            warning: 'Bazı durumlarda yukarı kırılma olabilir — hacim takibi önemli.'
        },
        'Yükselen Üçgen': {
            desc: 'Yatay direnç altında yükselen destek çizgisi. Genellikle yukarı kırılır.',
            direction: 'Yükseliş', dirColor: 'success', reliability: '%63-83', category: 'Devam',
            action: 'Direnç kırıldığında alış. Hedef: üçgen yüksekliği kadar yukarı.',
            warning: 'Direnci test eden her dokunuşta hacim artmalıdır.'
        },
        'Dikdörtgen': {
            desc: 'Fiyat yatay destek ve direnç arasında bant içinde hareket eder.',
            direction: 'Belirsiz', dirColor: 'warning', reliability: '%68-85', category: 'Nötr',
            action: 'Kırılma yönünü bekleyin. Yukarı kırılırsa alış, aşağı kırılırsa satış sinyali. Hacim artışı ile doğrulayın.',
            warning: 'Kırılma yönü belirsizdir. Pozisyon almadan önce hacim teyidi alınmalıdır.'
        }
    };

    function escHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getPatternSvg(name, width, height) {
        var svg = PATTERN_SVGS[name] || '';
        if (width && height && svg) {
            svg = svg.replace('width="48"', 'width="' + width + '"').replace('height="28"', 'height="' + height + '"');
        }
        return svg;
    }

    // DOM references
    var patternTypeSelect = document.getElementById('patternTypeSelect');
    var patternWindowSelect = document.getElementById('patternWindowSelect');
    var patternPeriodSelect = document.getElementById('patternPeriodSelect');
    var patternDirectionSelect = document.getElementById('patternDirectionSelect');
    var btnPatternScan = document.getElementById('btnPatternScan');
    var patternLoading = document.getElementById('patternLoading');
    var patternError = document.getElementById('patternError');
    var patternErrorText = document.getElementById('patternErrorText');
    var patternResults = document.getElementById('patternResults');
    var patternCountBadge = document.getElementById('patternCountBadge');
    var patternTableBody = document.getElementById('patternTableBody');
    var patternEmpty = document.getElementById('patternEmpty');
    var patternPagination = document.getElementById('patternPagination');
    var patternPaginationInfo = document.getElementById('patternPaginationInfo');
    var patternPaginationNav = document.getElementById('patternPaginationNav');
    var patternKpiCards = document.getElementById('patternKpiCards');
    var kpiTotalPatterns = document.getElementById('kpiTotalPatterns');
    var kpiBullishPatterns = document.getElementById('kpiBullishPatterns');
    var kpiBearishPatterns = document.getElementById('kpiBearishPatterns');
    var kpiNeutralPatterns = document.getElementById('kpiNeutralPatterns');

    function hideAll() {
        patternLoading.style.display = 'none';
        patternError.style.display = 'none';
        patternResults.style.display = 'none';
        if (patternKpiCards) patternKpiCards.style.display = 'none';
    }

    function fetchPatterns() {
        hideAll();
        patternLoading.style.display = '';

        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 30000);

        fetch('/ajax/hazir-taramalar/pattern-scan', { signal: controller.signal })
            .then(function(response) {
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function(data) {
                allPatterns = data.patterns || [];
                applyFilters();
                renderResults();
            })
            .catch(function(err) {
                clearTimeout(timeoutId);
                hideAll();
                patternErrorText.textContent = err.name === 'AbortError'
                    ? 'İstek zaman aşımına uğradı (30s).'
                    : 'Formasyon verileri alınamadı: ' + err.message;
                patternError.style.display = '';
            });
    }

    function applyFilters() {
        var type = patternTypeSelect.value;
        var windowVal = patternWindowSelect.value;
        var period = patternPeriodSelect.value;
        var direction = patternDirectionSelect ? patternDirectionSelect.value : 'all';

        filteredPatterns = allPatterns.filter(function(p) {
            if (type !== 'all' && p.patternName !== type) return false;
            if (windowVal !== 'all' && p.window !== parseInt(windowVal, 10)) return false;
            if (period !== 'all' && p.period !== period) return false;
            if (direction !== 'all' && getPatternDirection(p.patternName) !== direction) return false;
            return true;
        });

        sortData();
        currentPage = 1;
    }

    function sortData() {
        filteredPatterns.sort(function(a, b) {
            var valA = a[sortColumn];
            var valB = b[sortColumn];
            if (valA == null) return 1;
            if (valB == null) return -1;
            if (typeof valA === 'string') {
                valA = valA.toLocaleLowerCase('tr');
                valB = (valB || '').toLocaleLowerCase('tr');
            }
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function renderResults() {
        hideAll();

        if (filteredPatterns.length === 0) {
            patternResults.style.display = '';
            patternEmpty.style.display = '';
            patternTableBody.textContent = '';
            patternCountBadge.textContent = '0 Formasyon';
            patternPagination.style.display = 'none';
            renderKpiCards();
            return;
        }

        patternResults.style.display = '';
        patternEmpty.style.display = 'none';
        patternCountBadge.textContent = filteredPatterns.length + ' Formasyon';

        renderKpiCards();
        renderTable();
        renderPagination();
    }

    /**
     * Builds a single table row element for a pattern result.
     * Uses DOM methods instead of innerHTML for safety.
     */
    function buildRow(p, rowNum) {
        var direction = getPatternDirection(p.patternName);
        var dirColor = getDirectionColor(direction);
        var dirIcon = getDirectionIcon(direction);
        var dirBorder = getDirectionBorder(direction);

        var tr = document.createElement('tr');
        tr.style.borderLeft = '3px solid ' + dirBorder;
        if (p.filename) {
            tr.setAttribute('data-filename', p.filename);
            tr.setAttribute('data-symbol', p.symbol || '');
            tr.setAttribute('data-pattern', p.patternName || '');
            tr.setAttribute('data-score', p.score != null ? p.score.toFixed(3) : '');
            tr.setAttribute('data-distance', p.distance != null ? p.distance.toFixed(1) : '');
            tr.style.cursor = 'pointer';
        }

        // # column
        var tdNum = document.createElement('td');
        tdNum.textContent = rowNum;
        tr.appendChild(tdNum);

        // Hisse column (avatar + link)
        var tdSymbol = document.createElement('td');
        var divFlex = document.createElement('div');
        divFlex.className = 'd-flex align-items-center';

        var divAvatar = document.createElement('div');
        divAvatar.className = 'avatar-xs me-2';

        var img = document.createElement('img');
        img.src = '/img/stock-logos/' + (p.logoid || '');
        img.alt = '';
        img.className = 'rounded-circle';
        img.style.cssText = 'width:32px;height:32px;object-fit:cover;';

        var divFallback = document.createElement('div');
        divFallback.className = 'avatar-title rounded-circle bg-primary-subtle text-primary';
        divFallback.style.cssText = 'display:none;width:32px;height:32px;font-size:12px;';
        divFallback.textContent = (p.symbol || '??').substring(0, 2);

        img.onerror = function() {
            this.style.display = 'none';
            divFallback.style.display = 'flex';
        };

        divAvatar.appendChild(img);
        divAvatar.appendChild(divFallback);

        var link = document.createElement('a');
        link.href = '/stock/detail/' + p.symbol;
        link.className = 'text-reset fw-medium';
        link.textContent = p.symbol;

        divFlex.appendChild(divAvatar);
        divFlex.appendChild(link);
        tdSymbol.appendChild(divFlex);
        tr.appendChild(tdSymbol);

        // Formasyon column (direction-colored badge with icon)
        var tdPattern = document.createElement('td');
        tdPattern.className = 'text-center';
        var badge = document.createElement('span');
        badge.className = 'badge bg-' + dirColor + '-subtle text-' + dirColor;
        var badgeIcon = document.createElement('i');
        badgeIcon.className = dirIcon + ' text-' + dirColor + ' me-1';
        // Add SVG icon before direction icon
        var svgHtml = getPatternSvg(p.patternName);
        if (svgHtml) {
            var svgSpan = document.createElement('span');
            svgSpan.className = 'me-1';
            svgSpan.innerHTML = svgHtml;
            badge.appendChild(svgSpan);
        }
        badge.appendChild(badgeIcon);
        badge.appendChild(document.createTextNode(p.patternName || '-'));
        tdPattern.appendChild(badge);
        tr.appendChild(tdPattern);

        // Skor column (progress bar + number)
        var tdScore = document.createElement('td');
        tdScore.className = 'text-end';
        var scoreColor = p.score >= 0.25 ? 'success' : (p.score >= 0.15 ? 'warning' : 'secondary');
        var scoreWrapper = document.createElement('div');
        scoreWrapper.className = 'd-flex align-items-center justify-content-end gap-2';

        var progressDiv = document.createElement('div');
        progressDiv.className = 'progress progress-sm';
        progressDiv.style.width = '60px';
        var progressBar = document.createElement('div');
        progressBar.className = 'progress-bar bg-' + scoreColor;
        progressBar.style.width = (p.score != null ? (p.score * 100) : 0) + '%';
        progressDiv.appendChild(progressBar);

        var scoreSpan = document.createElement('span');
        scoreSpan.className = 'fw-semibold text-' + scoreColor;
        scoreSpan.textContent = p.score != null ? p.score.toFixed(3) : '-';

        scoreWrapper.appendChild(progressDiv);
        scoreWrapper.appendChild(scoreSpan);
        tdScore.appendChild(scoreWrapper);
        tr.appendChild(tdScore);

        // Uzaklik column (badge wrapped)
        var tdDistance = document.createElement('td');
        tdDistance.className = 'text-end';
        var distBadge = document.createElement('span');
        distBadge.className = 'badge bg-light text-dark';
        distBadge.textContent = p.distance != null ? '%' + p.distance.toFixed(1) : '-';
        tdDistance.appendChild(distBadge);
        tr.appendChild(tdDistance);

        // Periyot column (two vertical badges)
        var tdMeta = document.createElement('td');
        tdMeta.className = 'text-center';
        var metaWrap = document.createElement('div');
        metaWrap.className = 'd-flex flex-column gap-1 align-items-center';

        var periodBadge = document.createElement('span');
        periodBadge.className = p.period === '1W' ? 'badge bg-info-subtle text-info fs-10' : 'badge bg-primary-subtle text-primary fs-10';
        periodBadge.textContent = p.period === '1W' ? 'Haftalık' : 'Günlük';

        var mumBadge = document.createElement('span');
        mumBadge.className = 'badge bg-secondary-subtle text-secondary fs-10';
        mumBadge.textContent = (p.window || '-') + ' Mum';

        metaWrap.appendChild(periodBadge);
        metaWrap.appendChild(mumBadge);
        tdMeta.appendChild(metaWrap);
        tr.appendChild(tdMeta);

        return tr;
    }

    function renderTable() {
        var start = (currentPage - 1) * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, filteredPatterns.length);
        var pageData = filteredPatterns.slice(start, end);

        // Clear table body
        while (patternTableBody.firstChild) {
            patternTableBody.removeChild(patternTableBody.firstChild);
        }

        var fragment = document.createDocumentFragment();
        pageData.forEach(function(p, idx) {
            fragment.appendChild(buildRow(p, start + idx + 1));
        });
        patternTableBody.appendChild(fragment);

        // Row click → pattern detail modal
        patternTableBody.querySelectorAll('tr[data-filename]').forEach(function(row) {
            row.addEventListener('click', function(e) {
                if (e.target.closest('a')) return;

                var filename = this.getAttribute('data-filename');
                var symbol = this.getAttribute('data-symbol');
                var pattern = this.getAttribute('data-pattern');
                var score = this.getAttribute('data-score');
                var distance = this.getAttribute('data-distance');

                if (!pattern) return;

                var info = PATTERN_INFO[pattern] || {};
                var largeSvg = getPatternSvg(pattern, 280, 160);

                var modalTitle = document.getElementById('patternModalTitle');
                var modalBody = document.getElementById('patternModalBody');
                modalTitle.textContent = symbol + ' - ' + pattern;

                // Score color
                var scoreNum = parseFloat(score) || 0;
                var scoreColor = scoreNum >= 0.25 ? 'success' : (scoreNum >= 0.15 ? 'warning' : 'secondary');

                // Distance label
                var distNum = parseFloat(distance) || 0;
                var distLabel;
                if (distNum <= 1) distLabel = '%' + distNum.toFixed(1) + ' (çok yakın!)';
                else if (distNum <= 3) distLabel = '%' + distNum.toFixed(1) + ' (yakın)';
                else distLabel = '%' + distNum.toFixed(1) + ' (uzak)';

                // Period info from current filters or data
                var periodText = document.getElementById('patternPeriodSelect').value;
                var windowText = document.getElementById('patternWindowSelect').value;
                if (periodText === 'all') periodText = '1D';
                if (windowText === 'all') windowText = '10';
                var periodLabel = periodText === '1W' ? 'Haftalık' : 'Günlük';

                var bodyHtml = '';
                // Large SVG
                bodyHtml += '<div class="text-center py-3 bg-light rounded mb-3">' + largeSvg + '</div>';

                // 4 stat cards row
                bodyHtml += '<div class="row g-2 mb-3">';
                bodyHtml += '<div class="col-3"><div class="border rounded p-2 text-center"><small class="text-muted d-block fs-11">Yön</small><span class="fw-semibold text-' + (info.dirColor || 'secondary') + '">' + (info.direction || '-') + '</span></div></div>';
                bodyHtml += '<div class="col-3"><div class="border rounded p-2 text-center"><small class="text-muted d-block fs-11">Güvenilirlik</small><span class="fw-semibold">' + (info.reliability || '-') + '</span></div></div>';
                bodyHtml += '<div class="col-3"><div class="border rounded p-2 text-center"><small class="text-muted d-block fs-11">Skor</small><span class="fw-semibold text-' + scoreColor + '">' + (score || '-') + '</span></div></div>';
                bodyHtml += '<div class="col-3"><div class="border rounded p-2 text-center"><small class="text-muted d-block fs-11">Uzaklık</small><span class="fw-semibold">' + distLabel + '</span></div></div>';
                bodyHtml += '</div>';

                // Description
                bodyHtml += '<div class="mb-3"><h6 class="fs-13"><i class="ri-book-line me-1 text-primary"></i>Formasyon Hakkında</h6><p class="text-muted fs-13 mb-0">' + (info.desc || '') + '</p></div>';

                // Action guide
                if (info.action) {
                    bodyHtml += '<div class="mb-3"><h6 class="fs-13"><i class="ri-lightbulb-line me-1 text-warning"></i>Ne Yapılmalı?</h6><p class="text-muted fs-13 mb-0">' + info.action + '</p></div>';
                }

                // Warning
                if (info.warning) {
                    bodyHtml += '<div class="alert alert-warning py-2 fs-12 mb-3"><i class="ri-error-warning-line me-1"></i>' + info.warning + '</div>';
                }

                // Category + Period info
                bodyHtml += '<div class="d-flex justify-content-center gap-2 mb-3">';
                if (info.category) {
                    var catColor = info.category === 'Devam' ? 'info' : (info.category === 'Dönüş' ? 'primary' : 'secondary');
                    bodyHtml += '<span class="badge bg-' + catColor + '-subtle text-' + catColor + '"><i class="ri-bookmark-line me-1"></i>' + info.category + ' Formasyonu</span>';
                }
                bodyHtml += '<span class="badge bg-secondary-subtle text-secondary"><i class="ri-time-line me-1"></i>' + periodLabel + ' | ' + windowText + ' Mum</span>';
                bodyHtml += '</div>';

                // Stock detail button
                bodyHtml += '<div class="text-center"><a href="/stock/detail/' + escHtml(symbol) + '" class="btn btn-sm btn-primary"><i class="ri-line-chart-line me-1"></i>Hisse Detayına Git</a></div>';

                modalBody.innerHTML = bodyHtml;

                var modalEl = document.getElementById('patternImageModal');
                var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modal.show();
            });
        });
    }

    function renderKpiCards() {
        if (!patternKpiCards) return;
        var bullish = 0, bearish = 0, neutral = 0;
        filteredPatterns.forEach(function(p) {
            var d = getPatternDirection(p.patternName);
            if (d === 'bullish') bullish++;
            else if (d === 'bearish') bearish++;
            else neutral++;
        });
        kpiTotalPatterns.textContent = filteredPatterns.length;
        kpiBullishPatterns.textContent = bullish;
        kpiBearishPatterns.textContent = bearish;
        if (kpiNeutralPatterns) kpiNeutralPatterns.textContent = neutral;
        patternKpiCards.style.display = '';
    }

    function renderPagination() {
        var totalPages = Math.ceil(filteredPatterns.length / PAGE_SIZE);

        if (totalPages <= 1) {
            patternPagination.style.display = 'none';
            patternPaginationInfo.textContent = filteredPatterns.length + ' formasyon';
            return;
        }

        patternPagination.style.display = '';
        var start = (currentPage - 1) * PAGE_SIZE + 1;
        var end = Math.min(currentPage * PAGE_SIZE, filteredPatterns.length);
        patternPaginationInfo.textContent = start + '-' + end + ' / ' + filteredPatterns.length + ' formasyon';

        // Clear pagination nav
        while (patternPaginationNav.firstChild) {
            patternPaginationNav.removeChild(patternPaginationNav.firstChild);
        }

        var maxVisible = 7;
        var startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        var endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        function createPageItem(page, content, disabled, active) {
            var li = document.createElement('li');
            li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
            var a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            if (typeof content === 'string' && content.startsWith('ri-')) {
                var icon = document.createElement('i');
                icon.className = content;
                a.appendChild(icon);
            } else {
                a.textContent = content;
            }
            a.addEventListener('click', function(e) {
                e.preventDefault();
                if (page >= 1 && page <= totalPages && page !== currentPage) {
                    currentPage = page;
                    renderTable();
                    renderPagination();
                }
            });
            li.appendChild(a);
            return li;
        }

        // Previous
        patternPaginationNav.appendChild(
            createPageItem(currentPage - 1, 'ri-arrow-left-s-line', currentPage === 1, false)
        );

        // Page numbers
        for (var i = startPage; i <= endPage; i++) {
            patternPaginationNav.appendChild(
                createPageItem(i, String(i), false, i === currentPage)
            );
        }

        // Next
        patternPaginationNav.appendChild(
            createPageItem(currentPage + 1, 'ri-arrow-right-s-line', currentPage === totalPages, false)
        );
    }

    // Event listeners
    btnPatternScan.addEventListener('click', fetchPatterns);

    // Dropdown change -> re-filter (no re-fetch)
    [patternTypeSelect, patternWindowSelect, patternPeriodSelect, patternDirectionSelect].forEach(function(select) {
        if (select) {
            select.addEventListener('change', function() {
                if (allPatterns.length > 0) {
                    applyFilters();
                    renderResults();
                }
            });
        }
    });

    // Sort headers
    var sortHeaders = document.querySelectorAll('.pattern-sortable');
    if (sortHeaders && sortHeaders.length > 0) {
        sortHeaders.forEach(function(header) {
            header.addEventListener('click', function() {
                var col = this.getAttribute('data-col');
                if (sortColumn === col) {
                    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = col;
                    sortOrder = col === 'symbol' || col === 'patternName' ? 'asc' : 'desc';
                }
                // Update sort icons
                sortHeaders.forEach(function(h) {
                    var icon = h.querySelector('i');
                    if (icon) {
                        icon.className = 'ri-arrow-up-down-line text-muted fs-13';
                    }
                });
                var activeIcon = this.querySelector('i');
                if (activeIcon) {
                    activeIcon.className = sortOrder === 'asc'
                        ? 'ri-arrow-up-s-fill text-primary fs-13'
                        : 'ri-arrow-down-s-fill text-primary fs-13';
                }

                sortData();
                currentPage = 1;
                renderTable();
                renderPagination();
            });
        });
    }

    // Auto-load — IIFE icinde DOM zaten hazir
    fetchPatterns();

    // Bootstrap tooltip init
    var tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length > 0) {
        tooltipTriggerList.forEach(function(el) {
            new bootstrap.Tooltip(el);
        });
    }

})();
