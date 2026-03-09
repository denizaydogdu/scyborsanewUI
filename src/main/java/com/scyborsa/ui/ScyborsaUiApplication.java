package com.scyborsa.ui;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Scyborsa UI uygulamasının giriş noktası.
 * <p>
 * Thymeleaf tabanlı frontend uygulamasını başlatır. Port 8080 üzerinde
 * çalışır ve scyborsaApi backend servisini (port 8081) WebClient aracılığıyla tüketir.
 * </p>
 */
@SpringBootApplication
public class ScyborsaUiApplication {

    /**
     * Spring Boot uygulamasını başlatır.
     *
     * @param args komut satırı argümanları
     */
    public static void main(String[] args) {
        SpringApplication.run(ScyborsaUiApplication.class, args);
    }

}
