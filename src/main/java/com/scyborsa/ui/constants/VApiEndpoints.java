package com.scyborsa.ui.constants;

/**
 * vApi (Kripto API) endpoint path sabitleri.
 */
public final class VApiEndpoints {

    private VApiEndpoints() {
    }

    /** Kripto para pazar verileri endpoint'i. */
    public static final String CRYPTO_MARKETS = "/api/crypto/markets";

    /** Kripto para sparkline verileri endpoint'i. */
    public static final String CRYPTO_SPARKLINES = "/api/crypto/sparklines";

    /** Küresel kripto pazar verileri endpoint'i. */
    public static final String CRYPTO_GLOBAL = "/api/crypto/global";

    /** Kripto piyasa duygu endeksi (Fear and Greed) endpoint'i. */
    public static final String CRYPTO_FEAR_GREED = "/api/crypto/fear-greed";
}
