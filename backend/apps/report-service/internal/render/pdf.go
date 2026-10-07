package render

import (
	"bytes"
	"fmt"
	"time"

	"github.com/go-pdf/fpdf"

	"github.com/lumana/report-service/internal/report"
)

const (
	headerHeight = 34.0
	cardHeight   = 22.0
	timeLayout   = "2006-01-02 15:04"
)

func PDF(data report.Report) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetTitle(fmt.Sprintf("Activity report - %s", data.Service), false)
	pdf.SetAuthor("Lumana report-service", false)
	pdf.SetCreator("Lumana report-service", false)
	pdf.SetAutoPageBreak(false, margin)
	pdf.AliasNbPages("{nb}")
	pdf.SetFooterFunc(func() { footer(pdf, data) })

	pdf.AddPage()
	header(pdf, data)
	kpis(pdf, data, headerHeight+8)

	bucket := formatBucket(data.Window.Bucket)
	colors := newColorMap(actionNames(data))
	requests := panel(pdf, box{margin, 72, contentWidth, 104},
		"Requests over time",
		fmt.Sprintf("API calls per %s bucket, one line per action", bucket))
	lineChart(pdf, requests, data.Window, data.RequestLines, "requests", colors)

	errors := panel(pdf, box{margin, 182, contentWidth, 96},
		"Errors over time",
		fmt.Sprintf("Responses with status >= 400 per %s bucket", bucket))
	lineChart(pdf, errors, data.Window, data.ErrorLines, "errors", colors)

	pdf.AddPage()
	pageTitle(pdf, "Breakdown by action and event")

	latency := panel(pdf, box{margin, 30, contentWidth, latencyPanelHeight(data)},
		"Latency by action",
		"Average response time (dark) and slowest request (light) in the period")
	horizontalBars(pdf, latency, latencyBars(data), colorBrand)

	eventsTop := 30 + latencyPanelHeight(data) + 6
	events := panel(pdf, box{margin, eventsTop, contentWidth, eventsPanelHeight(data)},
		"Business events",
		"Fetches and imports recorded by the service; rows are shown next to the count")
	horizontalBars(pdf, events, eventBars(data), colorAccent)

	actionTable(pdf, data, eventsTop+eventsPanelHeight(data)+8)

	var output bytes.Buffer
	if err := pdf.Output(&output); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func header(pdf *fpdf.Fpdf, data report.Report) {
	pdf.SetFillColor(colorBrand.r, colorBrand.g, colorBrand.b)
	pdf.Rect(0, 0, pageWidth, headerHeight, "F")

	pdf.SetTextColor(colorAccent.r, colorAccent.g, colorAccent.b)
	pdf.SetFont(fontFamily, "B", 8)
	pdf.Text(margin, 11, "LUMANA / OPERATIONS")

	pdf.SetTextColor(colorOnBrand.r, colorOnBrand.g, colorOnBrand.b)
	pdf.SetFont(fontFamily, "B", 20)
	pdf.Text(margin, 21, "Activity report: "+data.Service)

	pdf.SetFont(fontFamily, "", 8.5)
	period := fmt.Sprintf("%s  to  %s UTC   |   bucket %s",
		data.Window.From.Format(timeLayout), data.Window.To.Format(timeLayout), formatBucket(data.Window.Bucket))
	pdf.Text(margin, 28.5, period)
}

func pageTitle(pdf *fpdf.Fpdf, title string) {
	pdf.SetTextColor(colorInk.r, colorInk.g, colorInk.b)
	pdf.SetFont(fontFamily, "B", 14)
	pdf.Text(margin, 20, title)
	pdf.SetDrawColor(colorBorder.r, colorBorder.g, colorBorder.b)
	pdf.SetLineWidth(0.3)
	pdf.Line(margin, 24, pageWidth-margin, 24)
}

func kpis(pdf *fpdf.Fpdf, data report.Report, y float64) {
	cards := []struct {
		label, value, hint string
		alert              bool
	}{
		{"REQUESTS", formatCount(data.TotalRequests), fmt.Sprintf("%d actions", len(data.Actions)), false},
		{"ERROR RATE", formatPercent(data.ErrorRate()), formatCount(data.TotalErrors) + " failed", data.ErrorRate() > 0.05},
		{"AVG LATENCY", formatMs(data.AvgLatencyMs), "weighted by requests", false},
		{"ROWS IMPORTED", formatCount(data.RowsImported), formatCount(data.RowsFetched) + " rows fetched", false},
	}
	gap := 4.0
	width := (contentWidth - gap*float64(len(cards)-1)) / float64(len(cards))

	for index, card := range cards {
		x := margin + float64(index)*(width+gap)
		pdf.SetFillColor(255, 255, 255)
		pdf.SetDrawColor(colorBorder.r, colorBorder.g, colorBorder.b)
		pdf.SetLineWidth(0.2)
		pdf.RoundedRect(x, y, width, cardHeight, 2, "1234", "DF")

		pdf.SetTextColor(colorMuted.r, colorMuted.g, colorMuted.b)
		pdf.SetFont(fontFamily, "B", 6.5)
		pdf.Text(x+4, y+6, card.label)

		value := colorInk
		if card.alert {
			value = colorDanger
		}
		pdf.SetTextColor(value.r, value.g, value.b)
		pdf.SetFont(fontFamily, "B", 15)
		pdf.Text(x+4, y+14, card.value)

		pdf.SetTextColor(colorFaint.r, colorFaint.g, colorFaint.b)
		pdf.SetFont(fontFamily, "", 6.5)
		pdf.Text(x+4, y+19, card.hint)
	}
}

