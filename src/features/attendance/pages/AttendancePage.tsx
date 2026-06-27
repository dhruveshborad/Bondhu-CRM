import React, { useState, useEffect, useCallback } from 'react'
import { 
  Clock, 
  MapPin, 
  Search, 
  Calendar, 
  User, 
  Briefcase, 
  CheckCircle2, 
  TrendingUp, 
  Filter,
  FileSpreadsheet,
  Users,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Plus,
  Trash2,
  ShieldAlert
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useStoreStore } from '@/store/storeStore'
import { useAttendanceStore } from '@/store/attendanceStore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/store/toastStore'
import { profilesService } from '@/services/profilesService'
import { tasksService } from '@/services/tasksService'
import type { Profile, Task } from '@/types'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export const AttendancePage: React.FC = () => {
  const { user } = useAuthStore()
  const { stores, activeStoreId, fetchStores } = useStoreStore()
  const { 
    currentSession, 
    logs, 
    allLogs, 
    loading, 
    clockIn, 
    clockOut, 
    fetchUserLogs, 
    fetchAllLogs,
    checkActiveSession
  } = useAttendanceStore()

  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'my-logs' | 'workforce' | 'calendar' | 'tasks' | 'roles'>('my-logs')
  
  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [storeFilter, setStoreFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  // Calendar State
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)

  // Tasks & Profiles state
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [taskStoreFilter, setTaskStoreFilter] = useState('all')

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskAssignedTo, setTaskAssignedTo] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskStoreId, setTaskStoreId] = useState('')

  // Live timer for active session
  const [elapsedTime, setElapsedTime] = useState('00:00:00')

  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [pendingRoleUpdate, setPendingRoleUpdate] = useState<{ profileId: string; role: 'admin' | 'manager' | 'staff' } | null>(null)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const loadTasksAndProfiles = useCallback(async () => {
    setTasksLoading(true)
    try {
      const tList = await tasksService.getAll()
      setTasks(tList)
      
      if (user?.role === 'admin' || user?.role === 'manager') {
        const pList = await profilesService.getAll()
        setProfiles(pList)
      }
    } catch (e: any) {
      toast.error('Failed to load tasks/profiles', e.message)
    } finally {
      setTasksLoading(false)
    }
  }, [user?.role])

  useEffect(() => {
    fetchStores().then((sList) => {
      if (sList.length > 0) {
        setSelectedStoreId(activeStoreId || sList[0].id)
      }
    })
    checkActiveSession()
    fetchUserLogs()
    loadTasksAndProfiles()
    
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchAllLogs()
    }
  }, [activeStoreId, user?.role, fetchStores, checkActiveSession, fetchUserLogs, fetchAllLogs, loadTasksAndProfiles])

  // Timer effect
  useEffect(() => {
    if (!currentSession) {
      setElapsedTime('00:00:00')
      return
    }

    const updateTimer = () => {
      const start = new Date(currentSession.clock_in).getTime()
      const now = Date.now()
      const diffMs = now - start
      if (diffMs < 0) {
        setElapsedTime('00:00:00')
        return
      }
      const secs = Math.floor(diffMs / 1000)
      const hours = Math.floor(secs / 3600)
      const minutes = Math.floor((secs % 3600) / 60)
      const seconds = secs % 60

      const pad = (num: number) => String(num).padStart(2, '0')
      setElapsedTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`)
    }

    updateTimer()
    const timerInterval = setInterval(updateTimer, 1000)
    return () => clearInterval(timerInterval)
  }, [currentSession])

  const handleClockIn = async () => {
    if (!selectedStoreId) {
      toast.error('Please select a store location first.')
      return
    }
    try {
      await clockIn(selectedStoreId)
      const storeName = stores.find(s => s.id === selectedStoreId)?.name || 'Store'
      toast.success('Clocked In Successfully', `You clocked in at ${storeName}.`)
      fetchUserLogs()
      if (user?.role === 'admin' || user?.role === 'manager') {
        fetchAllLogs()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to clock in.')
    }
  }

  const handleClockOut = async () => {
    try {
      await clockOut()
      toast.success('Clocked Out Successfully', 'Your attendance session has been closed.')
      fetchUserLogs()
      if (user?.role === 'admin' || user?.role === 'manager') {
        fetchAllLogs()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to clock out.')
    }
  }

  // Task creation handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle || !taskAssignedTo || !taskDueDate) {
      toast.error('Please complete all required fields.')
      return
    }

    try {
      await tasksService.create({
        assigned_to: taskAssignedTo,
        store_id: taskStoreId || null,
        title: taskTitle,
        description: taskDescription || null,
        due_date: taskDueDate
      })
      toast.success('Task Assigned', 'The task has been successfully assigned.')
      setTaskTitle('')
      setTaskDescription('')
      setTaskAssignedTo('')
      setTaskDueDate('')
      setTaskStoreId('')
      loadTasksAndProfiles()
    } catch (err: any) {
      toast.error('Failed to create task', err.message)
    }
  }

  // Task update handler
  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'Pending' | 'In Progress' | 'Completed') => {
    try {
      await tasksService.updateStatus(taskId, newStatus)
      toast.success('Task status updated', `Task moved to ${newStatus}.`)
      loadTasksAndProfiles()
    } catch (err: any) {
      toast.error('Failed to update task status', err.message)
    }
  }

  // Task deletion handler
  const handleDeleteTask = async (taskId: string) => {
    setDeleteTaskId(taskId)
  }

  const handleConfirmDeleteTask = async () => {
    if (!deleteTaskId) return
    try {
      await tasksService.delete(deleteTaskId)
      toast.success('Task deleted', 'The task was removed successfully.')
      loadTasksAndProfiles()
    } catch (err: any) {
      toast.error('Failed to delete task', err.message)
    } finally {
      setDeleteTaskId(null)
    }
  }

  // Role modification handler
  const handleUpdateRole = async (profileId: string, newRole: 'admin' | 'manager' | 'staff') => {
    if (profileId === user?.id) {
      toast.error('You cannot change your own permission levels.')
      return
    }
    setPendingRoleUpdate({ profileId, role: newRole })
  }

  const handleConfirmRoleUpdate = async () => {
    if (!pendingRoleUpdate) return
    const { profileId, role } = pendingRoleUpdate
    try {
      await profilesService.updateRole(profileId, role)
      toast.success('Role updated', `User promoted/demoted to ${role} level.`)
      loadTasksAndProfiles()
    } catch (err: any) {
      toast.error('Failed to update permission level', err.message)
    } finally {
      setPendingRoleUpdate(null)
    }
  }

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format time helper
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--'
    return new Date(timeStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Format duration helper
  const formatDuration = (clockInStr: string, clockOutStr: string | null) => {
    const start = new Date(clockInStr).getTime()
    const end = clockOutStr ? new Date(clockOutStr).getTime() : Date.now()
    const diffMs = end - start
    if (diffMs < 0) return '0m'
    const secs = Math.floor(diffMs / 1000)
    const hours = Math.floor(secs / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Filter logs
  const filteredAllLogs = allLogs.filter(log => {
    const matchesSearch = log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    const matchesStore = storeFilter === 'all' || log.store_id === storeFilter
    const matchesDate = !dateFilter || log.date === dateFilter
    return matchesSearch && matchesStore && matchesDate
  })

  // Calendar cells calculation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedCalendarDate(null)
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedCalendarDate(null)
  }

  const getCellDateString = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`
  }

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
  const calendarCells: (number | null)[] = []

  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i)
  }

  // Calculate workforce stats for today
  const getWorkforceStats = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayLogs = allLogs.filter(l => l.date === today)
    const presentToday = new Set(todayLogs.map(l => l.user_id)).size
    const activeNow = todayLogs.filter(l => l.clock_out === null).length
    
    // Average hours today
    const completedToday = todayLogs.filter(l => l.clock_out !== null)
    let avgHours = 0
    if (completedToday.length > 0) {
      const totalMs = completedToday.reduce((sum, log) => {
        const diff = new Date(log.clock_out!).getTime() - new Date(log.clock_in).getTime()
        return sum + diff
      }, 0)
      avgHours = totalMs / completedToday.length / (1000 * 60 * 60)
    }

    return {
      presentToday,
      activeNow,
      avgHours: avgHours.toFixed(1)
    }
  }

  const stats = getWorkforceStats()

  // Render Calendar Helper
  const renderCalendar = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    return (
      <div className="space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex flex-col text-left">
            <h3 className="text-base font-bold text-foreground">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'workforce' || activeTab === 'calendar' && isManagement 
                ? 'Viewing check-ins for all active users.' 
                : 'Viewing your clock history.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0 cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0 cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] sm:text-xs">
          {daysOfWeek.map((day) => (
            <div key={day} className="font-semibold text-muted-foreground uppercase py-1">
              {day}
            </div>
          ))}
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-16 sm:h-20 border border-transparent" />
            }

            const dateStr = getCellDateString(day)
            const dayLogs = isManagement && activeTab !== 'my-logs'
              ? allLogs.filter((l) => l.date === dateStr)
              : logs.filter((l) => l.date === dateStr)

            const activeSessionCount = dayLogs.filter((l) => l.clock_out === null).length
            const completedCount = dayLogs.filter((l) => l.clock_out !== null).length
            const isSelected = selectedCalendarDate === dateStr

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => setSelectedCalendarDate(isSelected ? null : dateStr)}
                className={`h-16 sm:h-20 border text-left p-1.5 rounded-lg flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden select-none ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <span className={`font-bold text-xs ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {day}
                </span>

                {dayLogs.length > 0 && (
                  <div className="flex flex-col gap-0.5 w-full">
                    {isManagement && activeTab !== 'my-logs' ? (
                      <>
                        {completedCount > 0 && (
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[8px] px-1 py-0.5 rounded scale-[0.9] origin-left">
                            {completedCount} Present
                          </span>
                        )}
                        {activeSessionCount > 0 && (
                          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[8px] px-1 py-0.5 rounded flex items-center gap-0.5 scale-[0.9] origin-left animate-pulse">
                            <span className="h-1 w-1 rounded-full bg-amber-500"></span>
                            {activeSessionCount} Active
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {dayLogs.map((log) => (
                          <span 
                            key={log.id} 
                            className={`font-bold text-[8px] px-1 py-0.5 rounded scale-[0.9] origin-left truncate ${
                              log.clock_out 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'
                            }`}
                          >
                            {log.clock_out 
                              ? formatDuration(log.clock_in, log.clock_out) 
                              : 'Active'
                            }
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected date details */}
        {selectedCalendarDate && (
          <div className="border rounded-xl p-4 bg-muted/20 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
              <Calendar className="h-4 w-4 text-primary" />
              Logs for {formatDate(selectedCalendarDate)}
            </h4>
            {(() => {
              const dayLogs = isManagement && activeTab !== 'my-logs'
                ? allLogs.filter((l) => l.date === selectedCalendarDate)
                : logs.filter((l) => l.date === selectedCalendarDate)

              if (dayLogs.length === 0) {
                return <p className="text-xs text-muted-foreground">No attendance records registered for this date.</p>
              }

              return (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {dayLogs.map((l) => (
                    <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between border bg-card p-3 rounded-lg text-xs gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border shrink-0">
                          {l.user_name?.charAt(0).toUpperCase() || 'E'}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{l.user_name || 'ERP Employee'}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            Checked In: {l.store?.name || 'Warehouse'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-6 text-left">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Clock In</span>
                          <span className="font-semibold text-foreground font-mono">{formatTime(l.clock_in)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Clock Out</span>
                          <span className="font-semibold text-foreground font-mono">{l.clock_out ? formatTime(l.clock_out) : 'Ongoing'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t pt-2 sm:border-0 sm:pt-0">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block text-right">Hours</span>
                          <span className="font-bold text-foreground">{l.clock_out ? formatDuration(l.clock_in, l.clock_out) : 'Active'}</span>
                        </div>
                        <Badge variant={l.clock_out ? 'outline' : 'success'}>
                          {l.clock_out ? 'Completed' : 'On Duty'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

  // Export to CSV Helper
  const handleExportCSV = () => {
    if (filteredAllLogs.length === 0) {
      toast.warning('No data to export.')
      return
    }
    
    const headers = ['Employee Name', 'Date', 'Store Location', 'Clock In', 'Clock Out', 'Duration']
    const rows = filteredAllLogs.map(log => [
      log.user_name || 'ERP Employee',
      log.date,
      log.store?.name || 'Unknown',
      formatTime(log.clock_in),
      formatTime(log.clock_out),
      log.clock_out ? formatDuration(log.clock_in, log.clock_out) : 'Active Session'
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
      
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `workforce_attendance_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Export Successful', 'Attendance ledger downloaded as CSV.')
  }

  const isManagement = user?.role === 'admin' || user?.role === 'manager'

  // Kanban tasks calculation
  const taskListFiltered = tasks.filter((t) => taskStoreFilter === 'all' || t.store_id === taskStoreFilter)
  const pendingTasks = taskListFiltered.filter(t => t.status === 'Pending')
  const progressTasks = taskListFiltered.filter(t => t.status === 'In Progress')
  const completedTasks = taskListFiltered.filter(t => t.status === 'Completed')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Clock In / Out Main Console */}
        <Card className="md:col-span-2 border shadow-sm overflow-hidden bg-gradient-to-br from-card to-muted/20 relative">
          {currentSession && (
            <div className="absolute top-0 right-0 p-3">
              <span className="flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Attendance Control Center
            </CardTitle>
            <CardDescription>
              Record your work session start and end times below. Always ensure you check in from your designated store location.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6">
            
            {/* Live Ticker Clock */}
            <div className="flex flex-col items-center md:items-start space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                {currentSession ? 'Current Session Duration' : 'Status: Off Duty'}
              </span>
              <span className={`text-4xl font-mono font-bold tracking-tight ${currentSession ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                {elapsedTime}
              </span>
              {currentSession && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Clocked In at: <b>{currentSession.store?.name}</b></span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {!currentSession ? (
                <>
                  <div className="flex flex-col space-y-1.5 w-full sm:w-56">
                    <label className="text-xs font-semibold text-muted-foreground text-left">Select Store Location</label>
                    <select
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                      className="bg-card text-foreground border border-input rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                    >
                      <option value="" disabled>-- Choose Location --</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button 
                    onClick={handleClockIn}
                    disabled={loading || !selectedStoreId}
                    className="h-10 sm:self-end bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Clock In
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={handleClockOut}
                  disabled={loading}
                  variant="destructive"
                  className="h-12 w-full sm:w-auto font-bold px-8 flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Briefcase className="h-4.5 w-4.5" />
                  Clock Out Session
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Stats Card */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
              <User className="h-4 w-4" />
              My Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-sm font-bold truncate text-foreground leading-none">{user?.full_name}</span>
                <span className="text-xs text-muted-foreground mt-1 truncate capitalize">{user?.role} Role</span>
              </div>
            </div>
            
            <div className="border-t pt-3.5 grid grid-cols-2 gap-4 text-center">
              <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Present Logs</span>
                <span className="text-lg font-bold text-foreground">{logs.length} days</span>
              </div>
              <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Duty Status</span>
                <Badge variant={currentSession ? 'success' : 'outline'} className="mt-1">
                  {currentSession ? 'On Duty' : 'Off Duty'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Navigation Tabs */}
      <div className="flex border-b border-border overflow-x-auto select-none no-scrollbar">
        <button
          onClick={() => setActiveTab('my-logs')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer shrink-0 ${
            activeTab === 'my-logs' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {isManagement ? 'My Clock Logs' : 'Personal Logbook'}
        </button>

        {isManagement && (
          <button
            onClick={() => setActiveTab('workforce')}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer shrink-0 ${
              activeTab === 'workforce' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Workforce Ledger
          </button>
        )}

        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer shrink-0 ${
            activeTab === 'calendar' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {isManagement ? 'Workforce Calendar' : 'My Calendar'}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer shrink-0 ${
            activeTab === 'tasks' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {isManagement ? 'Task Assignments' : 'My Tasks'}
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer shrink-0 ${
              activeTab === 'roles' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Role Provisioning
          </button>
        )}
      </div>

      {/* TABS CONTAINER */}
      <div className="space-y-6">
        
        {/* TAB 1: My Logs */}
        {activeTab === 'my-logs' && (
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
              <div className="text-left">
                <CardTitle>My Personal Logbook</CardTitle>
                <CardDescription>A chronological view of all your completed work sessions and durations.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/60 mb-3" />
                  <h3 className="font-bold text-sm text-foreground">No Logs Found</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    You have not registered any attendance history yet. Use the Clock In button above to start your first session.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                        <th className="p-4">Date</th>
                        <th className="p-4">Check-in Location</th>
                        <th className="p-4">Clock In Time</th>
                        <th className="p-4">Clock Out Time</th>
                        <th className="p-4">Total Duration</th>
                        <th className="p-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-left">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 font-medium text-foreground">{formatDate(log.date)}</td>
                          <td className="p-4">
                            <span className="flex items-center gap-1.5 font-medium">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {log.store?.name || 'Warehouse'}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-muted-foreground">{formatTime(log.clock_in)}</td>
                          <td className="p-4 font-mono text-muted-foreground">
                            {log.clock_out ? formatTime(log.clock_out) : '--:--:--'}
                          </td>
                          <td className="p-4 font-semibold text-foreground">
                            {log.clock_out ? formatDuration(log.clock_in, log.clock_out) : elapsedTime}
                          </td>
                          <td className="p-4 text-right">
                            <Badge variant={log.clock_out ? 'outline' : 'success'}>
                              {log.clock_out ? 'Completed' : 'Active Session'}
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
        )}

        {/* TAB 2: Workforce Ledger */}
        {activeTab === 'workforce' && isManagement && (
          <div className="space-y-6">
            
            {/* Workforce Dashboard mini-stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border shadow-sm p-4 flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Staff Present Today</span>
                  <span className="text-2xl font-bold">{stats.presentToday}</span>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Briefcase className="h-5 w-5" />
                </div>
              </Card>

              <Card className="border shadow-sm p-4 flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Currently Clocked In</span>
                  <span className="text-2xl font-bold text-emerald-500">{stats.activeNow}</span>
                </div>
                <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </Card>

              <Card className="border shadow-sm p-4 flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Avg Duration (Today)</span>
                  <span className="text-2xl font-bold">{stats.avgHours} hrs</span>
                </div>
                <div className="h-10 w-10 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                  <Clock className="h-5 w-5" />
                </div>
              </Card>
            </div>

            {/* Main Ledger Table */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="text-left">
                    <CardTitle>Workforce Ledger</CardTitle>
                    <CardDescription>Monitor daily check-ins, store locations, and working hours for all system users.</CardDescription>
                  </div>
                  <Button 
                    onClick={handleExportCSV}
                    variant="outline" 
                    className="flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer self-start"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Ledger (CSV)
                  </Button>
                </div>

                {/* Filters and search block */}
                <div className="grid gap-3 sm:grid-cols-3 mt-4 border-t pt-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Employee..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <select
                      value={storeFilter}
                      onChange={(e) => setStoreFilter(e.target.value)}
                      className="w-full bg-card text-foreground border border-input rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Locations</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="text-xs p-1.5"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredAllLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/60 mb-3" />
                    <h3 className="font-bold text-sm text-foreground">No Logs Found</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mt-1">
                      No attendance matching the selected search query, date, or store filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                          <th className="p-4">Employee</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Location</th>
                          <th className="p-4">Clock In</th>
                          <th className="p-4">Clock Out</th>
                          <th className="p-4">Duration</th>
                          <th className="p-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-left">
                        {filteredAllLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-4 font-bold text-foreground">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border shrink-0">
                                  {log.user_name?.charAt(0).toUpperCase() || 'E'}
                                </div>
                                <span className="truncate">{log.user_name || 'ERP Employee'}</span>
                              </div>
                            </td>
                            <td className="p-4 font-medium text-foreground">{formatDate(log.date)}</td>
                            <td className="p-4">
                              <span className="flex items-center gap-1.5 font-medium">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {log.store?.name || 'Warehouse'}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-muted-foreground">{formatTime(log.clock_in)}</td>
                            <td className="p-4 font-mono text-muted-foreground">
                              {log.clock_out ? formatTime(log.clock_out) : '--:--:--'}
                            </td>
                            <td className="p-4 font-semibold text-foreground">
                              {log.clock_out ? formatDuration(log.clock_in, log.clock_out) : 'Active Session'}
                            </td>
                            <td className="p-4 text-right">
                              <Badge variant={log.clock_out ? 'outline' : 'success'}>
                                {log.clock_out ? 'Completed' : 'Active Session'}
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
        )}

        {/* TAB 3: Calendar View */}
        {activeTab === 'calendar' && (
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="text-left">
                <CardTitle>Attendance Calendar</CardTitle>
                <CardDescription>
                  Interactive full-month calendar grid. Click on any active date cell to audit check-in logs and hours.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {renderCalendar()}
            </CardContent>
          </Card>
        )}

        {/* TAB 4: Tasks Dashboard */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            
            {/* Task assignment form for Admin / Managers */}
            {isManagement && (
              <Card className="border shadow-sm text-left">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    Assign Employee Task
                  </CardTitle>
                  <CardDescription>Create tasks and delegate duty items to employees for specific store locations.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTask} className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Select Employee *</label>
                      <select
                        value={taskAssignedTo}
                        onChange={(e) => setTaskAssignedTo(e.target.value)}
                        className="bg-card text-foreground border border-input rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                        required
                      >
                        <option value="" disabled>-- Pick Employee --</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Store Assignment (Optional)</label>
                      <select
                        value={taskStoreId}
                        onChange={(e) => setTaskStoreId(e.target.value)}
                        className="bg-card text-foreground border border-input rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                      >
                        <option value="">All Stores / Office</option>
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Due Date *</label>
                      <Input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="text-xs"
                        required
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground">Task Title *</label>
                      <Input
                        placeholder="e.g. Audit monitor display catalog"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="text-xs"
                        required
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5 md:col-span-3">
                      <label className="text-xs font-semibold text-muted-foreground">Description Details</label>
                      <textarea
                        placeholder="Provide details about the task requirements, instructions, and tools needed..."
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>

                    <div className="md:col-span-3 flex justify-end">
                      <Button type="submit" size="sm" className="font-bold flex items-center gap-1 cursor-pointer">
                        <Plus className="h-4 w-4" />
                        Assign Task
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Kanban Board */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-base font-bold text-foreground">Task Assignment Board</h3>
                  <p className="text-xs text-muted-foreground">Tracks currently pending and resolved work assignments.</p>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <select
                    value={taskStoreFilter}
                    onChange={(e) => setTaskStoreFilter(e.target.value)}
                    className="bg-card text-foreground border border-input rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Stores</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {tasksLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  
                  {/* Column 1: Pending */}
                  <Card className="border shadow-sm bg-muted/20">
                    <CardHeader className="py-3 bg-amber-500/10 border-b flex flex-row items-center justify-between">
                      <CardTitle className="text-xs uppercase font-extrabold text-amber-700 flex items-center gap-1">
                        Pending
                      </CardTitle>
                      <Badge variant="warning">{pendingTasks.length}</Badge>
                    </CardHeader>
                    <CardContent className="p-3! space-y-3 overflow-y-auto max-h-[400px]">
                      {pendingTasks.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-6">No pending tasks.</p>
                      ) : (
                        pendingTasks.map(t => (
                          <div key={t.id} className="bg-card border p-3 rounded-lg shadow-xs text-left space-y-2 relative group">
                            {isManagement && (
                              <button 
                                onClick={() => handleDeleteTask(t.id)}
                                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Delete Task"
                                aria-label="Delete Task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <h4 className="font-bold text-xs pr-6 text-foreground leading-tight">{t.title}</h4>
                            {t.description && <p className="text-[10px] text-muted-foreground leading-normal">{t.description}</p>}
                            
                            <div className="border-t pt-2 flex flex-col gap-1.5 text-[9px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-semibold text-foreground">
                                <User className="h-2.5 w-2.5" /> Assignee: {t.assigned_to_profile?.full_name || 'Staff'}
                              </span>
                              {t.store_id && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5" /> Store: {stores.find(s => s.id === t.store_id)?.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1 font-medium text-amber-600">
                                <Calendar className="h-2.5 w-2.5" /> Due: {t.due_date}
                              </span>
                            </div>

                            {/* Status transitions */}
                            {(t.assigned_to === user?.id || isManagement) && (
                              <div className="pt-1.5 flex justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleUpdateTaskStatus(t.id, 'In Progress')}
                                  className="text-[9px] h-6 py-0 px-2 font-bold cursor-pointer"
                                >
                                  Start Task
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Column 2: In Progress */}
                  <Card className="border shadow-sm bg-muted/20">
                    <CardHeader className="py-3 bg-blue-500/10 border-b flex flex-row items-center justify-between">
                      <CardTitle className="text-xs uppercase font-extrabold text-blue-700 flex items-center gap-1">
                        In Progress
                      </CardTitle>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/5">{progressTasks.length}</Badge>
                    </CardHeader>
                    <CardContent className="p-3! space-y-3 overflow-y-auto max-h-[400px]">
                      {progressTasks.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-6">No tasks in progress.</p>
                      ) : (
                        progressTasks.map(t => (
                          <div key={t.id} className="bg-card border p-3 rounded-lg shadow-xs text-left space-y-2 relative">
                            {isManagement && (
                              <button 
                                onClick={() => handleDeleteTask(t.id)}
                                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Delete Task"
                                aria-label="Delete Task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <h4 className="font-bold text-xs pr-6 text-foreground leading-tight">{t.title}</h4>
                            {t.description && <p className="text-[10px] text-muted-foreground leading-normal">{t.description}</p>}
                            
                            <div className="border-t pt-2 flex flex-col gap-1.5 text-[9px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-semibold text-foreground">
                                <User className="h-2.5 w-2.5" /> Assignee: {t.assigned_to_profile?.full_name || 'Staff'}
                              </span>
                              {t.store_id && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5" /> Store: {stores.find(s => s.id === t.store_id)?.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" /> Due: {t.due_date}
                              </span>
                            </div>

                            {/* Status transitions */}
                            {(t.assigned_to === user?.id || isManagement) && (
                              <div className="pt-1.5 flex justify-between gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleUpdateTaskStatus(t.id, 'Pending')}
                                  className="text-[9px] h-6 py-0 px-2 cursor-pointer"
                                >
                                  Pause
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleUpdateTaskStatus(t.id, 'Completed')}
                                  className="text-[9px] h-6 py-0 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                                >
                                  Complete
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Column 3: Completed */}
                  <Card className="border shadow-sm bg-muted/20">
                    <CardHeader className="py-3 bg-emerald-500/10 border-b flex flex-row items-center justify-between">
                      <CardTitle className="text-xs uppercase font-extrabold text-emerald-700 flex items-center gap-1">
                        Completed
                      </CardTitle>
                      <Badge variant="success">{completedTasks.length}</Badge>
                    </CardHeader>
                    <CardContent className="p-3! space-y-3 overflow-y-auto max-h-[400px]">
                      {completedTasks.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-6">No completed tasks.</p>
                      ) : (
                        completedTasks.map(t => (
                          <div key={t.id} className="bg-card border p-3 rounded-lg shadow-xs text-left space-y-2 relative">
                            {isManagement && (
                              <button 
                                onClick={() => handleDeleteTask(t.id)}
                                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Delete Task"
                                aria-label="Delete Task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <h4 className="font-bold text-xs pr-6 text-foreground text-muted-foreground line-through leading-tight">{t.title}</h4>
                            {t.description && <p className="text-[10px] text-muted-foreground line-through leading-normal">{t.description}</p>}
                            
                            <div className="border-t pt-2 flex flex-col gap-1.5 text-[9px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-semibold text-foreground">
                                <User className="h-2.5 w-2.5" /> Assignee: {t.assigned_to_profile?.full_name || 'Staff'}
                              </span>
                              {t.store_id && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5" /> Store: {stores.find(s => s.id === t.store_id)?.name}
                                </span>
                              )}
                            </div>

                            {/* Move back options */}
                            {(t.assigned_to === user?.id || isManagement) && (
                              <div className="pt-1.5 flex justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleUpdateTaskStatus(t.id, 'In Progress')}
                                  className="text-[9px] h-6 py-0 px-2 cursor-pointer"
                                >
                                  Re-open Task
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Role Provisioning */}
        {activeTab === 'roles' && user?.role === 'admin' && (
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="text-left">
                <CardTitle className="flex items-center gap-1.5 text-foreground">
                  <ShieldAlert className="h-5 w-5 text-primary" />
                  Role Provisioning Panel
                </CardTitle>
                <CardDescription>Update employee permission levels. Promoted users inherit access bounds dynamically.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-4">Employee Full Name</th>
                      <th className="p-4">Registered Email</th>
                      <th className="p-4">Member Since</th>
                      <th className="p-4">System Role</th>
                      <th className="p-4 text-right">Provisioning Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-left">
                    {profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-bold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] border shrink-0">
                              {p.full_name?.charAt(0).toUpperCase() || 'E'}
                            </div>
                            <span>{p.full_name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground font-medium">{p.email}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(p.created_at)}</td>
                        <td className="p-4">
                          <Badge 
                            variant={
                              p.role === 'admin' 
                                ? 'destructive' 
                                : p.role === 'manager' 
                                  ? 'warning' 
                                  : 'outline'
                            }
                            className="capitalize font-bold"
                          >
                            {p.role}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          {p.id === user?.id ? (
                            <span className="text-[10px] text-muted-foreground font-semibold italic">Current Admin</span>
                          ) : (
                            <select
                              value={p.role}
                              onChange={(e) => handleUpdateRole(p.id, e.target.value as any)}
                              className="bg-card text-foreground border border-input rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer"
                            >
                              <option value="staff">Staff Member</option>
                              <option value="manager">Manager Access</option>
                              <option value="admin">System Admin</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      <ConfirmDialog
        isOpen={deleteTaskId !== null}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={handleConfirmDeleteTask}
        title="Confirm Task Deletion"
        description="Are you absolutely sure you want to permanently delete this task? This action cannot be undone."
        confirmText="Delete Task"
        variant="destructive"
      />

      <ConfirmDialog
        isOpen={pendingRoleUpdate !== null}
        onClose={() => setPendingRoleUpdate(null)}
        onConfirm={handleConfirmRoleUpdate}
        title="Confirm Role Change"
        description={pendingRoleUpdate ? `Are you sure you want to change this employee's role to ${pendingRoleUpdate.role}? This will modify their access privileges immediately.` : ''}
        confirmText="Change Role"
        variant="warning"
      />

      </div>
    </div>
  )
}
