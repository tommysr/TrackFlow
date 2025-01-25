export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString();
} 