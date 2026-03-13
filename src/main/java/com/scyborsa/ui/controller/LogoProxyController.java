package com.scyborsa.ui.controller;

import com.scyborsa.ui.service.Bist100Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.Duration;
import java.util.regex.Pattern;

/**
 * Hisse ve araci kurum logo proxy controller'i.
 *
 * <p>scyborsaApi'deki logo cache endpoint'lerine WebClient uzerinden erisir
 * ve binary icerik olarak istemciye iletir. Iki endpoint sunar:</p>
 * <ul>
 *   <li>{@code /img/stock-logos/{logoid}} - Hisse SVG logo proxy (permitAll)</li>
 *   <li>{@code /img/brokerage-logos/{filename}} - Araci kurum logo proxy (permitAll)</li>
 * </ul>
 *
 * <p>Browser cache: 7 gun ({@code Cache-Control: public, max-age=604800}).
 * SVG yanitlarinda CSP baslik eklenir ({@code default-src 'none'; style-src 'unsafe-inline'}).</p>
 *
 * @see Bist100Service
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class LogoProxyController {

    /** Logoid dogrulama deseni: sadece kucuk harf, rakam ve tire, 1-100 karakter. */
    private static final Pattern VALID_LOGOID = Pattern.compile("^[a-z0-9-]{1,100}$");

    /** Araci kurum logo dosya adi dogrulama deseni: kucuk harf, rakam, alt tire, tire + bilinen uzanti. */
    private static final Pattern VALID_BROKERAGE_FILENAME = Pattern.compile("^[a-z0-9_-]{1,100}\\.(png|jpeg|jpg|svg)$");

    /** Logo gorsel verilerini saglayan servis. */
    private final Bist100Service bist100Service;

    /**
     * Logoid'e ait SVG logo dosyasini proxy olarak dondurur.
     *
     * <p>scyborsaApi'deki logo cache endpoint'ine WebClient ile erisir.
     * Browser cache: 7 gun ({@code Cache-Control: public, max-age=604800}).
     * SVG icerik icin CSP baslik eklenir.</p>
     *
     * @param logoid TradingView logoid (orn. "turk-hava-yollari")
     * @return SVG binary (image/svg+xml) veya 400 (gecersiz logoid) veya 404 (bulunamadi)
     */
    @GetMapping("/img/stock-logos/{logoid}")
    @ResponseBody
    public ResponseEntity<byte[]> getStockLogoImage(@PathVariable String logoid) {
        if (!VALID_LOGOID.matcher(logoid).matches()) {
            return ResponseEntity.badRequest().build();
        }
        byte[] svg = bist100Service.getStockLogoImage(logoid);
        if (svg == null || svg.length == 0) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.valueOf("image/svg+xml"))
                .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
                .body(svg);
    }

    /**
     * Araci kurum logo dosyasini proxy olarak dondurur.
     *
     * <p>scyborsaApi'deki brokerage logo cache endpoint'ine WebClient ile erisir.
     * Browser cache: 7 gun ({@code Cache-Control: public, max-age=604800}).
     * PNG/JPEG/SVG formatlari desteklenir. SVG icerik icin CSP baslik eklenir.</p>
     *
     * @param filename logo dosya adi (orn. "alnus_yatirim_icon.png")
     * @return logo binary veya 400 (gecersiz dosya adi) veya 404 (bulunamadi)
     */
    @GetMapping("/img/brokerage-logos/{filename:.+}")
    @ResponseBody
    public ResponseEntity<byte[]> getBrokerageLogoImage(@PathVariable String filename) {
        if (!VALID_BROKERAGE_FILENAME.matcher(filename).matches()) {
            return ResponseEntity.badRequest().build();
        }
        byte[] logo = bist100Service.getBrokerageLogoImage(filename);
        if (logo == null || logo.length == 0) {
            return ResponseEntity.notFound().build();
        }
        // Regex validation sadece .png, .jpeg, .jpg, .svg uzantilarina izin verir —
        // bu noktaya ulasan dosya adi kesinlikle bilinen bir uzantiya sahiptir.
        MediaType mediaType = filename.endsWith(".svg") ? MediaType.valueOf("image/svg+xml")
                : filename.endsWith(".png") ? MediaType.IMAGE_PNG
                : MediaType.IMAGE_JPEG; // .jpg ve .jpeg — regex validation diger uzantilari engeller

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());

        if (filename.endsWith(".svg")) {
            builder.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
        }

        return builder.body(logo);
    }
}
