package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.CryptoDetailDto;
import com.scyborsa.ui.dto.CryptoFearGreedDto;
import com.scyborsa.ui.dto.CryptoGlobalDto;
import com.scyborsa.ui.dto.CryptoMarketDto;
import com.scyborsa.ui.service.CryptoService;
import java.util.Collections;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

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

        // Stock bolumleri disabled
        model.addAttribute("hasAnalysisData", false);
        model.addAttribute("hasAkdData", false);
        model.addAttribute("hasTakasData", false);
        model.addAttribute("hasOrderbookData", false);
        model.addAttribute("analistTavsiyeleri", null);
        model.addAttribute("marketOpen", true); // crypto 24/7
        model.addAttribute("NO_TIME", null);

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

    private boolean isValidCoinId(String coinId) {
        return coinId != null && coinId.matches("^[a-z0-9-]{1,50}$");
    }
}
