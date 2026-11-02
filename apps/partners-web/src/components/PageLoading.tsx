/** Shown while a screen's code downloads (first visit only; later visits are instant). */
export function PageLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-dz-red" />
    </div>
  );
}
