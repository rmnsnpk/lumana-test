package report

import (
	"time"

	"github.com/lumana/report-service/internal/timeseries"
)

type ActionStats struct {
	Action       string
	Requests     float64
	Errors       float64
	AvgLatencyMs float64
	MaxLatencyMs float64
}

func (a ActionStats) ErrorRate() float64 {
	if a.Requests == 0 {
		return 0
	}
	return a.Errors / a.Requests
}

type EventStats struct {
	Type  string
	Count float64
	Rows  float64
}

type Line struct {
	Name   string
	Points []timeseries.Point
}

type Report struct {
	Service       string
	Window        Window
	GeneratedAt   time.Time
	Actions       []ActionStats
	Events        []EventStats
	RequestLines  []Line
	ErrorLines    []Line
	TotalRequests float64
	TotalErrors   float64
	AvgLatencyMs  float64
	RowsImported  float64
	RowsFetched   float64
}

func (r Report) ErrorRate() float64 {
	if r.TotalRequests == 0 {
		return 0
	}
	return r.TotalErrors / r.TotalRequests
}

func (r Report) Empty() bool {
	return r.TotalRequests == 0 && len(r.Events) == 0
}
