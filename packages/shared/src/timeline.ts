export function createTimeline(
  projects: ReadonlyArray<{ start: string; end: string }>,
  quarters = false,
) {
  if (!projects.length) return null;
  const starts = projects
    .map((project) => Date.parse(project.start))
    .filter(Number.isFinite);
  const ends = projects
    .map((project) => Date.parse(project.end))
    .filter(Number.isFinite);
  if (!starts.length || !ends.length) return null;
  const first = new Date(Math.min(...starts));
  const last = new Date(Math.max(...ends));
  const start = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  const end = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1);
  const months =
    (last.getUTCFullYear() - first.getUTCFullYear()) * 12 +
    last.getUTCMonth() -
    first.getUTCMonth() +
    1;
  const step = Math.max(quarters ? 3 : 1, Math.ceil(months / 24));
  const ticks = [];
  for (let offset = 0; offset < months; offset += step) {
    const timestamp = Date.UTC(
      first.getUTCFullYear(),
      first.getUTCMonth() + offset,
      1,
    );
    ticks.push({
      date: new Date(timestamp).toISOString(),
      left: ((timestamp - start) / (end - start)) * 100,
    });
  }
  return {
    start,
    end,
    ticks,
    position: (date: string) =>
      ((Date.parse(date) - start) / (end - start)) * 100,
  };
}
