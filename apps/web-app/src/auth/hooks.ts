import { useState, useCallback } from "react";
import { RegisterRequest } from "../api/auth";

interface RegisterFormData {
  username: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  streetAddress: string;
  ward: string;
  district: string;
  cityProvince: string;
  dateOfBirth?: string;
}

interface FormErrors {
  [key: string]: string;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone: string): boolean => {
  // Vietnamese phone format: 0 or +84 followed by 3/5/7/8/9 and 8 digits
  const phoneRegex = /^(\+84|0)[357-9]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};

const validateUsername = (username: string): boolean => {
  // Alphanumeric with dots, hyphens, underscores
  const usernameRegex = /^[a-zA-Z0-9._-]{3,255}$/;
  return usernameRegex.test(username);
};

export function useRegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    streetAddress: "",
    ward: "",
    district: "",
    cityProvince: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = useCallback(
    (field: keyof RegisterFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors],
  );

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (!validateUsername(formData.username)) {
      newErrors.username =
        "Username must be 3-255 characters, alphanumeric with . - _ allowed";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.length > 255) {
      newErrors.name = "Name must not exceed 255 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const getSubmitData = (): RegisterRequest => {
    return {
      username: formData.username,
      name: formData.name,
      email: formData.email.toLowerCase(),
      password: formData.password,
      dateOfBirth: formData.dateOfBirth,
    } as any;
  };

  return {
    formData,
    errors,
    updateField,
    validate,
    getSubmitData,
    setErrors,
  };
}
