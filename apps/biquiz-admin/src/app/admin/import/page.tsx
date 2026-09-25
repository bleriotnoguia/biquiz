'use client'

import { mdiAlertCircleOutline, mdiCheckCircleOutline, mdiDownload, mdiFileUploadOutline, mdiUpload } from '@mdi/js'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import Button from '@/modules/admin/components/Button'
import CardBox from '@/modules/admin/components/CardBox'
import Icon from '@/modules/admin/components/Icon'
import SectionMain from '@/modules/admin/components/Section/Main'
import SectionTitleLineWithButton from '@/modules/admin/components/Section/TitleLineWithButton'
import { supabase } from '@/config/supabase'
import {
  CSV_TEMPLATE,
  ImportPayload,
  JSON_TEMPLATE,
  parseImportFile,
} from '@/modules/admin/import/parseImport'

type Category = { id: number; level: number; translate: { locale: string; name: string }[] | null }

type ImportResult = {
  categories_created: number
  questions_inserted: number
  questions_skipped: number
}

const download = (fileName: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const ImportPage = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [payload, setPayload] = useState<ImportPayload | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fetchCategories = async () => {
    const { data } = await supabase.rpc('get_categories')
    setCategories(data ?? [])
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const findCategory = (id: number | undefined, nameFr: string, nameEn?: string) => {
    if (id) return categories.find((c) => c.id === id)
    const names = [nameFr, nameEn].filter(Boolean).map((n) => n!.toLowerCase())
    return categories.find((c) => c.translate?.some((t) => names.includes(t.name.trim().toLowerCase())))
  }

  const totalQuestions = useMemo(
    () => payload?.themes.reduce((acc, t) => acc + t.questions.length, 0) ?? 0,
    [payload]
  )

  const handleFile = async (file: File) => {
    setResult(null)
    setFileName(file.name)
    const parsed = parseImportFile(file.name, await file.text())
    setPayload(parsed.payload)
    setErrors(parsed.errors)
  }

  const reset = () => {
    setPayload(null)
    setErrors([])
    setFileName('')
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const runImport = async () => {
    if (!payload || errors.length) return
    setIsImporting(true)
    const { data, error } = await supabase.rpc('import_questions', { p_payload: payload })
    setIsImporting(false)

    if (error) {
      toast.error(error.message)
      return
    }
    setResult(data as ImportResult)
    toast.success('Import completed!')
    fetchCategories()
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiUpload} title="Import questions" main>
        <div className="flex gap-2">
          <Button
            icon={mdiDownload}
            label="JSON template"
            color="whiteDark"
            roundedFull
            small
            onClick={() => download('biquiz-template.json', JSON.stringify(JSON_TEMPLATE, null, 2), 'application/json')}
          />
          <Button
            icon={mdiDownload}
            label="CSV template"
            color="whiteDark"
            roundedFull
            small
            onClick={() => download('biquiz-template.csv', '\uFEFF' + CSV_TEMPLATE, 'text/csv;charset=utf-8')}
          />
        </div>
      </SectionTitleLineWithButton>

      <CardBox className="mb-6">
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) handleFile(file)
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition ${
            isDragging
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-gray-200 dark:border-slate-600 hover:border-indigo-300'
          }`}
        >
          <Icon path={mdiFileUploadOutline} size="36" w="" h="" className="text-indigo-500" />
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {fileName || 'Drop a .json or .csv file here, or click to browse'}
          </span>
          <span className="text-xs text-slate-400">
            Themes are matched by name (created if missing). Questions already present in a theme are skipped.
            Missing English values fall back to French.
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </label>
      </CardBox>

      {errors.length > 0 && (
        <CardBox className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-red-600 dark:text-red-400">
            <Icon path={mdiAlertCircleOutline} size="20" w="" h="" />
            <h3 className="font-semibold">
              {errors.length} error{errors.length > 1 ? 's' : ''} — fix the file and upload it again
            </h3>
          </div>
          <ul className="max-h-64 overflow-auto space-y-1 text-sm text-red-600 dark:text-red-400 font-mono">
            {errors.slice(0, 200).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </CardBox>
      )}

      {result && (
        <CardBox className="mb-6">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Icon path={mdiCheckCircleOutline} size="20" w="" h="" />
            <p className="font-medium">
              {result.questions_inserted} question(s) imported, {result.questions_skipped} skipped (already present),{' '}
              {result.categories_created} new theme(s).
            </p>
          </div>
        </CardBox>
      )}

      {payload && payload.themes.length > 0 && (
        <CardBox className="mb-6" hasTable>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {payload.themes.length} theme(s) · {totalQuestions} question(s)
            </span>
            <div className="flex gap-2">
              <Button label="Clear" color="whiteDark" small roundedFull onClick={reset} />
              <Button
                icon={mdiUpload}
                label={isImporting ? 'Importing…' : `Import ${totalQuestions} questions`}
                color="info"
                small
                roundedFull
                disabled={isImporting || errors.length > 0 || !!result}
                onClick={runImport}
              />
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Theme (FR)</th>
                <th>Theme (EN)</th>
                <th>Level</th>
                <th>Questions</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {payload.themes.map((theme, i) => {
                const existing = findCategory(theme.category_id, theme.name_fr, theme.name_en)
                return (
                  <tr key={i}>
                    <td data-label="Theme (FR)">
                      <details>
                        <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-200">
                          {theme.name_fr || `#${theme.category_id}`}
                        </summary>
                        <ol className="mt-2 ml-4 list-decimal space-y-2 text-sm">
                          {theme.questions.map((q, j) => (
                            <li key={j}>
                              <p className="text-slate-700 dark:text-slate-200">{q.name_fr}</p>
                              <p className="text-xs text-slate-400">{q.source_text_fr}</p>
                              <p className="text-xs">
                                {q.options.map((o, k) => (
                                  <span
                                    key={k}
                                    className={`mr-3 ${o.is_correct ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}
                                  >
                                    {o.name_fr}
                                  </span>
                                ))}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </details>
                    </td>
                    <td data-label="Theme (EN)">{theme.name_en ?? '—'}</td>
                    <td data-label="Level">{existing?.level ?? theme.level ?? 'auto'}</td>
                    <td data-label="Questions">{theme.questions.length}</td>
                    <td data-label="Target">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          existing
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {existing ? `Existing #${existing.id}` : 'New theme'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardBox>
      )}
    </SectionMain>
  )
}

export default ImportPage
