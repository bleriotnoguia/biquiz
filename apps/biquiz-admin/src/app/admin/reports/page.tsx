'use client'

import { mdiFlagOutline } from '@mdi/js'
import { format } from 'date-fns'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import CardBox from '@/modules/admin/components/CardBox'
import SectionMain from '@/modules/admin/components/Section/Main'
import SectionTitleLineWithButton from '@/modules/admin/components/Section/TitleLineWithButton'
import { supabase } from '@/config/supabase'

type ReportStatus = 'open' | 'resolved'

type QuestionReport = {
  id: number
  question_id: number
  reason: string
  comment: string | null
  locale: string | null
  status: ReportStatus
  created_at: string
  question_fr: string | null
  question_en: string | null
  source_fr: string | null
}

const REASONS: Record<string, string> = {
  wrong_answer: 'Wrong answer',
  typo: 'Wording',
  bad_reference: 'Reference',
  other: 'Other',
}

const ReportsPage = () => {
  const [reports, setReports] = useState<QuestionReport[]>([])
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_question_reports')
    if (error) toast.error(error.message)
    setReports(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    supabase.rpc('get_question_reports').then(({ data, error }) => {
      if (!active) return
      if (error) toast.error(error.message)
      setReports(data ?? [])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const setStatus = async (report: QuestionReport, status: ReportStatus) => {
    setUpdatingId(report.id)
    const { error } = await supabase.rpc('set_question_report_status', { p_id: report.id, p_status: status })
    setUpdatingId(null)
    if (error) {
      toast.error(error.message)
      return
    }
    setReports((current) => current.map((item) => (item.id === report.id ? { ...item, status } : item)))
  }

  const visible = reports.filter((report) => filter === 'all' || report.status === filter)
  const openCount = reports.filter((report) => report.status === 'open').length

  return (
    <SectionMain wide>
      <SectionTitleLineWithButton icon={mdiFlagOutline} title="Reports" main>
        <span className="text-sm text-slate-500 dark:text-slate-400">{openCount} open</span>
      </SectionTitleLineWithButton>

      <CardBox className="mb-6" hasTable>
        <div className="px-4 py-3 flex gap-2 border-b border-gray-100 dark:border-slate-700">
          {(['open', 'resolved', 'all'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`text-sm px-3 py-1 rounded-lg ${
                filter === value
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {value === 'open' ? 'Open' : value === 'resolved' ? 'Resolved' : 'All'}
            </button>
          ))}
          <button type="button" onClick={load} className="ml-auto text-sm text-indigo-600 dark:text-indigo-400">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-slate-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">No reports.</div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Question</th>
                  <th>Reason</th>
                  <th>Comment</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((report) => (
                  <tr key={report.id}>
                    <td className="whitespace-nowrap text-xs text-slate-400">
                      {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm')}
                      {report.locale ? ` · ${report.locale}` : ''}
                    </td>
                    <td>
                      <div className="text-sm text-slate-800 dark:text-slate-100">{report.question_fr || report.question_en || `#${report.question_id}`}</div>
                      {report.source_fr && <div className="text-xs text-slate-400">{report.source_fr}</div>}
                    </td>
                    <td className="whitespace-nowrap text-sm">{REASONS[report.reason] ?? report.reason}</td>
                    <td className="text-sm text-slate-600 dark:text-slate-300 max-w-xs">{report.comment || '—'}</td>
                    <td className="whitespace-nowrap">
                      {report.status === 'open' ? (
                        <button
                          type="button"
                          disabled={updatingId === report.id}
                          onClick={() => setStatus(report, 'resolved')}
                          className="text-sm text-indigo-600 dark:text-indigo-400 disabled:opacity-40"
                        >
                          Resolve
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingId === report.id}
                          onClick={() => setStatus(report, 'open')}
                          className="text-sm text-slate-500 disabled:opacity-40"
                        >
                          Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBox>
    </SectionMain>
  )
}

export default ReportsPage
