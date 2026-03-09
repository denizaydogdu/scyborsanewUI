package com.scyborsa.ui.dto;

import com.scyborsa.ui.enums.PeriodsEnum;
import lombok.Data;
import java.util.List;

/**
 * TradingView screener API yanıt modeli.
 * <p>
 * TradingView screener servisinden gelen tarama sonuçlarını temsil eder.
 * Ham screener verisinin ({@link DataItem}) yanı sıra, ilgili periyot
 * bilgisi ve teknik analiz sonuçlarını da barındırır.
 * </p>
 */
@Data
public class TvScreenerResponseModel {

    /** Toplam sonuç sayısı. */
    private Integer totalCount;

    /** Ham screener veri listesi. Her eleman bir sembol ve onun verilerini içerir. */
    private List<DataItem> data;

    /** Tarama adı (örn. screener tipi veya özel tarama ismi). */
    private String screenerName;

    /** Taramanın yapıldığı periyot bilgisi. */
    private PeriodsEnum periodsEnum;

    /** Her sembol için hesaplanmış teknik analiz sonuçları listesi. */
    private List<TechnicalResponseDto> technicalResponseDtoList;

    /**
     * TradingView screener API'sinden gelen tek bir veri satırını temsil eder.
     * <p>
     * {@code s} alanı sembol adını, {@code d} alanı ise ilgili sembolün
     * screener sütun değerlerini sıralı olarak içerir.
     * </p>
     */
    @Data
    public static class DataItem {

        /** Sembol adı (örn. "BIST:THYAO"). */
        private String s;

        /** Screener sütun değerleri listesi (sıralı). */
        private List<Object> d;
    }
}
