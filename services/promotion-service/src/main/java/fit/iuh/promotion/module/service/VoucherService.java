package fit.iuh.promotion.module.service;

import fit.iuh.promotion.module.domain.Voucher;
import fit.iuh.promotion.module.repository.VoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired; // Cực kỳ quan trọng!
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class VoucherService {

    @Autowired
    private VoucherRepository voucherRepository;

    public List<Voucher> getAll() {
        return voucherRepository.findAll().stream()
                .filter(v -> !v.isDeleted())
                .collect(Collectors.toList());
    }

    public Voucher create(Voucher voucher) {
        voucher.setDeleted(false);
        return voucherRepository.save(voucher);
    }

    public Optional<Voucher> getByCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        return voucherRepository.findByCode(code.trim())
                .filter(v -> !v.isDeleted());
    }

    public Optional<Voucher> update(Long id, Voucher updated) {
        return voucherRepository.findById(id)
                .map(existing -> {
                    existing.setCode(updated.getCode());
                    existing.setDiscountType(updated.getDiscountType());
                    existing.setDiscountAmount(updated.getDiscountAmount());
                    existing.setMinOrderValue(updated.getMinOrderValue());
                    existing.setMaxDiscountAmount(updated.getMaxDiscountAmount());
                    existing.setStartDate(updated.getStartDate());
                    existing.setEndDate(updated.getEndDate());
                    existing.setStatus(updated.getStatus());
                    existing.setDescription(updated.getDescription());
                    return voucherRepository.save(existing);
                });
    }

    public boolean delete(Long id) {
        return voucherRepository.findById(id)
                .map(existing -> {
                    existing.setDeleted(true);
                    voucherRepository.save(existing);
                    return true;
                }).orElse(false);
    }
}