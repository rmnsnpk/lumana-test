package server

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/lumana/report-service/gen/reportv1"
	"github.com/lumana/report-service/internal/render"
	"github.com/lumana/report-service/internal/report"
	"github.com/lumana/report-service/internal/timeseries"
)

const defaultService = "service-a"

type Builder interface {
	Build(ctx context.Context, service string, window report.Window) (report.Report, error)
}

type Server struct {
	reportv1.UnimplementedReportServiceServer
	builder       Builder
	maxWindow     time.Duration
	defaultWindow time.Duration
	now           func() time.Time
}

func New(builder Builder, maxWindow, defaultWindow time.Duration) *Server {
	return &Server{builder: builder, maxWindow: maxWindow, defaultWindow: defaultWindow, now: time.Now}
}

func (s *Server) GenerateActivityReport(
	ctx context.Context,
	request *reportv1.GenerateActivityReportRequest,
) (*reportv1.GenerateActivityReportResponse, error) {
	service := request.GetService()
	if service == "" {
		service = defaultService
	}

	window, err := s.window(request.GetFrom(), request.GetTo())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	data, err := s.builder.Build(ctx, service, window)
	if err != nil {
		return nil, toStatus(ctx, err)
	}

	pdf, err := render.PDF(data)
	if err != nil {
		log.Printf("render report: %v", err)
		return nil, status.Error(codes.Internal, "report rendering failed")
	}

	return &reportv1.GenerateActivityReportResponse{
		Pdf:      pdf,
		FileName: fmt.Sprintf("activity-%s-%s.pdf", service, window.To.Format("20060102-1504")),
	}, nil
}

func (s *Server) window(from, to *timestamppb.Timestamp) (report.Window, error) {
	end := s.now().UTC()
	if to != nil {
		if err := to.CheckValid(); err != nil {
			return report.Window{}, fmt.Errorf("invalid to: %w", err)
		}
		end = to.AsTime()
	}

	start := end.Add(-s.defaultWindow)
	if from != nil {
		if err := from.CheckValid(); err != nil {
			return report.Window{}, fmt.Errorf("invalid from: %w", err)
		}
		start = from.AsTime()
	}

	if !start.Before(end) {
		return report.Window{}, errors.New("from must be before to")
	}
	if end.Sub(start) > s.maxWindow {
		return report.Window{}, fmt.Errorf("the period may not exceed %.0f days", s.maxWindow.Hours()/24)
	}

	return report.NewWindow(start, end), nil
}

func toStatus(ctx context.Context, err error) error {
	switch {
	case errors.Is(ctx.Err(), context.Canceled):
		return status.Error(codes.Canceled, "report request canceled")
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		return status.Error(codes.DeadlineExceeded, "report deadline exceeded")
	case timeseries.IsUnavailable(err):
		log.Printf("build report: %v", err)
		return status.Error(codes.Unavailable, "RedisTimeSeries unavailable")
	default:
		log.Printf("build report: %v", err)
		return status.Error(codes.Internal, "report build failed")
	}
}
