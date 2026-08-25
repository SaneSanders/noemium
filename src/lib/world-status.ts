export type WorldStatusPage = {
  id: string;
  name: string;
  url: string;
  indicator: string;
  description: string;
  incidents: string[];
  components: string[];
  error: string | null;
};

export type WorldStatus = {
  generated_at: string;
  counts: { pages: number; down: number; errors: number };
  pages: WorldStatusPage[];
};

export function isDown(page: WorldStatusPage) {
  return Boolean(page.indicator) && page.indicator !== 'none' && page.indicator !== 'unknown' && !page.error;
}

export function worldStatusBoard(data: WorldStatus) {
  const down = data.pages.filter(isDown);
  const failed = data.pages.filter((page) => page.error);
  const up = data.pages.filter((page) => !isDown(page) && !page.error);
  return { generated_at: data.generated_at, counts: data.counts, down, up, failed };
}

export function formatCheckedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
