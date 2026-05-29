-- 1. Insert Parent Categories
INSERT INTO categories (id, name, parent_id) VALUES
(1, 'Sách văn học', NULL),
(2, 'Sách kinh tế', NULL),
(3, 'Sách thiếu nhi', NULL),
(4, 'Sách kỹ năng sống', NULL),
(5, 'Nuôi dạy con', NULL),
(6, 'Sách Giáo Khoa - Giáo Trình', NULL),
(7, 'Sách Học Ngoại Ngữ', NULL),
(8, 'Sách Tham Khảo', NULL),
(9, 'Từ Điển', NULL),
(10, 'Sách Kiến Thức Tổng Hợp', NULL),
(11, 'Sách Khoa Học - Kỹ Thuật', NULL),
(12, 'Sách Lịch sử', NULL),
(13, 'Điện Ảnh - Nhạc - Họa', NULL),
(14, 'Truyện Tranh, Manga, Comic', NULL),
(15, 'Sách Tôn Giáo - Tâm Linh', NULL),
(16, 'Sách Văn Hóa - Địa Lý - Du Lịch', NULL),
(17, 'Sách Chính Trị - Pháp Lý', NULL),
(18, 'Sách Nông - Lâm - Ngư Nghiệp', NULL),
(19, 'Sách Công Nghệ Thông Tin', NULL),
(20, 'Sách Y Học', NULL),
(21, 'Tạp Chí - Catalogue', NULL),
(22, 'Sách Tâm lý - Giới tính', NULL),
(23, 'Sách Thường Thức - Gia Đình', NULL),
(24, 'Thể Dục - Thể Thao', NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Sub Categories
INSERT INTO categories (id, name, parent_id) VALUES
-- 1. Sách văn học
(101, 'Tiểu thuyết', 1),
(102, 'Truyện ngắn', 1),
(103, 'Thơ ca', 1),

-- 2. Sách kinh tế
(104, 'Quản trị kinh doanh', 2),
(105, 'Tài chính - Đầu tư', 2),
(106, 'Marketing - Bán hàng', 2),

-- 3. Sách thiếu nhi
(107, 'Truyện tranh thiếu nhi', 3),
(108, 'Sách kỹ năng cho bé', 3),
(109, 'Sách tô màu', 3),

-- 4. Sách kỹ năng sống
(110, 'Phát triển bản thân', 4),
(111, 'Giao tiếp - Ứng xử', 4),
(112, 'Tư duy - Làm giàu', 4),

-- 5. Nuôi dạy con
(113, 'Chăm sóc trẻ sơ sinh', 5),
(114, 'Giáo dục sớm', 5),
(115, 'Tâm lý trẻ em', 5),

-- 6. Sách Giáo Khoa - Giáo Trình
(116, 'SGK cấp 1', 6),
(117, 'SGK cấp 2', 6),
(118, 'Giáo trình đại học', 6),

-- 7. Sách Học Ngoại Ngữ
(119, 'Tiếng Anh', 7),
(120, 'Tiếng Nhật', 7),
(121, 'Tiếng Hàn', 7),

-- 8. Sách Tham Khảo
(122, 'Luyện thi THPT', 8),
(123, 'Sách nâng cao', 8),

-- 9. Từ Điển
(124, 'Từ điển Anh - Việt', 9),
(125, 'Từ điển Nhật - Việt', 9),

-- 10. Sách Kiến Thức Tổng Hợp
(126, 'Bách khoa tri thức', 10),
(127, 'Kỹ năng tổng hợp', 10),

-- 11. Sách Khoa Học - Kỹ Thuật
(128, 'Khoa học tự nhiên', 11),
(129, 'Kỹ thuật công nghệ', 11),

-- 12. Sách Lịch sử
(130, 'Lịch sử Việt Nam', 12),
(131, 'Lịch sử thế giới', 12),

-- 13. Điện Ảnh - Nhạc - Họa
(132, 'Âm nhạc', 13),
(133, 'Hội họa', 13),

-- 14. Truyện Tranh, Manga, Comic
(134, 'Manga Nhật Bản', 14),
(135, 'Comic Mỹ', 14),

-- 15. Sách Tôn Giáo - Tâm Linh
(136, 'Phật giáo', 15),
(137, 'Tâm linh - Huyền bí', 15),

-- 16. Sách Văn Hóa - Địa Lý - Du Lịch
(138, 'Du lịch', 16),
(139, 'Văn hóa vùng miền', 16),

-- 17. Sách Chính Trị - Pháp Lý
(140, 'Luật pháp', 17),
(141, 'Chính trị học', 17),

-- 18. Sách Nông - Lâm - Ngư Nghiệp
(142, 'Nông nghiệp', 18),
(143, 'Chăn nuôi', 18),

-- 19. Sách Công Nghệ Thông Tin
(144, 'Lập trình', 19),
(145, 'Cơ sở dữ liệu', 19),
(146, 'AI - Machine Learning', 19),

-- 20. Sách Y Học
(147, 'Y học cơ bản', 20),
(148, 'Chăm sóc sức khỏe', 20),

-- 21. Tạp Chí - Catalogue
(149, 'Tạp chí thời trang', 21),
(150, 'Catalogue sản phẩm', 21),

-- 22. Sách Tâm lý - Giới tính
(151, 'Tâm lý học', 22),
(152, 'Giáo dục giới tính', 22),

-- 23. Sách Thường Thức - Gia Đình
(153, 'Nấu ăn', 23),
(154, 'Mẹo vặt gia đình', 23),

-- 24. Thể Dục - Thể Thao
(155, 'Fitness - Gym', 24),
(156, 'Bóng đá', 24)
ON CONFLICT (id) DO NOTHING;

-- 3. Reset PostgreSQL sequence to prevent duplicated primary key errors for new insertions later
SELECT setval(pg_get_serial_sequence('categories', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM categories;

-- 4. Semantic search setup and book seed data
CREATE EXTENSION IF NOT EXISTS vector;
DROP INDEX IF EXISTS books_embedding_hnsw_idx;
ALTER TABLE books ADD COLUMN IF NOT EXISTS embedding vector(1024);
ALTER TABLE books ALTER COLUMN embedding TYPE vector(1024) USING embedding::vector(1024);
ALTER TABLE books ADD COLUMN IF NOT EXISTS fts_tokens tsvector;

CREATE INDEX IF NOT EXISTS books_embedding_hnsw_idx
ON books USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS books_fts_tokens_gin_idx
ON books USING gin (fts_tokens);

INSERT INTO books (
	id,
	title,
	author,
	publisher,
	price,
	stock_quantity,
	status,
	description,
	image_url,
	category_id,
	parent_category_id
) VALUES
(1001, 'Cha Giàu Cha Nghèo', 'Robert T. Kiyosaki', 'NXB Trẻ', 120000, 20, 'AVAILABLE', 'Sách kinh điển về tư duy tài chính cá nhân, dòng tiền và đầu tư.', 'https://example.com/cha-giau-cha-ngheo.jpg', 105, 2),
(1002, 'Đắc Nhân Tâm', 'Dale Carnegie', 'NXB Tổng Hợp', 98000, 18, 'AVAILABLE', 'Cuốn sách về nghệ thuật giao tiếp, thuyết phục và xây dựng quan hệ tốt đẹp.', 'https://example.com/dac-nhan-tam.jpg', 110, 4),
(1003, 'English Grammar in Use', 'Raymond Murphy', 'Cambridge', 215000, 15, 'AVAILABLE', 'Giáo trình ngữ pháp tiếng Anh thực hành cho người học ở nhiều trình độ.', 'https://example.com/english-grammar-in-use.jpg', 119, 7),
(1004, 'Clean Code', 'Robert C. Martin', 'Prentice Hall', 265000, 12, 'AVAILABLE', 'Sách hướng dẫn viết mã sạch, dễ đọc và dễ bảo trì cho lập trình viên.', 'https://example.com/clean-code.jpg', 144, 19),
(1005, 'Sapiens: Lược sử loài người', 'Yuval Noah Harari', 'NXB Thế Giới', 179000, 10, 'AVAILABLE', 'Khám phá lịch sử phát triển của loài người qua góc nhìn khoa học và xã hội.', 'https://example.com/sapiens.jpg', 131, 12),
(1006, 'Dế Mèn Phiêu Lưu Ký', 'Tô Hoài', 'NXB Kim Đồng', 65000, 25, 'AVAILABLE', 'Tác phẩm kinh điển của văn học Việt Nam, giàu tính phiêu lưu và giáo dục.', 'https://example.com/de-men-phieu-luu-ky.jpg', 101, 1),
(1007, 'One Piece Tập 1', 'Eiichiro Oda', 'NXB Kim Đồng', 24000, 40, 'AVAILABLE', 'Mở đầu hành trình hải tặc đầy hấp dẫn, hài hước và phiêu lưu.', 'https://example.com/one-piece-1.jpg', 134, 14),
(1008, 'Tư Duy Nhanh Và Chậm', 'Daniel Kahneman', 'NXB Trẻ', 145000, 14, 'AVAILABLE', 'Sách nổi tiếng về hai hệ thống tư duy và cách con người ra quyết định.', 'https://example.com/tu-duy-nhanh-va-cham.jpg', 151, 22),
(1009, 'Cơ Thể Người', 'Nhiều tác giả', 'NXB Giáo Dục', 110000, 16, 'AVAILABLE', 'Kiến thức cơ bản về giải phẫu và hoạt động của cơ thể người.', 'https://example.com/co-the-nguoi.jpg', 147, 20),
(1010, 'Bóng Đá Hiện Đại', 'Nhiều tác giả', 'NXB Thể Thao', 90000, 22, 'AVAILABLE', 'Tổng hợp chiến thuật, kỹ năng và tư duy thi đấu trong bóng đá hiện đại.', 'https://example.com/bong-da-hien-dai.jpg', 156, 24)
ON CONFLICT (id) DO NOTHING;

INSERT INTO books (
	id,
	title,
	author,
	publisher,
	price,
	stock_quantity,
	status,
	description,
	image_url,
	category_id,
	parent_category_id
) VALUES
(1011, 'Những Kẻ Khờ Mộng Mơ', 'Nguyễn Nhật Ánh', 'Kim Đồng', 85000, 45, 'AVAILABLE', 'Câu chuyện ấm áp về tuổi thơ và giấc mơ.', 'https://picsum.photos/seed/book1011/600/900', 101, 1),
(1012, 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', 'Nguyễn Nhật Ánh', 'Kim Đồng', 95000, 38, 'AVAILABLE', 'Tác phẩm kinh điển về tuổi thơ miền quê.', 'https://picsum.photos/seed/book1012/600/900', 101, 1),
(1013, 'Cho Tôi Xin Một Vé Đi Tuổi Thơ', 'Nguyễn Nhật Ánh', 'Kim Đồng', 78000, 52, 'AVAILABLE', 'Những kỷ niệm đẹp về tuổi thơ.', 'https://picsum.photos/seed/book1013/600/900', 101, 1),
(1014, 'Harry Potter và Hòn Đá Phù Thủy', 'J.K. Rowling', 'Nhã Nam', 135000, 60, 'AVAILABLE', 'Tác phẩm fantasy nổi tiếng thế giới.', 'https://picsum.photos/seed/book1014/600/900', 101, 1),
(1015, 'Tôi Là Beto', 'Nguyễn Nhật Ánh', 'Kim Đồng', 72000, 40, 'AVAILABLE', 'Câu chuyện về chú chó Beto dễ thương.', 'https://picsum.photos/seed/book1015/600/900', 101, 1),
(1016, 'Dế Mèn Phiêu Lưu Ký', 'Tô Hoài', 'Kim Đồng', 65000, 35, 'AVAILABLE', 'Tác phẩm văn học thiếu nhi kinh điển.', 'https://picsum.photos/seed/book1016/600/900', 101, 1),
(1017, 'Tắt Đèn', 'Ngô Tất Tố', 'Văn Học', 89000, 25, 'AVAILABLE', 'Tác phẩm hiện thực phê phán nổi tiếng.', 'https://picsum.photos/seed/book1017/600/900', 101, 1),
(1018, 'Số Phận Con Người', 'Mikhail Sholokhov', 'Văn Học', 115000, 18, 'AVAILABLE', 'Kiệt tác văn học Nga.', 'https://picsum.photos/seed/book1018/600/900', 101, 1),
(1019, 'Nhà Giả Kim', 'Paulo Coelho', 'Tôn Giáo', 98000, 55, 'AVAILABLE', 'Hành trình theo đuổi giấc mơ.', 'https://picsum.photos/seed/book1019/600/900', 101, 1),
(1020, 'Đắc Nhân Tâm', 'Dale Carnegie', 'First News', 89000, 67, 'AVAILABLE', 'Nghệ thuật giao tiếp và ảnh hưởng đến người khác.', 'https://picsum.photos/seed/book1020/600/900', 111, 4),
(1021, 'Atomic Habits', 'James Clear', 'Alpha Books', 165000, 42, 'AVAILABLE', 'Thay đổi nhỏ dẫn đến thành công lớn.', 'https://picsum.photos/seed/book1021/600/900', 110, 4),
(1022, 'Nghệ Thuật Tư Duy Rõ Ràng', 'Rolf Dobelli', 'Alpha Books', 98000, 48, 'AVAILABLE', '99 lỗi tư duy thường gặp của con người.', 'https://picsum.photos/seed/book1022/600/900', 110, 4),
(1023, 'Sapiens - Lược Sử Loài Người', 'Yuval Noah Harari', 'Thế Giới', 195000, 33, 'AVAILABLE', 'Lịch sử loài người qua góc nhìn mới.', 'https://picsum.photos/seed/book1023/600/900', 131, 12),
(1024, '1984', 'George Orwell', 'Văn Học', 125000, 28, 'AVAILABLE', 'Tác phẩm kinh điển về dystopia.', 'https://picsum.photos/seed/book1024/600/900', 101, 1),
(1025, 'Thép Đã Tôi Thế Đấy', 'Nikolai Ostrovsky', 'Văn Học', 135000, 22, 'AVAILABLE', 'Tác phẩm cách mạng nổi tiếng.', 'https://picsum.photos/seed/book1025/600/900', 101, 1),
(1026, 'Người Giàu Nhất Thành Babylon', 'George S. Clason', 'Alpha Books', 125000, 50, 'AVAILABLE', 'Bài học tài chính kinh điển.', 'https://picsum.photos/seed/book1026/600/900', 105, 2),
(1027, 'Cha Giàu Cha Nghèo', 'Robert Kiyosaki', 'First News', 145000, 45, 'AVAILABLE', 'Bài học về tiền bạc từ hai người cha.', 'https://picsum.photos/seed/book1027/600/900', 105, 2),
(1028, 'Quản Trị Kinh Doanh Hiện Đại', 'Peter Drucker', 'Đồng Nai', 198000, 20, 'AVAILABLE', 'Tác phẩm kinh điển về quản trị.', 'https://picsum.photos/seed/book1028/600/900', 104, 2),
(1029, 'Từ Tốt Đến Vĩ Đại', 'Jim Collins', 'Alpha Books', 175000, 30, 'AVAILABLE', 'Bí quyết biến công ty từ tốt thành vĩ đại.', 'https://picsum.photos/seed/book1029/600/900', 104, 2),
(1030, 'Nghệ Thuật Bán Hàng', 'Zig Ziglar', 'First News', 135000, 35, 'AVAILABLE', 'Kỹ năng bán hàng đỉnh cao.', 'https://picsum.photos/seed/book1030/600/900', 106, 2),
(1031, 'Doraemon Tập 1', 'Fujiko F. Fujio', 'Kim Đồng', 45000, 120, 'AVAILABLE', 'Truyện tranh thiếu nhi bán chạy nhất.', 'https://picsum.photos/seed/book1031/600/900', 107, 3),
(1032, 'Conan Tập 1', 'Gosho Aoyama', 'Kim Đồng', 45000, 95, 'AVAILABLE', 'Thám tử lừng danh Conan.', 'https://picsum.photos/seed/book1032/600/900', 107, 3),
(1033, 'Sách Tô Màu Công Chúa', 'Various', 'Kim Đồng', 35000, 80, 'AVAILABLE', 'Sách tô màu giúp phát triển sáng tạo.', 'https://picsum.photos/seed/book1033/600/900', 109, 3),
(1034, 'Yêu Con Không Phải Là Cưng Chiều', 'Đặng Hoàng Giang', 'Phụ Nữ', 135000, 32, 'AVAILABLE', 'Phương pháp giáo dục con khoa học.', 'https://picsum.photos/seed/book1034/600/900', 114, 5),
(1035, 'Cách Nói Chuyện Với Trẻ', 'Adele Faber', 'First News', 125000, 40, 'AVAILABLE', 'Kỹ năng giao tiếp với con cái.', 'https://picsum.photos/seed/book1035/600/900', 114, 5),
(1036, 'Nghệ Thuật Sống', 'Dalai Lama', 'Tôn Giáo', 98000, 38, 'AVAILABLE', 'Những bài học về hạnh phúc.', 'https://picsum.photos/seed/book1036/600/900', 110, 4),
(1037, 'Muôn Kiếp Nhân Sinh', 'Nguyễn Phong', 'First News', 185000, 55, 'AVAILABLE', 'Triết lý nhân sinh sâu sắc.', 'https://picsum.photos/seed/book1037/600/900', 137, 15),
(1038, 'Hành Trình Về Phương Đông', 'Baird T. Spalding', 'Tôn Giáo', 145000, 30, 'AVAILABLE', 'Cuốn sách tâm linh nổi tiếng.', 'https://picsum.photos/seed/book1038/600/900', 137, 15),
(1039, 'The Psychology of Money', 'Morgan Housel', 'Alpha Books', 155000, 42, 'AVAILABLE', 'Tâm lý học về tiền bạc.', 'https://picsum.photos/seed/book1039/600/900', 105, 2),
(1040, 'Thay Đổi Cuộc Sống Với NLP', 'Richard Bandler', 'Alpha Books', 128000, 25, 'AVAILABLE', 'Công cụ thay đổi bản thân.', 'https://picsum.photos/seed/book1040/600/900', 110, 4),
(1041, 'Clean Code', 'Robert C. Martin', 'Addison-Wesley', 245000, 18, 'AVAILABLE', 'Hướng dẫn viết code sạch.', 'https://picsum.photos/seed/book1041/600/900', 144, 19),
(1042, 'Python Programming', 'Eric Matthes', 'Nhã Nam', 185000, 45, 'AVAILABLE', 'Học Python từ cơ bản đến nâng cao.', 'https://picsum.photos/seed/book1042/600/900', 144, 19),
(1043, 'Deep Learning', 'Ian Goodfellow', 'Nhã Nam', 295000, 12, 'AVAILABLE', 'Sách kinh điển về Deep Learning.', 'https://picsum.photos/seed/book1043/600/900', 146, 19),
(1044, 'The Pragmatic Programmer', 'Andrew Hunt', 'Addison-Wesley', 220000, 22, 'AVAILABLE', 'Kỹ thuật lập trình chuyên nghiệp.', 'https://picsum.photos/seed/book1044/600/900', 144, 19),
(1045, 'Giáo Trình SQL Cơ Bản', 'Nguyễn Văn A', 'Giáo Dục', 95000, 60, 'AVAILABLE', 'Học SQL từ A đến Z.', 'https://picsum.photos/seed/book1045/600/900', 145, 19),
(1046, 'Lịch Sử Việt Nam', 'Nhiều Tác Giả', 'Giáo Dục', 135000, 28, 'AVAILABLE', 'Tổng quan lịch sử dân tộc.', 'https://picsum.photos/seed/book1046/600/900', 130, 12),
(1047, 'Đất Rừng Phương Nam', 'Đoàn Giỏi', 'Kim Đồng', 89000, 35, 'AVAILABLE', 'Tác phẩm văn học miền Nam.', 'https://picsum.photos/seed/book1047/600/900', 101, 1),
(1048, 'Du Lịch Việt Nam', 'Various', 'Thế Giới', 165000, 40, 'AVAILABLE', 'Hướng dẫn du lịch các vùng miền.', 'https://picsum.photos/seed/book1048/600/900', 138, 16),
(1049, 'SGK Toán 9', 'Nhà Xuất Bản Giáo Dục', 'Giáo Dục', 45000, 150, 'AVAILABLE', 'Sách giáo khoa Toán lớp 9.', 'https://picsum.photos/seed/book1049/600/900', 117, 6),
(1050, 'English Grammar in Use', 'Raymond Murphy', 'Cambridge', 220000, 35, 'AVAILABLE', 'Ngữ pháp tiếng Anh kinh điển.', 'https://picsum.photos/seed/book1050/600/900', 119, 7),
(1051, 'Luyện Thi THPT Môn Toán', 'Nguyễn Thị Lan', 'Hồng Đức', 98000, 65, 'AVAILABLE', 'Tài liệu ôn thi đại học.', 'https://picsum.photos/seed/book1051/600/900', 122, 8),
(1052, 'Nấu Ăn Ngon Mỗi Ngày', 'Various', 'Phụ Nữ', 125000, 50, 'AVAILABLE', 'Công thức nấu ăn gia đình.', 'https://picsum.photos/seed/book1052/600/900', 153, 23),
(1053, 'Fitness cho Người Mới Bắt Đầu', 'Various', 'Thể Thao', 135000, 30, 'AVAILABLE', 'Hướng dẫn tập gym tại nhà.', 'https://picsum.photos/seed/book1053/600/900', 155, 24),
(1054, 'Chăm Sóc Sức Khỏe Tim Mạch', 'BS. Nguyễn Văn Bình', 'Y Học', 145000, 25, 'AVAILABLE', 'Kiến thức y khoa cơ bản.', 'https://picsum.photos/seed/book1054/600/900', 148, 20),
(1055, 'AI Siêu Trí Tuệ', 'Kai-Fu Lee', 'Alpha Books', 175000, 28, 'AVAILABLE', 'Tương lai của trí tuệ nhân tạo.', 'https://picsum.photos/seed/book1055/600/900', 146, 19),
(1056, 'Manga One Piece Tập 1', 'Eiichiro Oda', 'Kim Đồng', 45000, 110, 'AVAILABLE', 'Truyện tranh nổi tiếng.', 'https://picsum.photos/seed/book1056/600/900', 134, 14),
(1057, 'Bóng Đá - Chiến Thuật Hiện Đại', 'Various', 'Thể Thao', 155000, 20, 'AVAILABLE', 'Chiến thuật bóng đá đỉnh cao.', 'https://picsum.photos/seed/book1057/600/900', 156, 24),
(1058, 'Phật Giáo Trong Đời Sống', 'Thích Nhất Hạnh', 'Tôn Giáo', 98000, 45, 'AVAILABLE', 'Triết lý Phật giáo ứng dụng.', 'https://picsum.photos/seed/book1058/600/900', 136, 15),
(1059, 'Từ Điển Anh-Việt', 'Nhà Xuất Bản Từ Điển', 'Từ Điển', 185000, 55, 'AVAILABLE', 'Từ điển Anh Việt phổ biến.', 'https://picsum.photos/seed/book1059/600/900', 124, 9),
(1060, 'Bách Khoa Tri Thức Cho Trẻ Em', 'Various', 'Kim Đồng', 85000, 70, 'AVAILABLE', 'Kiến thức tổng hợp cho bé.', 'https://picsum.photos/seed/book1060/600/900', 126, 10),
(1061, 'Lập Trình Web Với React', 'Nguyễn Hoàng', 'Alpha Books', 210000, 25, 'AVAILABLE', 'Học ReactJS hiện đại.', 'https://picsum.photos/seed/book1061/600/900', 144, 19),
(1062, 'Machine Learning Cơ Bản', 'Andrew Ng', 'Alpha Books', 235000, 18, 'AVAILABLE', 'Khóa học ML kinh điển.', 'https://picsum.photos/seed/book1062/600/900', 146, 19),
(1063, 'Nấu Ăn Việt Nam', 'Various', 'Phụ Nữ', 115000, 48, 'AVAILABLE', '200 món ăn ngon Việt Nam.', 'https://picsum.photos/seed/book1063/600/900', 153, 23),
(1064, 'Gym - Xây Dựng Cơ Bắp', 'Various', 'Thể Thao', 145000, 32, 'AVAILABLE', 'Hướng dẫn tập gym chuyên sâu.', 'https://picsum.photos/seed/book1064/600/900', 155, 24),
(1065, 'Tâm Lý Học Tội Phạm', 'Various', 'Alpha Books', 165000, 22, 'AVAILABLE', 'Tâm lý học hình sự.', 'https://picsum.photos/seed/book1065/600/900', 151, 22),
(1066, 'Lịch Sử Thế Giới', 'Various', 'Giáo Dục', 175000, 20, 'AVAILABLE', 'Tổng quan lịch sử nhân loại.', 'https://picsum.photos/seed/book1066/600/900', 131, 12),
(1067, 'Tiếng Nhật Giao Tiếp', 'Minna No Nihongo', 'Giáo Dục', 135000, 40, 'AVAILABLE', 'Sách học tiếng Nhật cơ bản.', 'https://picsum.photos/seed/book1067/600/900', 120, 7),
(1068, 'Marketing 4.0', 'Philip Kotler', 'Alpha Books', 185000, 28, 'AVAILABLE', 'Marketing trong thời đại số.', 'https://picsum.photos/seed/book1068/600/900', 106, 2),
(1069, 'Chăm Sóc Trẻ Sơ Sinh', 'BS. Trần Thị Lan', 'Phụ Nữ', 98000, 50, 'AVAILABLE', 'Hướng dẫn chăm con khoa học.', 'https://picsum.photos/seed/book1069/600/900', 113, 5),
(1070, 'Truyện Tranh Doremon Tập 20', 'Fujiko F. Fujio', 'Kim Đồng', 45000, 90, 'AVAILABLE', 'Phiêu lưu của Doraemon.', 'https://picsum.photos/seed/book1070/600/900', 107, 3),
(1071, 'Clean Architecture', 'Robert C. Martin', 'Addison-Wesley', 255000, 15, 'AVAILABLE', 'Kiến trúc phần mềm chuyên nghiệp.', 'https://picsum.photos/seed/book1071/600/900', 144, 19),
(1072, 'Nghệ Thuật Viết Code', 'Various', 'Alpha Books', 165000, 30, 'AVAILABLE', 'Mẹo viết code đẹp.', 'https://picsum.photos/seed/book1072/600/900', 144, 19),
(1073, 'Sức Mạnh Của Thói Quen', 'Charles Duhigg', 'First News', 145000, 38, 'AVAILABLE', 'Hiểu và thay đổi thói quen.', 'https://picsum.photos/seed/book1073/600/900', 110, 4),
(1074, 'Giáo Trình Kinh Tế Học', 'Mankiw', 'Đồng Nai', 220000, 25, 'AVAILABLE', 'Kinh tế vĩ mô và vi mô.', 'https://picsum.photos/seed/book1074/600/900', 104, 2),
(1075, 'Phát Triển Bản Thân', 'Various', 'Alpha Books', 98000, 55, 'AVAILABLE', 'Hành trình hoàn thiện bản thân.', 'https://picsum.photos/seed/book1075/600/900', 110, 4),
(1076, 'Bóng Đá Toàn Tập', 'Various', 'Thể Thao', 135000, 28, 'AVAILABLE', 'Kiến thức toàn diện về bóng đá.', 'https://picsum.photos/seed/book1076/600/900', 156, 24),
(1077, 'Nấu Ăn Healthy', 'Various', 'Phụ Nữ', 125000, 45, 'AVAILABLE', 'Công thức ăn uống lành mạnh.', 'https://picsum.photos/seed/book1077/600/900', 153, 23),
(1078, 'Y Học Cổ Truyền', 'BS. Nguyễn Văn Hùng', 'Y Học', 155000, 20, 'AVAILABLE', 'Kiến thức Đông Y cơ bản.', 'https://picsum.photos/seed/book1078/600/900', 147, 20),
(1079, 'Lập Trình Java', 'Various', 'Alpha Books', 195000, 32, 'AVAILABLE', 'Java từ cơ bản đến nâng cao.', 'https://picsum.photos/seed/book1079/600/900', 144, 19),
(1080, 'Truyện Ngắn Nguyễn Minh Châu', 'Nguyễn Minh Châu', 'Văn Học', 89000, 25, 'AVAILABLE', 'Tuyển tập truyện ngắn hay.', 'https://picsum.photos/seed/book1080/600/900', 102, 1),
(1081, 'Du Lịch Châu Âu', 'Various', 'Thế Giới', 185000, 18, 'AVAILABLE', 'Hướng dẫn du lịch châu Âu.', 'https://picsum.photos/seed/book1081/600/900', 138, 16),
(1082, 'Tâm Lý Học Màu Sắc', 'Various', 'Alpha Books', 135000, 30, 'AVAILABLE', 'Ảnh hưởng của màu sắc đến cảm xúc.', 'https://picsum.photos/seed/book1082/600/900', 151, 22),
(1083, 'SGK Ngữ Văn 12', 'Nhà Xuất Bản Giáo Dục', 'Giáo Dục', 48000, 120, 'AVAILABLE', 'Sách giáo khoa Ngữ Văn lớp 12.', 'https://picsum.photos/seed/book1083/600/900', 118, 6),
(1084, 'Tiếng Hàn Cho Người Mới', 'Various', 'Giáo Dục', 145000, 42, 'AVAILABLE', 'Học tiếng Hàn giao tiếp.', 'https://picsum.photos/seed/book1084/600/900', 121, 7),
(1085, 'Đầu Tư Chứng Khoán', 'Various', 'Alpha Books', 165000, 35, 'AVAILABLE', 'Hướng dẫn đầu tư an toàn.', 'https://picsum.photos/seed/book1085/600/900', 105, 2),
(1086, 'Mẹo Vặt Gia Đình', 'Various', 'Phụ Nữ', 85000, 60, 'AVAILABLE', 'Hơn 1000 mẹo hay trong nhà.', 'https://picsum.photos/seed/book1086/600/900', 154, 23),
(1087, 'Lịch Sử Đảng Cộng Sản Việt Nam', 'Various', 'Giáo Dục', 95000, 22, 'AVAILABLE', 'Tài liệu tham khảo.', 'https://picsum.photos/seed/book1087/600/900', 141, 17),
(1088, 'Truyện Tranh Naruto', 'Masashi Kishimoto', 'Kim Đồng', 45000, 85, 'AVAILABLE', 'Naruto tập 5.', 'https://picsum.photos/seed/book1088/600/900', 134, 14),
(1089, 'Chăm Sóc Da Mặt', 'Various', 'Phụ Nữ', 115000, 50, 'AVAILABLE', 'Bí quyết chăm sóc da khoa học.', 'https://picsum.photos/seed/book1089/600/900', 148, 20),
(1090, 'Lập Trình Mobile Flutter', 'Various', 'Alpha Books', 225000, 20, 'AVAILABLE', 'Xây dựng app với Flutter.', 'https://picsum.photos/seed/book1090/600/900', 144, 19),
(1091, 'Thế Giới Phẳng', 'Thomas Friedman', 'Thế Giới', 168000, 25, 'AVAILABLE', 'Toàn cầu hóa thế giới.', 'https://picsum.photos/seed/book1091/600/900', 126, 10),
(1092, 'Phát Triển Trí Tuệ Cảm Xúc', 'Daniel Goleman', 'Alpha Books', 155000, 38, 'AVAILABLE', 'EQ - Trí tuệ cảm xúc.', 'https://picsum.photos/seed/book1092/600/900', 110, 4),
(1093, 'Sách Giáo Khoa Lịch Sử 9', 'Giáo Dục', 'Giáo Dục', 42000, 100, 'AVAILABLE', 'SGK Lịch sử lớp 9.', 'https://picsum.photos/seed/book1093/600/900', 117, 6),
(1094, 'Học Tiếng Anh Qua Truyện Ngắn', 'Various', 'Giáo Dục', 98000, 45, 'AVAILABLE', 'Cải thiện kỹ năng tiếng Anh.', 'https://picsum.photos/seed/book1094/600/900', 119, 7),
(1095, 'Kỹ Năng Làm Cha Mẹ', 'Various', 'Phụ Nữ', 135000, 35, 'AVAILABLE', 'Hướng dẫn làm cha mẹ hiệu quả.', 'https://picsum.photos/seed/book1095/600/900', 114, 5),
(1096, 'Blockchain và Tương Lai', 'Various', 'Alpha Books', 195000, 15, 'AVAILABLE', 'Công nghệ blockchain.', 'https://picsum.photos/seed/book1096/600/900', 146, 19),
(1097, 'Truyện Ngắn Nam Cao', 'Nam Cao', 'Văn Học', 78000, 40, 'AVAILABLE', 'Tuyển tập truyện ngắn.', 'https://picsum.photos/seed/book1097/600/900', 102, 1),
(1098, 'Yoga Cho Người Bận Rộn', 'Various', 'Thể Thao', 125000, 30, 'AVAILABLE', 'Bài tập yoga tại nhà.', 'https://picsum.photos/seed/book1098/600/900', 155, 24),
(1099, 'Kinh Doanh Online', 'Various', 'Alpha Books', 145000, 40, 'AVAILABLE', 'Bán hàng trên mạng xã hội.', 'https://picsum.photos/seed/book1099/600/900', 106, 2),
(1100, 'Tâm Lý Đám Đông', 'Gustave Le Bon', 'Alpha Books', 115000, 22, 'AVAILABLE', 'Hành vi đám đông.', 'https://picsum.photos/seed/book1100/600/900', 151, 22),
(1101, '100 Món Ăn Chay Ngon', 'Various', 'Phụ Nữ', 95000, 55, 'AVAILABLE', 'Công thức chay ngon miệng.', 'https://picsum.photos/seed/book1101/600/900', 153, 23),
(1102, 'Lập Trình Python Nâng Cao', 'Various', 'Alpha Books', 205000, 25, 'AVAILABLE', 'Python chuyên sâu.', 'https://picsum.photos/seed/book1102/600/900', 144, 19),
(1103, 'Lịch Sử Việt Nam Thời Hiện Đại', 'Various', 'Giáo Dục', 145000, 18, 'AVAILABLE', 'Lịch sử từ 1945 đến nay.', 'https://picsum.photos/seed/book1103/600/900', 130, 12),
(1104, 'Giáo Dục Giới Tính Cho Trẻ', 'BS. Lan Hương', 'Phụ Nữ', 98000, 35, 'AVAILABLE', 'Kiến thức giới tính phù hợp lứa tuổi.', 'https://picsum.photos/seed/book1104/600/900', 152, 22),
(1105, 'Mẹo Vặt Thông Minh', 'Various', 'Phụ Nữ', 85000, 60, 'AVAILABLE', 'Hàng ngàn mẹo hay trong đời sống.', 'https://picsum.photos/seed/book1105/600/900', 154, 23),
(1106, 'Docker và Kubernetes', 'Various', 'Alpha Books', 235000, 12, 'AVAILABLE', 'Triển khai ứng dụng container.', 'https://picsum.photos/seed/book1106/600/900', 144, 19),
(1107, 'Truyện Tranh Shin Cậu Bé Bút Chì', 'Yoshito Usui', 'Kim Đồng', 45000, 75, 'AVAILABLE', 'Shin - Cậu bé bút chì.', 'https://picsum.photos/seed/book1107/600/900', 107, 3),
(1108, 'Đầu Tư Bất Động Sản', 'Various', 'Alpha Books', 175000, 28, 'AVAILABLE', 'Chiến lược đầu tư BĐS.', 'https://picsum.photos/seed/book1108/600/900', 105, 2),
(1109, 'Thơ Xuân Quỳnh', 'Xuân Quỳnh', 'Văn Học', 92000, 30, 'AVAILABLE', 'Tuyển tập thơ hay.', 'https://picsum.photos/seed/book1109/600/900', 103, 1),
(1110, 'Kỹ Năng Sống Cho Thiếu Niên', 'Various', 'Kim Đồng', 78000, 65, 'AVAILABLE', 'Kỹ năng cần thiết cho tuổi teen.', 'https://picsum.photos/seed/book1110/600/900', 110, 4)
ON CONFLICT (id) DO NOTHING;

UPDATE books
SET fts_tokens = to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(author, ''))
WHERE fts_tokens IS NULL;

SELECT setval(pg_get_serial_sequence('books', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM books;

UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Cha%20Giau%20Cha%20Ngheo-L.jpg' WHERE id = 1001;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Dac%20Nhan%20Tam-L.jpg' WHERE id = 1002;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/English%20Grammar%20in%20Use-L.jpg' WHERE id = 1003;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Clean%20Code-L.jpg' WHERE id = 1004;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Sapiens-L.jpg' WHERE id = 1005;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/De%20Men%20Phieu%20Luu%20Ky-L.jpg' WHERE id = 1006;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/One%20Piece-L.jpg' WHERE id = 1007;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Thinking%20Fast%20and%20Slow-L.jpg' WHERE id = 1008;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e' WHERE id = 1009;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018' WHERE id = 1010;

UPDATE books SET image_url = 'https://images.unsplash.com/photo-1512820790803-83ca734da794' WHERE id = 1011;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516979187457-637abb4f9353' WHERE id = 1012;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66' WHERE id = 1013;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Harry%20Potter%20and%20the%20Philosophers%20Stone-L.jpg' WHERE id = 1014;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1517849845537-4d257902454a' WHERE id = 1015;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/De%20Men%20Phieu%20Luu%20Ky-L.jpg' WHERE id = 1016;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1512820790803-83ca734da794' WHERE id = 1017;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f' WHERE id = 1018;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/The%20Alchemist-L.jpg' WHERE id = 1019;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/How%20to%20Win%20Friends%20and%20Influence%20People-L.jpg' WHERE id = 1020;

UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Atomic%20Habits-L.jpg' WHERE id = 1021;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/The%20Art%20of%20Thinking%20Clearly-L.jpg' WHERE id = 1022;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Sapiens-L.jpg' WHERE id = 1023;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/1984-L.jpg' WHERE id = 1024;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da' WHERE id = 1025;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/The%20Richest%20Man%20in%20Babylon-L.jpg' WHERE id = 1026;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Rich%20Dad%20Poor%20Dad-L.jpg' WHERE id = 1027;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1552664730-d307ca884978' WHERE id = 1028;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Good%20to%20Great-L.jpg' WHERE id = 1029;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1556740749-887f6717d7e4' WHERE id = 1030;

UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Doraemon-L.jpg' WHERE id = 1031;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Detective%20Conan-L.jpg' WHERE id = 1032;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516979187457-637abb4f9353' WHERE id = 1033;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516627145497-ae6968895b74' WHERE id = 1034;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3' WHERE id = 1035;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb' WHERE id = 1036;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84' WHERE id = 1037;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d' WHERE id = 1038;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/The%20Psychology%20of%20Money-L.jpg' WHERE id = 1039;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643' WHERE id = 1040;

UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Clean%20Code-L.jpg' WHERE id = 1041;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Python%20Crash%20Course-L.jpg' WHERE id = 1042;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Deep%20Learning-L.jpg' WHERE id = 1043;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/The%20Pragmatic%20Programmer-L.jpg' WHERE id = 1044;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d' WHERE id = 1045;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1461360228754-6e81c478b882' WHERE id = 1046;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee' WHERE id = 1047;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' WHERE id = 1048;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b' WHERE id = 1049;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/English%20Grammar%20in%20Use-L.jpg' WHERE id = 1050;

UPDATE books SET image_url = 'https://images.unsplash.com/photo-1509228468518-180dd4864904' WHERE id = 1051;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061' WHERE id = 1052;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438' WHERE id = 1053;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d' WHERE id = 1054;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1677442136019-21780ecad995' WHERE id = 1055;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/One%20Piece-L.jpg' WHERE id = 1056;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018' WHERE id = 1057;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773' WHERE id = 1058;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da' WHERE id = 1059;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1512820790803-83ca734da794' WHERE id = 1060;

UPDATE books SET image_url = 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4' WHERE id = 1061;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1677442136019-21780ecad995' WHERE id = 1062;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061' WHERE id = 1063;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438' WHERE id = 1064;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3' WHERE id = 1065;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1461360228754-6e81c478b882' WHERE id = 1066;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1513258496099-48168024aec0' WHERE id = 1067;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1557838923-2985c318be48' WHERE id = 1068;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516627145497-ae6968895b74' WHERE id = 1069;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Doraemon-L.jpg' WHERE id = 1070;

UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Clean%20Architecture-L.jpg' WHERE id = 1071;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4' WHERE id = 1072;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/The%20Power%20of%20Habit-L.jpg' WHERE id = 1073;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f' WHERE id = 1074;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643' WHERE id = 1075;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018' WHERE id = 1076;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061' WHERE id = 1077;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d' WHERE id = 1078;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4' WHERE id = 1079;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f' WHERE id = 1080;

UPDATE books SET image_url = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' WHERE id = 1081;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' WHERE id = 1082;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b' WHERE id = 1083;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1513258496099-48168024aec0' WHERE id = 1084;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a' WHERE id = 1085;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1484154218962-a197022b5858' WHERE id = 1086;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1461360228754-6e81c478b882' WHERE id = 1087;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Naruto-L.jpg' WHERE id = 1088;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9' WHERE id = 1089;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c' WHERE id = 1090;

UPDATE books SET image_url = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f' WHERE id = 1091;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3' WHERE id = 1092;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b' WHERE id = 1093;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f' WHERE id = 1094;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516627145497-ae6968895b74' WHERE id = 1095;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0' WHERE id = 1096;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f' WHERE id = 1097;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1518611012118-696072aa579a' WHERE id = 1098;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1556740749-887f6717d7e4' WHERE id = 1099;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3' WHERE id = 1100;

UPDATE books SET image_url = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061' WHERE id = 1101;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4' WHERE id = 1102;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1461360228754-6e81c478b882' WHERE id = 1103;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516627145497-ae6968895b74' WHERE id = 1104;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1484154218962-a197022b5858' WHERE id = 1105;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1605745341112-85968b19335b' WHERE id = 1106;
UPDATE books SET image_url = 'https://covers.openlibrary.org/b/title/Crayon%20Shinchan-L.jpg' WHERE id = 1107;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa' WHERE id = 1108;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1512820790803-83ca734da794' WHERE id = 1109;
UPDATE books SET image_url = 'https://images.unsplash.com/photo-1516979187457-637abb4f9353' WHERE id = 1110;

INSERT INTO book_images (book_id, image_url) VALUES
(1001, 'https://images.unsplash.com/photo-1455885666463-7d0f9740e4f0'),
(1001, 'https://images.unsplash.com/photo-1512820790803-83ca734da794'),
(1004, 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4'),
(1004, 'https://images.unsplash.com/photo-1517841905240-472988babdf9'),
(1014, 'https://images.unsplash.com/photo-1516979187457-637abb4f9353'),
(1014, 'https://images.unsplash.com/photo-1507842217343-583bb7270b66'),
(1041, 'https://images.unsplash.com/photo-1498050108023-c5249f4df085'),
(1041, 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4'),
(1050, 'https://images.unsplash.com/photo-1532012197267-da84d127e765'),
(1050, 'https://images.unsplash.com/photo-1499750310107-5fef28a66643')
ON CONFLICT DO NOTHING;
