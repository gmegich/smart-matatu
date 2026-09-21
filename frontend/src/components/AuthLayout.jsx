export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <div className="auth-hero relative hidden w-[46%] flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur-sm">
              🚌
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Smart Matatu</h1>
              <p className="text-sm text-emerald-200/90">Nakuru SACCO System</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-7 animate-fade-up-delay">
          <div>
            <h2 className="text-3xl font-extrabold leading-[1.15] tracking-tight xl:text-4xl">
              Lipa nauli / Pay fare.<br />
              Fuatilia matatu / Track matatu.<br />
              <span className="text-amber-300">Salama na haraka / Safe & fast.</span>
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-emerald-100/80">
              Digital fare, live GPS tracking, and SACCO tools built for Nakuru matatus.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '💳', label: 'Digital wallet' },
              { icon: '📍', label: 'Live GPS tracking' },
              { icon: '✅', label: 'QR verification' },
              { icon: '📊', label: 'SACCO analytics' },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-3 backdrop-blur-sm transition hover:bg-white/15"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm font-medium text-white/90">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-emerald-200/45">
          © {new Date().getFullYear()} Smart Matatu · Nakuru, Kenya
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center page-bg p-4 sm:p-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-2xl shadow-lg shadow-emerald-600/25">
              🚌
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Smart Matatu</h1>
            <p className="text-sm text-slate-500">Nakuru Fare & Tracking</p>
          </div>

          <div className="card p-7 sm:p-8">
            {(title || subtitle) && (
              <div className="mb-7 text-center lg:text-left">
                {title && (
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
                )}
                {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
