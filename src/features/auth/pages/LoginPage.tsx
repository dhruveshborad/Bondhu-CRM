import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { KeyRound, Mail, Sparkles, Building2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/store/toastStore'
import { isDemoMode } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormInputs = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  })

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true)
    try {
      const res = await login(data.email, data.password)
      if (res.success) {
        toast.success('Logged in successfully!', `Welcome back!`)
        navigate('/')
      } else {
        toast.error('Authentication failed', res.error || 'Invalid credentials')
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
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              register a new company account
            </Link>
          </p>
        </div>

        {/* Demo Mode Alert Banner */}
        {isDemoMode && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs rounded-lg p-4 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              Demo Mode Configured
            </div>
            <p>
              Supabase environment variables are missing. Log in with any email and password to access the offline simulation. Registered users are saved in LocalStorage.
            </p>
          </div>
        )}

        {/* Form Container */}
        <div className="rounded-xl border bg-card p-6 shadow-lg">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {/* Email Field */}
            <div className="relative">
              <Input
                {...register('email')}
                label="Corporate Email Address"
                type="email"
                placeholder="you@company.com"
                error={errors.email?.message}
                className="pl-9"
              />
              <Mail className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground/70" />
            </div>

            {/* Password Field */}
            <div className="relative">
              <Input
                {...register('password')}
                label="Account Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                className="pl-9"
              />
              <KeyRound className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground/70" />
            </div>

            {/* Remember Session checkbox */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring bg-transparent cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-muted-foreground font-semibold cursor-pointer">
                  Remember my session
                </label>
              </div>

              <div className="text-xs">
                <a href="#" className="font-semibold text-primary hover:underline" onClick={(e) => {
                  e.preventDefault();
                  toast.info('Feature unavailable', 'Please contact your system administrator to reset password.');
                }}>
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full text-sm font-semibold tracking-wide"
              loading={loading}
            >
              Sign In to ERP
            </Button>
          </form>
        </div>

        {/* System Credentials Footer info */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium bg-muted/40 py-2.5 px-4 rounded-lg border border-border/40 select-text">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>Mini ERP Enterprise v1.0.0</span>
        </div>
      </motion.div>
    </div>
  )
}
