import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  Plus, 
  Trash2, 
  ArrowLeft,
  Eye,
  PlusCircle,
  Printer,
  Download,
  AlertTriangle
} from 'lucide-react'
import { salesService } from '@/services/salesService'
import { customersService } from '@/services/customersService'
import { productsService } from '@/services/productsService'
import type { Sale } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { SkeletonTable, EmptyState, ErrorState } from '@/components/common/States'
import { toast } from '@/store/toastStore'
import { useStoreStore } from '@/store/storeStore'

// Zod schemas for validation
const saleItemSchema = z.object({
  product_id: z.string().min(1, 'Select a product SKU'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Price must be positive'),
})

const saleSchema = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
  sale_date: z.string().min(1, 'Select a sales date'),
  discount: z.coerce.number().min(0, 'Discount must be positive'),
  tax: z.coerce.number().min(0, 'Tax must be positive'),
  items: z.array(saleItemSchema).min(1, 'Add at least one product row'),
})



export const SalesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isFormView, setIsFormView] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [activeInvoiceNo, setActiveInvoiceNo] = useState('')

  const { activeStoreId } = useStoreStore()

  // React Queries
  const { data: sales = [], isLoading: isSalesLoading, error: salesErr, refetch } = useQuery({
    queryKey: ['sales', activeStoreId],
    queryFn: () => salesService.getAll(activeStoreId || undefined),
  })

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersService.getAll(),
  })

  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['products', activeStoreId],
    queryFn: () => productsService.getAll(activeStoreId || undefined),
  })

  // Create Invoice Order Mutation
  const createSaleMutation = useMutation({
    mutationFn: ({ sale, items }: { sale: any; items: any[] }) => 
      salesService.create(sale, items),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Sale Invoice Finalized!', `Invoice ${data.invoice_no} generated successfully.`)
      
      // Hydrate supplier info for instant details view
      const customerObj = customers.find(c => c.id === data.customer_id)
      const hydratedSale = { ...data, customer: customerObj }
      setSelectedSale(hydratedSale)
      
      setIsFormView(false)
      setIsDetailsOpen(true)
    },
    onError: (err: any) => {
      toast.error('Invoice checkout rejected', err.message)
    }
  })

  // React Hook Form
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customer_id: '',
      sale_date: new Date().toISOString().split('T')[0],
      discount: 0,
      tax: 0,
      items: [{ product_id: '', quantity: 1, unit_price: 0 }]
    }
  })

  // Dynamic row array hooks
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchItems = watch('items')
  const watchDiscount = watch('discount') || 0
  const watchTax = watch('tax') || 0
  const watchCustomerId = watch('customer_id')

  const errs = errors as any
  const itemErrors = errs.items

  // Calculate live calculations
  const subtotal = watchItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0) || 0;
  const grandTotal = Math.max(0, subtotal - Number(watchDiscount) + Number(watchTax));

  // Change product trigger: autopopulate retail price and display stock indicators
  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId)
    if (prod) {
      setValue(`items.${index}.unit_price`, prod.selling_price)
    }
  }

  const handleCreateNewClick = async () => {
    const nextInvoice = await salesService.getNextInvoiceNo()
    setActiveInvoiceNo(nextInvoice)
    reset({
      customer_id: '',
      sale_date: new Date().toISOString().split('T')[0],
      discount: 0,
      tax: 0,
      items: [{ product_id: '', quantity: 1, unit_price: 0 }]
    })
    setIsFormView(true)
  }

  const handleFormSubmit = (data: any) => {
    // 1. Verify available stock levels before processing
    for (const item of data.items) {
      const prod = products.find(p => p.id === item.product_id);
      if (prod && prod.stock < item.quantity) {
        toast.error('Insufficient Stock', `Product "${prod.name}" has only ${prod.stock} units left. Cannot check out ${item.quantity} units.`);
        return;
      }
    }

    const salePayload = {
      customer_id: data.customer_id,
      discount: data.discount,
      tax: data.tax,
      sale_date: data.sale_date,
      store_id: activeStoreId || null
    }
    createSaleMutation.mutate({ sale: salePayload, items: data.items })
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }

  // --- PRINT & PDF LOGIC ---

  // A. Trigger PDF Generation
  const handleDownloadPDF = (sale: Sale) => {
    const doc = new jsPDF()
    const customerName = sale.customer?.name || 'Walk-in Customer'
    
    // Header Logo & Meta
    doc.setFontSize(22)
    doc.setTextColor(40, 40, 40)
    doc.text('BONDHU ERP SYSTEM', 14, 20)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('12 Enterprise Court, Suite 100, California, USA', 14, 26)
    
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('RETAIL SALES INVOICE', 140, 20)
    doc.setFontSize(10)
    doc.text(`Invoice No: ${sale.invoice_no}`, 140, 26)
    doc.text(`Invoice Date: ${sale.sale_date}`, 140, 31)

    // Divider Line
    doc.setDrawColor(220, 220, 220)
    doc.line(14, 36, 196, 36)

    // Customer block
    doc.setFontSize(11)
    doc.text('Bill To Customer:', 14, 45)
    doc.setFont('Helvetica', 'bold')
    doc.text(customerName, 14, 51)
    doc.setFont('Helvetica', 'normal')
    if (sale.customer?.phone) doc.text(`Phone: ${sale.customer.phone}`, 14, 56)
    if (sale.customer?.email) doc.text(`Email: ${sale.customer.email}`, 14, 61)
    if (sale.customer?.address) {
      doc.text('Billing Address:', 110, 45)
      doc.text(sale.customer.address, 110, 51, { maxWidth: 80 })
    }

    // Items Table
    const tableBody = (sale.items || []).map((item: any, idx: number) => {
      const prod = products.find(p => p.id === item.product_id)
      const name = prod ? prod.name : 'Unknown SKU'
      const sku = prod ? prod.sku : '—'
      return [
        idx + 1,
        `${name} (${sku})`,
        item.quantity,
        formatCurrency(item.unit_price),
        formatCurrency(item.quantity * item.unit_price)
      ]
    })

    autoTable(doc, {
      startY: 70,
      head: [['#', 'Product Description', 'Qty', 'Unit Price', 'Line Total']],
      body: tableBody,
      headStyles: { fillColor: [40, 40, 40] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 90 },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      }
    })

    // Summary calculations
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont('Helvetica', 'normal')
    
    doc.text('Subtotal:', 130, finalY)
    doc.text(formatCurrency(sale.subtotal), 170, finalY, { align: 'right' })
    
    doc.text('Discount Reductions:', 130, finalY + 6)
    doc.text(`-${formatCurrency(sale.discount)}`, 170, finalY + 6, { align: 'right' })
    
    doc.text('Tax Additions:', 130, finalY + 12)
    doc.text(formatCurrency(sale.tax), 170, finalY + 12, { align: 'right' })
    
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Grand Total Invoice:', 130, finalY + 20)
    doc.text(formatCurrency(sale.grand_total), 170, finalY + 20, { align: 'right' })

    // Save File
    doc.save(`Invoice_${sale.invoice_no}.pdf`)
    toast.success('PDF Downloaded!', `Saved Invoice_${sale.invoice_no}.pdf successfully.`)
  }

  // B. Trigger Browser Printing
  const handlePrintInvoice = (sale: Sale) => {
    // Generate a print-only layout using iframe or open a new window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked', 'Please enable popups to print invoices.');
      return;
    }

    const customerName = sale.customer?.name || 'Walk-in Customer'
    const itemsRows = (sale.items || []).map((item) => {
      const prod = products.find(p => p.id === item.product_id)
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${prod ? prod.name : 'Unknown SKU'} (${prod ? prod.sku : '—'})</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.unit_price)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.quantity * item.unit_price)}</td>
        </tr>
      `
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${sale.invoice_no}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .info-block { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
            .totals { margin-top: 30px; text-align: right; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th { background: #f4f4f4; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2 style="margin:0;">BONDHU ERP SYSTEM</h2>
              <p style="margin:5px 0 0 0;font-size:12px;color:#666;">Enterprise Sourcing & Ledgers Platform</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin:0;">INVOICE</h2>
              <p style="margin:5px 0 0 0;font-size:12px;">No: ${sale.invoice_no}</p>
              <p style="margin:2px 0 0 0;font-size:12px;">Date: ${sale.sale_date}</p>
            </div>
          </div>
          <div class="info-block">
            <div>
              <strong>Bill To:</strong><br>
              ${customerName}<br>
              ${sale.customer?.phone ? `Phone: ${sale.customer.phone}<br>` : ''}
              ${sale.customer?.email ? `Email: ${sale.customer.email}<br>` : ''}
            </div>
            <div>
              <strong>Billing Address:</strong><br>
              ${sale.customer?.address || '—'}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product Details</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="totals">
            <p>Subtotal: ${formatCurrency(sale.subtotal)}</p>
            <p>Discount: -${formatCurrency(sale.discount)}</p>
            <p>Tax: ${formatCurrency(sale.tax)}</p>
            <h3 style="margin-top: 10px;">Grand Total: ${formatCurrency(sale.grand_total)}</h3>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (isSalesLoading || isCustomersLoading || isProductsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Sales Ledgers</h2>
        </div>
        <SkeletonTable rows={8} cols={6} />
      </div>
    )
  }

  if (salesErr) {
    return <ErrorState onRetry={refetch} />
  }

  const selectedCustomerObj = customers.find(c => c.id === watchCustomerId)

  return (
    <div className="space-y-6 text-left">
      
      {/* View 1: Sales Invoice Workspace Creator */}
      {isFormView ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFormView(false)}
              className="rounded-lg border bg-card p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Finalize Invoice Sales</h2>
              <p className="text-sm text-muted-foreground">Log a retail product sale invoice. Live stock levels check is enforced.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              
              {/* Left Panel Form Config: 7 cols */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Header Information */}
                <Card className="shadow-sm">
                  <CardHeader className="border-b pb-4 mb-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoicing Header</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Select
                      {...register('customer_id')}
                      label="Customer Billing"
                      placeholder="Choose Customer Profile"
                      options={customers.map((c) => ({ value: c.id, label: c.name }))}
                      error={errs.customer_id?.message}
                    />

                    <Input
                      {...register('sale_date')}
                      label="Invoicing Date"
                      type="date"
                      error={errs.sale_date?.message}
                    />
                  </CardContent>
                </Card>

                {/* Invoiced Products SKU Rows */}
                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                    <div>
                      <CardTitle>Invoiced SKU Rows</CardTitle>
                      <CardDescription>Select stock quantities and prices for retail transactions</CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ product_id: '', quantity: 1, unit_price: 0 })}
                      className="gap-1 text-xs"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add SKU Row
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {itemErrors?.message && (
                      <p className="text-xs text-destructive font-semibold bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg">
                        {itemErrors?.message}
                      </p>
                    )}

                    <div className="space-y-4">
                      {fields.map((field, idx) => {
                        const itemProductId = watchItems?.[idx]?.product_id;
                        const matchedProduct = products.find(p => p.id === itemProductId);
                        const availableStock = matchedProduct ? matchedProduct.stock : 0;
                        const isStockLow = matchedProduct ? matchedProduct.stock <= matchedProduct.min_stock : false;

                        return (
                          <div 
                            key={field.id}
                            className="grid grid-cols-12 gap-3 items-end bg-muted/20 p-3.5 rounded-lg border border-border/40 relative"
                          >
                            {/* Product Selector */}
                            <div className="col-span-12 sm:col-span-6 text-left">
                              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                                <span>Select Product SKU</span>
                                {matchedProduct && (
                                  <span className={`text-[10px] font-bold ${availableStock === 0 ? 'text-destructive' : isStockLow ? 'text-amber-500 animate-pulse' : 'text-emerald-500'}`}>
                                    Available: {availableStock}
                                  </span>
                                )}
                              </label>
                              <select
                                {...register(`items.${idx}.product_id` as const)}
                                onChange={(e) => handleProductChange(idx, e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none"
                              >
                                <option value="" disabled>Choose Catalog SKU</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} — Retail Price: {formatCurrency(p.selling_price)}
                                  </option>
                                ))}
                              </select>
                              {itemErrors?.[idx]?.product_id && (
                                <p className="text-xs text-destructive mt-1 font-medium">{itemErrors[idx].product_id.message}</p>
                              )}
                            </div>

                            {/* Qty */}
                            <div className="col-span-6 sm:col-span-2">
                              <Input
                                {...register(`items.${idx}.quantity` as const)}
                                label="Qty"
                                type="number"
                                error={itemErrors?.[idx]?.quantity?.message}
                              />
                            </div>

                            {/* Unit Price */}
                            <div className="col-span-6 sm:col-span-3">
                              <Input
                                {...register(`items.${idx}.unit_price` as const)}
                                label="Price ($)"
                                type="number"
                                step="0.01"
                                error={itemErrors?.[idx]?.unit_price?.message}
                              />
                            </div>

                            {/* Remove Row */}
                            <div className="col-span-12 sm:col-span-1 flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={fields.length === 1}
                                onClick={() => remove(idx)}
                                className="text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer h-9 w-9"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Discounts & Taxes adjustments */}
                <Card className="shadow-sm">
                  <CardHeader className="border-b pb-4 mb-4">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adjustments</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Input
                      {...register('discount')}
                      label="Flat Coupon Discount ($)"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      error={errs.discount?.message}
                    />

                    <Input
                      {...register('tax')}
                      label="Calculated Sales Tax ($)"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      error={errs.tax?.message}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel Invoicing Paper Preview: 5 cols */}
              <div className="lg:col-span-5 space-y-6 sticky top-20">
                <Card className="shadow-md overflow-hidden border-2 border-primary/20 relative">
                  
                  {/* Visual Paper texture styling */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                  
                  <CardContent className="p-6 bg-card text-left text-xs font-mono space-y-5">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm tracking-tight text-foreground">BONDHU ERP</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Enterprise Ledger Node</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground">DRAFT INVOICE</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{activeInvoiceNo}</p>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-border py-3 grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-muted-foreground block uppercase font-bold text-[8px] tracking-wider">Bill To Customer</span>
                        <span className="text-foreground font-semibold text-xs leading-none mt-1 block">
                          {selectedCustomerObj ? selectedCustomerObj.name : 'Walk-in Client'}
                        </span>
                        {selectedCustomerObj?.phone && (
                          <span className="text-muted-foreground block mt-1">Phone: {selectedCustomerObj.phone}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground block uppercase font-bold text-[8px] tracking-wider">Date</span>
                        <span className="text-foreground font-semibold mt-1 block">
                          {watch('sale_date') || new Date().toISOString().split('T')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Table of items */}
                    <div className="space-y-1.5 border-t border-dashed border-border pt-3">
                      <div className="grid grid-cols-12 font-bold text-muted-foreground text-[9px] uppercase tracking-wider pb-1">
                        <span className="col-span-6">Description</span>
                        <span className="col-span-2 text-right">Qty</span>
                        <span className="col-span-4 text-right">Line Total</span>
                      </div>

                      {watchItems?.map((item: any, idx: number) => {
                        const prod = products.find((p) => p.id === item.product_id);
                        const quantity = Number(item.quantity) || 0;
                        const price = Number(item.unit_price) || 0;

                        return (
                          <div key={idx} className="grid grid-cols-12 text-[10px] py-1 border-b border-border/40 font-medium">
                            <span className="col-span-6 truncate text-foreground font-semibold">
                              {prod ? prod.name : 'Unspecified SKU'}
                            </span>
                            <span className="col-span-2 text-right text-muted-foreground">{quantity}</span>
                            <span className="col-span-4 text-right text-foreground font-semibold">
                              {formatCurrency(quantity * price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Calculations summary */}
                    <div className="border-t border-dashed border-border pt-3 space-y-1.5 text-right font-medium">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal:</span>
                        <span className="text-foreground">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Discount Coupon:</span>
                        <span className="text-destructive">-{formatCurrency(watchDiscount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Sales Tax:</span>
                        <span className="text-foreground">+{formatCurrency(watchTax)}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm font-extrabold border-t border-dashed border-border pt-2 text-foreground">
                        <span>GRAND TOTAL:</span>
                        <span className="text-primary">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>

                    {/* Warning if stock issues */}
                    {watchItems?.some((item: any) => {
                      const prod = products.find(p => p.id === item.product_id)
                      return prod && prod.stock < item.quantity
                    }) && (
                      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-2.5 rounded-lg flex items-center gap-1.5 text-[10px] leading-snug animate-pulse font-sans">
                        <AlertTriangle className="h-4.5 w-4.5 text-destructive shrink-0" />
                        <span>Available quantities exceeded. Finalizing will be rejected by database filters.</span>
                      </div>
                    )}

                    {/* Finalize trigger */}
                    <Button
                      type="button"
                      onClick={handleSubmit(handleFormSubmit)}
                      className="w-full font-bold shadow-md"
                      loading={createSaleMutation.isPending}
                    >
                      Finalize Invoice
                    </Button>
                  </CardContent>
                </Card>
              </div>

            </div>
          </form>
        </motion.div>
      ) : (
        /* View 2: Sales Ledger History Invoices */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Header block */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Sales Invoicing Ledgers</h2>
              <p className="text-sm text-muted-foreground">
                Review processed sales, print invoices, export customer order receipts, and track revenues.
              </p>
            </div>
            <Button onClick={handleCreateNewClick} className="gap-1.5 shadow-sm shrink-0 self-start sm:self-center">
              <Plus className="h-4 w-4" />
              New Sale Invoice
            </Button>
          </div>

          {/* Table list */}
          {sales.length === 0 ? (
            <EmptyState
              title="No invoice sales processed"
              description="Finalized sales receipts will populate here automatically, generating cash receipts and deducting stock."
              actionText="Generate Retail Sale"
              onAction={handleCreateNewClick}
            />
          ) : (
            <Card className="shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Invoice No</th>
                      <th className="py-3 px-4">Customer Client</th>
                      <th className="py-3 px-4 text-center">Invoice Date</th>
                      <th className="py-3 px-4 text-right">Items Sold</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sales.map((sale, idx) => {
                      const itemsCount = sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                      return (
                        <tr 
                          key={sale.id} 
                          className={`hover:bg-muted/40 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                        >
                          <td className="py-3.5 px-4 font-bold text-foreground">{sale.invoice_no}</td>
                          <td className="py-3.5 px-4 font-bold text-foreground">{sale.customer?.name || 'Walk-in Customer'}</td>
                          <td className="py-3.5 px-4 text-center text-muted-foreground">{sale.sale_date}</td>
                          <td className="py-3.5 px-4 text-right font-medium text-foreground">{itemsCount} units</td>
                          <td className="py-3.5 px-4 text-right text-muted-foreground font-medium">{formatCurrency(sale.subtotal)}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-foreground">{formatCurrency(sale.grand_total)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedSale(sale)
                                  setIsDetailsOpen(true)
                                }}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                                title="Preview Invoice"
                              >
                                <Eye className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handlePrintInvoice(sale)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                                title="Print Invoice"
                              >
                                <Printer className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(sale)}
                                className="rounded p-1.5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                title="Download PDF"
                              >
                                <Download className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* C. PREVIEW/FINALIZED DIALOG DETAILS */}
      <Dialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Finalized Sales Receipt Invoice"
        className="max-w-2xl"
      >
        {selectedSale && (
          <div className="space-y-6 text-left">
            
            {/* Visual Invoice Page mockup */}
            <div className="border border-border/80 bg-background/50 rounded-xl p-6 font-mono text-xs text-left space-y-5">
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">BONDHU ERP</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Enterprise Ledger Ledger</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground text-xs">{selectedSale.invoice_no}</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Date: {selectedSale.sale_date}</p>
                </div>
              </div>

              <div className="border-t border-dashed border-border py-4 grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <span className="text-muted-foreground block uppercase font-bold text-[8px] tracking-wider">Client Identity</span>
                  <span className="text-foreground font-bold text-xs leading-none mt-1.5 block">
                    {selectedSale.customer?.name || 'Walk-in Client'}
                  </span>
                  {selectedSale.customer?.phone && (
                    <span className="text-muted-foreground block mt-1">Phone: {selectedSale.customer.phone}</span>
                  )}
                  {selectedSale.customer?.email && (
                    <span className="text-muted-foreground block mt-0.5 truncate">Email: {selectedSale.customer.email}</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block uppercase font-bold text-[8px] tracking-wider">Shipping Address</span>
                  <p className="text-foreground font-medium mt-1 leading-relaxed">
                    {selectedSale.customer?.address || 'Walk-in Customer transaction'}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t border-dashed border-border pt-4">
                <div className="grid grid-cols-12 font-bold text-muted-foreground text-[9px] uppercase tracking-wider pb-1 border-b">
                  <span className="col-span-6">Product Description</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-4 text-right">Subtotal</span>
                </div>
                
                {selectedSale.items?.map((item: any) => {
                  const prod = products.find(p => p.id === item.product_id)
                  return (
                    <div key={item.id} className="grid grid-cols-12 text-[10px] py-2 border-b border-border/40 font-medium">
                      <span className="col-span-6 text-foreground font-bold leading-normal">
                        {prod ? prod.name : 'Unknown SKU'}
                        <span className="block text-[8px] text-muted-foreground font-normal">SKU: {prod ? prod.sku : '—'}</span>
                      </span>
                      <span className="col-span-2 text-right text-muted-foreground font-semibold">{item.quantity}</span>
                      <span className="col-span-4 text-right text-foreground font-bold">{formatCurrency(item.quantity * item.unit_price)}</span>
                    </div>
                  )
                })}
              </div>

              {/* Total Calcs */}
              <div className="border-t border-dashed border-border pt-4 space-y-1.5 text-right font-medium text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="text-foreground">{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Coupon Discount:</span>
                  <span className="text-destructive">-{formatCurrency(selectedSale.discount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Sales Tax Value:</span>
                  <span className="text-foreground">+{formatCurrency(selectedSale.tax)}</span>
                </div>
                
                <div className="flex justify-between text-sm font-extrabold border-t border-dashed border-border pt-2 text-foreground">
                  <span>GRAND TOTAL INVOICED:</span>
                  <span className="text-primary">{formatCurrency(selectedSale.grand_total)}</span>
                </div>
              </div>

            </div>

            {/* Print/Download PDF buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 border-t pt-4 mt-6">
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePrintInvoice(selectedSale)}
                  variant="outline"
                  className="gap-1.5 text-xs font-bold"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </Button>
                <Button
                  onClick={() => handleDownloadPDF(selectedSale)}
                  variant="outline"
                  className="gap-1.5 text-xs font-bold"
                >
                  <Download className="h-4 w-4" />
                  Save PDF File
                </Button>
              </div>
              <Button onClick={() => setIsDetailsOpen(false)}>Close Invoice</Button>
            </div>

          </div>
        )}
      </Dialog>

    </div>
  )
}
