import { type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} card p-6 max-h-[90vh] overflow-y-auto animate-scale-in`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-display">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  color = 'primary',
}: {
  label: string
  value: string | number
  icon: ReactNode
  color?: 'primary' | 'secondary' | 'accent' | 'warning' | 'error' | 'success'
}) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    accent: 'bg-accent-50 text-accent-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
    success: 'bg-success-50 text-success-600',
  }
  return (
    <div className="card p-5 flex items-center gap-4 animate-slide-up">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold font-display">{value}</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

export function Avatar({
  name,
  src,
  size = 40,
}: {
  name: string
  src?: string | null
  size?: number
}) {
  const initials = name
    ? name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold flex-shrink-0"
    >
      {initials}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold font-display mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}

export function Badge({
  children,
  color = 'neutral',
}: {
  children: ReactNode
  color?: 'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error'
}) {
  const colorMap: Record<string, string> = {
    neutral: 'bg-neutral-100 text-neutral-700',
    primary: 'bg-primary-100 text-primary-700',
    secondary: 'bg-secondary-100 text-secondary-700',
    accent: 'bg-accent-100 text-accent-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    error: 'bg-error-100 text-error-700',
  }
  return <span className={`badge ${colorMap[color]}`}>{children}</span>
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="border-[3px] border-[#f3dccf] border-t-[#1c1446] rounded-full animate-spin"
    />
  )
}

export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={40} />
    </div>
  )
}

export function NotificationBell({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative btn-ghost p-2 rounded-xl"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

export function NotificationPanel({
  open,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: {
  open: boolean
  onClose: () => void
  notifications: any[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}) {
  if (!open) return null

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16 animate-fade-in">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-neutral-200 max-h-[80vh] overflow-hidden animate-slide-down">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h3 className="font-semibold font-display">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          {notifications.length ? (
            <div className="divide-y divide-neutral-100">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && onMarkRead(n.id)}
                  className={`p-4 hover:bg-neutral-50 cursor-pointer transition-all ${
                    !n.read ? 'bg-primary-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      !n.read ? 'bg-primary-500' : 'bg-transparent'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-sm text-neutral-600 mt-0.5">{n.message}</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-neutral-500 text-sm">No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
