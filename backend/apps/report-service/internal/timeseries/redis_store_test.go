package timeseries

import (
	"testing"
	"time"
)

func TestParseMRange(t *testing.T) {
	reply := []interface{}{
		[]interface{}{
			"ts:service-a:requests:crashes.search",
			[]interface{}{
				[]interface{}{"service", "service-a"},
				[]interface{}{"name", "crashes.search"},
			},
			[]interface{}{
				[]interface{}{int64(1_000), "3"},
				[]interface{}{int64(61_000), "4.5"},
			},
		},
	}

	series, err := ParseMRange(reply)
	if err != nil {
		t.Fatal(err)
	}
	if len(series) != 1 || series[0].Name() != "crashes.search" {
		t.Fatalf("unexpected series %+v", series)
	}
	if series[0].Sum() != 7.5 || series[0].Max() != 4.5 {
		t.Fatalf("unexpected totals sum=%v max=%v", series[0].Sum(), series[0].Max())
	}
	if !series[0].Points[1].Time.Equal(time.UnixMilli(61_000)) {
		t.Fatalf("unexpected time %v", series[0].Points[1].Time)
	}
}

func TestParseMRangeRejectsUnexpectedReplies(t *testing.T) {
	if _, err := ParseMRange("nope"); err == nil {
		t.Fatal("expected an error")
	}
}
