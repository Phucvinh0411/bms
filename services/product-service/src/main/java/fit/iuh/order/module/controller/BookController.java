package fit.iuh.order.module.controller;

import fit.iuh.order.module.domain.Book;
import fit.iuh.order.module.dto.BookRequestDTO;
import fit.iuh.order.module.service.BookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://localhost:3001"})
public class BookController {

    @Autowired
    private BookService bookService;

    // Lấy danh sách toàn bộ sách (GET /api/books)
    @GetMapping
    public ResponseEntity<List<Book>> getAllBooks() {
        return ResponseEntity.ok(bookService.getAllBooks());
    }

    // Lấy thông tin 1 quyển sách cụ thể (GET /api/books/{id})
    @GetMapping("/{id}")
    public ResponseEntity<Book> getBookById(@PathVariable Long id) {
        return ResponseEntity.ok(bookService.getBookById(id));
    }

    // Lấy danh sách sách theo danh sách ID (POST /api/books/batch)
    @PostMapping("/batch")
    public ResponseEntity<List<Book>> getBooksByIds(@RequestBody List<Long> ids) {
        return ResponseEntity.ok(bookService.getBooksByIds(ids));
    }

    // Thêm sách mới (POST /api/books)
    @PostMapping
    public ResponseEntity<Book> createBook(@RequestBody BookRequestDTO requestDTO) {
        Book createdBook = bookService.createBook(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdBook);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Book> updateBook(@PathVariable Long id, @RequestBody BookRequestDTO requestDTO) {
        return ResponseEntity.ok(bookService.updateBook(id, requestDTO));
    }

    // Xoá sách (DELETE /api/books/{id})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }
}
