package lk.karu.lodge.controller.api;

import lk.karu.lodge.service.OfferService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offer")
public class OfferController {

    @GetMapping(path = "/active", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadActiveOffers() {
        String result = new OfferService().loadActiveOffers();
        return ResponseEntity.ok(result);
    }
}
