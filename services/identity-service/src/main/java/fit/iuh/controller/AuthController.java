package fit.iuh.controller;

import fit.iuh.config.JwtConfig;
import fit.iuh.dto.request.RefreshTokenRequest;
import fit.iuh.dto.response.JwtResponse;
import fit.iuh.dto.response.UserDto;
import fit.iuh.mapper.UserMapper;
import fit.iuh.repository.UserRepository;
import fit.iuh.service.AuthService;
import fit.iuh.service.JwtService;
import fit.iuh.dto.request.ChangePasswordWithOtpRequest;
import fit.iuh.dto.request.ForgotPasswordConfirmRequest;
import fit.iuh.dto.request.ForgotPasswordRequest;
import fit.iuh.dto.request.LoginRequest;
import fit.iuh.dto.request.RegisterUserRequest;
import fit.iuh.entity.Address;
import java.util.Map;
import fit.iuh.entity.Role;
import fit.iuh.entity.User;
import fit.iuh.repository.AddressRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@AllArgsConstructor
public class AuthController {
   private final AuthenticationManager manager;
   private final JwtService jwtService;
   private final AuthService authService;
   private final UserRepository userRepository;
   private final JwtConfig jwtConfig;
   private final UserMapper userMapper;
   private final AddressRepository addressRepository;
   private final PasswordEncoder passwordEncoder;

   @GetMapping("/me")
   public ResponseEntity<UserDto> me() {
      var authentication = SecurityContextHolder.getContext().getAuthentication();
       assert authentication != null;
       var userId = (Long) authentication.getPrincipal();

       assert userId != null;
       var user = userRepository.findById(userId).orElseThrow();

      return ResponseEntity.ok(userMapper.toDto(user));
   }



   @PostMapping("/login")
   public ResponseEntity<JwtResponse> login(
          @RequestBody LoginRequest request,
          HttpServletResponse response
   ) {
      manager.authenticate(new UsernamePasswordAuthenticationToken(
              request.getUsername(),
              request.getPassword()
      ));

      var user = userRepository.findUserByUsername(request.getUsername()).orElseThrow();

      String accessToken = jwtService.generateAccessToken(user).toString();
      String refreshToken = jwtService.generateRefreshToken(user).toString();

      var cookie = new Cookie("refreshToken", refreshToken);
      cookie.setHttpOnly(true);
      cookie.setPath("/api/v1/identity/auth");
      cookie.setMaxAge(jwtConfig.getRefreshTokenExpiration());
      cookie.setSecure(true);
      response.addCookie(cookie);
      return ResponseEntity.ok(new JwtResponse(accessToken, refreshToken));
   }

   @PostMapping("/register")
   public ResponseEntity<?> register(
           @Valid @RequestBody RegisterUserRequest request,
           HttpServletResponse response
   ) {
      if (userRepository.existsByEmail(request.getEmail())) {
         return ResponseEntity.badRequest().body("Email already exists");
      }
      if (userRepository.findUserByUsername(request.getUsername()).isPresent()) {
         return ResponseEntity.badRequest().body("Username already exists");
      }
      User user = userMapper.toEntity(request);
      user.setPassword(passwordEncoder.encode(request.getPassword()));
      user.setRole(Role.CUSTOMER);
      user.setStatus("ACTIVE");
      user.setFullName(request.getName());

      User savedUser = userRepository.save(user);

      String accessToken = jwtService.generateAccessToken(savedUser).toString();
      String refreshToken = jwtService.generateRefreshToken(savedUser).toString();

      Cookie cookie = new Cookie("refreshToken", refreshToken);
      cookie.setHttpOnly(true);
      cookie.setPath("/api/v1/identity/auth");
      cookie.setMaxAge(jwtConfig.getRefreshTokenExpiration());
      cookie.setSecure(true);
      response.addCookie(cookie);

      return ResponseEntity.ok(new JwtResponse(accessToken, refreshToken));
   }

   @PostMapping("/refresh")
   public ResponseEntity<JwtResponse> refresh(
           @RequestBody @Valid RefreshTokenRequest request,
           HttpServletResponse response
   ) {
      String token = request.getRefreshToken();
      var jwt = jwtService.parseToken(token);

      if(jwt == null || !jwtService.isTokenValid(jwt)) {
         return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
      }

      Long id = jwt.getUserIdFromToken();
      var user = userRepository.findById(id).orElseThrow();

      String accessToken = jwtService.generateAccessToken(user).toString();
      String refreshToken = jwtService.generateRefreshToken(user).toString();

      // Cập nhật lại cookie cho Web App
      Cookie cookie = new Cookie("refreshToken", refreshToken);
      cookie.setHttpOnly(true);
      cookie.setPath("/api/v1/identity/auth");
      cookie.setMaxAge(jwtConfig.getRefreshTokenExpiration());
      cookie.setSecure(true);
      response.addCookie(cookie);

      return ResponseEntity.ok(new JwtResponse(accessToken, refreshToken));
   }

   @PostMapping("/logout")
   public ResponseEntity<Void> logout(
           HttpServletRequest request,
           HttpServletResponse response,
           @CookieValue(name = "refreshToken", required = false) String refreshToken
   ) {
      String authHeader = request.getHeader("Authorization");

      // 1. Blacklist access token hiện tại nếu có
      if (authHeader != null && authHeader.startsWith("Bearer ")) {
         String rawToken = authHeader.replace("Bearer ", "");
         authService.logout(rawToken);
      }

      // 2. Blacklist luôn refresh token nếu có
      if (refreshToken != null) {
         authService.logout(refreshToken);
      }

      // 3. Luôn thực hiện xóa cookie ở phía client (Dù token có hay không)
      Cookie cookie = new Cookie("refreshToken", null);
      cookie.setHttpOnly(true);
      cookie.setPath("/api/v1/identity/auth");
      cookie.setMaxAge(0);
      cookie.setSecure(true);
      response.addCookie(cookie);

      return ResponseEntity.ok().build();
   }


   @PostMapping("/forgot-password/send-otp")
   public ResponseEntity<?> sendForgotPasswordOtp(@Valid @RequestBody ForgotPasswordRequest request) {
      authService.sendForgotPasswordOtp(request);
      return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi đến email của bạn"));
   }

   @PostMapping("/forgot-password/confirm")
   public ResponseEntity<?> confirmForgotPassword(@Valid @RequestBody ForgotPasswordConfirmRequest request) {
      authService.confirmForgotPassword(request);
      return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công"));
   }

   // Gửi OTP để xác nhận đổi mật khẩu (cần đăng nhập)
   @PostMapping("/change-password/send-otp")
   public ResponseEntity<?> sendChangePasswordOtp() {
      authService.sendChangePasswordOtp();
      return ResponseEntity.ok(Map.of("message", "Mã OTP đã được gửi đến email của bạn"));
   }

   // Xác nhận đổi mật khẩu với OTP
   @PostMapping("/change-password/confirm")
   public ResponseEntity<?> confirmChangePassword(@Valid @RequestBody ChangePasswordWithOtpRequest request) {
      authService.confirmChangePassword(request);
      return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công"));
   }

   @ExceptionHandler(BadCredentialsException.class)
   public ResponseEntity<Void> handleBadCredentialsException () {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
   }
}
