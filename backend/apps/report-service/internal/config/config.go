package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	GRPCAddress     string
	RedisURL        string
	MaxMessageBytes int
	MaxWindow       time.Duration
	DefaultWindow   time.Duration
	ShutdownTimeout time.Duration
}

func Load() Config {
	return Config{
		GRPCAddress:     stringEnv("REPORT_GRPC_ADDR", ":50051"),
		RedisURL:        stringEnv("REDIS_URL", "redis://localhost:6379"),
		MaxMessageBytes: intEnv("REPORT_MAX_MESSAGE_BYTES", 16*1024*1024),
		MaxWindow:       time.Duration(intEnv("REPORT_MAX_WINDOW_DAYS", 90)) * 24 * time.Hour,
		DefaultWindow:   time.Duration(intEnv("REPORT_DEFAULT_WINDOW_HOURS", 24)) * time.Hour,
		ShutdownTimeout: 10 * time.Second,
	}
}

func stringEnv(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func intEnv(name string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(name))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}
