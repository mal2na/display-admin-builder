/**
 * 디자인 시스템 아이콘 카탈로그 (DS-portal "아이콘" 라이브러리 · 아이콘.png 기준, 97개)
 * 카테고리: 일반 52 · 그래픽 12 · 네비게이션 6 · 혜택 7 · 로고 9 · 레벨 뱃지 7 · 순위 변동 4
 * 실제 에셋(Figma) 대신 시각적으로 동등한 lucide 아이콘으로 매핑(로고는 텍스트 배지).
 * 칩 등 저장값은 "icon:<key>" 형태로 보관하고, IconGlyph로 렌더한다.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Square, Headphones, Bell, ArrowUp, ChevronLeft, Barcode, BadgePercent, MessageCircle, Calendar, Phone,
  Camera, ShoppingCart, LayoutGrid, AlertCircle, CheckCircle, X, BarChart3, Smartphone, Download, ChevronDown,
  CalendarDays, ScanFace, Users, SlidersHorizontal, Globe, Heart, History, Home, Info, Link as LinkIcon,
  MapPin, Lock, MapPinned, Menu, Minus, Film, SquarePen, Play, Plus, Plane, Search, Send, PlusCircle, Settings,
  Share2, Star, Store, BellRing, Crown, AudioLines, AlertTriangle, Banknote, ReceiptText, FileText, PieChart,
  Infinity as InfinityIcon, MessageSquare, Coins, Video, Sparkles, User, ShoppingBag, Bot, Percent, Youtube,
  Shield, Award, Medal, Gem, BadgeCheck, TrendingUp, TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconDef = { key: string; label: string; Comp?: LucideIcon; text?: string };
export type IconCategory = { key: string; label: string; icons: IconDef[] };

const mk = (cat: string, label: string, Comp: LucideIcon): IconDef => ({ key: `${cat}/${label}`, label, Comp });
const badge = (cat: string, label: string, text: string): IconDef => ({ key: `${cat}/${label}`, label, text });

export const ICON_CATEGORIES: IconCategory[] = [
  {
    key: 'general',
    label: '일반',
    icons: [
      mk('general', 'Dummy', Square), mk('general', 'Accessory', Headphones), mk('general', 'Alert', Bell),
      mk('general', 'Arrow', ArrowUp), mk('general', 'Back', ChevronLeft), mk('general', 'Barcode', Barcode),
      mk('general', 'Benefit', BadgePercent), mk('general', 'Bubble', MessageCircle), mk('general', 'Calender', Calendar),
      mk('general', 'Call', Phone), mk('general', 'Camera', Camera), mk('general', 'Cart', ShoppingCart),
      mk('general', 'Category', LayoutGrid), mk('general', 'Caution', AlertCircle), mk('general', 'CheckCircle', CheckCircle),
      mk('general', 'Close', X), mk('general', 'Data', BarChart3), mk('general', 'Device', Smartphone),
      mk('general', 'Download', Download), mk('general', 'Dropdown', ChevronDown), mk('general', 'Event', CalendarDays),
      mk('general', 'FaceID', ScanFace), mk('general', 'Family', Users), mk('general', 'Filter', SlidersHorizontal),
      mk('general', 'Global', Globe), mk('general', 'Heart', Heart), mk('general', 'History', History),
      mk('general', 'Home', Home), mk('general', 'Info', Info), mk('general', 'Link', LinkIcon),
      mk('general', 'Location', MapPin), mk('general', 'Lock', Lock), mk('general', 'MapDotNumber', MapPinned),
      mk('general', 'Menu', Menu), mk('general', 'Minus', Minus), mk('general', 'Movie', Film),
      mk('general', 'NewChat', SquarePen), mk('general', 'Play', Play), mk('general', 'Plus', Plus),
      mk('general', 'Roaming', Plane), mk('general', 'Search', Search), mk('general', 'Send', Send),
      mk('general', 'Service', PlusCircle), mk('general', 'Setting', Settings), mk('general', 'Share', Share2),
      mk('general', 'Star', Star), mk('general', 'Store', Store), mk('general', 'Subscribe', BellRing),
      mk('general', 'Vip', Crown), mk('general', 'Voice', AudioLines), mk('general', 'Warning', AlertTriangle),
      mk('general', 'Won', Banknote),
    ],
  },
  {
    key: 'graphic',
    label: '그래픽',
    icons: [
      mk('graphic', 'Dummy', Square), mk('graphic', 'Bill', ReceiptText), mk('graphic', 'Content', FileText),
      mk('graphic', 'Data', PieChart), mk('graphic', 'DataUnlimited', InfinityIcon), mk('graphic', 'Device', Smartphone),
      mk('graphic', 'Family', Users), mk('graphic', 'Message', MessageSquare), mk('graphic', 'Point', Coins),
      mk('graphic', 'Search', Search), mk('graphic', 'Subscribe', BellRing), mk('graphic', 'Video', Video),
    ],
  },
  {
    key: 'nav',
    label: '네비게이션',
    icons: [
      mk('nav', 'Dummy', Square), mk('nav', 'AI', Sparkles), mk('nav', 'Benefit', BadgePercent),
      mk('nav', 'My', User), mk('nav', 'Shop', ShoppingBag), mk('nav', 'TAgent', Bot),
    ],
  },
  {
    key: 'benefit',
    label: '혜택',
    icons: [
      mk('benefit', 'Dummy', Square), mk('benefit', 'Bill', ReceiptText), mk('benefit', 'Call', Phone),
      mk('benefit', 'Data', BarChart3), mk('benefit', 'Event', CalendarDays), mk('benefit', 'Percent', Percent),
      mk('benefit', 'Point', Coins),
    ],
  },
  {
    key: 'logo',
    label: '로고',
    icons: [
      mk('logo', 'Dummy', Square), badge('logo', '7eleven', '7'), badge('logo', 'Atwosomeplace', 'A'),
      badge('logo', 'CU', 'CU'), badge('logo', 'Flo', 'F'), badge('logo', 'Netflix', 'N'),
      badge('logo', 'Tuniverse', 'Tu'), badge('logo', 'Tworld', 'T'), mk('logo', 'Youtube', Youtube),
    ],
  },
  {
    key: 'levelbadge',
    label: '레벨 뱃지',
    icons: [
      mk('levelbadge', 'Dummy', Square), mk('levelbadge', 'Lv1', Shield), mk('levelbadge', 'Lv2', Award),
      mk('levelbadge', 'Lv3', Medal), mk('levelbadge', 'Lv4', Gem), mk('levelbadge', 'Lv5', Crown),
      mk('levelbadge', 'Lv6', BadgeCheck),
    ],
  },
  {
    key: 'rank',
    label: '순위 변동',
    icons: [
      mk('rank', '상승', TrendingUp), mk('rank', '하락', TrendingDown), mk('rank', '유지', Minus),
      mk('rank', '신규', Sparkles),
    ],
  },
];

export const ICON_TOTAL = ICON_CATEGORIES.reduce((n, c) => n + c.icons.length, 0);
export const ICON_MAP: Record<string, IconDef> = Object.fromEntries(
  ICON_CATEGORIES.flatMap((c) => c.icons.map((i) => [i.key, i])),
);

export const isIconRef = (v?: string | null): v is string => !!v && v.startsWith('icon:');

/** "icon:<key>" 또는 "<key>"를 받아 해당 아이콘을 렌더 */
export function IconGlyph({ name, className }: { name: string; className?: string }) {
  const key = name.startsWith('icon:') ? name.slice(5) : name;
  const def = ICON_MAP[key];
  if (!def) return null;
  if (def.text) {
    return (
      <span className={cn('inline-flex items-center justify-center rounded bg-slate-800 font-bold leading-none text-white', className)} style={{ fontSize: '0.55em' }}>
        {def.text}
      </span>
    );
  }
  const C = def.Comp!;
  return <C className={className} />;
}
