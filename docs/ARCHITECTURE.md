# StockTrack — Architecture Deep Dive

> 🇲🇽 [Español](#-español) · 🇺🇸 [English](#-english)

---

## 🇲🇽 Español

### Estructura del proyecto

```
stocktrack/
├── app/
│   ├── (auth)/signin/       # Página de login con Google
│   ├── (dashboard)/
│   │   ├── layout.tsx       # Layout compartido: header, nav, auth guard
│   │   ├── dashboard/       # Vista principal de portafolio
│   │   └── backtest/        # Simulador retrospectivo
│   ├── actions/
│   │   ├── holdings.ts      # CRUD de posiciones (Server Actions)
│   │   └── historical.ts    # Datos históricos + backtest (Server Actions)
│   ├── api/auth/[...nextauth]/  # Handler de NextAuth
│   ├── globals.css          # Tailwind + animaciones customizadas
│   └── layout.tsx           # Root layout (fuentes, Toaster)
├── components/
│   ├── ui/                  # Primitivos shadcn (Button, Card, Dialog…)
│   ├── add-holding-dialog   # Modal para agregar posición
│   ├── holding-row          # Fila de tabla con confirm + toast
│   ├── symbol-chart-dialog  # Modal con gráfica histórica
│   ├── backtest-form        # Formulario + resultado del backtest
│   └── nav-links            # Navegación activa con usePathname
├── hooks/
│   └── use-confirm.tsx      # Hook de confirmación reutilizable (Promise-based)
├── lib/
│   ├── auth.ts              # Configuración NextAuth + MongoDB adapter
│   ├── marketData.ts        # Cliente Twelve Data API con cache
│   ├── mongodb.ts           # Cliente MongoDB nativo (para NextAuth)
│   ├── mongoose.ts          # Conexión Mongoose singleton
│   ├── portfolio.ts         # Agregación de holdings + precios
│   └── utils.ts             # cn() helper
├── models/
│   ├── Holding.ts           # Posición bursátil del usuario
│   ├── PriceCache.ts        # Cache de precios actuales (TTL 5 min)
│   ├── HistoricalCache.ts   # Cache de datos históricos (1×/día)
│   └── User.ts              # Modelo de usuario (NextAuth)
└── types/
    ├── index.ts             # HoldingDoc, HoldingWithPrice, BacktestResult…
    └── next-auth.d.ts       # Extensión de tipos de sesión
```

### Modelos de datos

#### Holding
Representa una posición bursátil que un usuario tiene en su portafolio.

```typescript
{
  user: ObjectId,        // Referencia al User (con índice — queries rápidas por usuario)
  symbol: string,        // Símbolo en mayúsculas ("AAPL")
  shares: number,        // Número de acciones (mín 0.0001, soporta fracciones)
  costBasis: number,     // Precio promedio de compra por acción
  purchaseDate: Date,    // Fecha de primera compra
  notes?: string,        // Notas opcionales (máx 500 chars)
  createdAt, updatedAt   // Timestamps automáticos de Mongoose
}
// Índice compuesto: { user: 1, symbol: 1 }
```

#### PriceCache
Cache de precios actuales de mercado. El índice TTL de MongoDB borra automáticamente los documentos cuando `expiresAt` llega.

```typescript
{
  symbol: string,           // Símbolo en mayúsculas
  price: number,            // Precio actual de cierre
  change: number,           // Cambio absoluto del día
  changePercent: number,    // Cambio porcentual del día
  previousClose: number,    // Cierre del día anterior
  lastUpdated: Date,
  expiresAt: Date           // TTL: lastUpdated + 5 min
}
// TTL index: { expiresAt: 1 }, { expireAfterSeconds: 0 }
```

#### HistoricalCache
Cache permanente de precios históricos. Se refresca una vez por día calendario.

```typescript
{
  symbol: string,
  data: Array<{ date: Date; close: number }>,  // Ascending, _id:false
  lastFetched: Date                             // Para detectar si ya se actualizó hoy
}
```

### Flujo de autenticación

```
1. Usuario → /signin → botón "Sign in with Google"
2. NextAuth redirige a Google OAuth consent screen
3. Google retorna código de autorización
4. NextAuth intercambia código por tokens
5. MongoDB Adapter crea/actualiza User y Account en Atlas
6. NextAuth crea Session en MongoDB (strategy: "database")
7. Cookie de sesión firmada → enviada al browser
8. En cada Server Component: getServerSession() → session.user.id
9. Si session es null → redirect("/signin")
```

### Server Actions vs API Routes

StockTrack usa Server Actions (`"use server"`) en lugar de API Routes para todas las mutaciones:

| Aspecto | Server Actions | API Routes |
|---------|---------------|------------|
| Boilerplate | Mínimo | fetch + JSON + status codes |
| Type safety | End-to-end (mismo tipo en cliente y servidor) | Manual con tipos genéricos |
| Auth check | Directo: `getServerSession()` en la función | Requiere middleware o guard en cada handler |
| Revalidación | `revalidatePath()` built-in | Requiere invalidar manualmente |
| Error handling | Try/catch + objeto `{ success, error }` | Try/catch + Response.json() |

### Estrategia de cache

#### Nivel 1: PriceCache (precios actuales)
```
getQuote(symbol):
  1. Buscar en PriceCache donde symbol === symbol
  2. Si existe (no expiró — TTL limpia automáticamente): retornar
  3. Si no existe: llamar a Twelve Data /quote
  4. Guardar resultado con expiresAt = now + 5 min
  5. MongoDB TTL index borra el doc cuando expiresAt llega
```

#### Nivel 2: HistoricalCache (datos históricos)
```
getHistoricalData(symbol):
  1. Buscar en HistoricalCache donde symbol === symbol
  2. Si existe Y lastFetched === today (calendar day): retornar data
  3. Si no existe O es de días anteriores: llamar a Twelve Data /time_series
  4. Hacer upsert con los datos nuevos y lastFetched = now
  5. En caso de fallo de API: retornar datos del cache aunque sean del día anterior
```

### Algoritmo del backtest

Dada una inversión hipotética en el pasado:

**Entradas:**
- `investedAmount` — monto invertido en USD
- `purchaseDate` — fecha de compra deseada
- `symbol` — símbolo bursátil

**Pasos:**
```
1. Obtener datos históricos del símbolo (getHistoricalData)
2. Encontrar el primer día de trading >= purchaseDate
   (los mercados no operan fines de semana ni feriados)
3. purchasePrice = precio de cierre de ese día
4. currentPrice = precio actual (getQuote)
5. sharesEquivalent = investedAmount / purchasePrice
6. currentValue = sharesEquivalent × currentPrice
7. gainLoss = currentValue - investedAmount
8. gainLossPercent = (gainLoss / investedAmount) × 100
9. Si yearsHeld >= 1:
   CAGR = ((currentValue / investedAmount)^(1/yearsHeld) - 1) × 100
   Si no: CAGR = null (CAGR no tiene sentido para períodos < 1 año)
10. chartData = todos los puntos históricos desde purchaseDate hasta hoy
    para dibujar la gráfica de valor de la inversión a lo largo del tiempo
```

**Fórmula de valor en el tiempo:**
```
value(t) = investedAmount × (close(t) / purchasePrice)
```
Esto escala el precio histórico relativo al precio de entrada, mostrando cuánto valdría la inversión en cada punto del tiempo.

### Multi-tenant security

Todos los Server Actions que acceden a datos de holdings aplican el patrón:

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) return { error: "Unauthorized" };

