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

    /** Kripto para detay endpoint'i (CoinGecko coin ID ile). */
    public static final String CRYPTO_COIN_DETAIL = "/api/crypto/coin/{coinId}";

    /** Kripto para teknik analiz indikatörleri endpoint'i. */
    public static final String CRYPTO_TECHNICAL = "/api/crypto/technical/{coinId}";

    /** Kripto para OHLCV (mum grafik) verileri endpoint'i. */
    public static final String CRYPTO_OHLCV = "/api/crypto/ohlcv/{symbol}/{interval}";
}
