package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.AkdResponseDto;
import com.scyborsa.ui.dto.AnalistTavsiyeDto;
import com.scyborsa.ui.dto.GuidanceUiDto;
import com.scyborsa.ui.dto.OrderbookResponseDto;
import com.scyborsa.ui.dto.TakasResponseDto;
import com.scyborsa.ui.dto.SectorStockDto;
import com.scyborsa.ui.dto.TvScreenerResponseModel;
import com.scyborsa.ui.enums.PeriodsEnum;
import com.scyborsa.ui.service.AnalistTavsiyeService;
import com.scyborsa.ui.service.Bist100Service;
import com.scyborsa.ui.service.GuidanceUiService;
import com.scyborsa.ui.service.HedefFiyatUiService;
import com.scyborsa.ui.service.StockDetailService;
import com.scyborsa.ui.service.TemelAnalizSkorUiService;
import com.scyborsa.ui.service.VbtsTedbirUiService;
import com.scyborsa.ui.util.TwUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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
public class StockController {

    /** Desteklenen 11 indikator adi (T3, SuperTrend, EWO, vb.). */
    private static final String[] INDICATOR_NAMES = {
            "T3", "SuperTrend", "EWO", "Squeeze Mom.", "WaveTrend",
            "SALMA", "CVD", "Twin Range", "MA Alignment", "Trend Follower", "Madrid Ribbon"
    };
    /** Pine screener plot indeksleri — plot16 (TDS composite) atlanir, plot6..plot17 arasi. */
    private static final int[] PLOT_INDICES = {6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17};

    /** Market durumu cache TTL (60 saniye). */
    private static final long MARKET_STATUS_CACHE_TTL_MS = 60_000;

    /** Hisse detay verileri saglayan servis. */
    private final StockDetailService stockDetailService;
    /** BIST100 hisse ve logo verisi saglayan servis. */
    private final Bist100Service bist100Service;
    /** Hisse bazli analist tavsiyeleri saglayan servis. */
    private final AnalistTavsiyeService analistTavsiyeService;
    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /** VBTS tedbirli hisse kontrolu servisi. */
    @Autowired(required = false)
    private VbtsTedbirUiService vbtsTedbirUiService;

    /** Hedef fiyat konsensus servisi. */
    @Autowired(required = false)
    private HedefFiyatUiService hedefFiyatUiService;

    /** Sirket beklentileri (guidance) servisi. */
    @Autowired(required = false)
    private GuidanceUiService guidanceUiService;

    /** Temel analiz skoru servisi. */
    @Autowired(required = false)
    private TemelAnalizSkorUiService temelAnalizSkorUiService;

    /** Cache'lenmis market durumu ve zaman damgasi. */
    private volatile boolean cachedMarketOpen = true;
    /** Cache'lenmis market durumunun son guncelleme zamani (epoch millis). */
    private volatile long cachedMarketOpenTime = 0;

    /**
     * Constructor injection — WebClient.Builder'dan WebClient olusturur.
     *
     * @param stockDetailService    hisse detay servisi
     * @param bist100Service        BIST100 servisi
     * @param analistTavsiyeService analist tavsiye servisi
     * @param webClientBuilder      Spring tarafindan enjekte edilen WebClient builder
     */
    public StockController(StockDetailService stockDetailService,
                           Bist100Service bist100Service,
                           AnalistTavsiyeService analistTavsiyeService,
                           WebClient.Builder webClientBuilder) {
        this.stockDetailService = stockDetailService;
        this.bist100Service = bist100Service;
        this.analistTavsiyeService = analistTavsiyeService;
        this.webClient = webClientBuilder.build();
    }

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

            model.addAttribute("assetType", "STOCK");
            model.addAttribute("currencySymbol", "TL");
            model.addAttribute("currencyPrefix", false);

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

            // NO_TIME periyodu response'da yoksa boş model ekle (th:each NPE önlemi)
            if (!model.containsAttribute("NO_TIME")) {
                TvScreenerResponseModel emptyModel = new TvScreenerResponseModel();
                emptyModel.setData(new ArrayList<>());
                model.addAttribute("NO_TIME", emptyModel);
            }

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

