// Centralized icon system — replaces every decorative emoji in the app with
// a Lucide vector icon. One library, one stroke weight, sizes chosen per
// context (see AppIcon) so the whole app reads as one consistent icon
// system instead of emoji whose weight/size vary by OS and font.
import type { CSSProperties } from 'react'
import {
  AlertTriangle, Archive, ArrowLeftRight, ArrowUpDown, Award, BarChart3, Bell, BellRing, Boxes, Briefcase, Building2, Calendar, Camera,
  Check, CheckCircle2, ChevronDown, CircleDot, Clock, Compass, Copy, CreditCard, FileEdit, FileText, Filter,
  Flag, FolderOpen, Globe, Handshake, HardHat, Hourglass, IdCard, Image, Info, Languages,
  Layers, LayoutGrid, List, Lock, LockOpen, Mail, MapPin, Megaphone, MessageCircle, MoreVertical, Monitor, Music,
  Package, PartyPopper, Pencil, Phone, Plus, Puzzle, Receipt, Repeat, Rocket, Scale, ScanFace,
  Search, Settings, Shield, ShieldCheck, Sparkles, Star, Store, ThumbsUp, Trash2, Trophy,
  Users, User, Video, Wallet, Wifi, Wrench, X, Zap, Menu, Home,
  type LucideIcon,
} from 'lucide-react'

export const ICONS = {
  // Money / escrow / funding
  lock: Lock,
  unlock: LockOpen,
  wallet: Wallet,
  card: CreditCard,
  receipt: Receipt,

  // Evidence / verification
  camera: Camera,
  image: Image,
  scan: ScanFace,
  idCard: IdCard,
  shield: Shield,
  shieldCheck: ShieldCheck,
  compass: Compass,

  // Status
  check: Check,
  checkCircle: CheckCircle2,
  flag: Flag,
  refresh: Repeat,
  alert: AlertTriangle,
  info: Info,
  clock: Clock,
  hourglass: Hourglass,

  // Work / construction / land
  hardHat: HardHat,
  wrench: Wrench,
  home: Home,
  mapPin: MapPin,
  building: Building2,
  scale: Scale,
  briefcase: Briefcase,
  grid: LayoutGrid,
  swap: ArrowLeftRight,

  // People / community
  user: User,
  users: Users,
  handshake: Handshake,
  celebrate: PartyPopper,
  thumbsUp: ThumbsUp,
  award: Award,
  trophy: Trophy,
  sparkles: Sparkles,

  // Communication
  message: MessageCircle,
  bell: Bell,
  bellRing: BellRing,
  megaphone: Megaphone,
  mail: Mail,
  phone: Phone,

  // Docs / org
  folder: FolderOpen,
  clipboard: FileText,
  fileEdit: FileEdit,
  barChart: BarChart3,
  puzzle: Puzzle,
  layers: Layers,

  // Misc UI
  globe: Globe,
  languages: Languages,
  search: Search,
  settings: Settings,
  plus: Plus,
  menu: Menu,
  close: X,
  star: Star,
  dot: CircleDot,
  monitor: Monitor,
  wifi: Wifi,
  zap: Zap,
  calendar: Calendar,
  video: Video,
  rocket: Rocket,
  store: Store,
  music: Music,

  // Inventory management (catalogue, product CRUD)
  boxes: Boxes,
  package: Package,
  edit: Pencil,
  copy: Copy,
  archive: Archive,
  trash: Trash2,
  filter: Filter,
  sortArrows: ArrowUpDown,
  chevronDown: ChevronDown,
  moreVertical: MoreVertical,
  list: List,
} as const

export type IconName = keyof typeof ICONS

/** Renders a named icon from the shared registry at a consistent stroke
 * weight — use this wherever an icon *name* flows through app state/props
 * (activity log entries, notification types, command palette results).
 * For icons used directly in JSX with no data indirection, importing the
 * Lucide component straight from 'lucide-react' is simpler — both paths
 * share the same size/strokeWidth conventions below. */
export function AppIcon({ name, size = 16, strokeWidth = 1.75, className, style }: {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}) {
  const Icon: LucideIcon = ICONS[name]
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} aria-hidden="true" />
}

/** Google's real wordmark "G" — a brand mark, not a decorative emoji, so it
 * stays a literal multi-color SVG rather than folding into the single-color
 * icon registry above (same mark used by the Google sign-in button in
 * AuthControls.tsx; kept here too so anywhere that lists "Google" as a
 * linked sign-in method — e.g. Settings — stays visually identical). */
export function GoogleGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  )
}
