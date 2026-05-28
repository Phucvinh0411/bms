CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE books ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE books ADD COLUMN IF NOT EXISTS fts_tokens tsvector;

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
