import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts'
import { 
  FileText, 
  Download, 
  Filter, 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  TrendingDown,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { productsService } from '@/services/productsService'
import { customersService } from '@/services/customersService'
import { suppliersService } from '@/services/suppliersService'
import { purchasesService } from '@/services/purchasesService'
import { salesService } from '@/services/salesService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable, SkeletonChart } from '@/components/common/States'
import { toast } from '@/store/toastStore'
import { useStoreStore } from '@/store/storeStore'

type ReportTab = 'products' | 'sales' | 'purchases' | 'customers' | 'suppliers';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('products')
  const { activeStoreId } = useStoreStore()
  
  // Filtering states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30) // Default 30 days
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [selectedProductId, setSelectedProductId] = useState('All')
  const [selectedCustomerId, setSelectedCustomerId] = useState('All')
  const [selectedSupplierId, setSelectedSupplierId] = useState('All')

  // Fetch all databases
  const { data: products = [], isLoading: loadingProds } = useQuery({ queryKey: ['products', activeStoreId], queryFn: () => productsService.getAll(activeStoreId || undefined) })
  const { data: customers = [], isLoading: loadingCusts } = useQuery({ queryKey: ['customers'], queryFn: () => customersService.getAll() })
  const { data: suppliers = [], isLoading: loadingSupps } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersService.getAll() })
  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({ queryKey: ['purchases', activeStoreId], queryFn: () => purchasesService.getAll(activeStoreId || undefined) })
  const { data: sales = [], isLoading: loadingSales } = useQuery({ queryKey: ['sales', activeStoreId], queryFn: () => salesService.getAll(activeStoreId || undefined) })

  const isLoading = loadingProds || loadingCusts || loadingSupps || loadingPurchases || loadingSales;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Business Intelligence Reports</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonTable rows={6} cols={5} />
      </div>
    )
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }

  // --- REPORT AGGREGATORS & FILTERS ---

  // 1. PRODUCT REPORT DATA
  const getProductReportData = () => {
    return products.map(p => {
      let status = 'In Stock'
      let variant: 'success' | 'warning' | 'destructive' = 'success'
      if (p.stock === 0) {
        status = 'Out of Stock'
        variant = 'destructive'
      } else if (p.stock <= p.min_stock) {
        status = 'Low Stock'
        variant = 'warning'
      }

      const totalValuation = p.stock * p.purchase_price;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        stock: p.stock,
        purchase_price: p.purchase_price,
        selling_price: p.selling_price,
        valuation: totalValuation,
        status,
        variant
      }
    })
  }

  // 2. SALES REPORT DATA (Filtered by date, customer, product)
  const getSalesReportData = () => {
    return sales.filter(s => {
      const dateVal = s.sale_date
      const matchesDate = dateVal >= startDate && dateVal <= endDate
      const matchesCustomer = selectedCustomerId === 'All' || s.customer_id === selectedCustomerId
      
      const matchesProduct = selectedProductId === 'All' || s.items?.some(item => item.product_id === selectedProductId)

      return matchesDate && matchesCustomer && matchesProduct
    })
  }

  // 3. PURCHASES REPORT DATA (Filtered by date, supplier, product)
  const getPurchasesReportData = () => {
    return purchases.filter(p => {
      const dateVal = p.purchase_date
      const matchesDate = dateVal >= startDate && dateVal <= endDate
      const matchesSupplier = selectedSupplierId === 'All' || p.supplier_id === selectedSupplierId
      
      const matchesProduct = selectedProductId === 'All' || p.items?.some(item => item.product_id === selectedProductId)

      return matchesDate && matchesSupplier && matchesProduct
    })
  }

  // 4. CUSTOMER PURCHASE HISTORIES REPORT DATA
  const getCustomerReportData = () => {
    return customers.map(cust => {
      const custSales = sales.filter(s => s.customer_id === cust.id)
      const totalOrders = custSales.length
      const totalSpend = custSales.reduce((sum, s) => sum + Number(s.grand_total), 0)
      const lastOrderDate = custSales.length > 0 
        ? custSales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())[0].sale_date 
        : 'No Orders Logged'

      return {
        id: cust.id,
        name: cust.name,
        email: cust.email || '—',
        phone: cust.phone || '—',
        totalOrders,
        totalSpend,
        lastOrderDate
      }
    })
  }

  // 5. SUPPLIER HISTORIES REPORT DATA
  const getSupplierReportData = () => {
    return suppliers.map(supp => {
      const suppPurchases = purchases.filter(p => p.supplier_id === supp.id)
      const totalPurchasesCount = suppPurchases.length
      const totalSourcingAmount = suppPurchases.reduce((sum, p) => sum + Number(p.total_amount), 0)
      const lastPurchaseDate = suppPurchases.length > 0 
        ? suppPurchases.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())[0].purchase_date 
        : 'No Sourcing'

      return {
        id: supp.id,
        name: supp.name,
        email: supp.email || '—',
        phone: supp.phone || '—',
        totalPurchasesCount,
        totalSourcingAmount,
        lastPurchaseDate
      }
    })
  }

  // --- EXPORT SCRIPT TRIGGERS ---

  // Helper: Trigger CSV downloads
  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported!', `Downloaded ${filename} successfully.`);
  }

  // A. Trigger CSV Export
  const handleExportCSV = () => {
    if (activeTab === 'products') {
      const headers = ['Product Name', 'SKU', 'Category', 'Stock Qty', 'Cost Price', 'Retail Price', 'Valuation', 'Stock Status']
      const rows = getProductReportData().map(p => [
        p.name, p.sku, p.category, p.stock.toString(), p.purchase_price.toString(), p.selling_price.toString(), p.valuation.toString(), p.status
      ])
      downloadCSV('Product_Report.csv', headers, rows)
    } 
    else if (activeTab === 'sales') {
      const headers = ['Invoice No', 'Customer', 'Date', 'Subtotal', 'Discount', 'Tax', 'Grand Total']
      const rows = getSalesReportData().map(s => [
        s.invoice_no, s.customer?.name || 'Walk-in', s.sale_date, s.subtotal.toString(), s.discount.toString(), s.tax.toString(), s.grand_total.toString()
      ])
      downloadCSV('Sales_Report.csv', headers, rows)
    } 
    else if (activeTab === 'purchases') {
      const headers = ['Order ID', 'Supplier Vendor', 'Date', 'Total Amount']
      const rows = getPurchasesReportData().map(p => [
        p.id.substring(0, 8), p.supplier?.name || 'Unknown', p.purchase_date, p.total_amount.toString()
      ])
      downloadCSV('Purchases_Report.csv', headers, rows)
    } 
    else if (activeTab === 'customers') {
      const headers = ['Customer Name', 'Email', 'Phone', 'Orders Count', 'Total Spent', 'Last Order Date']
      const rows = getCustomerReportData().map(c => [
        c.name, c.email, c.phone, c.totalOrders.toString(), c.totalSpend.toString(), c.lastOrderDate
      ])
      downloadCSV('Customer_Report.csv', headers, rows)
    } 
    else if (activeTab === 'suppliers') {
      const headers = ['Supplier Name', 'Email', 'Phone', 'Purchases Count', 'Total Sourced', 'Last Sourced Date']
      const rows = getSupplierReportData().map(s => [
        s.name, s.email, s.phone, s.totalPurchasesCount.toString(), s.totalSourcingAmount.toString(), s.lastPurchaseDate
      ])
      downloadCSV('Supplier_Report.csv', headers, rows)
    }
  }

  // B. Trigger PDF Report Export
  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    
    let reportTitle = ''
    let tableHeaders: string[] = []
    let tableBody: any[][] = []

    if (activeTab === 'products') {
      reportTitle = 'PRODUCT INVENTORY & STATUS REPORT'
      tableHeaders = ['Product Name', 'SKU', 'Category', 'Stock Qty', 'Price', 'Valuation', 'Status']
      tableBody = getProductReportData().map(p => [
        p.name, p.sku, p.category, p.stock, formatCurrency(p.selling_price), formatCurrency(p.valuation), p.status
      ])
    } 
    else if (activeTab === 'sales') {
      reportTitle = 'SALES LEDGERS RECEIPT REPORT'
      tableHeaders = ['Invoice No', 'Customer Client', 'Date', 'Subtotal', 'Tax', 'Grand Total']
      tableBody = getSalesReportData().map(s => [
        s.invoice_no, s.customer?.name || 'Walk-in', s.sale_date, formatCurrency(s.subtotal), formatCurrency(s.tax), formatCurrency(s.grand_total)
      ])
    } 
    else if (activeTab === 'purchases') {
      reportTitle = 'PURCHASE ORDER SOURCING REPORT'
      tableHeaders = ['Order ID', 'Supplier Partner', 'Date', 'Items Sold', 'Sourcing Total']
      tableBody = getPurchasesReportData().map(p => [
        p.id.substring(0, 8), p.supplier?.name || 'Unknown', p.purchase_date, p.items?.reduce((sum, i) => sum + i.quantity, 0) || 0, formatCurrency(p.total_amount)
      ])
    } 
    else if (activeTab === 'customers') {
      reportTitle = 'CUSTOMER RELATION & VALUE REPORT'
      tableHeaders = ['Customer Name', 'Email Address', 'Orders', 'Total Spend Value', 'Last Order Date']
      tableBody = getCustomerReportData().map(c => [
        c.name, c.email, c.totalOrders, formatCurrency(c.totalSpend), c.lastOrderDate
      ])
    } 
    else if (activeTab === 'suppliers') {
      reportTitle = 'SUPPLIER PROCUREMENT & VALUE REPORT'
      tableHeaders = ['Supplier Vendor Name', 'Email Address', 'Procurements', 'Total Sourcing Value', 'Last Sourced Date']
      tableBody = getSupplierReportData().map(s => [
        s.name, s.email, s.totalPurchasesCount, formatCurrency(s.totalSourcingAmount), s.lastPurchaseDate
      ])
    }

    doc.text(reportTitle, 14, 20)
    
    // Add date filter metadata
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Date Range Filters: ${startDate} to ${endDate}`, 14, 26)
    
    doc.setDrawColor(220, 220, 220)
    doc.line(14, 30, 196, 30)

    autoTable(doc, {
      startY: 35,
      head: [tableHeaders],
      body: tableBody,
      headStyles: { fillColor: [40, 40, 40] }
    })

    doc.save(`${activeTab}_report.pdf`)
    toast.success('PDF Exported!', `Saved ${activeTab}_report.pdf successfully.`);
  }

  // --- VISUALIZATION DATA GENERATORS ---

  // Sales chart values
  const salesReportList = getSalesReportData()
  const purchasesReportList = getPurchasesReportData()

  // Product category split (pie chart)
  const productData = getProductReportData()
  const categorySummary: Record<string, number> = {}
  productData.forEach(p => {
    categorySummary[p.category] = (categorySummary[p.category] || 0) + 1
  })
  const pieChartData = Object.entries(categorySummary).map(([name, value]) => ({ name, value }))
  const PIE_COLORS = ['#3b82f6', '#10b981', '#6366f1', '#ec4899', '#f59e0b', '#8b5cf6'];

  // Product KPIs
  const totalSkuValuation = productData.reduce((sum, p) => sum + p.valuation, 0);
  const totalStockCount = productData.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = productData.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock').length;

  // Sales KPIs
  const totalInvoicedAmount = salesReportList.reduce((sum, s) => sum + Number(s.grand_total), 0);
  const totalSalesTax = salesReportList.reduce((sum, s) => sum + Number(s.tax), 0);
  const totalSalesOrdersCount = salesReportList.length;

  // Sourcing KPIs
  const totalSourcedAmount = purchasesReportList.reduce((sum, p) => sum + Number(p.total_amount), 0);
  const totalPurchaseOrdersCount = purchasesReportList.length;

  return (
    <div className="space-y-6 text-left">
      
      {/* Title block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Business Intelligence Reports</h2>
          <p className="text-sm text-muted-foreground">
            Generate printable reports, export financial transaction CSVs, and analyze stock metrics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 text-xs font-bold shadow-sm">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-1.5 text-xs font-bold shadow-sm">
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs Selector Bar */}
      <div className="flex border-b border-border/60 overflow-x-auto select-none gap-2">
        {(['products', 'sales', 'purchases', 'customers', 'suppliers'] as ReportTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors capitalize ${
              activeTab === tab 
                ? 'border-primary text-foreground' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab} Report
          </button>
        ))}
      </div>

      {/* Dynamic Filter Controls Card */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2 bg-muted/20">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4 items-end">
          
          {/* Sourcing Date Range */}
          {(activeTab === 'sales' || activeTab === 'purchases') && (
            <>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Product Specific Filter */}
          {(activeTab === 'sales' || activeTab === 'purchases') && (
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Target SKU Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="All">All Catalog SKU Products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Customer filter on Sales tab */}
          {activeTab === 'sales' && (
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Target Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="All">All Customers</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Supplier filter on Purchases tab */}
          {activeTab === 'purchases' && (
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Target Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="All">All Suppliers</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Informational Label for static reports */}
          {(activeTab === 'products' || activeTab === 'customers' || activeTab === 'suppliers') && (
            <div className="col-span-4 text-xs text-muted-foreground font-semibold flex items-center gap-1.5 py-1.5">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              <span>This report displays all active ledger records in database history. No date filtering is needed.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Content Views */}
      
      {/* 1. PRODUCT REPORT */}
      {activeTab === 'products' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Total SKUs Valuation</span>
                  <h3 className="text-xl font-extrabold text-foreground mt-1">{formatCurrency(totalSkuValuation)}</h3>
                </div>
                <div className="rounded-lg p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Total Warehouse Units</span>
                  <h3 className="text-xl font-extrabold text-foreground mt-1">{totalStockCount} units</h3>
                </div>
                <div className="rounded-lg p-2 bg-primary/10 border border-primary/20 text-primary">
                  <Package className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className={`shadow-sm ${lowStockCount > 0 ? 'border-amber-500/20 bg-amber-500/5' : ''}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Low/Empty Stock SKU Alerts</span>
                  <h3 className={`text-xl font-extrabold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                    {lowStockCount} SKUs
                  </h3>
                </div>
                <div className="rounded-lg p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Table */}
            <div className="lg:col-span-8">
              <Card className="shadow-sm border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="py-2.5 px-3">Product SKU</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Available Stock</th>
                      <th className="py-2.5 px-3 text-right">Cost Value</th>
                      <th className="py-2.5 px-3 text-right">Valuation</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {getProductReportData().map(p => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-foreground block">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">SKU: {p.sku}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-muted-foreground">{p.category}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-foreground">{p.stock}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-muted-foreground">{formatCurrency(p.purchase_price)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatCurrency(p.valuation)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={p.variant}>{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Categorization Split Chart */}
            <div className="lg:col-span-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">SKU Category Split</CardTitle>
                </CardHeader>
                <CardContent className="h-[240px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. SALES REPORT */}
      {activeTab === 'sales' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Total Sales Inflow</span>
                  <h3 className="text-xl font-extrabold text-foreground mt-1">{formatCurrency(totalInvoicedAmount)}</h3>
                </div>
                <div className="rounded-lg p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Invoices Finalized</span>
                  <h3 className="text-xl font-extrabold text-foreground mt-1">{totalSalesOrdersCount} receipts</h3>
                </div>
                <div className="rounded-lg p-2 bg-primary/10 border border-primary/20 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Estimated Taxes Collected</span>
                  <h3 className="text-xl font-extrabold text-foreground mt-1">{formatCurrency(totalSalesTax)}</h3>
                </div>
                <div className="rounded-lg p-2 bg-blue-500/10 border border-blue-500/20 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Customer Buyer</th>
                  <th className="py-2.5 px-3 text-center">Invoicing Date</th>
                  <th className="py-2.5 px-3 text-right">Items Sold</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Grand Total Invoiced</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {salesReportList.map(s => {
                  const qtySum = s.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  return (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-bold text-foreground">{s.invoice_no}</td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">{s.customer?.name || 'Walk-in Client'}</td>
                      <td className="py-2.5 px-3 text-center text-muted-foreground">{s.sale_date}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-foreground">{qtySum} units</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{formatCurrency(s.subtotal)}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-foreground">{formatCurrency(s.grand_total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}

      {/* 3. PURCHASES REPORT */}
      {activeTab === 'purchases' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Total Sourcing Costs</span>
                  <h3 className="text-xl font-extrabold text-foreground mt-1">{formatCurrency(totalSourcedAmount)}</h3>
                </div>
                <div className="rounded-lg p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Procurement Orders Logged</span>
                  <h3 className="text-xl font-extrabold text-foreground mt-1">{totalPurchaseOrdersCount} transactions</h3>
                </div>
                <div className="rounded-lg p-2 bg-primary/10 border border-primary/20 text-primary">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Supplier Sourced Vendor</th>
                  <th className="py-2.5 px-3 text-center">Procurement Date</th>
                  <th className="py-2.5 px-3 text-right">Items Quantity</th>
                  <th className="py-2.5 px-3 text-right">Sourcing Invoice Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchasesReportList.map(p => {
                  const qtySum = p.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-semibold text-xs text-muted-foreground uppercase">{p.id.substring(0, 8)}...</td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">{p.supplier?.name || 'Unknown supplier'}</td>
                      <td className="py-2.5 px-3 text-center text-muted-foreground">{p.purchase_date}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-foreground">{qtySum} units</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-foreground">{formatCurrency(p.total_amount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}

      {/* 4. CUSTOMERS REPORT */}
      {activeTab === 'customers' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <Card className="shadow-sm border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3">Customer / Agency</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Phone Number</th>
                  <th className="py-2.5 px-3 text-center">Orders Finalized</th>
                  <th className="py-2.5 px-3 text-right">Aggregate Sales Revenue</th>
                  <th className="py-2.5 px-3 text-center font-bold">Last Sale Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {getCustomerReportData().map(c => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-bold text-foreground">{c.name}</td>
                    <td className="py-2.5 px-3 font-semibold text-muted-foreground">{c.email}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{c.phone}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-foreground">{c.totalOrders}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.totalSpend)}</td>
                    <td className="py-2.5 px-3 text-center text-muted-foreground font-semibold">{c.lastOrderDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}

      {/* 5. SUPPLIERS REPORT */}
      {activeTab === 'suppliers' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <Card className="shadow-sm border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3">Supplier Sourcing Partner</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Phone Number</th>
                  <th className="py-2.5 px-3 text-center">Orders Sourced</th>
                  <th className="py-2.5 px-3 text-right">Aggregate Sourcing Expense</th>
                  <th className="py-2.5 px-3 text-center font-bold">Last Procurement Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {getSupplierReportData().map(s => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-bold text-foreground">{s.name}</td>
                    <td className="py-2.5 px-3 font-semibold text-muted-foreground">{s.email}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{s.phone}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-foreground">{s.totalPurchasesCount}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(s.totalSourcingAmount)}</td>
                    <td className="py-2.5 px-3 text-center text-muted-foreground font-semibold">{s.lastPurchaseDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}

    </div>
  )
}
