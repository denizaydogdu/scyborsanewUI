package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.SectorStockDto;
import com.scyborsa.ui.service.Bist100Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

/**
 * BIST endeks hisse listesi sayfalari controller'i.
 *
 * <p>Dort endpoint sunar:</p>
 * <ul>
 *   <li>{@code /tum-hisseler} - Tum BIST hisse tablosu</li>
 *   <li>{@code /bist100} - BIST 100 endeks hisse tablosu</li>
 *   <li>{@code /bist50} - BIST 50 endeks hisse tablosu</li>
 *   <li>{@code /bist30} - BIST 30 endeks hisse tablosu</li>
 * </ul>
 *
 * <p>Tum sayfalar ayni template'i ({@code bist100/bist100-list}) kullanir,
 * yalnizca baslik ve veri degisir.</p>
 *
 * @see Bist100Service
 * @see SectorStockDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class Bist100Controller {

    private final Bist100Service bist100Service;

    /**
     * Tum BIST hisse listesi sayfasini goruntular.
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "bist100/bist100-list"} template adi
     */
    @GetMapping("/tum-hisseler")
    public String tumHisseler(Model model) {
        return renderIndexPage(model, bist100Service.getAllStocks(), "Tüm Hisseler");
    }

    /**
     * BIST 100 endeks hisse listesi sayfasini goruntular.
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "bist100/bist100-list"} template adi
     */
    @GetMapping("/bist100")
    public String bist100List(Model model) {
        return renderIndexPage(model, bist100Service.getBist100Stocks(), "BIST 100");
    }

    /**
     * BIST 50 endeks hisse listesi sayfasini goruntular.
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "bist100/bist100-list"} template adi
     */
    @GetMapping("/bist50")
    public String bist50List(Model model) {
        return renderIndexPage(model, bist100Service.getBist50Stocks(), "BIST 50");
    }

    /**
     * BIST 30 endeks hisse listesi sayfasini goruntular.
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "bist100/bist100-list"} template adi
     */
    @GetMapping("/bist30")
    public String bist30List(Model model) {
        return renderIndexPage(model, bist100Service.getBist30Stocks(), "BIST 30");
    }

    /**
     * Endeks hisse tablosu sayfasini render eder.
     *
     * @param model     Thymeleaf model nesnesi
     * @param stocks    hisse listesi
     * @param indexName endeks adi (orn. "BIST 100")
     * @return template adi
     */
    private String renderIndexPage(Model model, List<SectorStockDto> stocks, String indexName) {
        model.addAttribute("stocks", stocks);
        model.addAttribute("stockCount", stocks.size());
        model.addAttribute("indexName", indexName);
        return "bist100/bist100-list";
    }
}
