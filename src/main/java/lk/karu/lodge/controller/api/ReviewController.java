package lk.karu.lodge.controller.api;

import lk.karu.lodge.service.ReviewService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/review")
public class ReviewController {

    @GetMapping(path = "/latest", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> loadLatest(@RequestParam(name = "limit", defaultValue = "3") int limit) {
        String result = new ReviewService().loadLatestReviews(limit);
        return ResponseEntity.ok(result);
    }
}
