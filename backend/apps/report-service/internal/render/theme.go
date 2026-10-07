package render

type rgb struct{ r, g, b int }

var (
	colorInk     = rgb{23, 33, 43}
	colorMuted   = rgb{100, 116, 139}
	colorFaint   = rgb{148, 163, 184}
	colorGrid    = rgb{226, 232, 240}
	colorPanel   = rgb{248, 250, 252}
	colorBorder  = rgb{217, 225, 233}
	colorBrand   = rgb{15, 76, 92}
	colorAccent  = rgb{20, 184, 166}
	colorDanger  = rgb{220, 38, 38}
	colorOnBrand = rgb{255, 255, 255}

	palette = []rgb{
		{37, 99, 235},
		{20, 184, 166},
		{234, 88, 12},
		{147, 51, 234},
		{219, 39, 119},
		{101, 163, 13},
		{202, 138, 4},
		{8, 145, 178},
	}
)

const (
	pageWidth    = 210.0
	pageHeight   = 297.0
	margin       = 15.0
	contentWidth = pageWidth - 2*margin
	fontFamily   = "Helvetica"
)

type colorMap map[string]rgb

func newColorMap(names []string) colorMap {
	colors := colorMap{}
	for _, name := range names {
		if _, ok := colors[name]; !ok {
			colors[name] = palette[len(colors)%len(palette)]
		}
	}
	return colors
}

func (c colorMap) of(name string) rgb {
	if color, ok := c[name]; ok {
		return color
	}
	return colorMuted
}
