package com.example.service;

import java.util.regex.Pattern;

/**
 * UserService - handles user registration, validation, and authentication.
 */
public class UserService {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    private static final int MAX_PASSWORD_LENGTH = 128;
    private static final int MIN_PASSWORD_LENGTH = 8;

    // ── Covered by tests ────────────────────────────────────────────────────

    public String hashPassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be null or empty");
        }
        // Simulated hash (BCrypt in real code)
        return "hashed_" + rawPassword;
    }

    public boolean isEmailValid(String email) {
        if (email == null) return false;
        return EMAIL_PATTERN.matcher(email).matches();
    }

    // ── NOT covered by tests (gaps) ─────────────────────────────────────────

    public void validateUserInput(String email, String password) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (!isEmailValid(email)) {
            throw new IllegalArgumentException("Invalid email format");
        }
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("Password too short");
        }
        if (password.length() > MAX_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("Password too long");
        }
    }

    public boolean deleteUser(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Invalid user ID");
        }
        // Simulated DB delete — NOT tested
        return true;
    }

    public String resetPasswordToken(String email) {
        if (!isEmailValid(email)) {
            throw new IllegalArgumentException("Invalid email");
        }
        // Generates a reset token — NOT tested
        return java.util.UUID.randomUUID().toString();
    }
}
