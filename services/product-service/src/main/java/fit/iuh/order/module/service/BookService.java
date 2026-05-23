package fit.iuh.order.module.service;

import fit.iuh.order.module.dto.BookRequestDTO;
import fit.iuh.order.module.domain.Book;
import fit.iuh.order.module.domain.BookImage;
import fit.iuh.order.module.domain.Category;
import fit.iuh.order.module.repository.BookRepository;
import fit.iuh.order.module.repository.CategoryRepository;
import fit.iuh.order.module.semanticsearch.BookSemanticRepository;
import fit.iuh.order.module.semanticsearch.SemanticEmbeddingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class BookService {

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SemanticEmbeddingService semanticEmbeddingService;

    @Autowired
    private BookSemanticRepository bookSemanticRepository;

    // Lấy tất cả sách
    public List<Book> getAllBooks() {
        return bookRepository.findAll();
    }

    // Lấy sách theo ID
    public Book getBookById(Long id) {
        return bookRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy sách với ID: " + id));
    }

    // Thêm sách mới
    @Transactional
    public Book createBook(BookRequestDTO requestDTO) {
        Book book = new Book();

        // Map các trường cơ bản
        book.setTitle(requestDTO.getTitle());
        book.setAuthor(requestDTO.getAuthor());
        book.setPublisher(requestDTO.getPublisher());
        book.setPrice(requestDTO.getPrice());
        book.setStockQuantity(requestDTO.getStockQuantity());
        book.setStatus(requestDTO.getStatus());
        book.setDescription(requestDTO.getDescription());
        book.setImageUrl(requestDTO.getImageUrl());

        // Xử lý Category và Parent Category
        if (requestDTO.getCategoryId() != null) {
            Category category = categoryRepository.findById(requestDTO.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục!"));
            book.setCategory(category);
            book.setParentCategoryId(category.getParentId());
        }

        // Xử lý Danh sách Ảnh phụ
        if (requestDTO.getSecondaryImageUrls() != null && !requestDTO.getSecondaryImageUrls().isEmpty()) {
            List<BookImage> images = new ArrayList<>();
            for (String url : requestDTO.getSecondaryImageUrls()) {
                images.add(new BookImage(url, book));
            }
            book.setSecondaryImages(images);
        }

        Book savedBook = bookRepository.save(book);
        float[] embedding = semanticEmbeddingService.generateEmbedding(savedBook.buildTextForEmbedding());
        String embeddingLiteral = semanticEmbeddingService.toVectorLiteral(embedding);
        bookSemanticRepository.updateEmbedding(savedBook.getId(), embeddingLiteral);
        savedBook.setEmbedding(embedding);

        return savedBook;
    }

    // Cập nhật sách
    @Transactional
    public Book updateBook(Long id, BookRequestDTO requestDTO) {
        Book existingBook = bookRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy sách với ID: " + id));

        // Map lại các trường
        existingBook.setTitle(requestDTO.getTitle());
        existingBook.setAuthor(requestDTO.getAuthor());
        existingBook.setPublisher(requestDTO.getPublisher());
        existingBook.setPrice(requestDTO.getPrice());
        existingBook.setStockQuantity(requestDTO.getStockQuantity());
        existingBook.setStatus(requestDTO.getStatus());
        existingBook.setDescription(requestDTO.getDescription());
        existingBook.setImageUrl(requestDTO.getImageUrl());

        // Cập nhật lại Category nếu có thay đổi
        if (requestDTO.getCategoryId() != null) {
            Category category = categoryRepository.findById(requestDTO.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục!"));
            existingBook.setCategory(category);
            existingBook.setParentCategoryId(category.getParentId());
        }

        // Cập nhật Danh sách Ảnh phụ (Xóa cũ, đắp mới)
        if (requestDTO.getSecondaryImageUrls() != null) {
            existingBook.getSecondaryImages().clear();
            for (String url : requestDTO.getSecondaryImageUrls()) {
                existingBook.getSecondaryImages().add(new BookImage(url, existingBook));
            }
        }

        Book savedBook = bookRepository.save(existingBook);
        float[] embedding = semanticEmbeddingService.generateEmbedding(savedBook.buildTextForEmbedding());
        String embeddingLiteral = semanticEmbeddingService.toVectorLiteral(embedding);
        bookSemanticRepository.updateEmbedding(savedBook.getId(), embeddingLiteral);
        savedBook.setEmbedding(embedding);

        return savedBook;
    }

    // Xoá sách
    public void deleteBook(Long id) {
        Book existingBook = getBookById(id);
        existingBook.setIsDeleted(true);
        bookRepository.save(existingBook);
    }
}
