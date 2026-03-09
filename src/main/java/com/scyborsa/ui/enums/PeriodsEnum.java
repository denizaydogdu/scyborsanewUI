package com.scyborsa.ui.enums;

import lombok.Getter;

/**
 * Teknik analiz tarama periyotlarını tanımlayan enum.
 * <p>
 * Her periyot, kullanıcıya gösterilecek bir ad ({@code name}) ve
 * TradingView API'sine gönderilecek bir çözünürlük ({@code resolution})
 * değeri içerir.
 * </p>
 *
 * <ul>
 *   <li>{@link #FIFTEEN_MINUTES} -- 15 dakikalık periyot (resolution: "15")</li>
 *   <li>{@link #THIRTY_MINUTES} -- 30 dakikalık periyot (resolution: "30")</li>
 *   <li>{@link #ONE_HOUR} -- 1 saatlik periyot (resolution: "60")</li>
 *   <li>{@link #FOUR_HOURS} -- 4 saatlik periyot (resolution: "240")</li>
 *   <li>{@link #DAILY} -- Günlük periyot (resolution: "1D")</li>
 *   <li>{@link #WEEK} -- Haftalık periyot (resolution: "1W")</li>
 *   <li>{@link #NO_TIME} -- Zamansız tarama (periyot bilgisi yok)</li>
 *   <li>{@link #NO_TIME_CHART} -- Grafik için zamansız tarama</li>
 * </ul>
 */
@Getter
public enum PeriodsEnum {
    FIFTEEN_MINUTES("15 DAKIKALIK TARAMA", "15"),
    THIRTY_MINUTES("30 DAKIKALIK TARAMA", "30"),
    ONE_HOUR("1 SAATLIK TARAMA", "60"),
    FOUR_HOURS("4 SAATLIK TARAMA", "240"),
    DAILY("GUNLUK TARAMA", "1D"),
    WEEK("HAFTALIK TARAMA", "1W"),
    NO_TIME("NO_TIME", "NO_TIME"),
    NO_TIME_CHART("NO_TIME_CHART", "NO_TIME_CHART");

    /** Kullanıcıya gösterilecek periyot adı (örn. "15 DAKIKALIK TARAMA"). */
    private final String name;

    /** TradingView API'sine gönderilecek çözünürlük değeri (örn. "15", "1D"). */
    private final String resolution;

    /**
     * Yeni bir periyot enum sabiti oluşturur.
     *
     * @param name       kullanıcıya gösterilecek periyot adı
     * @param resolution TradingView API çözünürlük değeri
     */
    PeriodsEnum(String name, String resolution) {
        this.name = name;
        this.resolution = resolution;
    }
}