// SIEMPRE filtrar por user:
const holdings = await Holding.find({ user: session.user.id });
```

Este patrón garantiza que:
1. Nunca se devuelven datos de otro usuario aunque la query sea válida
2. Un usuario autenticado no puede modificar holdings de otro usuario
3. Si la sesión expira, todas las rutas de dashboard redirigen a `/signin`

---

## 🇺🇸 English

### Project structure

```
stocktrack/
├── app/
│   ├── (auth)/signin/       # Google sign-in page
│   ├── (dashboard)/
│   │   ├── layout.tsx       # Shared layout: header, nav, auth guard
│   │   ├── dashboard/       # Main portfolio view
│   │   └── backtest/        # Retrospective simulator
│   ├── actions/
│   │   ├── holdings.ts      # Holdings CRUD (Server Actions)
│   │   └── historical.ts    # Historical data + backtest (Server Actions)
│   ├── api/auth/[...nextauth]/  # NextAuth handler
│   ├── globals.css          # Tailwind + custom animations
│   └── layout.tsx           # Root layout (fonts, Toaster)
├── components/
│   ├── ui/                  # shadcn primitives (Button, Card, Dialog…)
│   ├── add-holding-dialog   # Modal for adding a position
│   ├── holding-row          # Table row with confirm dialog + toast
│   ├── symbol-chart-dialog  # Modal with historical price chart
│   ├── backtest-form        # Simulator form + result panel
│   └── nav-links            # Active navigation with usePathname
├── hooks/
│   └── use-confirm.tsx      # Reusable confirm hook (Promise-based)
├── lib/
│   ├── auth.ts              # NextAuth config + MongoDB adapter
│   ├── marketData.ts        # Twelve Data API client with cache
│   ├── mongodb.ts           # Native MongoDB client (for NextAuth)
│   ├── mongoose.ts          # Mongoose singleton connection
│   ├── portfolio.ts         # Holdings + price aggregation
│   └── utils.ts             # cn() helper
├── models/
│   ├── Holding.ts           # User's stock position
│   ├── PriceCache.ts        # Current price cache (5-min TTL)
│   ├── HistoricalCache.ts   # Historical data cache (once per day)
│   └── User.ts              # User model (NextAuth)
└── types/
    ├── index.ts             # HoldingDoc, HoldingWithPrice, BacktestResult…
    └── next-auth.d.ts       # Session type extensions
