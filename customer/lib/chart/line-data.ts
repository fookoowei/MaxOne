// Turn normalized {points, labels} into a Chart.js line dataset. Pure — the testable core;
// the Chart.js canvas render itself is a manual smoke (jsdom has no canvas).
export function buildLineData(points: number[], labels: string[]) {
  return {
    labels,
    datasets: [
      {
        data: points,
        borderColor: 'oklch(0.48 0.16 285)', // iris — matches the app theme
        backgroundColor: 'oklch(0.48 0.16 285 / 0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };
}
