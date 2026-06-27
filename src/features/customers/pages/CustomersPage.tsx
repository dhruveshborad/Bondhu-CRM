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
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { customersService } from '@/services/customersService'
import type { Customer } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Drawer } from '@/components/ui/Drawer'
import { SkeletonTable, EmptyState, ErrorState } from '@/components/common/States'
import { toast } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

// Zod validation schema
const customerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  phone: z.string().optional().default(''),
  email: z.string().email('Invalid email address').or(z.literal('')),
  address: z.string().optional().default(''),
})



export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const isStaff = user?.role === 'staff'
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // React Query Fetch
  const { data: customers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersService.getAll(),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Omit<Customer, 'id' | 'created_at'>) => customersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Customer added!', 'Successfully registered customer details.')
      setIsAddEditOpen(false)
    },
    onError: (err: any) => {
      toast.error('Failed to add customer', err.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => customersService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Customer updated!', 'Successfully modified details.')
      setIsAddEditOpen(false)
    },
    onError: (err: any) => {
      toast.error('Failed to update customer', err.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Customer deleted!', 'Successfully removed record.')
      setIsDeleteOpen(false)
    },
    onError: (err: any) => {
      toast.error('Failed to delete customer', err.message)
    }
  })

  // Form hooks
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(customerSchema),
  })

  const errs = errors as any

  const handleAddClick = () => {
    setSelectedCustomer(null)
    reset({ name: '', phone: '', email: '', address: '' })
    setIsAddEditOpen(true)
  }

  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    reset({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    })
    setIsAddEditOpen(true)
  }

  const handleDeleteClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDeleteOpen(true)
  }

  const handleDetailsClick = (customer: Customer) => {
    setSelectedCustomer(customer)
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

    if (selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data: formattedData })
    } else {
      createMutation.mutate(formattedData)
    }
  }

  const handleConfirmDelete = () => {
    if (selectedCustomer) {
      deleteMutation.mutate(selectedCustomer.id)
    }
  }

  // Filter list
  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  // Paginate list
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Customer Directory</h2>
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Customer Directory</h2>
          <p className="text-sm text-muted-foreground">
            Manage your consumer relations catalog, contact details, shipping addresses, and purchase history.
          </p>
        </div>
        {!isStaff && (
          <Button onClick={handleAddClick} className="gap-1.5 shadow-sm shrink-0 self-start sm:self-center">
            <Plus className="h-4 w-4" />
            Add Customer Profile
          </Button>
        )}
      </div>

      {/* Searching Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4!">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers by name, email, or telephone number..."
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
      {filteredCustomers.length === 0 ? (
        <EmptyState
          title="No customers registered"
          description="Could not find any customer matching search criteria. Add a new customer directory contact."
          actionText="Add New Customer"
          onAction={handleAddClick}
        />
      ) : (
        <Card className="shadow-sm overflow-hidden border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Office/Shipping Address</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedCustomers.map((cust, idx) => (
                  <tr 
                    key={cust.id} 
                    className={`hover:bg-muted/40 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                  >
                    <td className="py-3.5 px-4 font-bold text-foreground">{cust.name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">{cust.phone || '—'}</td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">{cust.email || '—'}</td>
                    <td className="py-3.5 px-4 text-muted-foreground truncate max-w-[200px]" title={cust.address || ''}>
                      {cust.address || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleDetailsClick(cust)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          title="View Profile Drawer"
                          aria-label="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {!isStaff && (
                          <button
                            onClick={() => handleEditClick(cust)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title="Edit"
                            aria-label="Edit customer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteClick(cust)}
                            className="rounded p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete"
                            aria-label="Delete customer"
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
                {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of{' '}
                {filteredCustomers.length} entries
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
        title={selectedCustomer ? 'Modify Customer Profile' : 'Register Customer Profile'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-left">
          <Input
            {...register('name')}
            label="Customer Name / Agency"
            placeholder="e.g. Acme Corporation"
            error={errs.name?.message}
          />
          <Input
            {...register('phone')}
            label="Phone Number"
            placeholder="e.g. +1 (555) 012-3456"
            error={errs.phone?.message}
          />
          <Input
            {...register('email')}
            label="Email Address"
            placeholder="e.g. billing@acme.com"
            error={errs.email?.message}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Physical Shipping / Billing Address
            </label>
            <textarea
              {...register('address')}
              rows={3}
              placeholder="e.g. 102 Industrial Way, Suite A, Silicon Valley, CA"
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
              {selectedCustomer ? 'Save Profile Changes' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* B. DETAILS DRAWER */}
      <Drawer
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Customer Profile Details"
      >
        {selectedCustomer && (
          <div className="space-y-6 text-left">
            
            {/* Visual Avatar Card */}
            <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/60">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                {selectedCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground leading-none">{selectedCustomer.name}</h3>
                <p className="text-[10px] text-muted-foreground mt-1.5 uppercase font-bold tracking-wider">Client Identity</p>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Telephone Number</span>
                  <span className="font-semibold text-foreground">{selectedCustomer.phone || 'No phone number registered.'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Email Address</span>
                  <span className="font-semibold text-foreground break-all">{selectedCustomer.email || 'No email registered.'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Physical Address</span>
                  <p className="text-foreground leading-relaxed mt-0.5 whitespace-pre-line">
                    {selectedCustomer.address || 'No physical address registered.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t pt-4">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Registration Date</span>
                  <span className="font-medium text-foreground">
                    {new Date(selectedCustomer.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
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
        {selectedCustomer && (
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-destructive p-3.5 rounded-lg text-sm leading-relaxed">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="font-bold">Dangerous Action</p>
                <p className="mt-0.5 text-xs text-destructive/90">
                  Are you absolutely sure you want to delete customer <strong className="font-black select-text">"{selectedCustomer.name}"</strong>? This will permanently wipe this contact.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Please note that deleting this customer will fail if they have processed sales orders or receipts.
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
                Confirm Delete Customer
              </Button>
            </div>
          </div>
        )}
      </Dialog>

    </div>
  )
}
