import type { SVGProps } from 'react'

export type IconName =
  | 'agent'
  | 'alert'
  | 'arrow'
  | 'audit'
  | 'check'
  | 'chevron'
  | 'copy'
  | 'download'
  | 'fork'
  | 'futures'
  | 'info'
  | 'map'
  | 'matrix'
  | 'plus'
  | 'protocol'
  | 'reset'
  | 'shield'
  | 'spark'
  | 'target'
  | 'undo'
  | 'upload'
  | 'x'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 18, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  const paths: Record<IconName, React.ReactNode> = {
    agent: (
      <>
        <rect x="5" y="7" width="14" height="12" rx="3" />
        <path d="M12 3v4M8.5 12h.01M15.5 12h.01M9 16h6" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    audit: (
      <>
        <path d="M9 4h6M9 8h6M7 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9" />
        <path d="m16 19 2 2 4-5M9 13h4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
      </>
    ),
    fork: (
      <>
        <circle cx="6" cy="5" r="2" />
        <circle cx="18" cy="5" r="2" />
        <circle cx="12" cy="19" r="2" />
        <path d="M6 7v2c0 3 2 4 6 4s6-1 6-4V7M12 13v4" />
      </>
    ),
    futures: (
      <>
        <path d="M3 18c4-9 6-9 9 0 3-12 5-12 9 0" />
        <path d="M3 6h18" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    matrix: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    protocol: (
      <>
        <path d="M8 4h8M8 20h8M4 8v8M20 8v8" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),
    reset: (
      <>
        <path d="M4 7h6V1" />
        <path d="M4.5 7A9 9 0 1 1 3 14" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 4 6v5c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4L12 2Z" />
        <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M15 9 21 3M17 3h4v4" />
      </>
    ),
    undo: (
      <>
        <path d="M9 7 4 12l5 5" />
        <path d="M20 17a7 7 0 0 0-7-7H4" />
      </>
    ),
    upload: (
      <>
        <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
  }

  return (
    <svg {...common} {...props}>
      {paths[name]}
    </svg>
  )
}
