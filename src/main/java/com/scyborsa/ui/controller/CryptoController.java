package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.CryptoDetailDto;
import com.scyborsa.ui.dto.CryptoFearGreedDto;
import com.scyborsa.ui.dto.CryptoGlobalDto;
import com.scyborsa.ui.dto.CryptoMarketDto;
import com.scyborsa.ui.dto.TvScreenerResponseModel;
import com.scyborsa.ui.service.CryptoService;
import com.scyborsa.ui.util.TwUtils;
import java.util.ArrayList;
import java.util.Collections;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Kripto para sayfasi controller'i.
 * SSR liste sayfasi ve AJAX polling endpoint'lerini saglar.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class CryptoController {

    private final CryptoService cryptoService;

    /**
     * Kripto para liste sayfasini render eder.
     * @param model Thymeleaf model
     * @return kripto liste template adi
     */
    @GetMapping("/kripto")
    public String kriptoList(Model model) {
        log.info("[KRIPTO-UI] Kripto liste sayfasi erisimi");
        List<CryptoMarketDto> markets = cryptoService.getMarkets();
        CryptoGlobalDto global = cryptoService.getGlobalData();
        CryptoFearGreedDto fearGreed = cryptoService.getFearGreed();

        model.addAttribute("markets", markets);
        model.addAttribute("global", global);
        model.addAttribute("fearGreed", fearGreed);
        model.addAttribute("marketCount", markets.size());
        return "kripto/kripto-list";
    }

    /**
     * Kripto pazar verilerini JSON olarak doner (AJAX polling).
     * @return kripto pazar listesi
     */
    @GetMapping("/ajax/kripto/markets")
    @ResponseBody
    public List<CryptoMarketDto> getMarketsAjax() {
        return cryptoService.getMarkets();
    }

    /**
     * Sparkline verilerini JSON olarak doner (AJAX polling).
     * @return coin ID -> fiyat listesi map
     */
    @GetMapping("/ajax/kripto/sparklines")
    @ResponseBody
    public Map<String, List<Double>> getSparklinesAjax() {
        return cryptoService.getSparklines();
    }

    /**
     * Kuresel pazar verilerini JSON olarak doner (AJAX polling).
     * @return global pazar verileri
     */
    @GetMapping("/ajax/kripto/global")
    @ResponseBody
    public CryptoGlobalDto getGlobalAjax() {
        return cryptoService.getGlobalData();
    }

    /**
     * Fear and Greed endeksini JSON olarak doner (AJAX polling).
     * @return fear/greed verileri
     */
    @GetMapping("/ajax/kripto/fear-greed")
    @ResponseBody
    public CryptoFearGreedDto getFearGreedAjax() {
        return cryptoService.getFearGreed();
    }

    /**
     * Kripto para detay sayfasini render eder.
     * @param coinId CoinGecko coin ID'si (orn: "bitcoin")
     * @param model Thymeleaf model
     * @return kripto detay template adi
     */
    @GetMapping("/kripto/{coinId}")
    public String kriptoDetail(@PathVariable String coinId, Model model) {
        if (coinId == null || !coinId.matches("^[a-z0-9-]{1,50}$")) {
            return "redirect:/kripto";
        }
        log.info("[KRIPTO-UI] Kripto detay sayfasi erisimi [coinId={}]", coinId);
        CryptoDetailDto coin = cryptoService.getCoinDetail(coinId);
        if (coin == null || coin.getId() == null) {
            return "redirect:/kripto";
        }
        Map<String, Object> technical = cryptoService.getTechnical(coinId);
        // Binance sembol: symbol alanindan derive et (btc -> BTCUSDT)
        String binanceSymbol = coin.getSymbol() != null
                ? coin.getSymbol().toUpperCase() + "USDT" : "";

        model.addAttribute("coin", coin);
        model.addAttribute("technical", technical);
        model.addAttribute("binanceSymbol", binanceSymbol);

        // Asset type
        model.addAttribute("assetType", "CRYPTO");
        model.addAttribute("currencySymbol", "$");
        model.addAttribute("currencyPrefix", true);

        // Stock model attributes (hero header icin)
        model.addAttribute("stockId", coin.getSymbol() != null ? coin.getSymbol().toUpperCase() : coinId);
        model.addAttribute("stockDescription", coin.getName());
        model.addAttribute("stockPrice", coin.getCurrentPrice());
        model.addAttribute("stockChangePercent", coin.getPriceChangePercentage24h());
        model.addAttribute("stockVolume", coin.getTotalVolume());
        model.addAttribute("coinImage", coin.getImage());
        model.addAttribute("coinId", coinId);

        // Teknik veri mapping — kripto indikatorlerini stock formatina donustur
        Map<String, Map<String, Object>> analysisMap = buildCryptoAnalysisMap(technical);
        int greenCount = analysisMap.containsKey("1D")
                ? (int) analysisMap.get("1D").getOrDefault("greenCount", 0) : 0;
        String recommendation = calculateRecommendation(greenCount);

        model.addAttribute("hasAnalysisData", !technical.isEmpty());
        model.addAttribute("analysisMap", analysisMap);
        model.addAttribute("NO_TIME", buildCryptoNoTime(coin, technical));
        model.addAttribute("recommendShortTime", recommendation);
        model.addAttribute("recommendMiddleTime", recommendation);
        model.addAttribute("recommendLongTime", recommendation);

        // Stock bolumleri disabled (kripto icin AKD/Takas/Orderbook yok)
        model.addAttribute("hasAkdData", false);
        model.addAttribute("hasTakasData", false);
        model.addAttribute("hasOrderbookData", false);
        model.addAttribute("analistTavsiyeleri", null);
        model.addAttribute("marketOpen", true); // crypto 24/7

        // Tarih
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        model.addAttribute("teknikTarihFull", now.format(java.time.format.DateTimeFormatter.ofPattern("dd MMMM yyyy", java.util.Locale.forLanguageTag("tr"))));
        model.addAttribute("teknikTarih", now.format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy")));

        // Breadcrumb
        model.addAttribute("breadcrumbCategory", "Kripto");
        model.addAttribute("breadcrumbCategoryUrl", "/kripto");

        return "stock/detail";
    }

    /**
     * Coin detay verilerini JSON olarak doner (AJAX polling 120sn).
     * @param coinId CoinGecko coin ID'si
     * @return coin detay DTO
     */
    @GetMapping("/ajax/kripto/{coinId}/detail")
    @ResponseBody
    public CryptoDetailDto getCoinDetailAjax(@PathVariable String coinId) {
        if (!isValidCoinId(coinId)) return new CryptoDetailDto();
        return cryptoService.getCoinDetail(coinId);
    }

    /**
     * Teknik analiz indikatorlerini JSON olarak doner (AJAX polling 60sn).
     * @param coinId CoinGecko coin ID'si
     * @return indikator map
     */
    @GetMapping("/ajax/kripto/{coinId}/technical")
    @ResponseBody
    public Map<String, Object> getTechnicalAjax(@PathVariable String coinId) {
        if (!isValidCoinId(coinId)) return Collections.emptyMap();
        return cryptoService.getTechnical(coinId);
    }

    /**
     * OHLCV mum verilerini JSON olarak doner.
     * @param symbol Binance sembol (orn: BTCUSDT)
     * @param interval zaman dilimi (default: 1d)
     * @param limit mum sayisi (default: 200)
     * @return OHLCV listesi
     */
    @GetMapping("/ajax/kripto/ohlcv")
    @ResponseBody
    public List<Map<String, Object>> getOhlcvAjax(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(defaultValue = "200") Integer limit) {
        String normalized = symbol != null ? symbol.toUpperCase() : "";
        return cryptoService.getOhlcv(normalized, interval, limit);
    }

    /**
     * Kripto teknik indikatorlerinden periyot bazli analiz haritasi olusturur.
     *
     * <p>11 sinyal hesaplar (MACD, RSI, Stochastic, EMA20, ADX, Aroon, EMA50, SMA50, SMA200, CCI, Momentum) ve
     * her periyot icin ayni greenCount/redCount degerlerini dondurur.
     * Kripto API tek periyot verisi sagladigi icin tum periyotlar ayni sonucu alir.</p>
     *
     * @param technical kripto teknik indikator verileri
     * @return periyot anahtarli (15M, 1H, 4H, 1D, 1W) analiz haritasi
     */
    private Map<String, Map<String, Object>> buildCryptoAnalysisMap(Map<String, Object> technical) {
        Map<String, Map<String, Object>> analysisMap = new HashMap<>();

        if (technical == null || technical.isEmpty()) {
            for (String period : List.of("15M", "1H", "4H", "1D", "1W")) {
                Map<String, Object> empty = new HashMap<>();
                empty.put("greenCount", 0);
                empty.put("redCount", 0);
                empty.put("indicators", new ArrayList<>());
                analysisMap.put(period, empty);
            }
            return analysisMap;
        }

        int greenCount = 0;
        int redCount = 0;
        List<Map<String, String>> indicators = new ArrayList<>();

        // 1. MACD > MACD.signal → green, else red
        Double macd = getDouble(technical, "MACD.macd");
        Double macdSignal = getDouble(technical, "MACD.signal");
        if (macd != null && macdSignal != null) {
            boolean positive = macd > macdSignal;
            indicators.add(buildIndicator("MACD", positive ? "positive" : "negative"));
            if (positive) greenCount++; else redCount++;
        } else {
            indicators.add(buildIndicator("MACD", "neutral"));
        }

        // 2. RSI 50-70 → green, >70 veya <30 → red
        Double rsi = getDouble(technical, "RSI");
        if (rsi != null) {
            String status;
            if (rsi >= 50 && rsi <= 70) {
                status = "positive";
                greenCount++;
            } else if (rsi > 70 || rsi < 30) {
                status = "negative";
                redCount++;
            } else {
                status = "neutral";
            }
            indicators.add(buildIndicator("RSI", status));
        } else {
            indicators.add(buildIndicator("RSI", "neutral"));
        }

        // 3. Stoch.K > Stoch.D → green, else red
        Double stochK = getDouble(technical, "Stoch.K");
        Double stochD = getDouble(technical, "Stoch.D");
        if (stochK != null && stochD != null) {
            boolean positive = stochK > stochD;
            indicators.add(buildIndicator("Stochastic", positive ? "positive" : "negative"));
            if (positive) greenCount++; else redCount++;
        } else {
            indicators.add(buildIndicator("Stochastic", "neutral"));
        }

        // 4. close > EMA20 → green, else red
        Double close = getDouble(technical, "close");
        Double ema20 = getDouble(technical, "EMA20");
        if (close != null && ema20 != null) {
            boolean positive = close > ema20;
            indicators.add(buildIndicator("EMA20", positive ? "positive" : "negative"));
            if (positive) greenCount++; else redCount++;
        } else {
            indicators.add(buildIndicator("EMA20", "neutral"));
        }

        // 5. ADX >20 && ADX+DI > ADX-DI → green, else red
        Double adx = getDouble(technical, "ADX");
        Double adxPlusDi = getDouble(technical, "ADX+DI");
        Double adxMinusDi = getDouble(technical, "ADX-DI");
        if (adx != null && adxPlusDi != null && adxMinusDi != null) {
            boolean positive = adx > 20 && adxPlusDi > adxMinusDi;
            indicators.add(buildIndicator("ADX", positive ? "positive" : "negative"));
            if (positive) greenCount++; else redCount++;
        } else {
            indicators.add(buildIndicator("ADX", "neutral"));
        }

        // 6. Aroon.Up > Aroon.Down → green, else red
        Double aroonUp = getDouble(technical, "Aroon.Up");
        Double aroonDown = getDouble(technical, "Aroon.Down");
        if (aroonUp != null && aroonDown != null) {
            boolean positive = aroonUp > aroonDown;
            indicators.add(buildIndicator("Aroon", positive ? "positive" : "negative"));
            if (positive) greenCount++; else redCount++;
        } else {
            indicators.add(buildIndicator("Aroon", "neutral"));
        }

        // 7. close > EMA50 → green, else red
        Double ema50 = getDouble(technical, "EMA50");
        if (close != null && ema50 != null) {
            boolean positive = close > ema50;
            indicators.add(buildIndicator("EMA50", positive ? "positive" : "negative"));
            if (positive) greenCount++; else redCount++;
        } else {
            indicators.add(buildIndicator("EMA50", "neutral"));
        }

        // 8. close > SMA50 → green, else red
        Double sma50 = getDouble(technical, "SMA50");
        if (close != null && sma50 != null) {
            boolean positive = close > sma50;
            indicators.add(buildIndicator("SMA50", positive ? "positive" : "negative"));
            if (positive) greenCount++; else redCount++;
        } else {
            indicators.add(buildIndicator("SMA50", "neutral"));
        }

        // 9. close > SMA200 → green, else red
        Double sma200 = getDouble(technical, "SMA200");
        if (close != null && sma200 != null) {
            boolean positive = close > sma200;
            indicators.add(buildIndicator("SMA200", positive ? "positive" : "negative"));
            if (positive) greenCount++; else redCount++;
        } else {
            indicators.add(buildIndicator("SMA200", "neutral"));
        }

        // 10. CCI20: >100 → green (guclu yukselis trendi), <-100 → red (guclu dusus trendi), else neutral
        Double cci = getDouble(technical, "CCI20");
        if (cci != null) {
            if (cci > 100) {
                indicators.add(buildIndicator("CCI", "positive"));
                greenCount++;
            } else if (cci < -100) {
                indicators.add(buildIndicator("CCI", "negative"));
                redCount++;
            } else {
                indicators.add(buildIndicator("CCI", "neutral"));
            }
        } else {
            indicators.add(buildIndicator("CCI", "neutral"));
        }

        // 11. Momentum > 0 → green, else red
        Double mom = getDouble(technical, "Mom");
        if (mom != null) {
            boolean positive = mom > 0;
            indicators.add(buildIndicator("Momentum", positive ? "positive" : "negative"));
            if (positive) greenCount++; else redCount++;
        } else {
            indicators.add(buildIndicator("Momentum", "neutral"));
        }

        // 11 sinyal — stock template ile ayni threshold (gc > 5 = yesil, rc > 5 = kirmizi)
        for (String period : List.of("15M", "1H", "4H", "1D", "1W")) {
            Map<String, Object> periodAnalysis = new HashMap<>();
            periodAnalysis.put("greenCount", greenCount);
            periodAnalysis.put("redCount", redCount);
            periodAnalysis.put("indicators", indicators);
            analysisMap.put(period, periodAnalysis);
        }

        return analysisMap;
    }

    /**
     * Kripto teknik verilerini stock detay sayfasinin NO_TIME formatina donusturur.
     *
     * <p>{@link TvScreenerResponseModel} olusturur ve d[] array icinde
     * RSI, MACD, EMA, SMA gibi indikator degerlerini stock formatina map'ler.</p>
     *
     * @param coin      kripto detay bilgileri
     * @param technical kripto teknik indikator verileri
     * @return stock formatinda TvScreenerResponseModel
     */
    private TvScreenerResponseModel buildCryptoNoTime(CryptoDetailDto coin, Map<String, Object> technical) {
        TvScreenerResponseModel model = new TvScreenerResponseModel();

        if (technical == null || technical.isEmpty()) {
            model.setData(new ArrayList<>());
            return model;
        }

        // 24 elemanlik d[] array — stock detail template'inin beklentisine uygun
        List<Object> d = new ArrayList<>(24);
        // d[0-5]: dummy metadata
        for (int i = 0; i < 6; i++) d.add(null);
        // d[6]: close
        d.add(getDouble(technical, "close"));
        // d[7-11]: null
        for (int i = 7; i <= 11; i++) d.add(null);
        // d[12]: RSI
        d.add(getDouble(technical, "RSI"));
        // d[13]: MACD.macd
        d.add(getDouble(technical, "MACD.macd"));
        // d[14]: MACD.signal
        d.add(getDouble(technical, "MACD.signal"));
        // d[15]: Mom (Momentum)
        d.add(getDouble(technical, "Mom"));
        // d[16]: ADX
        d.add(getDouble(technical, "ADX"));
        // d[17]: EMA20
        d.add(getDouble(technical, "EMA20"));
        // d[18]: EMA50
        d.add(getDouble(technical, "EMA50"));
        // d[19]: SMA50
        d.add(getDouble(technical, "SMA50"));
        // d[20]: SMA200
        d.add(getDouble(technical, "SMA200"));
        // d[21]: null (Ichimoku CLine yok)
        d.add(null);
        // d[22]: null (Ichimoku BLine yok)
        d.add(null);
        // d[23]: null (HullMA yok)
        d.add(null);

        TvScreenerResponseModel.DataItem item = new TvScreenerResponseModel.DataItem();
        String symbol = coin.getSymbol() != null ? coin.getSymbol().toUpperCase() : "CRYPTO";
        item.setS("CRYPTO:" + symbol);
        item.setD(d);

        model.setData(List.of(item));
        model.setTotalCount(1);

        return model;
    }

    /**
     * Yesil sinyal sayisina gore kripto oneri metni hesaplar.
     *
     * <p>11 sinyal uzerinden: 8+ Guclu Al, 6-7 Al, 5 Notr, 3-4 Sat, 0-2 Guclu Sat.</p>
     *
     * @param greenCount yesil (pozitif) sinyal sayisi (0-11 arasi)
     * @return oneri metni (Guclu Al, Al, Notr, Sat, Guclu Sat)
     */
    private String calculateRecommendation(int greenCount) {
        if (greenCount >= 8) return TwUtils.SIGNAL_STRONG_BUY;
        if (greenCount >= 6) return TwUtils.SIGNAL_BUY;
        if (greenCount == 5) return TwUtils.SIGNAL_NEUTRAL;
        if (greenCount >= 3) return TwUtils.SIGNAL_SELL;
        return TwUtils.SIGNAL_STRONG_SELL;
    }

    /**
     * Tek bir indikator icin ad ve durum bilgisi iceren Map olusturur.
     *
     * @param name   indikator adi (orn: "MACD", "RSI")
     * @param status sinyal durumu: "positive", "negative" veya "neutral"
     * @return indikator bilgi Map'i
     */
    private Map<String, String> buildIndicator(String name, String status) {
        Map<String, String> map = new HashMap<>();
        map.put("name", name);
        map.put("status", status);
        return map;
    }

    /**
     * Map'ten null-safe double degeri cikarir.
     *
     * @param map kaynak map
     * @param key aranacak anahtar
     * @return bulunan Double degeri veya null
     */
    private Double getDouble(Map<String, Object> map, String key) {
        if (map == null) return null;
        Object val = map.get(key);
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean isValidCoinId(String coinId) {
        return coinId != null && coinId.matches("^[a-z0-9-]{1,50}$");
    }
}
