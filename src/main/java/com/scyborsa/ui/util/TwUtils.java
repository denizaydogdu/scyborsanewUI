package com.scyborsa.ui.util;

/**
 * TradingView sinyal yardımcı metodları (UI tarafı).
 *
 * <p>TradingView'dan gelen sayısal öneri (recommendation) değerlerini
 * Türkçe sinyal etiketlerine dönüştürür, sembol formatlama ve
 * sinyal sınıflandırma işlemleri sunar.</p>
 *
 * <p>Sinyal eşik değerleri:</p>
 * <table border="1">
 *   <tr><th>Aralık</th><th>Sinyal</th></tr>
 *   <tr><td>&le; -0.5</td><td>Güçlü Sat</td></tr>
 *   <tr><td>-0.5 &ndash; -0.1</td><td>Sat</td></tr>
 *   <tr><td>-0.1 &ndash; 0.1</td><td>Nötr</td></tr>
 *   <tr><td>0.1 &ndash; 0.5</td><td>Al</td></tr>
 *   <tr><td>&ge; 0.5</td><td>Güçlü Al</td></tr>
 * </table>
 *
 * <p>Bu sınıf utility sınıfıdır; örneklenemez.</p>
 */
public final class TwUtils {

    /** BIST sembol ön eki. */
    public static final String BIST_PREFIX = "BIST:";

    /** Güçlü al sinyali etiketi. */
    public static final String SIGNAL_STRONG_BUY = "Güçlü Al";
    /** Al sinyali etiketi. */
    public static final String SIGNAL_BUY = "Al";
    /** Nötr sinyal etiketi. */
    public static final String SIGNAL_NEUTRAL = "Nötr";
    /** Sat sinyali etiketi. */
    public static final String SIGNAL_SELL = "Sat";
    /** Güçlü sat sinyali etiketi. */
    public static final String SIGNAL_STRONG_SELL = "Güçlü Sat";

    private TwUtils() {
    }

    /**
     * Verilen oranı (ratio) sinyal etiketine dönüştürür.
     *
     * <p>Eşik değerleri:</p>
     * <ul>
     *   <li>{@code ratio <= -0.4} &rarr; Güçlü Sat</li>
     *   <li>{@code -0.4 < ratio <= -0.1} &rarr; Sat</li>
     *   <li>{@code -0.1 < ratio <= 0.1} &rarr; Nötr</li>
     *   <li>{@code 0.1 < ratio <= 0.4} &rarr; Al</li>
     *   <li>{@code ratio > 0.4} &rarr; Güçlü Al</li>
     * </ul>
     *
     * @param ratio al/sat oranı (-1.0 ile 1.0 arası beklenir)
     * @return karşılık gelen Türkçe sinyal etiketi
     */
    public static String mapRatioToSignal(double ratio) {
        if (ratio <= -0.4) return SIGNAL_STRONG_SELL;
        else if (ratio <= -0.1) return SIGNAL_SELL;
        else if (ratio <= 0.1) return SIGNAL_NEUTRAL;
        else if (ratio <= 0.4) return SIGNAL_BUY;
        else return SIGNAL_STRONG_BUY;
    }

    /**
     * TradingView JSON yanıtındaki {@code Recommend.All} değerini sinyal etiketine çevirir.
     *
     * <p>Eşik değerleri:</p>
     * <ul>
     *   <li>{@code recommendAll >= 0.5} &rarr; Güçlü Al</li>
     *   <li>{@code 0.1 <= recommendAll < 0.5} &rarr; Al</li>
     *   <li>{@code -0.1 < recommendAll < 0.1} &rarr; Nötr</li>
     *   <li>{@code -0.5 < recommendAll <= -0.1} &rarr; Sat</li>
     *   <li>{@code recommendAll <= -0.5} &rarr; Güçlü Sat</li>
     * </ul>
     *
     * @param recommendAll TradingView'dan gelen genel öneri değeri; {@code null} ise Nötr kabul edilir
     * @return karşılık gelen Türkçe sinyal etiketi
     */
    public static String getSinyalFromJson(Double recommendAll) {
        if (recommendAll == null) return SIGNAL_NEUTRAL;
        if (recommendAll >= 0.5) return SIGNAL_STRONG_BUY;
        else if (recommendAll >= 0.1) return SIGNAL_BUY;
        else if (recommendAll <= -0.5) return SIGNAL_STRONG_SELL;
        else if (recommendAll <= -0.1) return SIGNAL_SELL;
        else return SIGNAL_NEUTRAL;
    }

