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
        return text && text.indexOf('<!-- scyborsa-login-page -->') !== -1;
    }

    // Global fetch interceptor
    var originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(function (response) {
            try {
                if (response.redirected && response.url && response.url.indexOf('/login') !== -1) {
                    redirectToLogin();
                }
            } catch (e) { /* guard hatasi — yoksay */ }
            return response;
        });
    };

    // Global XMLHttpRequest interceptor (eski AJAX cagrilari icin)
    var originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
        this.addEventListener('load', function () {
            if (this.responseURL && this.responseURL.indexOf('/login') !== -1) {
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
                if (redirecting) return;
                if (!res.ok) {
                    redirectToLogin();
                }
            })
            .catch(function () {
                // ag hatasi — session kontrolu atlaniyor
            });
    }, SESSION_CHECK_INTERVAL);
})();
