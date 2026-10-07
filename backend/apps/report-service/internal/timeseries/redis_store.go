package timeseries

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"sort"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisStore struct {
	client *redis.Client
}

func NewRedisStore(client *redis.Client) *RedisStore {
	return &RedisStore{client: client}
}

func (s *RedisStore) MRange(ctx context.Context, query RangeQuery) ([]Series, error) {
	args := []interface{}{
		"TS.MRANGE", query.From.UnixMilli(), query.To.UnixMilli(),
		"WITHLABELS",
		"ALIGN", "-",
		"AGGREGATION", string(query.Aggregation), query.Bucket.Milliseconds(),
		"FILTER",
	}
	for _, label := range sortedKeys(query.Filters) {
		args = append(args, label+"="+query.Filters[label])
	}

	reply, err := s.client.Do(ctx, args...).Result()
	if err != nil {
		return nil, fmt.Errorf("TS.MRANGE: %w", err)
	}

	return ParseMRange(reply)
}

// IsUnavailable reports whether err means Redis could not be reached, as opposed to a bad reply.
func IsUnavailable(err error) bool {
	var netErr net.Error
	return errors.As(err, &netErr) ||
		errors.Is(err, io.EOF) ||
		errors.Is(err, io.ErrUnexpectedEOF) ||
		errors.Is(err, redis.ErrClosed) ||
		errors.Is(err, redis.ErrPoolTimeout)
}

func ParseMRange(reply interface{}) ([]Series, error) {
	rows, ok := reply.([]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected TS.MRANGE reply %T", reply)
	}

	series := make([]Series, 0, len(rows))
	for _, row := range rows {
		fields, ok := row.([]interface{})
		if !ok || len(fields) < 3 {
			return nil, fmt.Errorf("unexpected TS.MRANGE row %T", row)
		}
		key, _ := fields[0].(string)
		series = append(series, Series{
			Key:    key,
			Labels: parseLabels(fields[1]),
			Points: parsePoints(fields[2]),
		})
	}

	sort.Slice(series, func(i, j int) bool { return series[i].Key < series[j].Key })
	return series, nil
}

func parseLabels(raw interface{}) map[string]string {
	labels := map[string]string{}
	pairs, _ := raw.([]interface{})
	for _, pair := range pairs {
		values, ok := pair.([]interface{})
		if !ok || len(values) != 2 {
			continue
		}
		name, nameOK := values[0].(string)
		value, valueOK := values[1].(string)
		if nameOK && valueOK {
			labels[name] = value
		}
	}
	return labels
}

func parsePoints(raw interface{}) []Point {
	samples, _ := raw.([]interface{})
	points := make([]Point, 0, len(samples))
	for _, sample := range samples {
		values, ok := sample.([]interface{})
		if !ok || len(values) != 2 {
			continue
		}
		timestamp, timestampOK := values[0].(int64)
		value, valueOK := toFloat(values[1])
		if timestampOK && valueOK {
			points = append(points, Point{Time: time.UnixMilli(timestamp).UTC(), Value: value})
		}
	}
	return points
}

func toFloat(raw interface{}) (float64, bool) {
	switch value := raw.(type) {
	case string:
		parsed, err := strconv.ParseFloat(value, 64)
		return parsed, err == nil
	case float64:
		return value, true
	case int64:
		return float64(value), true
	default:
		return 0, false
	}
}

func sortedKeys(values map[string]string) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
