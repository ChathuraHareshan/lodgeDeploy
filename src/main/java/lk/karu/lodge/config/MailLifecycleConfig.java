package lk.karu.lodge.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lk.karu.lodge.provider.MailServiceProvider;
import org.springframework.stereotype.Component;


@Component
public class MailLifecycleConfig {

    @PostConstruct
    public void start() {
        MailServiceProvider.getInstance().start();
    }

    @PreDestroy
    public void shutdown() {
        MailServiceProvider.getInstance().shutdown();
    }
}
