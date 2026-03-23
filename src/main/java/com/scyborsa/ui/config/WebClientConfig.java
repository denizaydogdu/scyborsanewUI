package com.scyborsa.ui.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.codec.ClientCodecConfigurer;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
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

    /** scyborsaApi backend base URL'i (application.yml: api.base-url). */
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
    /** Maksimum buffer boyutu (2 MB). Taramalar groupByStock gibi büyük JSON response'lar için gerekli. */
    private static final int MAX_BUFFER_SIZE = 2 * 1024 * 1024;

    @Bean
    public WebClient.Builder webClientBuilder() {
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(MAX_BUFFER_SIZE))
                .build();

        return WebClient.builder()
                .baseUrl(apiBaseUrl)
                .exchangeStrategies(strategies);
    }

}
