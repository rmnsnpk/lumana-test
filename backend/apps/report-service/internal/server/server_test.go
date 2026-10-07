package server

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strings"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/lumana/report-service/gen/reportv1"
	"github.com/lumana/report-service/internal/report"
)

type fakeBuilder struct {
	err     error
	service string
	window  report.Window
}

func (f *fakeBuilder) Build(_ context.Context, service string, window report.Window) (report.Report, error) {
	f.service, f.window = service, window
	return report.Report{Service: service, Window: window}, f.err
}

var now = time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)

func newServer(builder Builder) *Server {
	server := New(builder, 90*24*time.Hour, 24*time.Hour)
	server.now = func() time.Time { return now }
	return server
}

func TestDefaultsToLastDayOfServiceA(t *testing.T) {
	builder := &fakeBuilder{}
	response, err := newServer(builder).GenerateActivityReport(context.Background(), &reportv1.GenerateActivityReportRequest{})
	if err != nil {
		t.Fatal(err)
	}
	if builder.service != "service-a" || !builder.window.To.Equal(now) || !builder.window.From.Equal(now.Add(-24*time.Hour)) {
		t.Fatalf("unexpected window %+v for %s", builder.window, builder.service)
	}
	if len(response.Pdf) == 0 || response.FileName != "activity-service-a-20261008-1200.pdf" {
		t.Fatalf("unexpected response %q (%d bytes)", response.FileName, len(response.Pdf))
	}
}

func TestRejectsInvalidWindows(t *testing.T) {
	cases := []*reportv1.GenerateActivityReportRequest{
		{From: timestamppb.New(now), To: timestamppb.New(now.Add(-time.Hour))},
		{From: timestamppb.New(now.Add(-100 * 24 * time.Hour)), To: timestamppb.New(now)},
	}
	for _, request := range cases {
		_, err := newServer(&fakeBuilder{}).GenerateActivityReport(context.Background(), request)
		if status.Code(err) != codes.InvalidArgument {
			t.Errorf("expected InvalidArgument, got %v", err)
		}
	}
}

func TestMapsStoreFailuresWithoutLeakingDetails(t *testing.T) {
	cases := []struct {
		name string
		err  error
		code codes.Code
	}{
		{"network", fmt.Errorf("TS.MRANGE: %w", &net.OpError{Op: "dial", Net: "tcp", Err: errors.New("connect: connection refused")}), codes.Unavailable},
		{"bad reply", errors.New("unexpected TS.MRANGE reply string"), codes.Internal},
	}
	for _, c := range cases {
		_, err := newServer(&fakeBuilder{err: c.err}).
			GenerateActivityReport(context.Background(), &reportv1.GenerateActivityReportRequest{})
		if status.Code(err) != c.code {
			t.Errorf("%s: expected %v, got %v", c.name, c.code, err)
		}
		if message := status.Convert(err).Message(); strings.Contains(message, c.err.Error()) {
			t.Errorf("%s: status message leaks the cause: %q", c.name, message)
		}
	}
}
