export function PageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <svg
        className="h-8 w-8 animate-spin text-rail"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
        />
      </svg>
    </div>
  );
}

interface PageErrorProps {
  message: string;
  onRetry?: () => void;
}

export function PageError({ message, onRetry }: PageErrorProps) {
  return (
    <div className="flex h-64 items-center justify-center px-6">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg className="h-6 w-6 text-rail" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="font-display text-lg font-semibold text-navy-900 mb-1">
          Failed to load data
        </p>
        <p className="text-sm text-navy-500 mb-5">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-primary">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
