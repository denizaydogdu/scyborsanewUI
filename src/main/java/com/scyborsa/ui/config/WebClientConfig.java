package com.scyborsa.ui.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * WebClient konfigürasyon sınıfı.
 * <p>
 * scyborsaApi backend servisine HTTP istekleri göndermek için kullanılan
 * {@link WebClient.Builder} bean'ini oluşturur. Base URL değeri
 * {@code api.base-url} application property'sinden okunur.
 * </p>
 *
 * @see org.springframework.web.reactive.function.client.WebClient
 */
@Configuration
public class WebClientConfig {

    @Value("${api.base-url}")
    private String apiBaseUrl;

    /**
     * Önceden yapılandırılmış bir {@link WebClient.Builder} bean'i oluşturur.
     * <p>
     * Builder, {@code api.base-url} property'sinden alınan base URL ile
     * konfigüre edilir. Enjekte edilen her servis bu builder üzerinden
     * kendi WebClient örneğini oluşturabilir.
     * </p>
     *
     * @return base URL'i ayarlanmış {@link WebClient.Builder} örneği
     */
    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder()
                .baseUrl(apiBaseUrl);
    }

}
