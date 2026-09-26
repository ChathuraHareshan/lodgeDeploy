package lk.karu.lodge.controller.api;

import lk.karu.lodge.service.VillaService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/villa")
public class VillaController {

    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadVillas(@RequestParam(required = false) String region,
                                              @RequestParam(required = false) String city,
                                              @RequestParam(required = false) String q) {
        String result = new VillaService().loadVillas(region, city, q);
        return ResponseEntity.ok(result);
    }

    @GetMapping(path = "/destinations", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadDestinations() {
        String result = new VillaService().loadDestinations();
        return ResponseEntity.ok(result);
    }

    @GetMapping(path = "/{slug}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadVillaDetail(@PathVariable String slug,
                                                   @RequestParam(required = false) String checkIn,
                                                   @RequestParam(required = false) String checkOut) {
        String result = new VillaService().loadVillaDetail(slug, checkIn, checkOut);
        return ResponseEntity.ok(result);
    }
}
