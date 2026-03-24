package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.CryptoFearGreedDto;
import com.scyborsa.ui.dto.CryptoGlobalDto;
import com.scyborsa.ui.dto.CryptoMarketDto;
import com.scyborsa.ui.service.CryptoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
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
}
