package fit.iuh.order.order.core.service;

import fit.iuh.order.checkout.model.CheckoutContext;
import fit.iuh.order.checkout.handler.AddressSelectionHandler;
import fit.iuh.order.checkout.handler.PersistOrderHandler;
import fit.iuh.order.checkout.handler.PricingHandler;
import fit.iuh.order.checkout.handler.StockCheckHandler;
import fit.iuh.order.checkout.handler.VoucherCheckHandler;
import fit.iuh.order.order.core.dto.*;
import fit.iuh.order.order.core.model.Order;
import fit.iuh.order.order.core.model.OrderStatus;
import fit.iuh.order.order.core.repository.OrderRepository;
import fit.iuh.order.payment.strategy.PayOSPaymentStrategy;
import fit.iuh.order.payment.model.PaymentTransaction;
import fit.iuh.order.order.core.state.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service("orderManagementOrderService")
public class OrderService {
    @Autowired(required = false)
    private PayOSPaymentStrategy payOSPaymentStrategy;

    @Autowired(required = false)
    private fit.iuh.order.payment.repository.PaymentTransactionRepository paymentTransactionRepository;

    @Autowired(required = false)
    private fit.iuh.order.messaging.OrderEventPublisher orderEventPublisher;

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    private final OrderRepository orderRepository;
    private final StockCheckHandler stockCheckHandler;
    private final VoucherCheckHandler voucherCheckHandler;
    private final AddressSelectionHandler addressSelectionHandler;
    private final PricingHandler pricingHandler;
    private final PersistOrderHandler persistOrderHandler;

