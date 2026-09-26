package lk.karu.lodge.controller.api.admin;

import lk.karu.lodge.service.admin.AdminMetaService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/meta")
public class AdminMetaController {

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadMeta() {
        return ResponseEntity.ok(new AdminMetaService().loadMeta());
    }
}
