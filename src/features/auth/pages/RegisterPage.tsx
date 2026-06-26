import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { KeyRound, Mail, User, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { toast } from '@/store/toastStore'
import { isDemoMode } from '@/lib/supabase'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  role: z.enum(['admin', 'manager', 'staff']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
})

type RegisterFormInputs = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { registerUser } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', role: 'admin', password: '', confirmPassword: '' }
  })

  const errs = errors as any

  const onSubmit = async (data: RegisterFormInputs) => {
    setLoading(true)
    try {
      const res = await registerUser(data.email, data.password, data.fullName, data.role)
      if (res.success) {
        if (isDemoMode) {
          toast.success('Registration successful!', 'Account created in local demo database and logged in.');
          navigate('/')
        } else {
          toast.success('Registration initiated!', 'Check your inbox for a Supabase email confirmation link.');
          navigate('/login')
        }
      } else {
        toast.error('Registration failed', res.error || 'Failed to create account')
      }
    } catch (err: any) {
      toast.error('An error occurred', err.message || 'Please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      
      {/* Visual background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md space-y-8 z-10"
      >
        {/* Logo / Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xl shadow-md border">
            BG
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground">
            Create an Account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Demo Mode Alert Banner */}
        {isDemoMode && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs rounded-lg p-4 space-y-1 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              Demo Mode Configured
            </div>
            <p>
              Supabase environment variables are missing. Submitting this form will register a simulated tenant in your browser LocalStorage and log you in automatically.
            </p>
          </div>
        )}

        {/* Form Container */}
        <div className="rounded-xl border bg-card p-6 shadow-lg">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            
            {/* Full Name Field */}
            <div className="relative">
              <Input
                {...register('fullName')}
                label="Full Name / Representative"
                type="text"
                placeholder="Alex Mercer"
                error={errs.fullName?.message}
                className="pl-9"
              />
              <User className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground/70" />
            </div>

            {/* Email Field */}
            <div className="relative">
              <Input
                {...register('email')}
                label="Corporate Email Address"
                type="email"
                placeholder="you@company.com"
                error={errs.email?.message}
                className="pl-9"
              />
              <Mail className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground/70" />
            </div>

            {/* Role Select Field */}
            <div className="relative">
              <Select
                {...register('role')}
                label="Organizational Role / Permissions"
                options={[
                  { value: 'admin', label: 'Admin (Full Access)' },
                  { value: 'manager', label: 'Manager (Edit Access, No Settings)' },
                  { value: 'staff', label: 'Staff (Salesperson, No Reports)' }
                ]}
                error={errs.role?.message}
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <Input
                {...register('password')}
                label="Account Password"
                type="password"
                placeholder="••••••••"
                error={errs.password?.message}
                className="pl-9"
              />
              <KeyRound className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground/70" />
            </div>

            {/* Confirm Password Field */}
            <div className="relative">
              <Input
                {...register('confirmPassword')}
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                error={errs.confirmPassword?.message}
                className="pl-9"
              />
              <KeyRound className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground/70" />
            </div>

            {/* Consent Policy */}
            <p className="text-[10px] text-muted-foreground text-center leading-normal">
              By signing up, you agree to setup this enterprise ERP node and store transaction ledgers in accordance with our terms of service.
            </p>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full text-sm font-semibold tracking-wide mt-2"
              loading={loading}
            >
              Initialize Account
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