    public OrderService(
        OrderRepository orderRepository,
        StockCheckHandler stockCheckHandler,
        VoucherCheckHandler voucherCheckHandler,
        AddressSelectionHandler addressSelectionHandler,
        PricingHandler pricingHandler,
        PersistOrderHandler persistOrderHandler
    ) {
        this.orderRepository = orderRepository;
        this.stockCheckHandler = stockCheckHandler;
        this.voucherCheckHandler = voucherCheckHandler;
        this.addressSelectionHandler = addressSelectionHandler;
        this.pricingHandler = pricingHandler;
        this.persistOrderHandler = persistOrderHandler;

        this.stockCheckHandler
            .setNextHandler(this.voucherCheckHandler)
            .setNextHandler(this.addressSelectionHandler)
            .setNextHandler(this.pricingHandler)
            .setNextHandler(this.persistOrderHandler);
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        CheckoutContext context = CheckoutContext.builder()
            .userId(request.getUserId())
            .shippingAddressId(request.getShippingAddressId())
            .shippingAddress(request.getShippingAddress())
            .shippingLatitude(request.getShippingLatitude())
            .shippingLongitude(request.getShippingLongitude())
            .voucherCode(request.getVoucherCode())
            .requestedItems(request.getItems())
            .previewOnly(false)
            .build();

        stockCheckHandler.handle(context);

        Order savedOrder = context.getOrder();
        if (savedOrder == null) {
            throw new IllegalStateException("Checkout pipeline did not persist order");
        }

        String checkoutUrl = null;
        String qrCode = null;

        // Tự động tạo link thanh toán PayOS VietQR nếu phương thức là PAYOS
        if ("PAYOS".equalsIgnoreCase(request.getPaymentMethod()) && payOSPaymentStrategy != null) {
            // Set trạng thái đơn hàng là AWAITING_PAYMENT (Chờ thanh toán)
            savedOrder.setStatus(OrderStatus.AWAITING_PAYMENT);
            savedOrder = orderRepository.save(savedOrder);

            // Lưu giao dịch online vào bảng payment_transactions với trạng thái UNPAID
            if (paymentTransactionRepository != null) {
                PaymentTransaction transaction = new PaymentTransaction();
                transaction.setId(savedOrder.getId());
                transaction.setOrderId(savedOrder.getId());
                transaction.setAmount(savedOrder.getFinalTotal());
                transaction.setStatus(fit.iuh.order.order.core.model.PaymentStatus.UNPAID);
                transaction.setIsDeleted(false);
                paymentTransactionRepository.save(transaction);
            }

            try {
                String returnUrl = request.getReturnUrl();
                if (returnUrl == null || returnUrl.trim().isEmpty()) {
                    returnUrl = frontendUrl + "/checkout?status=success&orderId=" + savedOrder.getId();
                } else {
                    if (!returnUrl.contains("orderId=")) {
                        if (returnUrl.contains("?")) {
                            returnUrl += "&orderId=" + savedOrder.getId();
                        } else {
                            returnUrl += "?orderId=" + savedOrder.getId();
                        }
                    }
                }
                String cancelUrl = request.getCancelUrl();
                if (cancelUrl == null || cancelUrl.trim().isEmpty()) {
                    cancelUrl = frontendUrl + "/cart";
                }
                Map<String, Object> paymentData = payOSPaymentStrategy.createPaymentLink(savedOrder, returnUrl, cancelUrl);
                if (paymentData != null) {
                    if (paymentData.containsKey("checkoutUrl")) {
                        checkoutUrl = (String) paymentData.get("checkoutUrl");
                    }
                    if (paymentData.containsKey("qrCode")) {
                        qrCode = (String) paymentData.get("qrCode");
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi tự động tạo link thanh toán PayOS VietQR: " + e.getMessage());
            }
        } else {
            // Thanh toán khi nhận hàng (COD) -> Order status là PENDING (Chờ xử lý)
            savedOrder.setStatus(OrderStatus.PENDING);
            savedOrder = orderRepository.save(savedOrder);
            // Không lưu bất kỳ giao dịch nào vào bảng payment_transactions
        }

        OrderResponse response = mapToResponse(savedOrder);
        if (checkoutUrl != null) response.setCheckoutUrl(checkoutUrl);
        if (qrCode != null) response.setQrCode(qrCode);

        return response;
    }

    @Transactional(readOnly = true)
    public OrderPreviewResponse previewOrder(OrderRequest request) {
        CheckoutContext context = CheckoutContext.builder()
            .userId(request.getUserId())
            .shippingAddressId(request.getShippingAddressId())
            .shippingAddress(request.getShippingAddress())
            .shippingLatitude(request.getShippingLatitude())
            .shippingLongitude(request.getShippingLongitude())
            .voucherCode(request.getVoucherCode())
            .requestedItems(request.getItems())
            .previewOnly(true)
            .build();

        stockCheckHandler.handle(context);

        return OrderPreviewResponse.builder()
            .subtotalAmount(context.getSubtotal())
            .baseShippingFee(context.getBaseShippingFee())
            .shippingDiscount(context.getShippingDiscount())
            .orderDiscount(context.getOrderDiscount())
            .finalTotal(context.getFinalTotal())
            .totalAmount(context.getFinalTotal())
            .build();
    }

    public OrderResponse getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
        return mapToResponse(order);
    }

    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
        OrderStatus newStatus = OrderStatus.valueOf(status.toUpperCase());
        order.setStatus(newStatus);
        
        Order savedOrder = orderRepository.save(order);
        if (newStatus == OrderStatus.COMPLETED) {
            if (orderEventPublisher != null) {
                orderEventPublisher.publishOrderCompleted(savedOrder);
            }
        }
        return mapToResponse(savedOrder);
    }

    @Transactional
    public void deleteOrder(Long id) {
        orderRepository.deleteById(id);
    }

