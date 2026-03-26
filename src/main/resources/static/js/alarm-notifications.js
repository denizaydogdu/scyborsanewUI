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
    var USER_EMAIL = document.body.getAttribute('data-user-email') || '';
    var API_BASE = document.body.getAttribute('data-api-base') || '';
    var csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
    var csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');

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
     * Dropdown listesine yeni bildirim ekler (DOM API ile XSS-safe).
     *
     * @param {Object} notif bildirim nesnesi (stockCode, direction, message)
     */
    function addNotification(notif) {
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
        iconSpan.className = 'avatar-title bg-primary-subtle text-primary rounded-circle fs-16';
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
        time.appendChild(document.createTextNode(' Az once'));
        content.appendChild(time);

        row.appendChild(iconWrap);
        row.appendChild(content);
        div.appendChild(row);

        list.insertBefore(div, list.firstChild);
    }

    // 1. Okunmamis alarm sayisini getir
    if (USER_EMAIL) {
        fetch('/ajax/alerts/unread-count')
            .then(function(r) { if (!r.ok) throw new Error('failed'); return r.json(); })
            .then(function(data) {
                updateBadge(data.count || 0);
            })
            .catch(function() {
                // Sessizce basarisiz — alarm servisi henuz hazir olmayabilir
            });
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
                    // Listedeki bildirim ogelerini temizle
                    var items = list.querySelectorAll('.notification-item');
                    for (var i = 0; i < items.length; i++) {
                        items[i].remove();
                    }
                    if (noNotif) noNotif.style.display = '';
                })
                .catch(function() {
                    // Sessizce basarisiz
                });
        });
    }
})();
