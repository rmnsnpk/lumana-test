# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS build
WORKDIR /src
RUN go install github.com/grpc-ecosystem/grpc-health-probe@v0.4.40
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go vet ./... && go test ./... && CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/report-service ./cmd/report-service

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/report-service /report-service
COPY --from=build /go/bin/grpc-health-probe /grpc-health-probe
EXPOSE 50051
USER nonroot:nonroot
ENTRYPOINT ["/report-service"]
