package report

import "time"

const targetBuckets = 48

var bucketSteps = []time.Duration{
	time.Minute,
	5 * time.Minute,
	15 * time.Minute,
	30 * time.Minute,
	time.Hour,
	3 * time.Hour,
	6 * time.Hour,
	12 * time.Hour,
	24 * time.Hour,
}

type Window struct {
	From   time.Time
	To     time.Time
	Bucket time.Duration
}

func NewWindow(from, to time.Time) Window {
	return Window{From: from.UTC(), To: to.UTC(), Bucket: bucketFor(to.Sub(from))}
}

func (w Window) Span() time.Duration {
	return w.To.Sub(w.From)
}

func bucketFor(span time.Duration) time.Duration {
	for _, step := range bucketSteps {
		if span/step <= targetBuckets {
			return step
		}
	}
	return bucketSteps[len(bucketSteps)-1]
}
