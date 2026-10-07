package render

import (
	"fmt"
	"math"
	"time"
)

func formatCount(value float64) string {
	switch {
	case value >= 1_000_000:
		return fmt.Sprintf("%.1fM", value/1_000_000)
	case value >= 10_000:
		return fmt.Sprintf("%.1fk", value/1_000)
	default:
		return withThousands(int64(math.Round(value)))
	}
}

func withThousands(value int64) string {
	text := fmt.Sprintf("%d", value)
	if len(text) <= 3 {
		return text
	}
	result := ""
	for index, digit := range text {
		if index > 0 && (len(text)-index)%3 == 0 {
			result += ","
		}
		result += string(digit)
	}
	return result
}

func formatMs(value float64) string {
	if value >= 1000 {
		return fmt.Sprintf("%.2f s", value/1000)
	}
	return fmt.Sprintf("%.0f ms", value)
}

func formatPercent(value float64) string {
	return fmt.Sprintf("%.1f%%", value*100)
}

func formatBucket(bucket time.Duration) string {
	switch {
	case bucket >= 24*time.Hour:
		return fmt.Sprintf("%.0f day", bucket.Hours()/24)
	case bucket >= time.Hour:
		return fmt.Sprintf("%.0f h", bucket.Hours())
	default:
		return fmt.Sprintf("%.0f min", bucket.Minutes())
	}
}

func formatTick(value time.Time, span time.Duration) string {
	if span <= 48*time.Hour {
		return value.Format("Jan 02 15:04")
	}
	return value.Format("Jan 02")
}

func niceCeiling(value float64) float64 {
	if value <= 0 {
		return 1
	}
	magnitude := math.Pow(10, math.Floor(math.Log10(value)))
	for _, step := range []float64{1, 2, 2.5, 5, 10} {
		if candidate := step * magnitude; candidate >= value {
			return candidate
		}
	}
	return 10 * magnitude
}

func truncate(value string, maximum int) string {
	if len(value) <= maximum {
		return value
	}
	return value[:maximum-3] + "..."
}
