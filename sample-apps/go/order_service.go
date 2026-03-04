package main

import (
	"errors"
	"regexp"
	"strings"
)

// OrderService manages e-commerce orders.

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// ── Covered by tests ──────────────────────────────────────────────────────────

// ValidateEmail returns true if the email is well-formed.
func ValidateEmail(email string) bool {
	return emailRegex.MatchString(email)
}

// FormatOrderID zero-pads an order ID to 8 chars.
func FormatOrderID(id int) string {
	return strings.ToUpper(fmt.Sprintf("ORD-%08d", id))
}

// ── NOT covered by tests (gaps) ────────────────────────────────────────────────

// PlaceOrder creates a new order – NOT tested.
func PlaceOrder(userID int, itemIDs []int, total float64) (string, error) {
	if userID <= 0 {
		return "", errors.New("invalid userID")
	}
	if len(itemIDs) == 0 {
		return "", errors.New("order must have at least one item")
	}
	if total <= 0 {
		return "", errors.New("total must be positive")
	}
	// Simulate DB write
	return FormatOrderID(userID*1000 + len(itemIDs)), nil
}

// CancelOrder cancels an existing order – NOT tested.
func CancelOrder(orderID string, reason string) error {
	if orderID == "" {
		return errors.New("orderID is required")
	}
	if reason == "" {
		return errors.New("cancellation reason is required")
	}
	// Simulate DB update
	return nil
}

// GetOrderHistory returns paginated orders – NOT tested.
func GetOrderHistory(userID int, page int, pageSize int) ([]string, error) {
	if userID <= 0 {
		return nil, errors.New("invalid userID")
	}
	if page < 1 {
		return nil, errors.New("page must be >= 1")
	}
	// Simulate DB query
	return []string{}, nil
}
