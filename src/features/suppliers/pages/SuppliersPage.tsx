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
  Truck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { suppliersService } from '@/services/suppliersService'
import type { Supplier } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Drawer } from '@/components/ui/Drawer'
import { SkeletonTable, EmptyState, ErrorState } from '@/components/common/States'
import { toast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

// Zod validation schema
const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters'),
  phone: z.string().optional().default(''),
  email: z.string().email('Invalid email address').or(z.literal('')),
  address: z.string().optional().default(''),
})



export const SuppliersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  // React Query Fetch
  const { data: suppliers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersService.getAll(),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Omit<Supplier, 'id' | 'created_at'>) => suppliersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Supplier added!', 'Successfully registered vendor details.')
      setIsAddEditOpen(false)
    },
    onError: (err: any) => {
      toast.error('Failed to add supplier', err.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) => suppliersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Supplier updated!', 'Successfully modified details.')
      setIsAddEditOpen(false)
    },
    onError: (err: any) => {
      toast.error('Failed to update supplier', err.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Supplier deleted!', 'Successfully removed record.')
      setIsDeleteOpen(false)
    },
    onError: (err: any) => {
      toast.error('Failed to delete supplier', err.message)
    }
  })

  // Form hooks
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(supplierSchema),
  })

  const errs = errors as any

  const handleAddClick = () => {
    setSelectedSupplier(null)
    reset({ name: '', phone: '', email: '', address: '' })
    setIsAddEditOpen(true)
  }

  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    reset({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
    })
    setIsAddEditOpen(true)
  }

  const handleDeleteClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDeleteOpen(true)
  }

  const handleDetailsClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDetailsOpen(true)
  }

  const handleFormSubmit = (data: any) => {
    // Nullify empty strings to match DB schema
    const formattedData = {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
    };

    if (selectedSupplier) {
      updateMutation.mutate({ id: selectedSupplier.id, data: formattedData })
    } else {
      createMutation.mutate(formattedData)
    }
  }

  const handleConfirmDelete = () => {
    if (selectedSupplier) {
      deleteMutation.mutate(selectedSupplier.id)
    }
  }

  // Filter list
  const filteredSuppliers = suppliers.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.phone && s.phone.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term))
    );
  });

  // Paginate list
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Supplier Directory</h2>
        </div>
        <SkeletonTable rows={8} cols={5} />
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Supplier Directory</h2>
          <p className="text-sm text-muted-foreground">
            Manage your sourcing vendors, logistics suppliers, contact channels, and procurement histories.
          </p>
        </div>
        <Button onClick={handleAddClick} className="gap-1.5 shadow-sm shrink-0 self-start sm:self-center">
          <Plus className="h-4 w-4" />
          Add Supplier Profile
        </Button>
      </div>

      {/* Searching Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4!">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search suppliers by name, email, or telephone number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* List / Table */}
      {filteredSuppliers.length === 0 ? (
        <EmptyState
          title="No suppliers registered"
          description="Could not find any supplier matching search criteria. Add a new vendor profile."
          actionText="Add New Supplier"
          onAction={handleAddClick}
        />
      ) : (
        <Card className="shadow-sm overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Warehouse/Office Address</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedSuppliers.map((supp, idx) => (
                  <tr 
                    key={supp.id} 
                    className={`hover:bg-muted/40 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                  >
                    <td className="py-3.5 px-4 font-bold text-foreground">{supp.name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">{supp.phone || '—'}</td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">{supp.email || '—'}</td>
                    <td className="py-3.5 px-4 text-muted-foreground truncate max-w-[200px]" title={supp.address || ''}>
                      {supp.address || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleDetailsClick(supp)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          title="View Profile Drawer"
                          aria-label="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(supp)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          title="Edit"
                          aria-label="Edit supplier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteClick(supp)}
                            className="rounded p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete"
                            aria-label="Delete supplier"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredSuppliers.length)} of{' '}
                {filteredSuppliers.length} entries
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
        title={selectedSupplier ? 'Modify Supplier Profile' : 'Register Supplier Profile'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-left">
          <Input
            {...register('name')}
            label="Supplier Vendor Name"
            placeholder="e.g. Global Tech Distributors"
            error={errs.name?.message}
          />
          <Input
            {...register('phone')}
            label="Phone Number"
            placeholder="e.g. +1 (800) 555-0100"
            error={errs.phone?.message}
          />
          <Input
            {...register('email')}
            label="Email Address"
            placeholder="e.g. sales@globaltech.com"
            error={errs.email?.message}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Warehouse / Office Mailing Address
            </label>
            <textarea
              {...register('address')}
              rows={3}
              placeholder="e.g. 100 Distribution Way, Logistics Hub, Suite 40, TX"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
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
              {selectedSupplier ? 'Save Vendor Changes' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* B. DETAILS DRAWER */}
      <Drawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Supplier Vendor Details"
      >
        {selectedSupplier && (
          <div className="space-y-6 text-left">
            
            {/* Visual Avatar Card */}
            <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/60">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground leading-none">{selectedSupplier.name}</h3>
                <p className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Vendor Partner</p>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Telephone Number</span>
                  <span className="font-semibold text-foreground">{selectedSupplier.phone || 'No phone number registered.'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Email Address</span>
                  <span className="font-semibold text-foreground break-all">{selectedSupplier.email || 'No email registered.'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Physical Address</span>
                  <p className="text-foreground leading-relaxed mt-0.5 whitespace-pre-line">
                    {selectedSupplier.address || 'No physical address registered.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t pt-4">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Sourcing Partnership Since</span>
                  <span className="font-medium text-foreground">
                    {new Date(selectedSupplier.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Button onClick={() => setIsDetailsOpen(false)} className="w-full">Close Profile</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* C. DELETE CONFIRMATION */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion Warning"
      >
        {selectedSupplier && (
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-destructive p-3.5 rounded-lg text-sm leading-relaxed">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="font-bold">Dangerous Action</p>
                <p className="mt-0.5 text-xs text-destructive/90">
                  Are you absolutely sure you want to delete supplier <strong className="font-black select-text">"{selectedSupplier.name}"</strong>? This will permanently wipe this contact record.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Please note that deleting this supplier will fail if they have linked purchase order ledgers in database.
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
                Confirm Delete Supplier
              </Button>
            </div>
          </div>
        )}
      </Dialog>

    </div>
  )
}
