package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.AkdResponseDto;
import com.scyborsa.ui.dto.AnalistTavsiyeDto;
import com.scyborsa.ui.dto.SectorStockDto;
import com.scyborsa.ui.dto.TvScreenerResponseModel;
import com.scyborsa.ui.enums.PeriodsEnum;
import com.scyborsa.ui.service.AnalistTavsiyeService;
import com.scyborsa.ui.service.Bist100Service;
import com.scyborsa.ui.service.StockDetailService;
import com.scyborsa.ui.util.TwUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Hisse senedi detay sayfasi view controller'i.
 *
 * <p>Belirli bir hisse senedinin teknik analiz detaylarini gosterir.
 * TradingView Pine Screener verisini {@link StockDetailService} uzerinden alir,
 * periyot bazinda (15M, 30M, 1H, 4H, 1D, 1W) indikator sinyallerini isler ve
 * Thymeleaf sablonuna model attribute olarak aktarir.</p>
 *
 * <h3>Desteklenen Indikatorler</h3>
 * <ul>
 *   <li>T3, SuperTrend, EWO, Squeeze Mom., WaveTrend</li>
 *   <li>SALMA, CVD, Twin Range, MA Alignment, Trend Follower, Madrid Ribbon</li>
 * </ul>
 *
 * @see StockDetailService
 * @see TvScreenerResponseModel
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class StockController {

    private static final String[] INDICATOR_NAMES = {
            "T3", "SuperTrend", "EWO", "Squeeze Mom.", "WaveTrend",
            "SALMA", "CVD", "Twin Range", "MA Alignment", "Trend Follower", "Madrid Ribbon"
    };
    // plot16=TDS (composite) atlanir, gerisi plot6..plot17
    private static final int[] PLOT_INDICES = {6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17};

    private final StockDetailService stockDetailService;
    private final Bist100Service bist100Service;
    private final AnalistTavsiyeService analistTavsiyeService;

    /**
     * Hisse senedi detay sayfasini render eder.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /stock/detail/{stockId}}</p>
     *
     * <p>Pine Screener verisini periyot bazinda isleyerek her periyot icin
     * yesil/kirmizi indikator sayilarini ve detaylarini hesaplar.</p>
     *
     * <h4>Model Attribute'lari</h4>
     * <ul>
     *   <li>{@code stockId} — Hisse senedi sembol kodu (orn: "THYAO")</li>
     *   <li>{@code analysisMap} — Periyot anahtarli (15M, 30M, 1H, 4H, 1D, 1W) analiz haritasi;
     *       her deger greenCount, redCount ve indicators listesi icerir</li>
     *   <li>{@code periodMap} — {@link PeriodsEnum} anahtarli ham screener verileri</li>
     *   <li>{@code NO_TIME} — Zamansiz (genel) screener verisi</li>
     *   <li>{@code recommendLongTime} — Uzun vadeli oneri metni</li>
     *   <li>{@code recommendMiddleTime} — Orta vadeli oneri metni</li>
     *   <li>{@code recommendShortTime} — Kisa vadeli oneri metni</li>
     * </ul>
     *
     * @param stockId hisse senedi sembol kodu (path variable, orn: "THYAO")
     * @param model   Thymeleaf model nesnesi; view'a aktarilacak attribute'lar buraya eklenir
     * @return {@code "stock/detail"} — Thymeleaf tarafindan {@code templates/stock/detail.html} olarak cozumlenir
     */
    @GetMapping("/stock/detail/{stockId}")
    public String stockDetail(@PathVariable("stockId") String stockId, Model model) {
        try {
            log.info("Stock Detail Page Accessed: {}", stockId);

            List<TvScreenerResponseModel> pineScreenerResponseModelList =
                    stockDetailService.getPineScreenerData(stockId);

            Map<PeriodsEnum, TvScreenerResponseModel> periodMap = new HashMap<>();

            if (pineScreenerResponseModelList != null) {
                for (TvScreenerResponseModel resp : pineScreenerResponseModelList) {
                    if (resp.getPeriodsEnum() != null) {
                        periodMap.put(resp.getPeriodsEnum(), resp);
                    }
                }
            }

            model.addAttribute("periodMap", periodMap);

            Map<String, Map<String, Object>> analysisMap = new HashMap<>();

            for (Map.Entry<PeriodsEnum, TvScreenerResponseModel> entry : periodMap.entrySet()) {
                PeriodsEnum periodEnum = entry.getKey();
                TvScreenerResponseModel tvResp = entry.getValue();

                String thymeleafPeriodKey;
                switch (periodEnum) {
                    case FIFTEEN_MINUTES:  thymeleafPeriodKey = "15M"; break;
                    case THIRTY_MINUTES:   thymeleafPeriodKey = "30M"; break;
                    case ONE_HOUR:         thymeleafPeriodKey = "1H";  break;
                    case FOUR_HOURS:       thymeleafPeriodKey = "4H";  break;
                    case DAILY:            thymeleafPeriodKey = "1D";  break;
                    case WEEK:             thymeleafPeriodKey = "1W";  break;
                    case NO_TIME:
                        model.addAttribute("NO_TIME", tvResp);
                        continue;
                    case NO_TIME_CHART:
                        continue;
                    default: thymeleafPeriodKey = periodEnum.name();
                }

                int greenCount = 0;
                int redCount = 0;
                List<Map<String, String>> indicators = new ArrayList<>();

                if (tvResp.getData() != null && !tvResp.getData().isEmpty()) {
                    TvScreenerResponseModel.DataItem row = tvResp.getData().get(0);
                    List<Object> d = row.getD();

                    // 11 indikator: plot6(T3)..plot17(MadridRibbon), plot16(TDS) haric
                    for (int i = 0; i < PLOT_INDICES.length; i++) {
                        int signal = toInt(d.get(PLOT_INDICES[i]));
                        boolean positive = signal > 0;
                        boolean negative = signal < 0;
                        String status = positive ? "positive" : (negative ? "negative" : "neutral");
                        if (positive) greenCount++;
                        if (negative) redCount++;
                        indicators.add(buildIndicator(INDICATOR_NAMES[i], status));
                    }
                }

                Map<String, Object> periodAnalysis = new HashMap<>();
                periodAnalysis.put("greenCount", greenCount);
                periodAnalysis.put("redCount", redCount);
                periodAnalysis.put("indicators", indicators);

                analysisMap.put(thymeleafPeriodKey, periodAnalysis);
            }

            model.addAttribute("analysisMap", analysisMap);
            model.addAttribute("stockId", stockId);

            // Gauge sinyallerini analysisMap greenCount'tan hesapla
            Map<String, Object> period15M = analysisMap.get("15M");
            Map<String, Object> period4H = analysisMap.get("4H");
            Map<String, Object> period1W = analysisMap.get("1W");
            int shortGreen = period15M != null ? (int) period15M.getOrDefault("greenCount", 0) : 0;
            int midGreen = period4H != null ? (int) period4H.getOrDefault("greenCount", 0) : 0;
            int longGreen = period1W != null ? (int) period1W.getOrDefault("greenCount", 0) : 0;
            model.addAttribute("recommendShortTime", calculateRecommendation(shortGreen));
            model.addAttribute("recommendMiddleTime", calculateRecommendation(midGreen));
            model.addAttribute("recommendLongTime", calculateRecommendation(longGreen));

        } catch (Exception e) {
            log.error("StockController - Error getting tvScreener", e);
            if (!model.containsAttribute("analysisMap")) {
                model.addAttribute("analysisMap", createEmptyAnalysisMap());
            }
            if (!model.containsAttribute("stockId")) {
                model.addAttribute("stockId", stockId);
            }
            if (!model.containsAttribute("recommendLongTime")) {
                model.addAttribute("recommendLongTime", TwUtils.SIGNAL_NEUTRAL);
                model.addAttribute("recommendMiddleTime", TwUtils.SIGNAL_NEUTRAL);
                model.addAttribute("recommendShortTime", TwUtils.SIGNAL_NEUTRAL);
            }
            if (!model.containsAttribute("NO_TIME")) {
                TvScreenerResponseModel emptyModel = new TvScreenerResponseModel();
                emptyModel.setData(new ArrayList<>());
                model.addAttribute("NO_TIME", emptyModel);
            }
        }

        // Hero header: hisse bilgilerini yukle
        loadStockInfo(stockId, model);

        // Analist tavsiyeleri yukle
        loadAnalistTavsiyeleri(stockId, model);

        // AKD verileri yukle
        loadAkdData(stockId, model);

        return "stock/detail";
    }

    /**
     * Verilen nesneyi {@code int} degerine guvenli sekilde donusturur.
     *
     * <p>{@code null} veya donusturulemeyen degerler icin {@code 0} doner.</p>
     *
     * @param obj donusturulecek nesne ({@link Number} veya {@link String} olabilir)
     * @return nesnenin int karsiligi; donusturulemezse {@code 0}
     */
    private int toInt(Object obj) {
        if (obj == null) return 0;
        if (obj instanceof Number) return ((Number) obj).intValue();
        try {
            return Integer.parseInt(obj.toString());
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Tek bir indikator icin ad ve durum bilgisi iceren Map olusturur.
     *
     * <p>Thymeleaf sablonunda her indikatoru gostermek icin kullanilir.</p>
     *
     * @param name   indikator adi (orn: "T3", "SuperTrend")
     * @param status sinyal durumu: {@code "positive"}, {@code "negative"} veya {@code "neutral"}
     * @return {@code {"name": ..., "status": ...}} seklinde Map
     */
    private Map<String, String> buildIndicator(String name, String status) {
        Map<String, String> map = new HashMap<>();
        map.put("name", name);
        map.put("status", status);
        return map;
    }

    /**
     * Green count degerine gore gauge sinyali hesaplar.
     *
     * @param greenCount yesil (pozitif) gosterge sayisi
     * @return sinyal string'i (Guclu Al, Al, Notr, Sat, Guclu Sat)
     */
    private String calculateRecommendation(int greenCount) {
        if (greenCount >= 8) return TwUtils.SIGNAL_STRONG_BUY;
        if (greenCount >= 6) return TwUtils.SIGNAL_BUY;
        if (greenCount == 5) return TwUtils.SIGNAL_NEUTRAL;
        if (greenCount >= 3) return TwUtils.SIGNAL_SELL;
        return TwUtils.SIGNAL_STRONG_SELL;
    }

    /**
     * Hisse bilgilerini Bist100Service uzerinden yukler ve model'e ekler.
     *
     * <p>getAllStocks() ile tum hisseleri alir, stockId'ye gore filtreler
     * ve fiyat, degisim, hacim, logoid bilgilerini model'e ekler.</p>
     *
     * @param stockId hisse senedi sembol kodu
     * @param model   Thymeleaf model nesnesi
     */
    private void loadStockInfo(String stockId, Model model) {
        try {
            List<SectorStockDto> allStocks = bist100Service.getAllStocks();
            SectorStockDto found = allStocks.stream()
                    .filter(s -> stockId.equalsIgnoreCase(s.getTicker()))
                    .findFirst()
                    .orElse(null);

            if (found != null) {
                model.addAttribute("stockDescription", found.getDescription());
                model.addAttribute("stockPrice", found.getPrice());
                model.addAttribute("stockChangePercent", found.getChangePercent());
                model.addAttribute("stockVolume", found.getVolume());
                model.addAttribute("stockLogoid", found.getLogoid());
            } else {
                setDefaultStockInfo(model);
            }
        } catch (Exception e) {
            log.warn("Hisse bilgisi yuklenemedi: {} - {}", stockId, e.getMessage());
            setDefaultStockInfo(model);
        }
    }

    /**
     * Hisse bilgisi bulunamadiginda veya hata durumunda varsayilan degerleri set eder.
     *
     * @param model Thymeleaf model nesnesi
     */
    private void setDefaultStockInfo(Model model) {
        model.addAttribute("stockDescription", "");
        model.addAttribute("stockPrice", 0.0);
        model.addAttribute("stockChangePercent", 0.0);
        model.addAttribute("stockVolume", 0.0);
        model.addAttribute("stockLogoid", "");
    }

    /**
     * Belirtilen hisse koduna ait analist tavsiyelerini yukler ve model'e ekler.
     *
     * <p>Son 10 tavsiyeyi, toplam tavsiye sayisini, al sayisini ve
     * ortalama hedef fiyati hesaplar.</p>
     *
     * @param stockCode hisse kodu (BIST ticker)
     * @param model     Thymeleaf model nesnesi
     */
    private void loadAnalistTavsiyeleri(String stockCode, Model model) {
        try {
            List<AnalistTavsiyeDto> tavsiyeleri = analistTavsiyeService.getAnalistTavsiyeleriByCode(stockCode);

            if (tavsiyeleri == null || tavsiyeleri.isEmpty()) {
                setDefaultTavsiyeInfo(model);
                return;
            }

            int toplamTavsiye = tavsiyeleri.size();

            long alSayisi = tavsiyeleri.stream()
                    .filter(t -> t.getRatingType() != null)
                    .filter(t -> "al".equalsIgnoreCase(t.getRatingType()))
                    .count();

            double ortalamaHedefFiyat = tavsiyeleri.stream()
                    .filter(t -> t.getTargetPrice() != null && t.getTargetPrice() > 0)
                    .mapToDouble(AnalistTavsiyeDto::getTargetPrice)
                    .average()
                    .orElse(0.0);

            // Tarihe gore sirali (desc), ilk 10
            List<AnalistTavsiyeDto> son10 = tavsiyeleri.stream()
                    .sorted(Comparator.comparing(
                            (AnalistTavsiyeDto t) -> t.getDate() != null ? t.getDate() : "",
                            Comparator.reverseOrder()))
                    .limit(10)
                    .collect(Collectors.toList());

            model.addAttribute("analistTavsiyeleri", son10);
            model.addAttribute("toplamTavsiye", toplamTavsiye);
            model.addAttribute("alSayisi", (int) alSayisi);
            model.addAttribute("ortalamaHedefFiyat", ortalamaHedefFiyat);
        } catch (Exception e) {
            log.warn("Analist tavsiyeleri yuklenemedi: {} - {}", stockCode, e.getMessage());
            setDefaultTavsiyeInfo(model);
        }
    }

    /**
     * Analist tavsiyesi bulunamadiginda veya hata durumunda varsayilan degerleri set eder.
     *
     * @param model Thymeleaf model nesnesi
     */
    private void setDefaultTavsiyeInfo(Model model) {
        model.addAttribute("analistTavsiyeleri", Collections.emptyList());
        model.addAttribute("toplamTavsiye", 0);
        model.addAttribute("alSayisi", 0);
        model.addAttribute("ortalamaHedefFiyat", 0.0);
    }

    /**
     * AKD (Aracı Kurum Dağılımı) verilerini yükler ve model'e ekler.
     *
     * @param stockId hisse kodu
     * @param model   Thymeleaf model
     */
    private void loadAkdData(String stockId, Model model) {
        try {
            AkdResponseDto akd = stockDetailService.getAkdData(stockId);
            if (akd != null) {
                model.addAttribute("akdAlicilar", akd.getAlicilar() != null ? akd.getAlicilar() : List.of());
                model.addAttribute("akdSaticilar", akd.getSaticilar() != null ? akd.getSaticilar() : List.of());
                model.addAttribute("akdToplam", akd.getToplam() != null ? akd.getToplam() : List.of());
            } else {
                setDefaultAkdData(model);
            }
        } catch (Exception e) {
            log.warn("AKD verisi yüklenemedi: {} - {}", stockId, e.getMessage());
            setDefaultAkdData(model);
        }
    }

    /**
     * Boş AKD verilerini model'e ekler (hata durumu için).
     *
     * @param model Thymeleaf model
     */
    private void setDefaultAkdData(Model model) {
        model.addAttribute("akdAlicilar", List.of());
        model.addAttribute("akdSaticilar", List.of());
        model.addAttribute("akdToplam", List.of());
    }

    /**
     * Hata durumunda kullanilmak uzere bos bir analiz haritasi olusturur.
     *
     * <p>Tum periyotlar (15M, 30M, 1H, 4H, 1D, 1W) icin greenCount=0, redCount=0 ve
     * bos indikator listesi iceren varsayilan yapiyi doner. Boylece Thymeleaf
     * sablonu null-safe calisir.</p>
     *
     * @return periyot anahtarli bos analiz haritasi
     */
    private Map<String, Map<String, Object>> createEmptyAnalysisMap() {
        Map<String, Map<String, Object>> map = new HashMap<>();
        for (String period : List.of("15M", "30M", "1H", "4H", "1D", "1W")) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("greenCount", 0);
            empty.put("redCount", 0);
            empty.put("indicators", new ArrayList<>());
            map.put(period, empty);
        }
        return map;
    }
}