        // Teknik analiz verisi var mi kontrolu
        @SuppressWarnings("unchecked")
        Map<String, Map<String, Object>> aMap = (Map<String, Map<String, Object>>) model.getAttribute("analysisMap");
        boolean hasAnalysisData = false;
        if (aMap != null) {
            hasAnalysisData = aMap.values().stream()
                    .anyMatch(p -> {
                        int green = (int) p.getOrDefault("greenCount", 0);
                        int red = (int) p.getOrDefault("redCount", 0);
                        return green > 0 || red > 0;
                    });
        }
        model.addAttribute("hasAnalysisData", hasAnalysisData);

        // Hero header: hisse bilgilerini yukle
        loadStockInfo(stockId, model);

        // Analist tavsiyeleri yukle
        loadAnalistTavsiyeleri(stockId, model);

        // AKD verileri yukle
        loadAkdData(stockId, model);

        // Takas verileri yukle
        loadTakasData(stockId, model);

        // Emir defteri verileri yukle
        loadOrderbookData(stockId, model);

        // Market durumu yukle
        model.addAttribute("marketOpen", getMarketOpen());

        // Teknik veri tarihi + gün adı + son güncelleme saati (ör: "11 Mart 2026 / Çarşamba / 17:30")
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        String teknikTarihFull = now.format(DateTimeFormatter.ofPattern("d MMMM yyyy / EEEE / HH:mm", new Locale("tr", "TR")));
        model.addAttribute("teknikTarihFull", teknikTarihFull);
        // Kısa format (dd.MM.yyyy) — grafik kartı için
        model.addAttribute("teknikTarih", now.toLocalDate().format(DateTimeFormatter.ofPattern("dd.MM.yyyy")));

        // Fintables MCP zenginlestirme (graceful degradation)
        try {
            if (vbtsTedbirUiService != null) {
                model.addAttribute("isTedbirli", vbtsTedbirUiService.isTedbirli(stockId));
            }
        } catch (Exception e) {
            log.debug("VBTS tedbir kontrolu basarisiz: {} - {}", stockId, e.getMessage());
        }

        try {
            if (hedefFiyatUiService != null) {
                model.addAttribute("hedefFiyatlar", hedefFiyatUiService.getHisseHedefFiyatlar(stockId));
            }
        } catch (Exception e) {
            log.debug("Hedef fiyat verisi alinamadi: {} - {}", stockId, e.getMessage());
        }

        try {
            if (guidanceUiService != null) {
                List<GuidanceUiDto> guidancelar = guidanceUiService.getHisseGuidance(stockId);
                model.addAttribute("guidancelar", guidancelar);
            }
        } catch (Exception e) {
            log.debug("Guidance verisi alinamadi: {} - {}", stockId, e.getMessage());
        }

        try {
            if (temelAnalizSkorUiService != null) {
                model.addAttribute("temelSkor", temelAnalizSkorUiService.getTemelAnalizSkor(stockId));
            }
        } catch (Exception e) {
            log.debug("Temel analiz skor alinamadi: {} - {}", stockId, e.getMessage());
        }

