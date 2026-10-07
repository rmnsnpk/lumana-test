package render

import (
	"time"

	"github.com/go-pdf/fpdf"

	"github.com/lumana/report-service/internal/report"
)

type box struct{ x, y, w, h float64 }

const (
	yTicks       = 5
	xTicks       = 6
	axisGutter   = 14.0
	legendHeight = 8.0
)

func setColor(pdf *fpdf.Fpdf, color rgb) {
	pdf.SetDrawColor(color.r, color.g, color.b)
	pdf.SetFillColor(color.r, color.g, color.b)
	pdf.SetTextColor(color.r, color.g, color.b)
}

func panel(pdf *fpdf.Fpdf, area box, title, subtitle string) box {
	pdf.SetFillColor(colorPanel.r, colorPanel.g, colorPanel.b)
	pdf.SetDrawColor(colorBorder.r, colorBorder.g, colorBorder.b)
	pdf.SetLineWidth(0.2)
	pdf.RoundedRect(area.x, area.y, area.w, area.h, 2, "1234", "DF")

	pdf.SetTextColor(colorInk.r, colorInk.g, colorInk.b)
	pdf.SetFont(fontFamily, "B", 11)
	pdf.Text(area.x+5, area.y+8, title)
	pdf.SetTextColor(colorMuted.r, colorMuted.g, colorMuted.b)
	pdf.SetFont(fontFamily, "", 7.5)
	pdf.Text(area.x+5, area.y+12.5, subtitle)

	return box{x: area.x + 5, y: area.y + 17, w: area.w - 10, h: area.h - 22}
}

func emptyNotice(pdf *fpdf.Fpdf, area box, message string) {
	pdf.SetTextColor(colorFaint.r, colorFaint.g, colorFaint.b)
	pdf.SetFont(fontFamily, "I", 9)
	width := pdf.GetStringWidth(message)
	pdf.Text(area.x+(area.w-width)/2, area.y+area.h/2, message)
}

func lineChart(pdf *fpdf.Fpdf, area box, window report.Window, lines []report.Line, yLabel string, colors colorMap) {
	if len(lines) == 0 {
		emptyNotice(pdf, area, "No samples in this period")
		return
	}

	plot := box{x: area.x + axisGutter, y: area.y, w: area.w - axisGutter, h: area.h - legendHeight - 8}
	maximum := 0.0
	for _, line := range lines {
		for _, point := range line.Points {
			if point.Value > maximum {
				maximum = point.Value
			}
		}
	}
	top := niceCeiling(maximum)

	drawYAxis(pdf, plot, top, yLabel)
	drawXAxis(pdf, plot, window)

	span := window.Span().Seconds()
	xFor := func(bucketStart time.Time) float64 {
		at := bucketStart.Add(window.Bucket / 2)
		if at.After(window.To) {
			at = window.To
		}
		return plot.x + plot.w*at.Sub(window.From).Seconds()/span
	}
	yFor := func(value float64) float64 {
		return plot.y + plot.h - plot.h*value/top
	}

	pdf.SetLineWidth(0.5)
	for _, line := range lines {
		setColor(pdf, colors.of(line.Name))
		for pointIndex, point := range line.Points {
			x, y := xFor(point.Time), yFor(point.Value)
			if pointIndex > 0 {
				previous := line.Points[pointIndex-1]
				pdf.Line(xFor(previous.Time), yFor(previous.Value), x, y)
			}
			if point.Value > 0 {
				pdf.Circle(x, y, 0.5, "F")
			}
		}
	}

	legend(pdf, box{x: plot.x, y: plot.y + plot.h + 9, w: plot.w, h: legendHeight}, lines, colors)
}

func drawYAxis(pdf *fpdf.Fpdf, plot box, top float64, label string) {
	pdf.SetFont(fontFamily, "", 6.5)
	pdf.SetLineWidth(0.15)
	for tick := 0; tick <= yTicks; tick++ {
		value := top * float64(tick) / yTicks
		y := plot.y + plot.h - plot.h*float64(tick)/yTicks
		pdf.SetDrawColor(colorGrid.r, colorGrid.g, colorGrid.b)
		pdf.Line(plot.x, y, plot.x+plot.w, y)
		text := formatCount(value)
		pdf.SetTextColor(colorMuted.r, colorMuted.g, colorMuted.b)
		pdf.Text(plot.x-2-pdf.GetStringWidth(text), y+1, text)
	}

	pdf.TransformBegin()
	pdf.TransformRotate(90, plot.x-axisGutter+2, plot.y+plot.h/2)
	width := pdf.GetStringWidth(label)
	pdf.Text(plot.x-axisGutter+2-width/2, plot.y+plot.h/2, label)
	pdf.TransformEnd()
}

