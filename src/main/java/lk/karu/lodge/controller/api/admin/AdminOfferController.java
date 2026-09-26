package lk.karu.lodge.controller.api.admin;

import lk.karu.lodge.dto.admin.AdminOfferRequest;
import lk.karu.lodge.service.admin.AdminOfferService;
import lk.karu.lodge.service.admin.AdminSupport;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/offer")
public class AdminOfferController {

    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadAll() {
        return ResponseEntity.ok(new AdminOfferService().loadAll());
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> create(@RequestBody String json) {
        AdminOfferRequest req = parse(json);
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminOfferService().create(req));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> update(@PathVariable int id, @RequestBody String json) {
        AdminOfferRequest req = parse(json);
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminOfferService().update(id, req));
    }

    @PutMapping(path = "/{id}/active", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> setActive(@PathVariable int id, @RequestBody String json) {
        AdminOfferRequest req = parse(json);
        return ResponseEntity.ok(req == null || req.active == null ? AdminSupport.fail("Invalid request.") : new AdminOfferService().setActive(id, req.active));
    }

    @DeleteMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> delete(@PathVariable int id) {
        return ResponseEntity.ok(new AdminOfferService().delete(id));
    }

    private static AdminOfferRequest parse(String json) {
        try {
            return AppUtil.GSON.fromJson(json, AdminOfferRequest.class);
        } catch (Exception e) {
            return null;
        }
    }
}
