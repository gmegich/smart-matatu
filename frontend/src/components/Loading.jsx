export default function Loading({ message = 'Inapakia...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  )
}
