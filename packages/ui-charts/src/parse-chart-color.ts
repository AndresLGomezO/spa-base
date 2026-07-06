export interface ParsedChartColor {
  readonly rgb: string;
  readonly opacity: number;
}

const RGBA_PATTERN =
  /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i;

export function parseChartColor(color: string): ParsedChartColor | null {
  const trimmed = color.trim();
  const match = RGBA_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);

  if (
    !Number.isFinite(red) ||
    !Number.isFinite(green) ||
    !Number.isFinite(blue) ||
    !Number.isFinite(alpha)
  ) {
    return null;
  }

  return {
    rgb: `rgb(${red}, ${green}, ${blue})`,
    opacity: Math.max(0, Math.min(1, alpha)),
  };
}

export function resolveAreaFillGradientColor(
  areaFillColor: string,
  strokeColor: string,
): ParsedChartColor {
  const parsedFill = parseChartColor(areaFillColor);
  if (parsedFill) {
    return parsedFill;
  }

  const parsedStroke = parseChartColor(strokeColor);
  if (parsedStroke) {
    return parsedStroke;
  }

  return {
    rgb: areaFillColor.trim().length > 0 ? areaFillColor : strokeColor,
    opacity: 1,
  };
}

export function resolveAreaFillGradientOpacity(
  parsedColor: ParsedChartColor,
  areaFillOpacity: number,
): number {
  return parsedColor.opacity * areaFillOpacity;
}
