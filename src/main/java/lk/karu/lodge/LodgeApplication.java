package lk.karu.lodge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

@SpringBootApplication
public class LodgeApplication extends SpringBootServletInitializer {

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(LodgeApplication.class);
    }

    public static void main(String[] args) {
        SpringApplication.run(LodgeApplication.class, args);
        System.out.println("App URL: http://localhost:8080/lodge");

    }
}
