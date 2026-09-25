'use client'

import {
  mdiAccessPoint,
  mdiBookOpenPageVariant,
  mdiCellphone,
  mdiChartBar,
  mdiCheckDecagram,
  mdiHelpCircleOutline,
  mdiPlayCircleOutline,
} from '@mdi/js'
import React, { useEffect, useState } from 'react'
import Button from '@/modules/admin/components/Button'
import CardBox from '@/modules/admin/components/CardBox'
import SectionMain from '@/modules/admin/components/Section/Main'
import SectionTitleLineWithButton from '@/modules/admin/components/Section/TitleLineWithButton'
import CardBoxWidget from '@/modules/admin/components/CardBox/Widget'
import ActivityChart, { DailyActivity } from '@/modules/admin/components/ActivityChart'
import { supabase } from '@/config/supabase'

type ActivityStats = {
  days: number
  totals: {
    sessions: number
    devices: number
    devices_today: number
    page_views: number
    quiz_starts: number
    quiz_completes: number
    avg_score_pct: number | null
  }
  daily: DailyActivity[]
  by_category: {
    category_id: number
    name: string | null
    starts: number
    completes: number
    avg_score_pct: number | null
  }[]
  by_platform: { platform: string; devices: number }[]
  by_locale: { locale: string; devices: number }[]
}

const PERIODS = [7, 30, 90]

const Breakdown = ({ title, rows }: { title: string; rows: { label: string; value: number }[] }) => {
  const total = rows.reduce((acc, r) => acc + r.value, 0) || 1
  return (
    <CardBox>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No data yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span className="capitalize">{r.label}</span>
                <span>
                  {r.value} ({Math.round((r.value / total) * 100)}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(r.value / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardBox>
  )
}

const DashboardPage = () => {
  const [stats, setStats] = useState({ categories: 0, questions: 0 })
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [activity, setActivity] = useState<ActivityStats | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [isActivityLoading, setIsActivityLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsStatsLoading(true)
        const [{ count: categoriesCount }, { count: questionsCount }] = await Promise.all([
          supabase.from('question_categories').select('*', { count: 'exact', head: true }),
          supabase.from('questions').select('*', { count: 'exact', head: true }),
        ])
        setStats({ categories: categoriesCount || 0, questions: questionsCount || 0 })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsStatsLoading(false)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    const fetchActivity = async () => {
      setIsActivityLoading(true)
      const { data, error } = await supabase.rpc('get_activity_stats', { p_days: days })
      setActivityError(error ? error.message : null)
      setActivity(error ? null : (data as ActivityStats))
      setIsActivityLoading(false)
    }

    fetchActivity()
  }, [days])

  const totals = activity?.totals
  const completionRate =
    totals && totals.quiz_starts ? Math.round((totals.quiz_completes / totals.quiz_starts) * 100) : 0

  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiBookOpenPageVariant} title="Overview" main>
        <Button
          href="https://biquiz.bleriotnoguia.com"
          target="_blank"
          icon={mdiAccessPoint}
          label="Open Biquiz App"
          color="contrast"
          roundedFull
          small
        />
      </SectionTitleLineWithButton>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <CardBoxWidget
          trendLabel="Total"
          icon={mdiBookOpenPageVariant}
          iconColor="success"
          number={stats.categories}
          label="Categories"
          isLoading={isStatsLoading}
        />
        <CardBoxWidget
          trendLabel="All time"
          icon={mdiHelpCircleOutline}
          iconColor="info"
          number={stats.questions}
          label="Questions"
          isLoading={isStatsLoading}
        />
      </div>

      <SectionTitleLineWithButton icon={mdiChartBar} title="App activity">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                days === p
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {p} days
            </button>
          ))}
        </div>
      </SectionTitleLineWithButton>

      {activityError ? (
        <CardBox className="mb-6">
          <p className="text-sm font-medium text-red-500">Failed to load activity</p>
          <p className="text-xs text-slate-400 font-mono">{activityError}</p>
        </CardBox>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 mb-6">
            <CardBoxWidget
              trendLabel={`${totals?.devices_today ?? 0} today`}
              icon={mdiCellphone}
              iconColor="warning"
              number={totals?.devices ?? 0}
              label="Active devices"
              isLoading={isActivityLoading}
            />
            <CardBoxWidget
              trendLabel={`${totals?.page_views ?? 0} page views`}
              icon={mdiAccessPoint}
              iconColor="info"
              number={totals?.sessions ?? 0}
              label="Sessions"
              isLoading={isActivityLoading}
            />
            <CardBoxWidget
              trendLabel={`${completionRate}% completed`}
              icon={mdiPlayCircleOutline}
              iconColor="success"
              number={totals?.quiz_starts ?? 0}
              label="Quizzes started"
              isLoading={isActivityLoading}
            />
            <CardBoxWidget
              trendLabel={`${totals?.quiz_completes ?? 0} quizzes completed`}
              icon={mdiCheckDecagram}
              iconColor="danger"
              number={Math.round(totals?.avg_score_pct ?? 0)}
              numberSuffix="%"
              label="Average score"
              isLoading={isActivityLoading}
            />
          </div>

          <CardBox className="mb-6">
            {isActivityLoading ? (
              <div className="h-56 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
            ) : (
              <ActivityChart data={activity?.daily ?? []} />
            )}
          </CardBox>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
            <CardBox className="lg:col-span-2" hasTable>
              <h3 className="px-4 pt-4 pb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Most played themes
              </h3>
              {activity?.by_category.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Theme</th>
                      <th>Started</th>
                      <th>Completed</th>
                      <th>Avg score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.by_category.map((c) => (
                      <tr key={c.category_id}>
                        <td data-label="Theme" className="capitalize">
                          {c.name ?? `#${c.category_id}`}
                        </td>
                        <td data-label="Started">{c.starts}</td>
                        <td data-label="Completed">{c.completes}</td>
                        <td data-label="Avg score">{c.avg_score_pct !== null ? `${c.avg_score_pct}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 pb-4 text-sm text-slate-400">No quiz played in this period.</p>
              )}
            </CardBox>
            <div className="space-y-6">
              <Breakdown
                title="Platforms"
                rows={(activity?.by_platform ?? []).map((p) => ({ label: p.platform, value: p.devices }))}
              />
              <Breakdown
                title="Languages"
                rows={(activity?.by_locale ?? []).map((l) => ({ label: l.locale, value: l.devices }))}
              />
            </div>
          </div>
        </>
      )}
    </SectionMain>
  )
}

export default DashboardPage
