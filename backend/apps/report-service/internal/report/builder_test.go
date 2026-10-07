package report

import (
	"context"
	"testing"
	"time"

	"github.com/lumana/report-service/internal/timeseries"
)

type fakeStore struct {
	byMetric map[string][]timeseries.Series
	queries  []timeseries.RangeQuery
}

func (f *fakeStore) MRange(_ context.Context, query timeseries.RangeQuery) ([]timeseries.Series, error) {
	f.queries = append(f.queries, query)
	return f.byMetric[query.Filters["metric"]+":"+string(query.Aggregation)], nil
}

func series(name string, values ...float64) timeseries.Series {
	points := make([]timeseries.Point, len(values))
	for index, value := range values {
		points[index] = timeseries.Point{Time: time.Unix(int64(index*60), 0), Value: value}
	}
	return timeseries.Series{Key: name, Labels: map[string]string{"name": name}, Points: points}
}

func TestBuildAggregatesActionsAndEvents(t *testing.T) {
	store := &fakeStore{byMetric: map[string][]timeseries.Series{
		"requests:sum": {series("crashes.search", 6, 4), series("crashes.upload", 0, 2)},
		"errors:sum":   {series("crashes.search", 1, 1)},
		"latency:avg":  {series("crashes.search", 10), series("crashes.upload", 40)},
		"latency:max":  {series("crashes.search", 90), series("crashes.upload", 300)},
		"events:sum":   {series("import.completed", 2), series("dataset.fetch.completed", 1)},
		"rows:sum":     {series("import.completed", 5000), series("dataset.fetch.completed", 1000)},
	}}
	window := NewWindow(time.Unix(0, 0), time.Unix(0, 0).Add(24*time.Hour))

	report, err := NewBuilder(store).Build(context.Background(), "service-a", window)
	if err != nil {
		t.Fatal(err)
	}

	if report.TotalRequests != 12 || report.TotalErrors != 2 {
		t.Fatalf("totals: requests=%v errors=%v", report.TotalRequests, report.TotalErrors)
	}
	if report.Actions[0].Action != "crashes.search" || report.Actions[0].ErrorRate() != 0.2 {
		t.Fatalf("unexpected first action %+v", report.Actions[0])
	}
	if got := report.AvgLatencyMs; got != (10*10+40*2)/12.0 {
		t.Fatalf("weighted latency %v", got)
	}
	if report.RowsImported != 5000 || report.RowsFetched != 1000 || len(report.Events) != 2 {
		t.Fatalf("events %+v", report.Events)
	}
	for _, query := range store.queries {
		if query.Filters["service"] != "service-a" {
			t.Fatalf("query without service filter %+v", query)
		}
	}
}

func TestBuildFillsEmptyBucketsWithZero(t *testing.T) {
	start := time.Unix(0, 0).UTC()
	sparse := timeseries.Series{
		Labels: map[string]string{"name": "crashes.search"},
		Points: []timeseries.Point{{Time: start.Add(time.Hour), Value: 5}},
	}
	store := &fakeStore{byMetric: map[string][]timeseries.Series{"requests:sum": {sparse}}}
	window := NewWindow(start, start.Add(4*time.Hour))

	report, err := NewBuilder(store).Build(context.Background(), "service-a", window)
	if err != nil {
		t.Fatal(err)
	}

	points := report.RequestLines[0].Points
	if len(points) != int(4*time.Hour/window.Bucket) || points[0].Value != 0 || points[12].Value != 5 {
		t.Fatalf("unexpected dense points: %d, first %v, at 1h %v", len(points), points[0], points[12])
	}
}

func TestNewWindowPicksReadableBuckets(t *testing.T) {
	start := time.Unix(0, 0)
	cases := map[time.Duration]time.Duration{
		30 * time.Minute:    time.Minute,
		24 * time.Hour:      30 * time.Minute,
		7 * 24 * time.Hour:  6 * time.Hour,
		90 * 24 * time.Hour: 24 * time.Hour,
	}
	for span, expected := range cases {
		if got := NewWindow(start, start.Add(span)).Bucket; got != expected {
			t.Errorf("span %v: bucket %v, want %v", span, got, expected)
		}
	}
}
