package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.watchlist.WatchlistDto;
import com.scyborsa.ui.dto.watchlist.WatchlistStockDto;
import com.scyborsa.ui.service.WatchlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Takip listesi controller sinifi.
 *
 * <p>Takip listesi sayfasi ve AJAX proxy endpoint'lerini icerir.
 * Tum istekler kullanicinin email adresi ile API'ye proxy edilir.</p>
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class WatchlistController {

    /** Takip listesi islemlerini yapan servis. */
    private final WatchlistService watchlistService;

    // ── View Endpoint ──────────────────────────────────────

    /**
     * Takip listesi sayfasini goruntular.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /takip-listeleri}</p>
     *
     * <p>Kullanicinin takip listelerini yukler. Hic liste yoksa
     * ilk listenin hisselerini de modele ekler.</p>
     *
     * @param model     Thymeleaf model nesnesi
     * @param principal oturum acmis kullanici
     * @return {@code "watchlist/watchlist"} view
     */
    @GetMapping("/takip-listeleri")
    public String watchlistPage(Model model, Principal principal) {
        if (principal == null) return "redirect:/login";

        try {
            List<WatchlistDto> watchlists = watchlistService.getWatchlists(principal.getName());
            model.addAttribute("watchlists", watchlists);

            if (!watchlists.isEmpty()) {
                WatchlistDto activeWatchlist = watchlists.get(0);
                model.addAttribute("activeWatchlist", activeWatchlist);

                List<WatchlistStockDto> stocks = watchlistService.getWatchlistStocks(
                        activeWatchlist.getId(), principal.getName());
                model.addAttribute("stocks", stocks);
            } else {
                model.addAttribute("activeWatchlist", null);
                model.addAttribute("stocks", Collections.emptyList());
            }
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listesi sayfasi yuklenemedi: {}", e.getMessage());
            model.addAttribute("watchlists", Collections.emptyList());
            model.addAttribute("activeWatchlist", null);
            model.addAttribute("stocks", Collections.emptyList());
        }

        return "watchlist/watchlist";
    }

    // ── AJAX: Watchlist CRUD ───────────────────────────────

    /**
     * Kullanicinin takip listelerini JSON olarak doner (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/watchlists}</p>
     *
     * @param principal oturum acmis kullanici
     * @return takip listesi listesi
     */
    @GetMapping("/ajax/watchlists")
    @ResponseBody
    public List<WatchlistDto> getWatchlistsAjax(Principal principal) {
        if (principal == null) return Collections.emptyList();
        try {
            return watchlistService.getWatchlists(principal.getName());
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listeleri alinamadi: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Yeni takip listesi olusturur (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> POST</p>
     * <p><b>Path:</b> {@code /ajax/watchlists}</p>
     *
     * @param body      name ve description alanlari iceren Map
     * @param principal oturum acmis kullanici
     * @return olusturulan takip listesi DTO
     */
    @PostMapping("/ajax/watchlists")
    @ResponseBody
    public ResponseEntity<WatchlistDto> createWatchlist(@RequestBody Map<String, String> body,
                                                         Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            WatchlistDto created = watchlistService.createWatchlist(
                    body.get("name"), body.get("description"), principal.getName());
            return created != null
                    ? ResponseEntity.ok(created)
                    : ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listesi olusturulamadi: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Mevcut bir takip listesini gunceller (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> PUT</p>
     * <p><b>Path:</b> {@code /ajax/watchlists/{id}}</p>
     *
     * @param id        takip listesi ID
     * @param body      name ve description alanlari iceren Map
     * @param principal oturum acmis kullanici
     * @return guncellenmis takip listesi DTO
     */
    @PutMapping("/ajax/watchlists/{id}")
    @ResponseBody
    public ResponseEntity<WatchlistDto> updateWatchlist(@PathVariable Long id,
                                                         @RequestBody Map<String, String> body,
                                                         Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            WatchlistDto updated = watchlistService.updateWatchlist(
                    id, body.get("name"), body.get("description"), principal.getName());
            return updated != null
                    ? ResponseEntity.ok(updated)
                    : ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listesi guncellenemedi (id={}): {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Belirtilen takip listesini siler (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> DELETE</p>
     * <p><b>Path:</b> {@code /ajax/watchlists/{id}}</p>
     *
     * @param id        takip listesi ID
     * @param principal oturum acmis kullanici
     * @return 200 OK
     */
    @DeleteMapping("/ajax/watchlists/{id}")
    @ResponseBody
    public ResponseEntity<Void> deleteWatchlist(@PathVariable Long id, Principal principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            watchlistService.deleteWatchlist(id, principal.getName());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listesi silinemedi (id={}): {}", id, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── AJAX: Watchlist Stock Operations ───────────────────

    /**
     * Belirtilen takip listesindeki hisseleri JSON olarak doner (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/watchlists/{id}/stocks}</p>
     *
     * @param id        takip listesi ID
     * @param principal oturum acmis kullanici
     * @return hisse listesi
     */
    @GetMapping("/ajax/watchlists/{id}/stocks")
    @ResponseBody
    public List<WatchlistStockDto> getWatchlistStocksAjax(@PathVariable Long id,
                                                           Principal principal) {
        if (principal == null) return Collections.emptyList();
        try {
            return watchlistService.getWatchlistStocks(id, principal.getName());
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listesi hisseleri alinamadi (id={}): {}", id, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Takip listesine yeni hisse ekler (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> POST</p>
     * <p><b>Path:</b> {@code /ajax/watchlists/{id}/stocks}</p>
     *
     * @param id        takip listesi ID
     * @param body      stockCode ve stockName alanlari iceren Map
     * @param principal oturum acmis kullanici
     * @return eklenen hisse DTO
     */
    @PostMapping("/ajax/watchlists/{id}/stocks")
    @ResponseBody
    public ResponseEntity<WatchlistStockDto> addStock(@PathVariable Long id,
                                                       @RequestBody Map<String, String> body,
                                                       Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            WatchlistStockDto added = watchlistService.addStock(
                    id, body.get("stockCode"), body.get("stockName"), principal.getName());
            return added != null
                    ? ResponseEntity.ok(added)
                    : ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Hisse eklenemedi (watchlistId={}, stockCode={}): {}",
                    id, body.get("stockCode"), e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Takip listesinden hisse cikarir (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> DELETE</p>
     * <p><b>Path:</b> {@code /ajax/watchlists/{id}/stocks/{stockCode}}</p>
     *
     * @param id        takip listesi ID
     * @param stockCode cikarilacak hisse borsa kodu
     * @param principal oturum acmis kullanici
     * @return 200 OK
     */
    @DeleteMapping("/ajax/watchlists/{id}/stocks/{stockCode}")
    @ResponseBody
    public ResponseEntity<Void> removeStock(@PathVariable Long id,
                                             @PathVariable String stockCode,
                                             Principal principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            watchlistService.removeStock(id, stockCode, principal.getName());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Hisse cikarilAmadi (watchlistId={}, stockCode={}): {}",
                    id, stockCode, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Takip listesindeki hisselerin siralamasini gunceller (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> PUT</p>
     * <p><b>Path:</b> {@code /ajax/watchlists/{id}/stocks/reorder}</p>
     *
     * @param id        takip listesi ID
     * @param itemIds   yeni siradaki hisse ID listesi
     * @param principal oturum acmis kullanici
     * @return 200 OK
     */
    @PutMapping("/ajax/watchlists/{id}/stocks/reorder")
    @ResponseBody
    public ResponseEntity<Void> reorderStocks(@PathVariable Long id,
                                               @RequestBody List<Long> itemIds,
                                               Principal principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            watchlistService.reorderStocks(id, itemIds, principal.getName());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Hisse siralanamadi (watchlistId={}): {}", id, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
