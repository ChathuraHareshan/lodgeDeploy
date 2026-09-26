package lk.karu.lodge.controller.api;

import com.google.gson.JsonObject;
import lk.karu.lodge.service.CurrencyService;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/currency")
public class CurrencyController {

    private final CurrencyService currencyService = new CurrencyService();

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> rates() {
        JsonObject out = currencyService.rates();
        return ResponseEntity.ok(AppUtil.GSON.toJson(out));
    }
}
