/**
 * Fiyat alarmi bildirim sistemi.
 *
 * Her sayfada yuklenir. Okunmamis alarm sayisini topbar badge'inda gosterir.
 * STOMP uzerinden gercek zamanli bildirim alir ve dropdown listesini gunceller.
 *
 * Gereksinimler:
 * - body[data-user-email] attribute (GlobalModelAdvice tarafindan eklenir)
 * - body[data-api-base] attribute (GlobalModelAdvice tarafindan eklenir)
 * - SockJS + StompJs kutuphane (layout.html'de yuklenir)
 */
(function() {
    'use strict';

    var badge = document.getElementById('notification-badge');
    var list = document.getElementById('notification-list');
    var noNotif = document.getElementById('no-notifications');
    var markAllBtn = document.getElementById('mark-all-read');

    // Topbar yoksa (ornegin login sayfasi) hicbir sey yapma
    if (!badge) return;

    var unreadCount = 0;
    var seenAlertIds = {};
    var USER_EMAIL = document.body.getAttribute('data-user-email') || '';
    var API_BASE = document.body.getAttribute('data-api-base') || '';
    var csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
    var csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');

    var bellIcon = document.querySelector('#page-header-notifications-dropdown .bx-bell');
    var bellPulseTimer = null;

    /**
     * Badge sayisini gunceller.
     *
     * @param {number} count okunmamis bildirim sayisi
     */
    function updateBadge(count) {
        unreadCount = count;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * Zil ikonuna dikkat cekici animasyon uygular.
     * Kullanici bildirim dropdown'ina tiklayana kadar sallanir.
     */
    function animateBell() {
        if (!bellIcon) return;

        // Badge pulse efekti (onceki timer'i temizle — stacking engeli)
        badge.style.transition = 'transform 0.3s ease';
        badge.style.transform = 'scale(1.4)';
        if (bellPulseTimer) clearTimeout(bellPulseTimer);
        bellPulseTimer = setTimeout(function() {
            badge.style.transform = 'scale(1)';
            bellPulseTimer = null;
        }, 300);

        // Zil sallama — kullanici tiklayana kadar devam eder
        bellIcon.classList.add('bell-shake');
    }

    /**
     * Zil sallamayi durdurur.
     */
    function stopBellShake() {
        if (bellIcon) bellIcon.classList.remove('bell-shake');
    }

    /**
     * Dropdown acildiginda: zil durdur + okunmamis bildirimleri otomatik okundu isaretle.
     * Boylece sonraki sayfa gecislerinde zil tekrar sallanmaz.
     */
    var bellBtn = document.getElementById('page-header-notifications-dropdown');
    if (bellBtn) {
        bellBtn.addEventListener('click', function() {
            stopBellShake();
            // Okunmamis bildirim varsa otomatik okundu isaretle (DB guncelle)
            if (unreadCount > 0 && USER_EMAIL) {
                var countAtClick = unreadCount;
                var headers = {};
                if (csrfHeader && csrfToken) headers[csrfHeader] = csrfToken;
                fetch('/ajax/alerts/read-all', { method: 'PUT', headers: headers })
                    .then(function(r) {
                        if (!r.ok) return;
                        // Fetch sirasinda yeni STOMP alarm geldiyse onu koruma
                        var newArrived = unreadCount - countAtClick;
                        updateBadge(newArrived > 0 ? newArrived : 0);
                        seenAlertIds = {};
                    })
                    .catch(function() {});
            }
        });
    }

    /**
     * Dropdown listesine yeni bildirim ekler (DOM API ile XSS-safe).
     *
     * @param {Object} notif bildirim nesnesi (stockCode, direction, message)
     */
    function addNotification(notif) {
        if (notif.alertId && seenAlertIds[notif.alertId]) return;
        if (notif.alertId) seenAlertIds[notif.alertId] = true;
        if (noNotif) noNotif.style.display = 'none';

        var isAbove = notif.direction === 'ABOVE';
        var stockCode = notif.stockCode || '';
        var message = notif.message || '';

        // Ana konteyner
        var div = document.createElement('div');
        div.className = 'text-reset notification-item d-block dropdown-item position-relative';

        var row = document.createElement('div');
        row.className = 'd-flex';

        // Sol ikon
        var iconWrap = document.createElement('div');
        iconWrap.className = 'flex-shrink-0 avatar-xs me-3';
        var iconSpan = document.createElement('span');
        iconSpan.className = 'avatar-title bg-light rounded-circle fs-16';
        var icon = document.createElement('i');
        icon.className = isAbove ? 'ri-arrow-up-line text-success' : 'ri-arrow-down-line text-danger';
        iconSpan.appendChild(icon);
        iconWrap.appendChild(iconSpan);

        // Sag icerik
        var content = document.createElement('div');
        content.className = 'flex-grow-1';
        var link = document.createElement('a');
        link.href = '/stock/detail/' + encodeURIComponent(stockCode);
        link.className = 'stretched-link';
        var title = document.createElement('h6');
        title.className = 'mt-0 mb-1 fs-13 fw-semibold';
        title.textContent = stockCode + ' ' + message;
        link.appendChild(title);
        content.appendChild(link);

        var time = document.createElement('p');
        time.className = 'mb-0 fs-11 text-muted';
        var clockIcon = document.createElement('i');
        clockIcon.className = 'mdi mdi-clock-outline';
        time.appendChild(clockIcon);
        time.appendChild(document.createTextNode(' ' + formatRelativeTime(notif.triggeredAt)));
        content.appendChild(time);

        row.appendChild(iconWrap);
        row.appendChild(content);
        div.appendChild(row);

        list.insertBefore(div, list.firstChild);
    }

    /**
     * Tetiklenme zamanini relative formata cevirir.
     * @param {string|null} triggeredAt ISO tarih string veya null
     * @returns {string} "Az önce", "5dk önce", "2 saat önce", "Dün", vb.
     */
    function formatRelativeTime(triggeredAt) {
        if (!triggeredAt) return 'Az önce';
        try {
            var triggered = new Date(triggeredAt);
            var now = new Date();
            var diffMs = now - triggered;
            var diffMin = Math.floor(diffMs / 60000);
            var diffHour = Math.floor(diffMs / 3600000);
            var diffDay = Math.floor(diffMs / 86400000);

            if (diffMin < 1) return 'Az önce';
            if (diffMin < 60) return diffMin + 'dk önce';
            if (diffHour < 24) return diffHour + ' saat önce';
            if (diffDay === 1) return 'Dün';
            if (diffDay < 7) return diffDay + ' gün önce';
            return triggered.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return 'Az önce';
        }
    }

    // 1. Okunmamis alarm sayisini getir + dropdown'a gecmis alarmlari yukle
    if (USER_EMAIL) {
        // Badge count
        fetch('/ajax/alerts/unread-count')
            .then(function(r) { if (!r.ok) throw new Error('failed'); return r.json(); })
            .then(function(data) {
                updateBadge(data.count || 0);
                if (data.count > 0) animateBell();
            })
            .catch(function() {});

        // Tetiklenmis ama okunmamis alarmlari dropdown'a yukle (offline gecmisi)
        fetch('/ajax/alerts?status=TRIGGERED')
            .then(function(r) { if (!r.ok) throw new Error('failed'); return r.json(); })
            .then(function(alerts) {
                var unread = alerts.filter(function(a) { return !a.readAt; });
                if (unread.length > 0 && noNotif) noNotif.style.display = 'none';
                unread.forEach(function(a) {
                    addNotification({
                        alertId: a.id,
                        stockCode: a.stockCode,
                        direction: a.direction,
                        message: a.triggerPrice
                            ? (a.direction === 'ABOVE' ? 'hedefe ulaştı ≥' : 'hedefe ulaştı ≤') + ' ' + Number(a.triggerPrice).toLocaleString('tr-TR', {minimumFractionDigits:2}) + '₺'
                            : (a.direction === 'ABOVE' ? 'hedefe ulaştı' : 'hedefe ulaştı'),
                        triggeredAt: a.triggeredAt
                    });
                });
            })
            .catch(function() {});
    }

    // 2. STOMP baglantisi — gercek zamanli bildirimler
    if (USER_EMAIL && typeof SockJS !== 'undefined' && typeof StompJs !== 'undefined') {
        var client = new StompJs.Client({
            webSocketFactory: function() {
                return new SockJS(API_BASE + '/ws');
            },
            connectHeaders: { email: USER_EMAIL },
            reconnectDelay: 10000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000
        });

        client.onConnect = function() {
            client.subscribe('/user/queue/notifications', function(msg) {
                try {
                    var notif = JSON.parse(msg.body);
                    updateBadge(unreadCount + 1);
                    addNotification(notif);
                    // Dropdown aciksa sallama (kullanici zaten bakiyor)
                    var isOpen = bellBtn && bellBtn.getAttribute('aria-expanded') === 'true';
                    if (!isOpen) animateBell();
                } catch (e) {
                    // JSON parse hatasi — sessizce atla
                }
            });
        };

        client.onStompError = function() {
            // STOMP hatasi — reconnect otomatik
        };

        client.activate();
    }

    // 3. Tumunu okundu isaretle
    if (markAllBtn && USER_EMAIL) {
        markAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            var headers = {};
            if (csrfHeader && csrfToken) headers[csrfHeader] = csrfToken;
            fetch('/ajax/alerts/read-all', { method: 'PUT', headers: headers })
                .then(function(r) {
                    if (!r.ok) return;
                    updateBadge(0);
                    stopBellShake();
                    // Listedeki bildirim ogelerini temizle
                    var items = list.querySelectorAll('.notification-item');
                    for (var i = 0; i < items.length; i++) {
                        items[i].remove();
                    }
                    if (noNotif) noNotif.style.display = '';
                    seenAlertIds = {};
                })
                .catch(function() {
                    // Sessizce basarisiz
                });
        });
    }
})();
