/** Deep link into the Noemium desktop app (B4). The app handles noemium://new. */

export function openInNoemiumHref(name: string, goal = ''): string {
  const q = new URLSearchParams();
  q.set('name', name.trim().slice(0, 80) || 'Untitled');
  const g = goal.trim().slice(0, 280);
  if (g) q.set('goal', g);
  return `noemium://new?${q.toString()}`;
}