func latencyBars(data report.Report) []bar {
	bars := make([]bar, 0, len(data.Actions))
	for _, action := range data.Actions {
		bars = append(bars, bar{
			label:     action.Action,
			value:     action.AvgLatencyMs,
			secondary: action.MaxLatencyMs,
			text:      fmt.Sprintf("%s / max %s", formatMs(action.AvgLatencyMs), formatMs(action.MaxLatencyMs)),
		})
	}
	return bars
}

func eventBars(data report.Report) []bar {
	bars := make([]bar, 0, len(data.Events))
	for _, event := range data.Events {
		text := formatCount(event.Count)
		if event.Rows > 0 {
			text += " / " + formatCount(event.Rows) + " rows"
		}
		bars = append(bars, bar{label: event.Type, value: event.Count, text: text})
	}
	return bars
}

func latencyPanelHeight(data report.Report) float64 {
	return 30 + 10*float64(maxInt(len(data.Actions), 1))
}

func eventsPanelHeight(data report.Report) float64 {
	return 30 + 10*float64(maxInt(len(data.Events), 1))
}

func actionTable(pdf *fpdf.Fpdf, data report.Report, y float64) {
	pdf.SetTextColor(colorInk.r, colorInk.g, colorInk.b)
	pdf.SetFont(fontFamily, "B", 11)
	pdf.Text(margin, y, "Summary by action")

	columns := []struct {
		title string
		width float64
		align string
	}{
		{"Action", 52, "L"},
		{"Requests", 25, "R"},
		{"Errors", 22, "R"},
		{"Error rate", 25, "R"},
		{"Avg latency", 28, "R"},
		{"Max latency", 28, "R"},
	}

	pdf.SetXY(margin, y+4)
	pdf.SetFillColor(colorBrand.r, colorBrand.g, colorBrand.b)
	pdf.SetTextColor(colorOnBrand.r, colorOnBrand.g, colorOnBrand.b)
	pdf.SetFont(fontFamily, "B", 7.5)
	for _, column := range columns {
		pdf.CellFormat(column.width, 7, column.title, "", 0, column.align, true, 0, "")
	}
	pdf.Ln(-1)

	if len(data.Actions) == 0 {
		pdf.SetX(margin)
		pdf.SetTextColor(colorFaint.r, colorFaint.g, colorFaint.b)
		pdf.SetFont(fontFamily, "I", 8)
		pdf.CellFormat(contentWidth, 7, "No API requests in this period", "", 1, "C", false, 0, "")
		return
	}

	pdf.SetFont(fontFamily, "", 7.5)
	for index, action := range data.Actions {
		if pdf.GetY() > pageHeight-margin-12 {
			break
		}
		fill := index%2 == 1
		pdf.SetFillColor(colorPanel.r, colorPanel.g, colorPanel.b)
		pdf.SetTextColor(colorInk.r, colorInk.g, colorInk.b)
		pdf.SetX(margin)
		values := []string{
			truncate(action.Action, 32),
			formatCount(action.Requests),
			formatCount(action.Errors),
			formatPercent(action.ErrorRate()),
			formatMs(action.AvgLatencyMs),
			formatMs(action.MaxLatencyMs),
		}
		for columnIndex, column := range columns {
			pdf.CellFormat(column.width, 6.5, values[columnIndex], "B", 0, column.align, fill, 0, "")
		}
		pdf.Ln(-1)
	}
}

func footer(pdf *fpdf.Fpdf, data report.Report) {
	pdf.SetY(-10)
	pdf.SetTextColor(colorFaint.r, colorFaint.g, colorFaint.b)
	pdf.SetFont(fontFamily, "", 7)
	pdf.CellFormat(contentWidth/2, 5,
		"Generated "+data.GeneratedAt.Format(time.RFC3339)+" from RedisTimeSeries", "", 0, "L", false, 0, "")
	pdf.CellFormat(contentWidth/2, 5,
		fmt.Sprintf("Page %d of {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
}

func actionNames(data report.Report) []string {
	names := make([]string, 0, len(data.Actions)+len(data.RequestLines))
	for _, action := range data.Actions {
		names = append(names, action.Action)
	}
	for _, line := range append(data.RequestLines, data.ErrorLines...) {
		names = append(names, line.Name)
	}
	return names
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
