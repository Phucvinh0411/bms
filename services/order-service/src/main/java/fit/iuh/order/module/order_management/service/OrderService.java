package fit.iuh.order.module.order_management.service;

import fit.iuh.order.module.handler.CheckoutContext;
import fit.iuh.order.module.handler.AddressSelectionHandler;
import fit.iuh.order.module.handler.PersistOrderHandler;
import fit.iuh.order.module.handler.PricingHandler;
import fit.iuh.order.module.handler.StockCheckHandler;
import fit.iuh.order.module.handler.VoucherCheckHandler;
import fit.iuh.order.module.order_management.dto.*;
import fit.iuh.order.module.models.Order;
import fit.iuh.order.module.models.enums.OrderStatus;
import fit.iuh.order.module.order_management.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service("orderManagementOrderService")
public class OrderService {
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

        return mapToResponse(savedOrder);
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
        order.setStatus(OrderStatus.valueOf(status.toUpperCase()));
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    public void deleteOrder(Long id) {
        orderRepository.deleteById(id);
    }

    public boolean checkPurchase(Long userId, Long bookId) {
        return orderRepository.existsByUserIdAndBookIdAndStatusNot(userId, bookId, OrderStatus.CANCELED);
    }

    private OrderResponse mapToResponse(Order order) {
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
                .items(order.getItems().stream().map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .bookId(item.getBookId())
                        .quantity(item.getQuantity())
                        .priceAtPurchase(item.getPriceAtPurchase())
                        .build()).collect(Collectors.toList()))
                .build();
    }
}
