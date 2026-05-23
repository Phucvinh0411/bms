package fit.iuh.order.module.order_management.repository;

import fit.iuh.order.module.models.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fit.iuh.order.module.models.enums.OrderStatus;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    boolean existsByUserIdAndItems_BookIdAndStatus(Long userId, Long bookId, OrderStatus status);

    @Query("SELECT COUNT(o) > 0 FROM Order o JOIN o.items i WHERE o.userId = :userId AND i.bookId = :bookId AND o.status <> :canceledStatus")
    boolean existsByUserIdAndBookIdAndStatusNot(@Param("userId") Long userId, @Param("bookId") Long bookId, @Param("canceledStatus") OrderStatus canceledStatus);
}
