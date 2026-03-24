/**
 * Session Guard — Oturum suresi dolunca kullaniciyi login sayfasina yonlendirir.
 *
 * <p>Global fetch interceptor ile tum AJAX yanitlarini izler. Spring Security
 * session timeout veya concurrent session kick sonrasi /login'e redirect
 * yaptiginda bunu yakalar ve kullaniciyi uygun mesajla login sayfasina yonlendirir.</p>
 */
(function () {
    'use strict';

    var SESSION_CHECK_INTERVAL = 60000; // 60sn
    var redirecting = false;

    /**
     * Login sayfasina yonlendirir (tekrar cagriyi onler).
     * Redirect URL'sindeki kicked parametresini korur.
     *
     * @param {string} [redirectUrl] - Spring Security'nin yonlendirdigi URL
     */
    function redirectToLogin(redirectUrl) {
        if (redirecting) return;
        redirecting = true;
        // Concurrent session kick ise kicked mesajini goster, yoksa timeout
        if (redirectUrl && redirectUrl.indexOf('kicked=true') !== -1) {
            window.location.href = '/login?kicked=true';
        } else {
            window.location.href = '/login?timeout=true';
        }
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
                    redirectToLogin(response.url);
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
                    redirectToLogin(this.responseURL);
                }
            }
        });
        return originalOpen.apply(this, arguments);
    };

    // Periyodik session kontrolu (polling olmayan sayfalarda da calisir)
    // Not: Spring Security session expired → 302 redirect → fetch interceptor yakalar.
    // Bu polling sadece redirect tespiti icin, !res.ok kontrolu yapilmaz
    // (500 server error'da kullaniciyi yanlis logout yapmasini onler).
    setInterval(function () {
        if (redirecting) return;
        fetch('/ajax/session-check', { credentials: 'same-origin' })
            .catch(function () {
                // ag hatasi — session kontrolu atlaniyor
            });
    }, SESSION_CHECK_INTERVAL);
})();
