package report

import (
	"context"
	"sort"
	"time"

	"github.com/lumana/report-service/internal/timeseries"
)

const (
	labelService = "service"
	labelMetric  = "metric"

	metricRequests = "requests"
	metricErrors   = "errors"
	metricLatency  = "latency"
	metricEvents   = "events"
	metricRows     = "rows"

	eventImportCompleted = "import.completed"
	eventFetchCompleted  = "dataset.fetch.completed"
)

type Builder struct {
	store timeseries.Store
	now   func() time.Time
}

func NewBuilder(store timeseries.Store) *Builder {
	return &Builder{store: store, now: time.Now}
}

func (b *Builder) Build(ctx context.Context, service string, window Window) (Report, error) {
	whole := window.Span()
	if whole < time.Millisecond {
		whole = time.Millisecond
	}

	requests, err := b.query(ctx, service, metricRequests, timeseries.Sum, window, window.Bucket)
	if err != nil {
		return Report{}, err
	}
	errors, err := b.query(ctx, service, metricErrors, timeseries.Sum, window, window.Bucket)
	if err != nil {
		return Report{}, err
	}
	latencyAvg, err := b.query(ctx, service, metricLatency, timeseries.Avg, window, whole)
	if err != nil {
		return Report{}, err
	}
	latencyMax, err := b.query(ctx, service, metricLatency, timeseries.Max, window, whole)
	if err != nil {
		return Report{}, err
	}
	events, err := b.query(ctx, service, metricEvents, timeseries.Sum, window, whole)
	if err != nil {
		return Report{}, err
	}
	rows, err := b.query(ctx, service, metricRows, timeseries.Sum, window, whole)
	if err != nil {
		return Report{}, err
	}

	report := Report{
		Service:      service,
		Window:       window,
		GeneratedAt:  b.now().UTC(),
		RequestLines: toLines(requests, window),
		ErrorLines:   toLines(errors, window),
		Actions:      actionStats(requests, errors, latencyAvg, latencyMax),
		Events:       eventStats(events, rows),
	}

	weightedLatency := 0.0
	for _, action := range report.Actions {
		report.TotalRequests += action.Requests
		report.TotalErrors += action.Errors
		weightedLatency += action.AvgLatencyMs * action.Requests
	}
	if report.TotalRequests > 0 {
		report.AvgLatencyMs = weightedLatency / report.TotalRequests
	}
	for _, event := range report.Events {
		switch event.Type {
		case eventImportCompleted:
			report.RowsImported = event.Rows
		case eventFetchCompleted:
			report.RowsFetched = event.Rows
		}
	}

	return report, nil
}

func (b *Builder) query(
	ctx context.Context,
	service, metric string,
	aggregation timeseries.Aggregation,
	window Window,
	bucket time.Duration,
) ([]timeseries.Series, error) {
	return b.store.MRange(ctx, timeseries.RangeQuery{
		From:        window.From,
		To:          window.To,
		Aggregation: aggregation,
		Bucket:      bucket,
		Filters:     map[string]string{labelService: service, labelMetric: metric},
	})
}

func toLines(series []timeseries.Series, window Window) []Line {
	lines := make([]Line, 0, len(series))
	for _, item := range series {
		if item.Sum() > 0 {
			lines = append(lines, Line{Name: item.Name(), Points: densify(item.Points, window)})
		}
	}
	sort.Slice(lines, func(i, j int) bool { return lines[i].Name < lines[j].Name })
	return lines
}

func densify(points []timeseries.Point, window Window) []timeseries.Point {
	byBucket := make(map[int64]float64, len(points))
	for _, point := range points {
		byBucket[point.Time.UnixMilli()] = point.Value
	}

	dense := make([]timeseries.Point, 0, int(window.Span()/window.Bucket)+1)
	for at := window.From; at.Before(window.To); at = at.Add(window.Bucket) {
		dense = append(dense, timeseries.Point{Time: at, Value: byBucket[at.UnixMilli()]})
	}
	return dense
}

func actionStats(requests, errors, latencyAvg, latencyMax []timeseries.Series) []ActionStats {
	byAction := map[string]*ActionStats{}
	get := func(name string) *ActionStats {
		if stats, ok := byAction[name]; ok {
			return stats
		}
		stats := &ActionStats{Action: name}
		byAction[name] = stats
		return stats
	}

	for _, item := range requests {
		get(item.Name()).Requests = item.Sum()
	}
	for _, item := range errors {
		get(item.Name()).Errors = item.Sum()
	}
	for _, item := range latencyAvg {
		if len(item.Points) > 0 {
			get(item.Name()).AvgLatencyMs = item.Points[0].Value
		}
	}
	for _, item := range latencyMax {
		get(item.Name()).MaxLatencyMs = item.Max()
	}

	stats := make([]ActionStats, 0, len(byAction))
	for _, item := range byAction {
		if item.Requests > 0 {
			stats = append(stats, *item)
		}
	}
	sort.Slice(stats, func(i, j int) bool {
		if stats[i].Requests != stats[j].Requests {
			return stats[i].Requests > stats[j].Requests
		}
		return stats[i].Action < stats[j].Action
	})
	return stats
}

func eventStats(events, rows []timeseries.Series) []EventStats {
	rowsByType := map[string]float64{}
	for _, item := range rows {
		rowsByType[item.Name()] = item.Sum()
	}

	stats := make([]EventStats, 0, len(events))
	for _, item := range events {
		if count := item.Sum(); count > 0 {
			stats = append(stats, EventStats{Type: item.Name(), Count: count, Rows: rowsByType[item.Name()]})
		}
	}
	sort.Slice(stats, func(i, j int) bool { return stats[i].Type < stats[j].Type })
	return stats
}
