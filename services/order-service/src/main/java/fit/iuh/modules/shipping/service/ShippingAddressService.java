package fit.iuh.modules.shipping.service;

import fit.iuh.domain.exception.BadRequestException;
import fit.iuh.domain.exception.NotFoundException;
import fit.iuh.modules.shipping.model.ShippingAddress;
import fit.iuh.modules.shipping.dto.ShippingAddressRequest;
import fit.iuh.modules.shipping.dto.ShippingAddressResponse;
import fit.iuh.modules.shipping.repository.ShippingAddressRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShippingAddressService {
    private final ShippingAddressRepository shippingAddressRepository;

    @Transactional
    public ShippingAddressResponse create(ShippingAddressRequest request) {
        validate(request);
        ShippingAddress address = ShippingAddress.builder()
            .userId(request.getUserId())
            .recipientName(request.getRecipientName().trim())
            .phoneNumber(request.getPhoneNumber().trim())
            .addressLine(request.getAddressLine().trim())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .isDefault(Boolean.TRUE.equals(request.getIsDefault()))
            .build();

        if (shippingAddressRepository.countByUserId(request.getUserId()) == 0) {
            address.setIsDefault(true);
        }
        ShippingAddress saved = shippingAddressRepository.save(address);
        if (Boolean.TRUE.equals(saved.getIsDefault())) {
            clearDefaultForOthers(saved.getUserId(), saved.getId());
        }
        return map(saved);
    }

    public List<ShippingAddressResponse> getByUserId(Long userId) {
        return shippingAddressRepository.findByUserIdOrderByIsDefaultDescIdDesc(userId)
            .stream().map(this::map).collect(Collectors.toList());
    }

    public ShippingAddressResponse getById(Long id, Long userId) {
        ShippingAddress address = shippingAddressRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Shipping address not found"));
        return map(address);
    }

    @Transactional
    public ShippingAddressResponse update(Long id, ShippingAddressRequest request) {
        validate(request);
        ShippingAddress address = shippingAddressRepository.findByIdAndUserId(id, request.getUserId())
            .orElseThrow(() -> new NotFoundException("Shipping address not found"));
        address.setRecipientName(request.getRecipientName().trim());
        address.setPhoneNumber(request.getPhoneNumber().trim());
        address.setAddressLine(request.getAddressLine().trim());
        address.setLatitude(request.getLatitude());
        address.setLongitude(request.getLongitude());
        address.setIsDefault(Boolean.TRUE.equals(request.getIsDefault()));

        ShippingAddress saved = shippingAddressRepository.save(address);
        if (Boolean.TRUE.equals(saved.getIsDefault())) {
            clearDefaultForOthers(saved.getUserId(), saved.getId());
        }
        return map(saved);
    }

    @Transactional
    public ShippingAddressResponse setDefault(Long id, Long userId) {
        ShippingAddress address = shippingAddressRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Shipping address not found"));
        address.setIsDefault(true);
        ShippingAddress saved = shippingAddressRepository.save(address);
        clearDefaultForOthers(userId, id);
        return map(saved);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        ShippingAddress address = shippingAddressRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Shipping address not found"));
        boolean wasDefault = Boolean.TRUE.equals(address.getIsDefault());
        shippingAddressRepository.delete(address);

        if (wasDefault) {
            shippingAddressRepository.findByUserIdOrderByIsDefaultDescIdDesc(userId).stream().findFirst().ifPresent(next -> {
                next.setIsDefault(true);
                shippingAddressRepository.save(next);
            });
        }
    }

    private void validate(ShippingAddressRequest request) {
        if (request.getUserId() == null) {
            throw new BadRequestException("userId is required");
        }
        if (request.getRecipientName() == null || request.getRecipientName().isBlank()) {
            throw new BadRequestException("recipientName is required");
        }
        
        // Tên người nhận không được chứa ký tự đặc biệt (chỉ chứa chữ cái tiếng Việt/Anh, số và khoảng trắng)
        String trimmedName = request.getRecipientName().trim();
        if (!trimmedName.matches("^[\\p{L}\\p{N}\\s]+$")) {
            throw new BadRequestException("Tên người nhận không được chứa ký tự đặc biệt");
        }

        if (request.getPhoneNumber() == null || request.getPhoneNumber().isBlank()) {
            throw new BadRequestException("phoneNumber is required");
        }

        // Số điện thoại phải gồm đúng 10 chữ số
        String trimmedPhone = request.getPhoneNumber().trim();
        if (!trimmedPhone.matches("^\\d{10}$")) {
            throw new BadRequestException("Số điện thoại phải bao gồm đúng 10 chữ số");
        }

        if (request.getAddressLine() == null || request.getAddressLine().isBlank()) {
            throw new BadRequestException("addressLine is required");
        }
        if (request.getLatitude() == null || request.getLongitude() == null) {
            throw new BadRequestException("latitude/longitude are required");
        }
    }

    private void clearDefaultForOthers(Long userId, Long selectedId) {
        List<ShippingAddress> addresses = shippingAddressRepository.findByUserIdOrderByIsDefaultDescIdDesc(userId);
        for (ShippingAddress item : addresses) {
            if (!item.getId().equals(selectedId) && Boolean.TRUE.equals(item.getIsDefault())) {
                item.setIsDefault(false);
                shippingAddressRepository.save(item);
            }
        }
    }

    private ShippingAddressResponse map(ShippingAddress item) {
        return ShippingAddressResponse.builder()
            .id(item.getId())
            .userId(item.getUserId())
            .recipientName(item.getRecipientName())
            .phoneNumber(item.getPhoneNumber())
            .addressLine(item.getAddressLine())
            .latitude(item.getLatitude())
            .longitude(item.getLongitude())
            .isDefault(item.getIsDefault())
            .build();
    }
}
