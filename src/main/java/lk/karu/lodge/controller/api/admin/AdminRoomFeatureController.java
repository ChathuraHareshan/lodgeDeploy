package lk.karu.lodge.controller.api.admin;

import lk.karu.lodge.dto.admin.AdminCatalogRequest;
import lk.karu.lodge.service.admin.AdminRoomFeatureService;
import lk.karu.lodge.service.admin.AdminSupport;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/room-feature")
public class AdminRoomFeatureController {

    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadAll() {
        return ResponseEntity.ok(new AdminRoomFeatureService().loadAll());
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> create(@RequestBody String json) {
        AdminCatalogRequest req = parse(json);
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminRoomFeatureService().create(req));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> rename(@PathVariable int id, @RequestBody String json) {
        AdminCatalogRequest req = parse(json);
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminRoomFeatureService().rename(id, req));
    }

    @DeleteMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> delete(@PathVariable int id) {
        return ResponseEntity.ok(new AdminRoomFeatureService().delete(id));
    }

    private static AdminCatalogRequest parse(String json) {
        try {
            return AppUtil.GSON.fromJson(json, AdminCatalogRequest.class);
        } catch (Exception e) {
            return null;
        }
    }
}
