/**
 * Session Guard — Oturum suresi dolunca kullaniciyi login sayfasina yonlendirir.
 *
 * <p>Global fetch interceptor ile tum AJAX yanitlarini izler. Spring Security
 * session timeout sonrasi /login'e redirect yaptiginda bunu yakalar ve
 * kullaniciyi login sayfasina yonlendirir.</p>
 */
(function () {
    'use strict';

    var SESSION_CHECK_INTERVAL = 60000; // 60sn
    var redirecting = false;

    /**
     * Login sayfasina yonlendirir (tekrar cagriyi onler).
     */
    function redirectToLogin() {
        if (redirecting) return;
        redirecting = true;
        window.location.href = '/login?timeout=true';
    }

    /**
     * Yanit iceriginin login sayfasi olup olmadigini kontrol eder.
     *
     * @param {string} text - Yanit metni
     * @returns {boolean} Login sayfasi ise true
     */
    function isLoginPage(text) {
        return text && text.indexOf('loginBtn') !== -1 && text.indexOf('auth-page-wrapper') !== -1;
    }

    // Global fetch interceptor
    var originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(function (response) {
            // Login URL'sine redirect edildiyse
            if (response.redirected && response.url && response.url.indexOf('/login') !== -1) {
                redirectToLogin();
            }
            return response;
        });
    };

    // Global XMLHttpRequest interceptor (eski AJAX cagrilari icin)
    var originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
        this.addEventListener('load', function () {
            if (this.responseURL && this.responseURL.indexOf('/login') !== -1) {
                // Yanit login sayfasi HTML'i mi kontrol et
                if (isLoginPage(this.responseText)) {
                    redirectToLogin();
                }
            }
        });
        return originalOpen.apply(this, arguments);
    };

    // Periyodik session kontrolu (polling olmayan sayfalarda da calisir)
    setInterval(function () {
        if (redirecting) return;
        fetch('/ajax/session-check', { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok || (res.redirected && res.url.indexOf('/login') !== -1)) {
                    redirectToLogin();
                }
            })
            .catch(function () {
                // ag hatasi — session kontrolu atlaniyor
            });
    }, SESSION_CHECK_INTERVAL);
})();
