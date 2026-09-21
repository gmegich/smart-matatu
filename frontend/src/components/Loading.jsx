export default function Loading({ message = 'Inapakia / Loading...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center page-bg">
      <div className="text-center">
        <div className="relative mx-auto h-14 w-14">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-600" />
          <div className="absolute inset-0 flex items-center justify-center text-lg">🚌</div>
        </div>
        <p className="mt-5 animate-soft-pulse text-sm font-medium text-slate-500">{message}</p>
      </div>
    </div>
  )
}
