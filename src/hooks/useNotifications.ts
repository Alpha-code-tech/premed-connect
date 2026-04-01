import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useNotifications(studentId: string | undefined) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  // Realtime subscription
  useEffect(() => {
    if (!studentId) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', studentId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [studentId, queryClient])

  const unreadCount = query.data?.filter(n => !n.is_read).length ?? 0

  const markAllRead = async () => {
    if (!studentId || unreadCount === 0) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('student_id', studentId)
      .eq('is_read', false)
    queryClient.invalidateQueries({ queryKey: ['notifications', studentId] })
    queryClient.invalidateQueries({ queryKey: ['student-unread-notifications', studentId] })
  }

  const markOneRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    queryClient.invalidateQueries({ queryKey: ['notifications', studentId] })
    queryClient.invalidateQueries({ queryKey: ['student-unread-notifications', studentId] })
  }

  return { ...query, unreadCount, markAllRead, markOneRead }
}
