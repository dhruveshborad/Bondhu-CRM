import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  ArrowLeft,
  Calendar,
  Truck,
  Eye,
  PlusCircle,
  FileText
} from 'lucide-react'
import { purchasesService } from '@/services/purchasesService'
import { suppliersService } from '@/services/suppliersService'
import { productsService } from '@/services/productsService'
import type { Purchase } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { SkeletonTable, EmptyState, ErrorState } from '@/components/common/States'
import { toast } from '@/store/toastStore'
import { useStoreStore } from '@/store/storeStore'

// Zod schemas for validation
const purchaseItemSchema = z.object({
  product_id: z.string().min(1, 'Select a product SKU'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Price must be positive'),
})

const purchaseSchema = z.object({
  supplier_id: z.string().min(1, 'Select a supplier'),
  purchase_date: z.string().min(1, 'Select a purchase date'),
  items: z.array(purchaseItemSchema).min(1, 'Add at least one product row'),
})

export const PurchasesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isFormView, setIsFormView] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const { activeStoreId } = useStoreStore()

  // React Queries
  const { data: purchases = [], isLoading: isPurchasesLoading, error: purchasesErr, refetch } = useQuery({
    queryKey: ['purchases', activeStoreId],
    queryFn: () => purchasesService.getAll(activeStoreId || undefined),
  })

  const { data: suppliers = [], isLoading: isSuppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersService.getAll(),
  })

  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['products', activeStoreId],
    queryFn: () => productsService.getAll(activeStoreId || undefined),
  })

  // Create Purchase Order Mutation
  const createPurchaseMutation = useMutation({
    mutationFn: ({ purchase, items }: { purchase: any; items: any[] }) => 
      purchasesService.create(purchase, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Purchase order created!', 'Successfully added stock and logged sourcing ledger.')
      setIsFormView(false)
    },
    onError: (err: any) => {
      toast.error('Failed to create purchase', err.message)
    }
  })

  // React Hook Form for dynamic rows
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplier_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      items: [{ product_id: '', quantity: 1, unit_price: 0 }]
    }
  })

  // Dynamic row array hooks
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchItems = watch('items')
  const purchaseTotal = watchItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0) || 0;

  const errs = errors as any
  const itemErrors = errs.items

  // Change product trigger: autopopulate cost price
  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId)
    if (prod) {
      setValue(`items.${index}.unit_price`, prod.purchase_price)
    }
  }

  const handleCreateNewClick = () => {
    reset({
      supplier_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      items: [{ product_id: '', quantity: 1, unit_price: 0 }]
    })
    setIsFormView(true)
  }

  const handleFormSubmit = (data: any) => {
    const purchasePayload = {
      supplier_id: data.supplier_id,
      purchase_date: data.purchase_date,
      store_id: activeStoreId || null
    }
    createPurchaseMutation.mutate({ purchase: purchasePayload, items: data.items })
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }

  if (isPurchasesLoading || isSuppliersLoading || isProductsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Purchase Ledgers</h2>
        </div>
        <SkeletonTable rows={8} cols={5} />
      </div>
    )
  }

  if (purchasesErr) {
    return <ErrorState onRetry={refetch} />
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* View 1: Dynamic Purchase Order Form */}
      {isFormView ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header Back Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFormView(false)}
              className="rounded-lg border bg-card p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Sourcing Entry Invoicing</h2>
              <p className="text-sm text-muted-foreground">Add stock catalog products by placing a purchase order.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Sourcing Vendor */}
              <Card className="col-span-2 shadow-sm">
                <CardHeader className="border-b pb-4 mb-4">
                  <CardTitle className="text-sm uppercase tracking-wider font-bold text-muted-foreground">Order Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Select
                    {...register('supplier_id')}
                    label="Supplier Vendor"
                    placeholder="Choose Sourcing Vendor"
                    options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                    error={errs.supplier_id?.message}
                  />

                  <Input
                    {...register('purchase_date')}
                    label="Purchase Log Date"
                    type="date"
                    error={errs.purchase_date?.message}
                  />
                </CardContent>
              </Card>

              {/* Live Invoice Details */}
              <Card className="shadow-sm border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-wider font-extrabold text-primary">Live Calculation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block uppercase">Total Cost</span>
                    <span className="text-3xl font-extrabold text-foreground">{formatCurrency(purchaseTotal)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground leading-normal">
                    Stock increments will trigger immediately upon finalization. Double check vendor SKU cost metrics.
                  </div>
                  <Button
                    type="submit"
                    className="w-full font-bold shadow-md"
                    loading={createPurchaseMutation.isPending}
                  >
                    Finalize Purchase Order
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Dynamic Product Rows */}
            <Card className="shadow-sm border">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                <div>
                  <CardTitle>Dynamic SKU Order Rows</CardTitle>
                  <CardDescription>Configure products being sourced, quantities, and cost parameters</CardDescription>
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

                <div className="space-y-3.5">
                  {fields.map((field: any, idx: number) => (
                    <div 
                      key={field.id} 
                      className="grid grid-cols-12 gap-3 items-end bg-muted/20 p-3 rounded-lg border border-border/40 relative"
                    >
                      {/* Product SKU Selector */}
                      <div className="col-span-12 sm:col-span-6 text-left">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">
                          Select Product SKU
                        </label>
                        <select
                          {...register(`items.${idx}.product_id` as const)}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none"
                        >
                          <option value="" disabled>Choose Product Barcode</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) — Stock: {p.stock}
                            </option>
                          ))}
                        </select>
                        {itemErrors?.[idx]?.product_id && (
                          <p className="text-xs text-destructive mt-1 font-medium">{itemErrors[idx].product_id.message}</p>
                        )}
                      </div>

                      {/* Quantity Input */}
                      <div className="col-span-6 sm:col-span-2">
                        <Input
                          {...register(`items.${idx}.quantity` as const)}
                          label="Qty"
                          type="number"
                          error={itemErrors?.[idx]?.quantity?.message}
                        />
                      </div>

                      {/* Sourcing Cost Price */}
                      <div className="col-span-6 sm:col-span-3">
                        <Input
                          {...register(`items.${idx}.unit_price` as const)}
                          label="Cost Price ($)"
                          type="number"
                          step="0.01"
                          error={itemErrors?.[idx]?.unit_price?.message}
                        />
                      </div>

                      {/* Delete Action */}
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
                  ))}
                </div>
              </CardContent>
            </Card>
          </form>
        </motion.div>
      ) : (
        /* View 2: Sourcing Ledger History List */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Header block */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Purchase Order Sourcing</h2>
              <p className="text-sm text-muted-foreground">
                Review historical logs, supplier sourcing receipts, cost inputs, and warehouse replenishments.
              </p>
            </div>
            <Button onClick={handleCreateNewClick} className="gap-1.5 shadow-sm shrink-0 self-start sm:self-center">
              <Plus className="h-4 w-4" />
              New Purchase Order
            </Button>
          </div>

          {/* Sourcing Ledger Table */}
          {purchases.length === 0 ? (
            <EmptyState
              title="No purchases logged"
              description="Warehouse replenish logs are empty. Sourcing new catalog items will trigger stock additions automatically."
              actionText="Log Sourcing Order"
              onAction={handleCreateNewClick}
            />
          ) : (
            <Card className="shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Supplier Partner</th>
                      <th className="py-3 px-4 text-center">Order Log Date</th>
                      <th className="py-3 px-4 text-right">Items Quantity</th>
                      <th className="py-3 px-4 text-right">Total Sourcing Cost</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {purchases.map((purchase, idx) => {
                      const itemsCount = purchase.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                      return (
                        <tr 
                          key={purchase.id} 
                          className={`hover:bg-muted/40 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                        >
                          <td className="py-3.5 px-4 font-semibold text-xs text-muted-foreground uppercase">{purchase.id.substring(0, 8)}...</td>
                          <td className="py-3.5 px-4 font-bold text-foreground">{purchase.supplier?.name || 'Unknown Supplier'}</td>
                          <td className="py-3.5 px-4 text-center text-muted-foreground">{purchase.purchase_date}</td>
                          <td className="py-3.5 px-4 text-right font-medium text-foreground">{itemsCount} units</td>
                          <td className="py-3.5 px-4 text-right font-bold text-foreground">{formatCurrency(purchase.total_amount)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedPurchase(purchase)
                                setIsDetailsOpen(true)
                              }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                              title="View Order items"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>
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

      {/* C. DETAIL EXPANDER DIALOG */}
      <Dialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Sourcing Purchase Order Details"
      >
        {selectedPurchase && (
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b pb-3.5 mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                <FileText className="h-4 w-4" />
                Purchase: {selectedPurchase.id.substring(0, 8)}...
              </div>
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {selectedPurchase.purchase_date}
              </span>
            </div>

            {/* Vendor Partner */}
            <div className="bg-muted/40 p-3 rounded-lg border flex gap-3 items-start text-xs">
              <Truck className="h-5 w-5 text-primary shrink-0" />
              <div>
                <span className="font-bold text-foreground block">Supplier Sourcing Vendor</span>
                <span className="font-medium text-muted-foreground mt-0.5 block">{selectedPurchase.supplier?.name}</span>
                {selectedPurchase.supplier?.phone && (
                  <span className="text-[10px] text-muted-foreground/80 mt-0.5 block">Contact: {selectedPurchase.supplier.phone}</span>
                )}
              </div>
            </div>

            {/* Order Items Table */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Ordered SKU Products</span>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b bg-muted/65 text-muted-foreground font-semibold">
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Cost Price</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items?.map((item) => (
                      <tr key={item.id} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-foreground block">{item.product?.name || 'Unknown SKU'}</span>
                          <span className="text-[10px] text-muted-foreground">SKU: {item.product?.sku || '—'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{formatCurrency(item.unit_price)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-foreground">{formatCurrency(item.quantity * item.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sourcing Invoice Totals */}
            <div className="flex items-center justify-between border-t pt-4 mt-6">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground uppercase">Total Cost Amount:</span>
                <span className="text-lg font-extrabold text-foreground">{formatCurrency(selectedPurchase.total_amount)}</span>
              </div>
              <Button onClick={() => setIsDetailsOpen(false)}>Close Order Details</Button>
            </div>
          </div>
        )}
      </Dialog>

    </div>
  )
}
