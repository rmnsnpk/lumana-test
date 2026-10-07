package render

import (
	"bytes"
	"testing"
	"time"

	"github.com/lumana/report-service/internal/report"
	"github.com/lumana/report-service/internal/timeseries"
)

func sampleReport(withData bool) report.Report {
	from := time.Date(2026, 10, 7, 9, 0, 0, 0, time.UTC)
	data := report.Report{
		Service:     "service-a",
		Window:      report.NewWindow(from, from.Add(24*time.Hour)),
		GeneratedAt: from.Add(24 * time.Hour),
	}
	if !withData {
		return data
	}
	points := []timeseries.Point{
		{Time: from, Value: 12},
		{Time: from.Add(30 * time.Minute), Value: 40},
		{Time: from.Add(60 * time.Minute), Value: 7},
	}
	data.RequestLines = []report.Line{{Name: "crashes.search", Points: points}}
	data.ErrorLines = []report.Line{{Name: "crashes.search", Points: points[:1]}}
	data.Actions = []report.ActionStats{{Action: "crashes.search", Requests: 59, Errors: 12, AvgLatencyMs: 14, MaxLatencyMs: 220}}
	data.Events = []report.EventStats{{Type: "import.completed", Count: 2, Rows: 200_000}}
	data.TotalRequests, data.TotalErrors, data.AvgLatencyMs, data.RowsImported = 59, 12, 14, 200_000
	return data
}

func TestPDFRendersWithAndWithoutData(t *testing.T) {
	for _, withData := range []bool{true, false} {
		output, err := PDF(sampleReport(withData))
		if err != nil {
			t.Fatalf("withData=%v: %v", withData, err)
		}
		if !bytes.HasPrefix(output, []byte("%PDF-")) || len(output) < 2000 {
			t.Fatalf("withData=%v: unexpected output of %d bytes", withData, len(output))
		}
	}
}

func TestFormatting(t *testing.T) {
	cases := map[string]string{
		formatCount(1234):       "1,234",
		formatCount(25_000):     "25.0k",
		formatMs(1500):          "1.50 s",
		formatPercent(0.125):    "12.5%",
		formatBucket(time.Hour): "1 h",
	}
	for got, want := range cases {
		if got != want {
			t.Errorf("got %q, want %q", got, want)
		}
	}
	if niceCeiling(37) != 50 || niceCeiling(0) != 1 {
		t.Errorf("niceCeiling: %v %v", niceCeiling(37), niceCeiling(0))
	}
}