    /**
     * Hisse adını BIST sembol formatına dönüştürür.
     *
     * <p>Gelen değer zaten {@code "BIST:"} ön ekiyle başlıyorsa olduğu gibi döner;
     * aksi halde {@code "BIST:"} ön eki eklenir. Değer büyük harfe çevrilir.</p>
     *
     * @param stockName hisse adı (ör. "thyao" veya "BIST:THYAO")
     * @return {@code "BIST:"} ön ekli büyük harfli sembol; {@code null} veya boş ise {@code null}
     */
    public static String formatSymbol(String stockName) {
        if (stockName == null || stockName.trim().isEmpty()) return null;
        String trimmed = stockName.trim().toUpperCase();
        return trimmed.startsWith(BIST_PREFIX) ? trimmed : BIST_PREFIX + trimmed;
    }

    /**
     * BIST sembolünden hisse adını çıkarır.
     *
     * <p>{@code "BIST:THYAO"} girildiğinde {@code "THYAO"} döner.
     * Ön ek yoksa değeri büyük harfe çevirip olduğu gibi döner.</p>
     *
     * @param symbol BIST sembolü (ör. "BIST:THYAO") veya düz hisse adı
     * @return ön eksiz hisse adı (büyük harf); {@code null} veya boş ise {@code null}
     */
    public static String extractStockName(String symbol) {
        if (symbol == null || symbol.trim().isEmpty()) return null;
        String trimmed = symbol.trim().toUpperCase();
        return trimmed.startsWith(BIST_PREFIX) ? trimmed.substring(BIST_PREFIX.length()) : trimmed;
    }

    /**
     * Verilen sinyalin alım yönlü olup olmadığını kontrol eder.
     *
     * <p>{@code "Al"} veya {@code "Güçlü Al"} ise {@code true} döner.</p>
     *
     * @param sinyal kontrol edilecek sinyal etiketi
     * @return sinyal alım yönlü ise {@code true}
     */
    public static boolean isAlSinyali(String sinyal) {
        return SIGNAL_BUY.equals(sinyal) || SIGNAL_STRONG_BUY.equals(sinyal);
    }

    /**
     * Verilen sinyalin satış yönlü olup olmadığını kontrol eder.
     *
     * <p>{@code "Sat"} veya {@code "Güçlü Sat"} ise {@code true} döner.</p>
     *
     * @param sinyal kontrol edilecek sinyal etiketi
     * @return sinyal satış yönlü ise {@code true}
     */
    public static boolean isSatSinyali(String sinyal) {
        return SIGNAL_SELL.equals(sinyal) || SIGNAL_STRONG_SELL.equals(sinyal);
    }

    /**
     * Sinyal etiketini sayısal puana dönüştürür.
     *
     * <p>Puan tablosu:</p>
     * <ul>
     *   <li>Güçlü Al &rarr; {@code 2}</li>
     *   <li>Al &rarr; {@code 1}</li>
     *   <li>Nötr &rarr; {@code 0}</li>
     *   <li>Sat &rarr; {@code -1}</li>
     *   <li>Güçlü Sat &rarr; {@code -2}</li>
     * </ul>
     *
     * @param sinyal sinyal etiketi; {@code null} ise {@code 0} döner
     * @return -2 ile 2 arasında sayısal puan; tanınmayan sinyal için {@code 0}
     */
    public static int getSinyalScore(String sinyal) {
        if (sinyal == null) return 0;
        return switch (sinyal) {
            case SIGNAL_STRONG_BUY -> 2;
            case SIGNAL_BUY -> 1;
            case SIGNAL_NEUTRAL -> 0;
            case SIGNAL_SELL -> -1;
            case SIGNAL_STRONG_SELL -> -2;
            default -> 0;
        };
    }
}
