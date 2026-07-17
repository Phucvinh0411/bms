package fit.iuh.modules.payment.repository;

import fit.iuh.modules.payment.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByIdAndIsDeletedFalse(Long id);
    boolean existsByIdAndIsDeletedFalse(Long id);
}
