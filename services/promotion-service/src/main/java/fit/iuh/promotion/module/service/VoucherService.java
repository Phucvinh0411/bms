package fit.iuh.promotion.module.service;

import fit.iuh.promotion.module.domain.Voucher;
import fit.iuh.promotion.module.repository.VoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired; // Cực kỳ quan trọng!
import java.util.List;
import java.util.Optional;

@Service
public class VoucherService {

    @Autowired
    private VoucherRepository voucherRepository;

    public List<Voucher> getAll() {
        return voucherRepository.findAll();
    }

    public Voucher create(Voucher voucher) {
        return voucherRepository.save(voucher);
    }

    public Optional<Voucher> getByCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        return voucherRepository.findByCode(code.trim());
    }
}