    @Transactional
    public OrderResponse cancelOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + id));

        // Chỉ cho phép hủy khi đơn hàng ở trạng thái Chờ xử lý (PENDING) hoặc Chờ thanh toán (AWAITING_PAYMENT)
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            throw new IllegalStateException("Chỉ có đơn hàng ở trạng thái Chờ xử lý hoặc Chờ thanh toán mới được phép hủy!");
        }

        // Xác định State hiện tại bằng State Pattern
        OrderState currentState;
        switch (order.getStatus()) {
            case PENDING:
                currentState = new PendingState();
                break;
            case AWAITING_PAYMENT:
                currentState = new PendingState();
                break;
            default:
                currentState = new PendingState();
        }

        // Thực hiện hủy thông qua State Pattern
        currentState.cancel(order);

        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse changePaymentMethod(Long id, String paymentMethod, String returnUrl, String cancelUrl) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + id));

        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            throw new IllegalStateException("Chỉ được đổi phương thức thanh toán khi đơn hàng đang ở trạng thái Chờ xử lý (PENDING) hoặc Chờ thanh toán (AWAITING_PAYMENT)");
        }

        // Đơn hàng thanh toán COD (không có giao dịch online trong database) thì không cho chuyển phương thức thanh toán
        if (paymentTransactionRepository != null) {
            var txOpt = paymentTransactionRepository.findByIdAndIsDeletedFalse(order.getId());
            if (txOpt.isEmpty()) {
                throw new IllegalStateException("Đơn hàng thanh toán khi nhận hàng (COD) không được phép thay đổi phương thức thanh toán!");
            }
        }

        String checkoutUrl = null;
        String qrCode = null;

        if ("PAYOS".equalsIgnoreCase(paymentMethod)) {
            // Kiểm tra trạng thái hiện tại trước khi đổi sang PAYOS
            if (paymentTransactionRepository != null) {
                var txOpt = paymentTransactionRepository.findByIdAndIsDeletedFalse(order.getId());
                if (txOpt.isPresent()) {
                    var tx = txOpt.get();
                    if (tx.getStatus() == fit.iuh.order.order.core.model.PaymentStatus.PAID) {
                        throw new IllegalStateException("Đơn hàng đã được thanh toán online thành công, không thể thay đổi phương thức!");
                    }
                }
            }

            // Set trạng thái đơn hàng là AWAITING_PAYMENT (Chờ thanh toán)
            order.setStatus(OrderStatus.AWAITING_PAYMENT);
            orderRepository.save(order);

            // Lưu/Cập nhật giao dịch online vào bảng payment_transactions với trạng thái UNPAID
            if (paymentTransactionRepository != null) {
                var txOpt = paymentTransactionRepository.findById(order.getId());
                PaymentTransaction transaction = txOpt.orElseGet(() -> {
                    PaymentTransaction newTx = new PaymentTransaction();
                    newTx.setId(order.getId());
                    newTx.setOrderId(order.getId());
                    newTx.setAmount(order.getFinalTotal());
                    return newTx;
                });
                transaction.setStatus(fit.iuh.order.order.core.model.PaymentStatus.UNPAID);
                transaction.setIsDeleted(false);
                paymentTransactionRepository.save(transaction);
            }

            if (payOSPaymentStrategy != null) {
                try {
                    String finalReturnUrl = returnUrl;
                    if (finalReturnUrl == null || finalReturnUrl.trim().isEmpty()) {
                        finalReturnUrl = frontendUrl + "/checkout?status=success&orderId=" + order.getId();
                    } else {
                        if (!finalReturnUrl.contains("orderId=")) {
                            if (finalReturnUrl.contains("?")) {
                                finalReturnUrl += "&orderId=" + order.getId();
                            } else {
                                finalReturnUrl += "?orderId=" + order.getId();
                            }
                        }
                    }
                    String finalCancelUrl = cancelUrl;
                    if (finalCancelUrl == null || finalCancelUrl.trim().isEmpty()) {
                        finalCancelUrl = frontendUrl + "/cart";
                    }
                    Map<String, Object> paymentData = payOSPaymentStrategy.createPaymentLink(order, finalReturnUrl, finalCancelUrl);
                    if (paymentData != null) {
                        if (paymentData.containsKey("checkoutUrl")) {
                            checkoutUrl = (String) paymentData.get("checkoutUrl");
                        }
                        if (paymentData.containsKey("qrCode")) {
                            qrCode = (String) paymentData.get("qrCode");
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Lỗi đổi phương thức thanh toán sang PayOS: " + e.getMessage());
                }
            }
        } else if ("COD".equalsIgnoreCase(paymentMethod)) {
            if (paymentTransactionRepository != null) {
                var txOpt = paymentTransactionRepository.findByIdAndIsDeletedFalse(order.getId());
                if (txOpt.isPresent()) {
                    var tx = txOpt.get();
                    if (tx.getStatus() == fit.iuh.order.order.core.model.PaymentStatus.PAID) {
                        throw new IllegalStateException("Đơn hàng đã được thanh toán online, không thể chuyển sang thanh toán khi nhận hàng (COD)!");
                    }
                    // Đánh dấu soft delete giao dịch online cũ vì đã chuyển sang COD (COD không lưu ở bảng payment_transactions)
                    tx.setIsDeleted(true);
                    paymentTransactionRepository.save(tx);
                }
            }

            // Set trạng thái đơn hàng về PENDING (Chờ xử lý)
            order.setStatus(OrderStatus.PENDING);
            orderRepository.save(order);
        }

        OrderResponse response = mapToResponse(order);
        if (checkoutUrl != null) response.setCheckoutUrl(checkoutUrl);
        if (qrCode != null) response.setQrCode(qrCode);

        return response;
    }

    public boolean checkPurchase(Long userId, Long bookId) {
        return orderRepository.existsByUserIdAndBookIdAndStatusNot(userId, bookId, OrderStatus.CANCELED);
    }

    @Transactional
    public OrderResponse confirmOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
        
        // Chỉ cho phép xác nhận khi trạng thái đang là PENDING hoặc AWAITING_PAYMENT
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            throw new IllegalArgumentException("Đơn hàng không thể xác nhận ở trạng thái hiện tại: " + order.getStatus());
        }
        
        order.setStatus(OrderStatus.CONFIRMED);
        Order savedOrder = orderRepository.save(order);
        return mapToResponse(savedOrder);
    }

    @Transactional
    public OrderResponse updateShippingFee(Long id, java.math.BigDecimal newBaseShippingFee) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
        
        // Cập nhật phí ship cơ bản
        order.setBaseShippingFee(newBaseShippingFee);
        
        // Tính toán lại finalTotal và totalAmount
        java.math.BigDecimal subtotal = order.getSubtotalAmount();
        java.math.BigDecimal shipDiscount = order.getShippingDiscount();
        java.math.BigDecimal ordDiscount = order.getOrderDiscount();
        
        java.math.BigDecimal finalTotal = subtotal.add(newBaseShippingFee)
                .subtract(shipDiscount)
                .subtract(ordDiscount);
        
        if (finalTotal.compareTo(java.math.BigDecimal.ZERO) < 0) {
            finalTotal = java.math.BigDecimal.ZERO;
        }
        
        order.setFinalTotal(finalTotal);
        order.setTotalAmount(finalTotal);
        
        Order savedOrder = orderRepository.save(order);
        
        final java.math.BigDecimal calculatedTotal = finalTotal;
        
        // Nếu có giao dịch online liên quan, cập nhật lại số tiền thanh toán tương ứng
        if (paymentTransactionRepository != null) {
            paymentTransactionRepository.findByIdAndIsDeletedFalse(id).ifPresent(tx -> {
                if ("UNPAID".equalsIgnoreCase(tx.getStatus().name())) {
                    tx.setAmount(calculatedTotal);
                    paymentTransactionRepository.save(tx);
                }
            });
        }
        
        return mapToResponse(savedOrder);
    }

    private OrderResponse mapToResponse(Order order) {
        String paymentStatus = "CHƯA THANH TOÁN"; // default
        if (paymentTransactionRepository != null) {
            var txOpt = paymentTransactionRepository.findByIdAndIsDeletedFalse(order.getId());
            if (txOpt.isPresent()) {
                var statusStr = txOpt.get().getStatus().name();
                if ("PAID".equalsIgnoreCase(statusStr)) {
                    paymentStatus = "ĐÃ THANH TOÁN (VietQR)";
                } else {
                    paymentStatus = "CHƯA THANH TOÁN (VietQR)";
                }
            } else {
                // Đơn hàng COD
                if (order.getStatus() == OrderStatus.COMPLETED) {
                    paymentStatus = "ĐÃ THANH TOÁN (COD)";
                } else {
                    paymentStatus = "CHƯA THANH TOÁN (COD)";
                }
            }
        }

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUserId())
                .orderDate(order.getOrderDate())
                .totalAmount(order.getTotalAmount())
            .subtotalAmount(order.getSubtotalAmount())
            .baseShippingFee(order.getBaseShippingFee())
            .shippingDiscount(order.getShippingDiscount())
            .orderDiscount(order.getOrderDiscount())
            .finalTotal(order.getFinalTotal())
                .status(order.getStatus().name())
                .paymentStatus(paymentStatus)
                .shippingAddress(order.getShippingAddress())
                .items(order.getItems() == null ? java.util.Collections.emptyList() : order.getItems().stream().map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .bookId(item.getBookId())
                        .quantity(item.getQuantity())
                        .priceAtPurchase(item.getPriceAtPurchase())
                        .build()).collect(Collectors.toList()))
                .build();
    }
}