```

### Data models

#### Holding
Represents a stock position in a user's portfolio.

```typescript
{
  user: ObjectId,        // Reference to User (indexed — fast per-user queries)
  symbol: string,        // Uppercase ticker ("AAPL")
  shares: number,        // Number of shares (min 0.0001, supports fractional)
  costBasis: number,     // Average purchase price per share
  purchaseDate: Date,    // Date of first purchase
  notes?: string,        // Optional notes (max 500 chars)
  createdAt, updatedAt   // Mongoose auto-timestamps
}
// Compound index: { user: 1, symbol: 1 }
```

#### PriceCache
Caches current market prices. MongoDB TTL index auto-deletes documents when `expiresAt` is reached.

```typescript
{
  symbol: string,           // Uppercase ticker
  price: number,            // Current close price
  change: number,           // Absolute day change
  changePercent: number,    // Percentage day change
  previousClose: number,    // Previous day close
  lastUpdated: Date,
  expiresAt: Date           // TTL: lastUpdated + 5 min
}
// TTL index: { expiresAt: 1 }, { expireAfterSeconds: 0 }
```

#### HistoricalCache
Permanent cache of historical prices. Refreshed once per calendar day.

```typescript
{
  symbol: string,
  data: Array<{ date: Date; close: number }>,  // Ascending, _id:false
  lastFetched: Date                             // Detects if already updated today
}
```

### Authentication flow

```
1. User → /signin → "Sign in with Google" button
2. NextAuth redirects to Google OAuth consent screen
3. Google returns authorization code
4. NextAuth exchanges code for tokens
5. MongoDB Adapter creates/updates User and Account in Atlas
6. NextAuth creates a Session document in MongoDB (strategy: "database")
7. Signed session cookie → sent to browser
8. In each Server Component: getServerSession() → session.user.id
9. If session is null → redirect("/signin")
```

### Server Actions vs API Routes

StockTrack uses Server Actions (`"use server"`) instead of API Routes for all mutations:

| Aspect | Server Actions | API Routes |
|--------|---------------|------------|
| Boilerplate | Minimal | fetch + JSON + status codes |
| Type safety | End-to-end (same type client & server) | Manual with generic types |
| Auth check | Direct: `getServerSession()` inside function | Requires middleware or guard per handler |
| Cache revalidation | `revalidatePath()` built-in | Manual invalidation |
| Error handling | try/catch + `{ success, error }` object | try/catch + Response.json() |

### Cache strategy

#### Level 1: PriceCache (current prices)
```
getQuote(symbol):
  1. Look up PriceCache where symbol matches
  2. If found (not expired — TTL handles cleanup): return cached data
  3. If missing: call Twelve Data /quote endpoint
  4. Store result with expiresAt = now + 5 minutes
  5. MongoDB TTL index auto-deletes when expiresAt is reached
```

#### Level 2: HistoricalCache (historical data)
```
getHistoricalData(symbol):
  1. Look up HistoricalCache where symbol matches
  2. If found AND lastFetched === today (calendar day): return data
  3. If missing OR from a previous day: call Twelve Data /time_series
  4. Upsert with new data and lastFetched = now
  5. On API failure: fall back to stale cache data from previous day
```

### Backtest algorithm

Given a hypothetical past investment:

**Inputs:**
- `investedAmount` — invested amount in USD
- `purchaseDate` — desired purchase date
- `symbol` — stock ticker

**Steps:**
```
1. Fetch historical data for the symbol (getHistoricalData)
2. Find the first trading day >= purchaseDate
   (markets don't operate on weekends or holidays)
3. purchasePrice = closing price on that day
4. currentPrice = current price (getQuote)
5. sharesEquivalent = investedAmount / purchasePrice
6. currentValue = sharesEquivalent × currentPrice
7. gainLoss = currentValue - investedAmount
8. gainLossPercent = (gainLoss / investedAmount) × 100
9. If yearsHeld >= 1:
   CAGR = ((currentValue / investedAmount)^(1/yearsHeld) - 1) × 100
   Otherwise: CAGR = null (CAGR is undefined for periods under 1 year)
10. chartData = all historical points from purchaseDate to today
    to draw the investment value chart over time
```

**Value-over-time formula:**
```
value(t) = investedAmount × (close(t) / purchasePrice)
```
This scales the historical price relative to the entry price, showing what the investment would be worth at each point in time.

### Multi-tenant security

Every Server Action that accesses holdings data applies this pattern:

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) return { error: "Unauthorized" };

// ALWAYS filter by user:
const holdings = await Holding.find({ user: session.user.id });
```

This guarantees:
1. Data from other users is never returned, even for otherwise valid queries
2. An authenticated user cannot modify another user's holdings
3. When a session expires, all dashboard routes redirect to `/signin`
