import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  ArrowUpDown,
  Filter,
  AlertCircle
} from 'lucide-react'
import { productsService } from '@/services/productsService'
import type { Product } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { SkeletonTable, EmptyState, ErrorState } from '@/components/common/States'
import { toast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'
import { useStoreStore } from '@/store/storeStore'

// Zod Schema for validation
const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  category: z.string().min(1, 'Category is required'),
  purchase_price: z.coerce.number().min(0, 'Purchase price must be positive'),
  selling_price: z.coerce.number().min(0, 'Selling price must be positive'),
  stock: z.coerce.number().int().min(0, 'Current stock must be at least 0'),
  min_stock: z.coerce.number().int().min(0, 'Minimum stock must be at least 0'),
  description: z.string().optional().default(''),
}).refine((data) => data.selling_price >= data.purchase_price, {
  path: ['selling_price'],
  message: 'Selling price should be greater than or equal to purchase price (negative margin)',
})



export const ProductsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const isStaff = user?.role === 'staff'
  
  // State variables
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')
  const [sortField, setSortField] = useState<keyof Product>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Dialog Modals State
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  const { activeStoreId } = useStoreStore()

  // React Query Fetch
  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey: ['products', activeStoreId],
    queryFn: () => productsService.getAll(activeStoreId || undefined),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Omit<Product, 'id' | 'created_at'>) => productsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Product created!', 'Successfully added to the database.')
      setIsAddEditOpen(false)
    },
    onError: (err: any) => {
      toast.error('Failed to create product', err.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => productsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Product updated!', 'Successfully modified details.')
      setIsAddEditOpen(false)
    },
    onError: (err: any) => {
      toast.error('Failed to update product', err.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Product deleted!', 'The SKU was successfully removed.')
      setIsDeleteOpen(false)
    },
    onError: (err: any) => {
      toast.error('Failed to delete product', err.message)
    }
  })

  // Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(productSchema),
  })

  const errs = errors as any

  // Triggered on Add Product click
  const handleAddClick = () => {
    setSelectedProduct(null)
    reset({
      name: '',
      sku: '',
      category: '',
      purchase_price: 0,
      selling_price: 0,
      stock: 0,
      min_stock: 10,
      description: '',
    })
    setIsAddEditOpen(true)
  }

  // Triggered on Edit Product click
  const handleEditClick = (product: Product) => {
    setSelectedProduct(product)
    reset({
      name: product.name,
      sku: product.sku,
      category: product.category,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock: product.stock,
      min_stock: product.min_stock,
      description: product.description || '',
    })
    setIsAddEditOpen(true)
  }

  // Triggered on Delete Product click
  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteOpen(true)
  }

  // Triggered on Details Product click
  const handleDetailsClick = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailsOpen(true)
  }

  const handleFormSubmit = (data: any) => {
    if (selectedProduct) {
      updateMutation.mutate({ id: selectedProduct.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleConfirmDelete = () => {
    if (selectedProduct) {
      deleteMutation.mutate(selectedProduct.id)
    }
  }

  // Sort helper
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Get Stock Badge variant & label
  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: 'Out of Stock', variant: 'destructive' as const }
    if (stock <= minStock) return { label: 'Low Stock', variant: 'warning' as const }
    return { label: 'In Stock', variant: 'success' as const }
  }

  // Categories list for filter dropdown
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))]

  // Filtered & Sorted products list
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter
      
      const status = getStockStatus(p.stock, p.min_stock).label
      const matchesStock = 
        stockFilter === 'All' ||
        (stockFilter === 'In Stock' && status === 'In Stock') ||
        (stockFilter === 'Low Stock' && status === 'Low Stock') ||
        (stockFilter === 'Out of Stock' && status === 'Out of Stock')

      return matchesSearch && matchesCategory && matchesStock
    })
    .sort((a, b) => {
      const aVal = a[sortField] ?? ''
      const bVal = b[sortField] ?? ''
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Product Inventory</h2>
        </div>
        <SkeletonTable rows={8} cols={7} />
      </div>
    )
  }

  if (error) {
    return <ErrorState onRetry={refetch} />
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Header Block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Products Catalog</h2>
          <p className="text-sm text-muted-foreground">
            Manage warehouse inventory items, pricing margins, SKU barcodes, and threshold limits.
          </p>
        </div>
        {!isStaff && (
          <Button onClick={handleAddClick} className="gap-1.5 shadow-sm shrink-0 self-start sm:self-center">
            <Plus className="h-4 w-4" />
            Add Product SKU
          </Button>
        )}
      </div>

      {/* Searching & Filtering Panel */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products by name or SKU code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Filter Category */}
          <div className="w-full md:w-48 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Stock */}
          <div className="w-full md:w-48">
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none"
            >
              <option value="All">All Stock Levels</option>
              <option value="In Stock">In Stock Only</option>
              <option value="Low Stock">Low Stock Alerts</option>
              <option value="Out of Stock">Out of Stock Only</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Could not find any products matching your search keywords or active filters. Try adding a new product SKU."
          actionText="Add New Product"
          onAction={handleAddClick}
        />
      ) : (
        <Card className="shadow-sm overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                  <th onClick={() => handleSort('name')} className="py-3 px-4 cursor-pointer hover:bg-muted/70 select-none transition-colors">
                    <span className="flex items-center gap-1.5">Product Name <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th onClick={() => handleSort('sku')} className="py-3 px-4 cursor-pointer hover:bg-muted/70 select-none transition-colors">
                    <span className="flex items-center gap-1.5">SKU <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th onClick={() => handleSort('category')} className="py-3 px-4 cursor-pointer hover:bg-muted/70 select-none transition-colors">
                    <span className="flex items-center gap-1.5">Category <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th onClick={() => handleSort('purchase_price')} className="py-3 px-4 cursor-pointer hover:bg-muted/70 select-none transition-colors text-right">
                    <span className="flex items-center gap-1.5 justify-end">Purchase Price <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th onClick={() => handleSort('selling_price')} className="py-3 px-4 cursor-pointer hover:bg-muted/70 select-none transition-colors text-right">
                    <span className="flex items-center gap-1.5 justify-end">Selling Price <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th onClick={() => handleSort('stock')} className="py-3 px-4 cursor-pointer hover:bg-muted/70 select-none transition-colors text-right">
                    <span className="flex items-center gap-1.5 justify-end">Stock <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedProducts.map((prod, idx) => {
                  const status = getStockStatus(prod.stock, prod.min_stock)
                  return (
                    <tr 
                      key={prod.id} 
                      className={`hover:bg-muted/40 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                    >
                      <td className="py-3.5 px-4 font-bold text-foreground">{prod.name}</td>
                      <td className="py-3.5 px-4 font-semibold text-muted-foreground text-xs">{prod.sku}</td>
                      <td className="py-3.5 px-4 text-muted-foreground">{prod.category}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-muted-foreground">{formatCurrency(prod.purchase_price)}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-foreground">{formatCurrency(prod.selling_price)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">{prod.stock}</td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleDetailsClick(prod)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {!isStaff && (
                            <button
                              onClick={() => handleEditClick(prod)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteClick(prod)}
                              className="rounded p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of{' '}
                {filteredProducts.length} entries
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* A. ADD/EDIT DIALOG */}
      <Dialog
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={selectedProduct ? 'Modify Product SKU' : 'Register New Product SKU'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                {...register('name')}
                label="Product SKU Name"
                placeholder="e.g. Dell Latitude 5440"
                error={errs.name?.message}
              />
            </div>
            <div>
              <Input
                {...register('sku')}
                label="SKU Barcode / Code"
                placeholder="e.g. DELL-LAT-5440"
                error={errs.sku?.message}
                disabled={!!selectedProduct} // Prevent changing SKU after creation
              />
            </div>
            <div>
              <Input
                {...register('category')}
                label="Category Layer"
                placeholder="e.g. Electronics"
                error={errs.category?.message}
              />
            </div>
            <div>
              <Input
                {...register('purchase_price')}
                label="Cost Sourcing Price ($)"
                type="number"
                step="0.01"
                placeholder="100.00"
                error={errs.purchase_price?.message}
              />
            </div>
            <div>
              <Input
                {...register('selling_price')}
                label="Retail Selling Price ($)"
                type="number"
                step="0.01"
                placeholder="150.00"
                error={errs.selling_price?.message}
              />
            </div>
            <div>
              <Input
                {...register('stock')}
                label="Initial Quantity In Stock"
                type="number"
                placeholder="10"
                error={errs.stock?.message}
              />
            </div>
            <div>
              <Input
                {...register('min_stock')}
                label="Minimum Alert Limit"
                type="number"
                placeholder="5"
                error={errs.min_stock?.message}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Product SKU Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Describe specifications, warranty, or catalog details..."
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {selectedProduct ? 'Save Product Changes' : 'Publish Product SKU'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* B. DETAILS DIALOG */}
      <Dialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Product Catalog Specifications"
      >
        {selectedProduct && (
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b pb-3 mb-2">
              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedProduct.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">SKU ID: {selectedProduct.sku}</p>
              </div>
              <Badge variant={getStockStatus(selectedProduct.stock, selectedProduct.min_stock).variant}>
                {getStockStatus(selectedProduct.stock, selectedProduct.min_stock).label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block font-semibold uppercase">Category</span>
                <span className="font-medium text-foreground">{selectedProduct.category}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-semibold uppercase">Created Timestamp</span>
                <span className="font-medium text-foreground">{new Date(selectedProduct.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-semibold uppercase">Warehouse Cost Price</span>
                <span className="font-semibold text-foreground">{formatCurrency(selectedProduct.purchase_price)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-semibold uppercase">Retail Margin Price</span>
                <span className="font-bold text-primary">{formatCurrency(selectedProduct.selling_price)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-semibold uppercase">Available Quantity</span>
                <span className="font-bold text-foreground">{selectedProduct.stock} units</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-semibold uppercase">Replenish Limit Threshold</span>
                <span className="font-medium text-foreground">{selectedProduct.min_stock} units</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground block font-semibold uppercase">Catalog description</span>
                <p className="font-normal text-muted-foreground bg-muted/40 p-2.5 rounded-lg border mt-1 leading-relaxed text-xs">
                  {selectedProduct.description || 'No catalog specifications registered.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t pt-4 mt-6">
              <Button onClick={() => setIsDetailsOpen(false)}>Close Specifications</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* C. DELETE CONFIRMATION DIALOG */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion Warning"
      >
        {selectedProduct && (
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-destructive p-3.5 rounded-lg text-sm leading-relaxed">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="font-bold">Dangerous Action</p>
                <p className="mt-0.5 text-xs text-destructive/90">
                  Are you absolutely sure you want to delete product SKU <strong className="font-black select-text">"{selectedProduct.name}"</strong>? This action will permanently remove it from catalog.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Please note that deleting this product will fail if it has purchase order or sales receipt records in database.
            </p>

            <div className="flex justify-end gap-2 border-t pt-4 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                loading={deleteMutation.isPending}
              >
                Confirm Delete SKU
              </Button>
            </div>
          </div>
        )}
      </Dialog>

    </div>
  )
}
