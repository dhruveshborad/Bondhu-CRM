import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Package, 
  Users, 
  Truck, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle,
  ArrowUpRight,
  Plus
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { dashboardService } from '@/services/dashboardService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonCard, SkeletonChart, SkeletonTable, ErrorState } from '@/components/common/States'
import { useStoreStore } from '@/store/storeStore'
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts'

export const DashboardPage: React.FC = () => {
  const { activeStoreId } = useStoreStore()
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats', activeStoreId],
    queryFn: () => dashboardService.getStats(activeStoreId || undefined),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
            <p className="text-sm text-muted-foreground">Compiling ledger statistics...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonTable rows={4} cols={4} />
      </div>
    )
  }

  if (error || !stats) {
    return <ErrorState onRetry={refetch} />
  }

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  }

  const kpis = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      desc: 'Sum of all processed sales',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      trend: '+12% from last month',
      trendUp: true
    },
    {
      title: 'Total Sales Ledger',
      value: stats.totalSales.toString(),
      icon: TrendingUp,
      desc: 'Number of invoice sales',
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      trend: '+8.5% from last week',
      trendUp: true
    },
    {
      title: 'Total Purchase Ledger',
      value: formatCurrency(stats.totalPurchases),
      icon: ShoppingCart,
      desc: 'Sum of inventory purchases',
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      trend: '-2.4% from last month',
      trendUp: false
    },
    {
      title: 'Products In Catalog',
      value: stats.totalProducts.toString(),
      icon: Package,
      desc: 'Total active SKUs in warehouse',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      trend: '+2 new categories',
      trendUp: true
    },
    {
      title: 'Client Directory',
      value: stats.totalCustomers.toString(),
      icon: Users,
      desc: 'Active buyers in record',
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
      trend: '+3 registered today',
      trendUp: true
    },
    {
      title: 'Active Suppliers',
      value: stats.totalSuppliers.toString(),
      icon: Truck,
      desc: 'Sourcing vendor contacts',
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
      trend: 'Zero latency logs',
      trendUp: true
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 text-left"
    >
      {/* Title block */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Overview of company ledgers, stock updates, and invoice summaries.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link to="/sales">
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              New Sale Invoice
            </Button>
          </Link>
          <Link to="/purchases">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Purchase Order
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -4 }}
            className="rounded-xl border bg-card p-6 shadow-sm select-none"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {kpi.title}
              </span>
              <div className={`rounded-lg border p-1.5 ${kpi.color}`}>
                <kpi.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
              <span className="text-muted-foreground font-medium">{kpi.desc}</span>
              <span className={`font-semibold ${kpi.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpi.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Overview Area Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Sales vs Purchases</CardTitle>
            <CardDescription>Visualizing cash inflow (revenue sales) vs outflow (stock sourcing purchases)</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueOverview} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" className="text-[10px] text-muted-foreground font-bold" />
                <YAxis className="text-[10px] text-muted-foreground font-bold" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="sales" name="Sales Inflow" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="purchases" name="Purchases Outflow" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Sales Revenue Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Sales Revenue Inflow</CardTitle>
            <CardDescription>Monthly totals of generated sales receipts</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" className="text-[10px] text-muted-foreground font-bold" />
                <YAxis className="text-[10px] text-muted-foreground font-bold" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Bar dataKey="amount" name="Revenue Amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lists / Tables Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Invoices Ledger */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
            <div>
              <CardTitle>Recent Invoice Sales</CardTitle>
              <CardDescription>Latest finalized consumer sales receipts</CardDescription>
            </div>
            <Link to="/sales">
              <Button size="sm" variant="ghost" className="gap-1 text-xs">
                View Ledger
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 px-6 pb-6">
            {stats.recentSales.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No recent invoices logged.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-bold">
                      <th className="py-2.5 text-left text-xs uppercase font-bold tracking-wider">Invoice</th>
                      <th className="py-2.5 text-left text-xs uppercase font-bold tracking-wider">Customer</th>
                      <th className="py-2.5 text-left text-xs uppercase font-bold tracking-wider">Date</th>
                      <th className="py-2.5 text-right text-xs uppercase font-bold tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                        <td className="py-3 font-semibold text-foreground text-xs">{sale.invoice_no}</td>
                        <td className="py-3 text-muted-foreground font-medium text-xs truncate max-w-[120px]">
                          {sale.customer?.name || 'Walk-in Customer'}
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">{sale.sale_date}</td>
                        <td className="py-3 text-right font-semibold text-foreground text-xs">
                          {formatCurrency(sale.grand_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="shadow-sm border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Inventory items dropping below minimum limits</CardDescription>
              </div>
            </div>
            <Link to="/products">
              <Button size="sm" variant="ghost" className="gap-1 text-xs text-amber-600 hover:text-amber-700">
                Replenish
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 px-6 pb-6">
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-center py-6 text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                ✅ All products are sufficiently stocked.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-bold">
                      <th className="py-2.5 text-left text-xs uppercase font-bold tracking-wider">Product Name</th>
                      <th className="py-2.5 text-left text-xs uppercase font-bold tracking-wider">SKU</th>
                      <th className="py-2.5 text-right text-xs uppercase font-bold tracking-wider">Stock</th>
                      <th className="py-2.5 text-right text-xs uppercase font-bold tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lowStockProducts.slice(0, 5).map((prod) => (
                      <tr key={prod.id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                        <td className="py-3 font-semibold text-foreground text-xs">{prod.name}</td>
                        <td className="py-3 text-muted-foreground text-xs">{prod.sku}</td>
                        <td className="py-3 text-right font-bold text-foreground text-xs">{prod.stock}</td>
                        <td className="py-3 text-right">
                          <Badge variant={prod.stock === 0 ? 'destructive' : 'warning'}>
                            {prod.stock === 0 ? 'Out of Stock' : `${prod.stock} Left`}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
