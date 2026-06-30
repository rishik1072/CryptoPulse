export const TRACKED_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'] as const

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: 'LayoutDashboard' },
  { to: '/markets', label: 'Markets', icon: 'TrendingUp' },
  { to: '/portfolio', label: 'Portfolio', icon: 'Wallet' },
  { to: '/watchlist', label: 'Watchlist', icon: 'Star' },
  { to: '/settings', label: 'Settings', icon: 'Settings' },
] as const

export const API_CONFIG = {
  COINGECKO_BASE: 'https://api.coingecko.com/api/v3',
  BINANCE_WS: 'wss://stream.binance.com:443/ws',
} as const