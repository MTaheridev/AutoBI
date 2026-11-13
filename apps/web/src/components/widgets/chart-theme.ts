'use client';

export function readChartTokens() {
  if (typeof window === 'undefined') {
    return {
      ink: '#12161f',
      muted: '#5c6678',
      line: '#d0d7e2',
      signal: '#0f6e56',
      surface: '#ffffff',
    };
  }
  const styles = getComputedStyle(document.documentElement);
  return {
    ink: styles.getPropertyValue('--ink').trim() || '#12161f',
    muted: styles.getPropertyValue('--ink-muted').trim() || '#5c6678',
    line: styles.getPropertyValue('--line').trim() || '#d0d7e2',
    signal: styles.getPropertyValue('--signal').trim() || '#0f6e56',
    surface: styles.getPropertyValue('--surface-elevated').trim() || '#ffffff',
  };
}

export function chartBaseOption() {
  const t = readChartTokens();
  return {
    color: [t.signal, '#4aa487', '#5c6678', '#2b8a6c', '#93a1b5'],
    backgroundColor: 'transparent',
    textStyle: { color: t.ink, fontFamily: 'var(--font-source-sans), sans-serif' },
    axisPointer: { lineStyle: { color: t.line } },
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.line,
      textStyle: { color: t.ink },
    },
  };
}

export function cartesianAxes(categories: string[]) {
  const t = readChartTokens();
  return {
    xAxis: {
      type: 'category' as const,
      data: categories,
      axisLine: { lineStyle: { color: t.line } },
      axisLabel: { color: t.muted },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const } },
      axisLabel: { color: t.muted },
      axisLine: { show: false },
    },
  };
}
