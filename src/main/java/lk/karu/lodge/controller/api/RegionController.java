package lk.karu.lodge.controller.api;

import lk.karu.lodge.service.RegionService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/region")
public class RegionController {

    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadRegions() {
        String result = new RegionService().loadAllRegions();
        return ResponseEntity.ok(result);
    }
}
