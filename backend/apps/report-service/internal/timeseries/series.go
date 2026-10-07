package timeseries

import (
	"context"
	"time"
)

type Point struct {
	Time  time.Time
	Value float64
}

type Series struct {
	Key    string
	Labels map[string]string
	Points []Point
}

func (s Series) Name() string {
	return s.Labels["name"]
}

func (s Series) Sum() float64 {
	total := 0.0
	for _, point := range s.Points {
		total += point.Value
	}
	return total
}

func (s Series) Max() float64 {
	maximum := 0.0
	for _, point := range s.Points {
		if point.Value > maximum {
			maximum = point.Value
		}
	}
	return maximum
}

type Aggregation string

const (
	Sum Aggregation = "sum"
	Avg Aggregation = "avg"
	Max Aggregation = "max"
)

type RangeQuery struct {
	From        time.Time
	To          time.Time
	Aggregation Aggregation
	Bucket      time.Duration
	Filters     map[string]string
}

type Store interface {
	MRange(ctx context.Context, query RangeQuery) ([]Series, error)
}