        return "stock/detail";
    }

    /**
     * AI teknik analiz yorumunu AJAX proxy olarak döndürür.
     *
     * <p>Hisse detay sayfasındaki AI kartı bu endpoint'i lazy-load ile çağırır.
     * scyborsaApi'deki cache mekanizması sayesinde günde bir kez AI çağrısı yapılır.</p>
     *
     * @param stockCode hisse kodu (ör: "GARAN")
     * @return AI yorum JSON'u veya hata mesajı
     */
    @GetMapping("/ajax/stock/{stockCode}/ai-comment")
    @ResponseBody
    public Map<String, Object> getAiComment(@PathVariable String stockCode) {
        if (stockCode == null || !stockCode.matches("^[A-Z0-9]{2,6}$")) {
            return Map.of("error", "Geçersiz hisse kodu.");
        }
        try {
            Map<String, Object> result = stockDetailService.getAiComment(stockCode);
            if (result != null) {
                return result;
            }
            return Map.of("error", "AI yorumu alınamadı.");
        } catch (Exception e) {
            log.warn("AI yorum proxy hatası: {} - {}", stockCode, e.getMessage());
            return Map.of("error", "AI servisi şu anda kullanılamıyor.");
        }
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
                model.addAttribute("akdDataDate", akd.getFormattedDataDate());
                boolean hasAkdData = (akd.getAlicilar() != null && !akd.getAlicilar().isEmpty())
                        || (akd.getSaticilar() != null && !akd.getSaticilar().isEmpty());
                model.addAttribute("hasAkdData", hasAkdData);
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
        model.addAttribute("akdDataDate", null);
        model.addAttribute("hasAkdData", false);
    }

    /**
     * Takas (Saklama Dagilimi) verilerini yukler ve model'e ekler.
     *
     * @param stockId hisse kodu
     * @param model   Thymeleaf model
     */
    private void loadTakasData(String stockId, Model model) {
        try {
            TakasResponseDto takas = stockDetailService.getTakasData(stockId);
            if (takas != null && takas.getCustodians() != null) {
                model.addAttribute("takasCustodians", takas.getCustodians());
                model.addAttribute("takasDataDate", takas.getFormattedDataDate());
                model.addAttribute("hasTakasData", takas.getCustodians() != null && !takas.getCustodians().isEmpty());
            } else {
                setDefaultTakasData(model);
            }
        } catch (Exception e) {
            log.warn("Takas verisi yuklenemedi: {} - {}", stockId, e.getMessage());
            setDefaultTakasData(model);
        }
    }

    /**
     * Bos Takas verilerini model'e ekler (hata durumu icin).
     *
     * @param model Thymeleaf model
     */
    private void setDefaultTakasData(Model model) {
        model.addAttribute("takasCustodians", List.of());
        model.addAttribute("takasDataDate", null);
        model.addAttribute("hasTakasData", false);
    }

    /**
     * Emir defteri (orderbook) verilerini yükler ve model'e ekler.
     *
     * @param stockId hisse kodu
     * @param model   Thymeleaf model
     */
    private void loadOrderbookData(String stockId, Model model) {
        try {
            OrderbookResponseDto orderbook = stockDetailService.getOrderbookData(stockId);
            if (orderbook != null && orderbook.getTransactions() != null
                    && !orderbook.getTransactions().isEmpty()) {
                List<OrderbookResponseDto.OrderbookTransactionDto> all = orderbook.getTransactions();

                List<OrderbookResponseDto.OrderbookTransactionDto> alisIslemleri = all.stream()
                        .filter(t -> "B".equals(t.getAction()))
                        .collect(Collectors.toList());

                List<OrderbookResponseDto.OrderbookTransactionDto> satisIslemleri = all.stream()
                        .filter(t -> "S".equals(t.getAction()))
                        .collect(Collectors.toList());

                model.addAttribute("orderbookAlislar", alisIslemleri);
                model.addAttribute("orderbookSatislar", satisIslemleri);
                model.addAttribute("orderbookAlisCount", alisIslemleri.size());
                model.addAttribute("orderbookSatisCount", satisIslemleri.size());
                model.addAttribute("orderbookCount", orderbook.getTotalCount());
                model.addAttribute("hasOrderbookData", true);
            } else {
                setDefaultOrderbookData(model);
            }
        } catch (Exception e) {
            log.warn("Orderbook verisi yüklenemedi: {} - {}", stockId, e.getMessage());
            setDefaultOrderbookData(model);
        }
    }

    /**
     * Boş emir defteri verilerini model'e ekler (hata durumu için).
     *
     * @param model Thymeleaf model
     */
    private void setDefaultOrderbookData(Model model) {
        model.addAttribute("orderbookAlislar", List.of());
        model.addAttribute("orderbookSatislar", List.of());
        model.addAttribute("orderbookAlisCount", 0);
        model.addAttribute("orderbookSatisCount", 0);
        model.addAttribute("orderbookCount", 0);
        model.addAttribute("hasOrderbookData", false);
    }

    /**
     * API'den borsa seans durumunu sorgular.
     *
     * <p>{@code /api/v1/chart/status} endpoint'inden {@code marketOpen} alanini okur.
     * Hata durumunda guvenli varsayilan olarak {@code true} doner.</p>
     *
     * @return seans aciksa {@code true}, kapaliysa {@code false}
     */
    @SuppressWarnings("unchecked")
    private boolean getMarketOpen() {
        long now = System.currentTimeMillis();
        if (now - cachedMarketOpenTime < MARKET_STATUS_CACHE_TTL_MS) {
            return cachedMarketOpen;
        }

        try {
            Map<String, Object> status = webClient.get()
                    .uri("/api/v1/chart/status")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            if (status != null && status.containsKey("marketOpen")) {
                cachedMarketOpen = Boolean.TRUE.equals(status.get("marketOpen"));
                cachedMarketOpenTime = now;
                return cachedMarketOpen;
            }
        } catch (Exception e) {
            log.warn("Market durumu alinamadi, varsayilan true: {}", e.getMessage());
        }
        return true;
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
