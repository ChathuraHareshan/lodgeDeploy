package lk.karu.lodge.controller.api.admin;

import lk.karu.lodge.dto.admin.AdminStatusRequest;
import lk.karu.lodge.dto.admin.AdminVillaRequest;
import lk.karu.lodge.service.admin.AdminSupport;
import lk.karu.lodge.service.admin.AdminVillaService;
import lk.karu.lodge.util.AppUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/villa")
public class AdminVillaController {

    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadAll() {
        return ResponseEntity.ok(new AdminVillaService().loadAll());
    }

    @GetMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadOne(@PathVariable int id) {
        return ResponseEntity.ok(new AdminVillaService().loadOne(id));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> create(@RequestBody String json) {
        AdminVillaRequest req = parse(json);
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminVillaService().create(req));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> update(@PathVariable int id, @RequestBody String json) {
        AdminVillaRequest req = parse(json);
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminVillaService().update(id, req));
    }

    @PutMapping(path = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> setStatus(@PathVariable int id, @RequestBody String json) {
        AdminStatusRequest req;
        try {
            req = AppUtil.GSON.fromJson(json, AdminStatusRequest.class);
        } catch (Exception e) {
            req = null;
        }
        return ResponseEntity.ok(req == null ? AdminSupport.fail("Invalid request.") : new AdminVillaService().setStatus(id, req.status));
    }

    @DeleteMapping(path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> delete(@PathVariable int id) {
        return ResponseEntity.ok(new AdminVillaService().delete(id));
    }

    private static AdminVillaRequest parse(String json) {
        try {
            return AppUtil.GSON.fromJson(json, AdminVillaRequest.class);
        } catch (Exception e) {
            return null;
        }
    }
}
