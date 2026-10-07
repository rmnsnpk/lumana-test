package main

import (
	"context"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"

	"github.com/lumana/report-service/gen/reportv1"
	"github.com/lumana/report-service/internal/config"
	"github.com/lumana/report-service/internal/report"
	"github.com/lumana/report-service/internal/server"
	"github.com/lumana/report-service/internal/timeseries"
)

func main() {
	cfg := config.Load()

	options, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatalf("invalid REDIS_URL: %v", err)
	}
	options.Protocol = 2
	client := redis.NewClient(options)
	defer client.Close()

	pingCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}

	listener, err := net.Listen("tcp", cfg.GRPCAddress)
	if err != nil {
		log.Fatalf("listen %s: %v", cfg.GRPCAddress, err)
	}

	grpcServer := grpc.NewServer(
		grpc.MaxSendMsgSize(cfg.MaxMessageBytes),
		grpc.MaxRecvMsgSize(cfg.MaxMessageBytes),
	)
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(grpcServer, healthServer)
	builder := report.NewBuilder(timeseries.NewRedisStore(client))
	reportv1.RegisterReportServiceServer(grpcServer, server.New(builder, cfg.MaxWindow, cfg.DefaultWindow))
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)

	go func() {
		log.Printf("report gRPC server listening on %s", cfg.GRPCAddress)
		if err := grpcServer.Serve(listener); err != nil {
			log.Printf("gRPC server stopped: %v", err)
		}
	}()

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
	<-signals

	healthServer.Shutdown()
	stopped := make(chan struct{})
	go func() {
		grpcServer.GracefulStop()
		close(stopped)
	}()
	select {
	case <-stopped:
	case <-time.After(cfg.ShutdownTimeout):
		grpcServer.Stop()
	}
}
