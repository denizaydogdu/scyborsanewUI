package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.AraciKurumAkdListDto;
import com.scyborsa.ui.dto.AraciKurumDetailDto;
import com.scyborsa.ui.dto.BrokerageTakasListDto;
import com.scyborsa.ui.service.AraciKurumListService;
import com.scyborsa.ui.service.KatilimEndeksiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Collections;

/**
 * Aracı kurumlar piyasa geneli AKD dağılım sayfası controller'ı.
 *
 * <p>{@code /araci-kurumlar} URL'inde aracı kurumların piyasa geneli
 * alış/satış/net hacim dağılımını gösteren sayfayı sunar.</p>
 *
 * @see AraciKurumListService
 * @see AraciKurumAkdListDto
 * @see AraciKurumDetailDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class AraciKurumlarController {

    /** Araci kurum AKD listesi ve detay verilerini saglayan servis. */
    private final AraciKurumListService araciKurumListService;

    /** Katılım endeksi kontrol servisi. */
    private final KatilimEndeksiService katilimEndeksiService;

    /**
     * Aracı kurumlar piyasa geneli AKD dağılım sayfasını gösterir.
     *
     * <p>Opsiyonel tarih parametresi ile geçmiş tarih verileri görüntülenebilir.
     * Tarih formatı YYYY-MM-DD olmalıdır; geçersiz format durumunda tarih parametresi
     * yok sayılır.</p>
     *
     * @param date  tarih filtresi (opsiyonel, YYYY-MM-DD)
     * @param model Thymeleaf model
     * @return template adı
     */
    @GetMapping("/araci-kurumlar")
    public String araciKurumlar(@RequestParam(required = false) String date, Model model) {
        // Tarih sanitizasyonu (log injection engellemek icin once sanitize, sonra logla)
        if (date != null && !date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            log.warn("[ARACI-KURUM-UI] Geçersiz tarih formatı alındı, yok sayılıyor");
            date = null;
        }
        log.info("[ARACI-KURUM-UI] Aracı kurumlar sayfası istendi, date={}", date);

        AraciKurumAkdListDto response = araciKurumListService.getAraciKurumAkdList(date);

        if (response != null && response.getItems() != null && !response.getItems().isEmpty()) {
            model.addAttribute("kurumlar", response.getItems());
            model.addAttribute("dataDate", response.getFormattedDataDate());
            model.addAttribute("kurumSayisi", response.getItems().size());

            // KPI hesaplamaları
            long totalVolume = response.getItems().stream()
                    .mapToLong(AraciKurumAkdListDto.BrokerageAkdItemDto::getTotalVolume)
                    .sum();
            long netBuyerCount = response.getItems().stream()
                    .filter(i -> i.getNetVolume() > 0)
                    .count();
            long netSellerCount = response.getItems().stream()
                    .filter(i -> i.getNetVolume() < 0)
                    .count();

            model.addAttribute("totalVolume", totalVolume);
            model.addAttribute("netBuyerCount", netBuyerCount);
            model.addAttribute("netSellerCount", netSellerCount);
        } else {
            model.addAttribute("kurumlar", Collections.emptyList());
            model.addAttribute("dataDate", "");
            model.addAttribute("kurumSayisi", 0);
            model.addAttribute("totalVolume", 0L);
            model.addAttribute("netBuyerCount", 0L);
            model.addAttribute("netSellerCount", 0L);
        }

        return "araciKurumlar/araci-kurumlar-list";
    }

    /**
     * Takas analizi sayfasini gosterir.
     *
     * <p>Araci kurumlarin takas (saklama) dagilimini, piyasa paylarini
     * ve haftalik degisimlerini gosteren sayfayi sunar.</p>
     *
     * @param model Thymeleaf model
     * @return template adi
     */
    @GetMapping("/takas-analizi")
    public String takasAnalizi(Model model) {
        log.info("[ARACI-KURUM-UI] Takas analizi sayfasi istendi");

        BrokerageTakasListDto response = araciKurumListService.getTakasListesi();

        if (response != null && response.getItems() != null && !response.getItems().isEmpty()) {
            var items = response.getItems();
            model.addAttribute("kurumlar", items);
            model.addAttribute("kurumSayisi", items.size());

            // Toplam piyasa degeri
            double totalMarketValue = items.stream()
                    .mapToDouble(BrokerageTakasListDto.BrokerageTakasItemDto::getLastValue)
                    .sum();
            model.addAttribute("totalMarketValue", totalMarketValue);

            // En buyuk kurum (liste zaten sirali)
            model.addAttribute("topKurum", items.get(0));
        } else {
            model.addAttribute("kurumlar", Collections.emptyList());
            model.addAttribute("kurumSayisi", 0);
            model.addAttribute("totalMarketValue", 0.0);
            model.addAttribute("topKurum", null);
        }

        return "araciKurumlar/takas-analizi";
    }

    /**
     * Aracı kurum hisse bazlı AKD detay sayfasını gösterir.
     *
     * <p>Belirli bir aracı kurumun hisse bazlı alış/satış/net dağılım
     * detayını gösterir. Opsiyonel tarih parametresi ile geçmiş tarih
     * verileri görüntülenebilir.</p>
     *
     * @param code  kurum kodu (MLB, YKR vb.)
     * @param date  tarih filtresi (opsiyonel, YYYY-MM-DD)
     * @param model Thymeleaf model
     * @return detay sayfası template adı
     */
    @GetMapping("/araci-kurumlar/{code}")
    public String araciKurumDetail(@PathVariable String code,
                                   @RequestParam(required = false) String date,
                                   Model model) {
        // code sanitizasyonu
        if (code == null || !code.matches("^[A-Z0-9]{2,10}$")) {
            log.warn("[ARACI-KURUM-UI] Geçersiz kurum kodu, yönlendiriliyor");
            return "redirect:/araci-kurumlar";
        }
        // date sanitizasyonu
        if (date != null && !date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            log.warn("[ARACI-KURUM-UI] Geçersiz tarih formatı, yok sayılıyor");
            date = null;
        }
        log.info("[ARACI-KURUM-UI] Aracı kurum detay sayfası istendi, code={}, date={}", code, date);

        AraciKurumDetailDto response = araciKurumListService.getAraciKurumDetail(code, date);

        if (response.getItems() != null && !response.getItems().isEmpty()) {
            model.addAttribute("brokerageCode", response.getBrokerageCode());
            model.addAttribute("stocks", response.getItems());
            model.addAttribute("dataDate", response.getFormattedDataDate());
            model.addAttribute("stockCount", response.getStockCount());
            model.addAttribute("totalBuyVolume", response.getTotalBuyVolume());
            model.addAttribute("totalSellVolume", response.getTotalSellVolume());
            model.addAttribute("totalNetVolume", response.getTotalNetVolume());
            model.addAttribute("kurumTitle", response.getBrokerageTitle() != null ? response.getBrokerageTitle() : code);
            model.addAttribute("kurumShortTitle", response.getBrokerageShortTitle() != null ? response.getBrokerageShortTitle() : code);
            model.addAttribute("kurumLogoUrl", response.getBrokerageLogoUrl() != null ? response.getBrokerageLogoUrl() : "");
        } else {
            model.addAttribute("brokerageCode", code);
            model.addAttribute("stocks", Collections.emptyList());
            model.addAttribute("dataDate", "");
            model.addAttribute("stockCount", 0);
            model.addAttribute("totalBuyVolume", 0L);
            model.addAttribute("totalSellVolume", 0L);
            model.addAttribute("totalNetVolume", 0L);
            model.addAttribute("kurumTitle", code);
            model.addAttribute("kurumShortTitle", code);
            model.addAttribute("kurumLogoUrl", "");
        }

        model.addAttribute("katilimCodes", katilimEndeksiService.getKatilimCodes());
        return "araciKurumlar/araci-kurumlar-detail";
    }
}