func drawXAxis(pdf *fpdf.Fpdf, plot box, window report.Window) {
	pdf.SetDrawColor(colorFaint.r, colorFaint.g, colorFaint.b)
	pdf.SetLineWidth(0.25)
	pdf.Line(plot.x, plot.y+plot.h, plot.x+plot.w, plot.y+plot.h)

	pdf.SetFont(fontFamily, "", 6.5)
	pdf.SetTextColor(colorMuted.r, colorMuted.g, colorMuted.b)
	for tick := 0; tick <= xTicks; tick++ {
		at := window.From.Add(time.Duration(float64(window.Span()) * float64(tick) / xTicks))
		x := plot.x + plot.w*float64(tick)/xTicks
		pdf.Line(x, plot.y+plot.h, x, plot.y+plot.h+1)
		text := formatTick(at, window.Span())
		width := pdf.GetStringWidth(text)
		left := x - width/2
		if tick == 0 {
			left = x
		} else if tick == xTicks {
			left = x - width
		}
		pdf.Text(left, plot.y+plot.h+4.5, text)
	}
}

func legend(pdf *fpdf.Fpdf, area box, lines []report.Line, colors colorMap) {
	pdf.SetFont(fontFamily, "", 7)
	x := area.x
	y := area.y
	for _, line := range lines {
		label := truncate(line.Name, 28)
		width := 6 + pdf.GetStringWidth(label) + 6
		if x+width > area.x+area.w {
			x = area.x
			y += 4.5
		}
		setColor(pdf, colors.of(line.Name))
		pdf.Rect(x, y-2.2, 3, 2.4, "F")
		pdf.SetTextColor(colorInk.r, colorInk.g, colorInk.b)
		pdf.Text(x+4.5, y, label)
		x += width
	}
}

type bar struct {
	label     string
	value     float64
	secondary float64
	text      string
}

func horizontalBars(pdf *fpdf.Fpdf, area box, bars []bar, color rgb) {
	if len(bars) == 0 {
		emptyNotice(pdf, area, "No samples in this period")
		return
	}

	maximum := 0.0
	for _, item := range bars {
		if item.value > maximum {
			maximum = item.value
		}
		if item.secondary > maximum {
			maximum = item.secondary
		}
	}
	top := niceCeiling(maximum)
	labelWidth := 38.0
	valueWidth := 34.0
	trackX := area.x + labelWidth
	trackWidth := area.w - labelWidth - valueWidth
	rowHeight := minFloat(area.h/float64(len(bars)), 10)

	for index, item := range bars {
		y := area.y + float64(index)*rowHeight
		pdf.SetFont(fontFamily, "", 7.5)
		pdf.SetTextColor(colorInk.r, colorInk.g, colorInk.b)
		pdf.Text(area.x, y+rowHeight/2+1, truncate(item.label, 24))

		pdf.SetFillColor(colorGrid.r, colorGrid.g, colorGrid.b)
		pdf.RoundedRect(trackX, y+rowHeight/2-2, trackWidth, 4, 1, "1234", "F")
		if item.secondary > 0 {
			pdf.SetFillColor(lighten(color).r, lighten(color).g, lighten(color).b)
			pdf.RoundedRect(trackX, y+rowHeight/2-2, maxFloat(1, trackWidth*item.secondary/top), 4, 1, "1234", "F")
		}
		pdf.SetFillColor(color.r, color.g, color.b)
		pdf.RoundedRect(trackX, y+rowHeight/2-2, maxFloat(1, trackWidth*item.value/top), 4, 1, "1234", "F")

		pdf.SetFont(fontFamily, "B", 7.5)
		pdf.SetTextColor(colorInk.r, colorInk.g, colorInk.b)
		pdf.Text(trackX+trackWidth+3, y+rowHeight/2+1, item.text)
	}
}

func lighten(color rgb) rgb {
	return rgb{r: (color.r + 2*255) / 3, g: (color.g + 2*255) / 3, b: (color.b + 2*255) / 3}
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
