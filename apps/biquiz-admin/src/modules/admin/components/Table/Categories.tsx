'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { mdiChevronLeft, mdiChevronRight, mdiMagnify, mdiPencil, mdiClose, mdiCheck, mdiTrashCan } from '@mdi/js'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { supabase } from '@/config/supabase'
import Icon from '../Icon'
import Button from '../Button'
import CardBoxModal from '../CardBox/Modal'
import { categoryName, filterCategories } from '@/modules/admin/utils/categoryTable'
import { pageWindow } from '@/modules/admin/utils/questionTable'

type Translation = { name: string; locale: string }

type Category = {
  id: number
  level?: number
  is_active: boolean
  created_at: string
  translate: Translation[] | null
}

type EditForm = {
  nameEn: string
  nameFr: string
  isActive: boolean
}

const PAGE_SIZES = [10, 25, 50]
const selectClass =
  'text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent'

const TableCategories = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<number, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [perPage, setPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<Category[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ nameEn: '', nameFr: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const filteredCategories = useMemo(
    () => filterCategories(categories, { search: searchQuery, status: statusFilter }),
    [categories, searchQuery, statusFilter],
  )

  const numPages = Math.max(1, Math.ceil(filteredCategories.length / perPage))
  const safePage = Math.min(currentPage, Math.max(0, numPages - 1))
  const paginated = filteredCategories.slice(perPage * safePage, perPage * (safePage + 1))
  const pages = pageWindow(safePage, filteredCategories.length === 0 ? 0 : numPages)
  const pageIds = paginated.map((category) => category.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id))
  const filtersActive = statusFilter !== 'all'

  const deletable = pendingDelete.filter((category) => (questionCounts?.[category.id] ?? 0) === 0)
  const blocked = pendingDelete.filter((category) => (questionCounts?.[category.id] ?? 0) > 0)

  const loadQuestionCounts = async (ids: number[]) => {
    const entries = await Promise.all(
      ids.map(async (id) => {
        const { count, error } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('question_category_id', id)
        if (error) throw error
        return [id, count ?? 0] as const
      }),
    )
    setQuestionCounts(Object.fromEntries(entries))
  }

  const fetchCategories = async (silent = false) => {
    if (!silent) setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase.rpc('get_categories')

    if (error) {
      console.error('[Categories] Supabase error:', error)
      if (!silent) setFetchError(error.message)
      else toast.error('Failed to refresh categories.')
      if (!silent) setLoading(false)
      return
    }

    const next: Category[] = data ?? []
    setCategories(next)
    setSelectedIds((prev) => {
      const valid = new Set(next.map((category) => category.id))
      const kept = new Set([...prev].filter((id) => valid.has(id)))
      return kept.size === prev.size ? prev : kept
    })

    try {
      await loadQuestionCounts(next.map((category) => category.id))
    } catch (countError) {
      console.error('[Categories] question count error:', countError)
      setQuestionCounts(null)
      toast.error('Could not count questions in each category.')
    }

    if (!silent) setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const openEdit = (category: Category) => {
    setEditingCategory(category)
    setEditForm({
      nameEn: categoryName(category, 'en') === '—' ? '' : categoryName(category, 'en'),
      nameFr: categoryName(category, 'fr') === '—' ? '' : categoryName(category, 'fr'),
      isActive: category.is_active,
    })
    setSaveError(null)
  }

  const closeEdit = () => {
    if (saving) return
    setEditingCategory(null)
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!editingCategory) return
    setSaving(true)
    setSaveError(null)

    const { error: statusError } = await supabase
      .from('question_categories')
      .update({ is_active: editForm.isActive, updated_at: new Date().toISOString() })
      .eq('id', editingCategory.id)

    if (statusError) {
      setSaveError(statusError.message)
      setSaving(false)
      return
    }

    const translationUpdates = [
      { locale: 'en', name: editForm.nameEn },
      { locale: 'fr', name: editForm.nameFr },
    ]

    for (const { locale, name } of translationUpdates) {
      const existing = editingCategory.translate?.find((entry) => entry.locale === locale)
      if (existing) {
        const { error } = await supabase
          .from('question_category_translations')
          .update({ name, updated_at: new Date().toISOString() })
          .eq('question_category_id', editingCategory.id)
          .eq('locale', locale)
        if (error) {
          setSaveError(error.message)
          setSaving(false)
          return
        }
      } else if (name.trim()) {
        const { error } = await supabase.from('question_category_translations').insert({
          question_category_id: editingCategory.id,
          locale,
          name,
        })
        if (error) {
          setSaveError(error.message)
          setSaving(false)
          return
        }
      }
    }

    setSaving(false)
    setEditingCategory(null)
    toast.success('Category updated.')
    await fetchCategories(true)
  }

  const toggleActive = async (category: Category) => {
    if (togglingId != null) return
    const nextActive = !category.is_active
    setTogglingId(category.id)
    setCategories((prev) => prev.map((entry) => (entry.id === category.id ? { ...entry, is_active: nextActive } : entry)))

    const { data, error } = await supabase
      .from('question_categories')
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .eq('id', category.id)
      .select('id')

    if (error || !data?.length) {
      setCategories((prev) => prev.map((entry) => (entry.id === category.id ? { ...entry, is_active: category.is_active } : entry)))
      toast.error('Failed to update status.')
    }
    setTogglingId(null)
  }

  const removeCategory = async (category: Category) => {
    const { error: parentError } = await supabase
      .from('question_categories')
      .update({ parent_id: null, updated_at: new Date().toISOString() })
      .eq('parent_id', category.id)

    if (parentError) return parentError.message

    const { error: translationError } = await supabase
      .from('question_category_translations')
      .delete()
      .eq('question_category_id', category.id)

    if (translationError) return translationError.message

    const { data, error } = await supabase.from('question_categories').delete().eq('id', category.id).select('id')

    if (error || !data?.length) {
      const rows = (category.translate ?? [])
        .filter((entry) => entry.locale && entry.name)
        .map((entry) => ({
          question_category_id: category.id,
          locale: entry.locale,
          name: entry.name,
        }))
      if (rows.length) await supabase.from('question_category_translations').insert(rows)
      return error?.message ?? 'Category was not deleted.'
    }

    return null
  }

  const deleteCategories = async () => {
    if (isDeleting) return
    if (deletable.length === 0) {
      setPendingDelete([])
      return
    }

    setIsDeleting(true)
    const failedIds = new Set<number>()
    for (const category of deletable) {
      const message = await removeCategory(category)
      if (message) failedIds.add(category.id)
    }

    const deleted = deletable.length - failedIds.size
    if (failedIds.size && deleted === 0) toast.error('Failed to delete categories.')
    else if (failedIds.size) toast.error(`${deleted} deleted, ${failedIds.size} failed.`)
    else toast.success(deleted === 1 ? 'Category deleted.' : `${deleted} categories deleted.`)

    setIsDeleting(false)
    setPendingDelete([])
    setSelectedIds((prev) => {
      const next = new Set(prev)
      deletable.forEach((category) => {
        if (!failedIds.has(category.id)) next.delete(category.id)
      })
      return next
    })
    await fetchCategories(true)
  }

  const togglePageSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      filteredCategories.forEach((category) => next.add(category.id))
      return next
    })
  }

  const formatDate = (value: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return format(date, 'dd/MM/yyyy')
  }

  const labelOf = (category: Category) => {
    const english = categoryName(category, 'en')
    return english !== '—' ? english : categoryName(category, 'fr')
  }

  const emptyMessage = searchQuery
    ? `No categories found for "${searchQuery}"`
    : filtersActive
      ? 'No categories match these filters.'
      : 'No categories yet.'

  return (
    <>
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Edit Category</h3>
              <button
                type="button"
                onClick={closeEdit}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
              >
                <Icon path={mdiClose} size="18" w="" h="" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Name (EN)</label>
                <input
                  type="text"
                  value={editForm.nameEn}
                  onChange={(event) => setEditForm((form) => ({ ...form, nameEn: event.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Name (FR)</label>
                <input
                  type="text"
                  value={editForm.nameFr}
                  onChange={(event) => setEditForm((form) => ({ ...form, nameFr: event.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditForm((form) => ({ ...form, isActive: !form.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${
                    editForm.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  aria-label={editForm.isActive ? 'Set category inactive' : 'Set category active'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      editForm.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-300">{editForm.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              {(questionCounts?.[editingCategory.id] ?? 0) > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {questionCounts?.[editingCategory.id]} questions use this category.
                </p>
              )}
              {saveError && <p className="text-xs text-red-500 dark:text-red-400">{saveError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {saving ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon path={mdiCheck} size="16" w="" h="" />
                )}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CardBoxModal
        title={blocked.length && deletable.length === 0 ? 'Cannot delete' : deletable.length > 1 ? 'Delete categories' : 'Confirm deletion'}
        buttonColor={deletable.length > 0 ? 'danger' : 'info'}
        buttonLabel={
          isDeleting ? 'Deleting...' : deletable.length > 1 ? `Delete ${deletable.length}` : deletable.length === 1 ? 'Delete' : 'OK'
        }
        isActive={pendingDelete.length > 0}
        onConfirm={deleteCategories}
        onCancel={() => {
          if (!isDeleting) setPendingDelete([])
        }}
      >
        {deletable.length > 0 && (
          <div className="space-y-2">
            <p>
              {deletable.length === 1 ? (
                <>
                  Are you sure you want to delete <b>{labelOf(deletable[0])}</b>?
                </>
              ) : (
                <>
                  Delete <b>{deletable.length}</b> categories?
                </>
              )}
            </p>
            {deletable.length > 1 && (
              <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 max-h-40 overflow-y-auto">
                {deletable.slice(0, 8).map((category) => (
                  <li key={category.id}>{labelOf(category)}</li>
                ))}
                {deletable.length > 8 && <li className="text-slate-400">and {deletable.length - 8} more</li>}
              </ul>
            )}
          </div>
        )}
        {blocked.length > 0 && (
          <div className={deletable.length > 0 ? 'mt-3' : ''}>
            <p>
              {blocked.length === 1 ? (
                <>
                  <b>{labelOf(blocked[0])}</b> still has {questionCounts?.[blocked[0].id]} questions.
                </>
              ) : (
                <>{blocked.length} categories still have questions and will be kept.</>
              )}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Move or delete those questions first.</p>
          </div>
        )}
        {deletable.length > 0 && <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">This action cannot be undone.</p>}
      </CardBoxModal>

      <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-[16rem] max-w-md">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon path={mdiMagnify} size="16" w="" h="" />
          </span>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setCurrentPage(0)
            }}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
              setCurrentPage(0)
            }}
            className={selectClass}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all')
                setCurrentPage(0)
              }}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline px-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-indigo-800 dark:text-indigo-200">{selectedIds.size} selected</span>
            {selectedIds.size < filteredCategories.length && (
              <button type="button" onClick={selectAllFiltered} className="text-indigo-600 dark:text-indigo-300 hover:underline">
                Select all {filteredCategories.length}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-slate-600 dark:text-slate-300 hover:underline px-2"
            >
              Clear
            </button>
            <Button
              color="danger"
              icon={mdiTrashCan}
              label="Delete"
              disabled={questionCounts == null}
              onClick={() => setPendingDelete(categories.filter((category) => selectedIds.has(category.id)))}
              small
              roundedFull
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-4 py-8">
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : fetchError ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-red-500 dark:text-red-400 mb-1">Failed to load categories</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-3">{fetchError}</p>
          <button type="button" onClick={() => fetchCategories()} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            Try again
          </button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">{emptyMessage}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th className="lg:w-10">
                    <PageCheckbox
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={togglePageSelection}
                      label="Select categories on this page"
                    />
                  </th>
                  <th>Id</th>
                  <th className="lg:min-w-[14rem]">Name (EN)</th>
                  <th className="lg:min-w-[14rem]">Name (FR)</th>
                  <th>Level</th>
                  <th>Questions</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {paginated.map((category) => {
                  const selected = selectedIds.has(category.id)
                  const count = questionCounts?.[category.id]
                  return (
                    <tr key={category.id} className={selected ? 'is-selected' : undefined}>
                      <td data-label="Select" className="lg:w-10">
                        <PageCheckbox
                          checked={selected}
                          indeterminate={false}
                          onChange={() => toggleRow(category.id)}
                          label={`Select category ${category.id}`}
                        />
                      </td>
                      <td data-label="Id">
                        <span className="text-xs text-slate-400 dark:text-slate-500">#{category.id}</span>
                      </td>
                      <td data-label="Name (EN)" className="whitespace-normal">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{categoryName(category, 'en')}</span>
                      </td>
                      <td data-label="Name (FR)" className="whitespace-normal">
                        <span className="text-slate-600 dark:text-slate-300">{categoryName(category, 'fr')}</span>
                      </td>
                      <td data-label="Level">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{category.level ?? '—'}</span>
                      </td>
                      <td data-label="Questions">
                        <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                          {count == null ? '…' : count}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            category.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td data-label="Created" className="whitespace-nowrap">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(category.created_at)}</span>
                      </td>
                      <td className="before:hidden lg:w-1 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <label
                            className={`switch ${togglingId === category.id ? 'opacity-50' : ''}`}
                            title={category.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <input
                              type="checkbox"
                              checked={category.is_active}
                              disabled={togglingId === category.id}
                              aria-label={category.is_active ? `Deactivate category ${category.id}` : `Activate category ${category.id}`}
                              onChange={() => toggleActive(category)}
                            />
                            <span className="check" />
                          </label>
                          <Button color="info" icon={mdiPencil} onClick={() => openEdit(category)} small />
                          <Button
                            color="danger"
                            icon={mdiTrashCan}
                            onClick={() => setPendingDelete([category])}
                            disabled={questionCounts == null}
                            small
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  aria-label="Previous page"
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Icon path={mdiChevronLeft} size="16" w="" h="" />
                </button>
                {pages.map((page, index) =>
                  page === 'gap' ? (
                    <span key={`gap-${index}`} className="px-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                        page === safePage
                          ? 'bg-indigo-600 text-white'
                          : 'border border-gray-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {page + 1}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(numPages - 1, safePage + 1))}
                  disabled={safePage >= numPages - 1}
                  aria-label="Next page"
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Icon path={mdiChevronRight} size="16" w="" h="" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  Rows
                  <select
                    aria-label="Rows per page"
                    value={perPage}
                    onChange={(event) => {
                      setPerPage(Number(event.target.value))
                      setCurrentPage(0)
                    }}
                    className={selectClass}
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Page {safePage + 1} of {numPages} · {filteredCategories.length}
                  {filteredCategories.length !== categories.length ? ` of ${categories.length}` : ''} categories
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function PageCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
  label: string
}) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label className="checkbox">
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} />
      <span className="check" />
    </label>
  )
}

export default TableCategories
