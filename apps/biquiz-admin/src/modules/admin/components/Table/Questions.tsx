'use client'

import { mdiChevronLeft, mdiChevronRight, mdiMagnify, mdiPencil, mdiPlus, mdiTrashCan } from '@mdi/js'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { IOption, IQuestion } from '@/modules/admin/interfaces'
import Button from '../Button'
import CardBoxModal from '../CardBox/Modal'
import { format } from 'date-fns'
import { Form, Formik, FormikProps } from 'formik'
import QuestionFormStepTwo from './QuestionFormStepTwo'
import QuestionFormStepOne from './QuestionFormStepOne'
import Tabs, { ITabs } from './Tabs'
import { supabase } from '@/config/supabase'
import toast from 'react-hot-toast'
import Icon from '../Icon'
import {
  filterQuestions,
  lookupLabel,
  NamedLookup,
  pageWindow,
} from '@/modules/admin/utils/questionTable'
import { optionsForType } from '@/modules/admin/utils/questionForm'

const PAGE_SIZES = [10, 25, 50]
const selectClass =
  'text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent'

const TableQuestions = () => {
  const formRef = useRef<FormikProps<any>>(null)
  const [questions, setQuestions] = useState<IQuestion[]>([])
  const [categories, setCategories] = useState<NamedLookup[]>([])
  const [types, setTypes] = useState<NamedLookup[]>([])
  const [isSubmeting, setIsSubmeting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [perPage, setPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const initialQuestion: IQuestion = {
    name_en: '',
    name_fr: '',
    source_text_en: '',
    source_text_fr: '',
    is_active: true,
    category_id: 1,
    type_id: 1,
    options: [
      { is_correct: false, name_en: '', name_fr: '' },
      { is_correct: false, name_en: '', name_fr: '' },
      { is_correct: false, name_en: '', name_fr: '' },
      { is_correct: false, name_en: '', name_fr: '' },
    ],
    created_at: '',
    updated_at: '',
  }

  const [currentPage, setCurrentPage] = useState(0)
  const [question, setQuestion] = useState<IQuestion>(initialQuestion)
  const [options, setOptions] = useState<IOption[]>(initialQuestion.options)

  const filteredQuestions = useMemo(
    () =>
      filterQuestions(questions, {
        search: searchQuery,
        status: statusFilter,
        categoryId: categoryFilter,
        typeId: typeFilter,
      }),
    [questions, searchQuery, statusFilter, categoryFilter, typeFilter],
  )

  const numPages = Math.max(1, Math.ceil(filteredQuestions.length / perPage))
  const safePage = Math.min(currentPage, numPages - 1)
  const questionsPaginated = filteredQuestions.slice(perPage * safePage, perPage * (safePage + 1))
  const pages = pageWindow(safePage, filteredQuestions.length === 0 ? 0 : numPages)
  const pageIds = questionsPaginated.flatMap((item) => (item.id != null ? [item.id] : []))
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id))
  const filtersActive = statusFilter !== 'all' || categoryFilter !== 'all' || typeFilter !== 'all'
  const pendingQuestions = questions.filter((item) => item.id != null && pendingDeleteIds.includes(item.id))

  const getQuestionsData = async (silent = false) => {
    if (!silent) setLoading(true)
    const [questionsResult, categoriesResult, typesResult] = await Promise.all([
      supabase.rpc('get_question_details'),
      supabase.rpc('get_categories'),
      supabase.rpc('get_question_types'),
    ])

    if (questionsResult.error) console.error(questionsResult.error)
    if (categoriesResult.error) console.error(categoriesResult.error)
    if (typesResult.error) console.error(typesResult.error)

    const nextQuestions: IQuestion[] = questionsResult.data ?? []
    setQuestions(nextQuestions)
    setCategories(categoriesResult.data ?? [])
    setTypes(typesResult.data ?? [])
    setSelectedIds((prev) => {
      const valid = new Set(nextQuestions.flatMap((item) => (item.id != null ? [item.id] : [])))
      const next = new Set([...prev].filter((id) => valid.has(id)))
      return next.size === prev.size ? prev : next
    })
    if (!silent) setLoading(false)
  }

  const updateQuestionData = async (values: IQuestion) => {
    const { error } = await supabase.rpc('update_question_data', { p_data: values })
    if (error) {
      toast.error('Failed to update question.')
    } else {
      toast.success('Question updated successfully!')
      handleCloseModal()
      getQuestionsData(true)
    }
  }

  const insertQuestionData = async (values: IQuestion) => {
    const { error } = await supabase.rpc('insert_question_data', { p_data: values })
    if (error) toast.error('Failed to create question.')
    else {
      toast.success('Question created successfully!')
      handleCloseModal()
      getQuestionsData(true)
    }
  }

  const deleteQuestions = async (ids: number[]) => {
    if (ids.length === 0 || isDeleting) return
    setIsDeleting(true)
    const results = await Promise.all(ids.map((id) => supabase.rpc('delete_question_data', { question_id: id })))
    const failed = results.filter((result) => result.error).length
    const deleted = ids.length - failed

    if (failed && deleted === 0) {
      toast.error(ids.length === 1 ? 'Failed to delete question.' : 'Failed to delete questions.')
    } else if (failed) {
      toast.error(`${deleted} deleted, ${failed} failed.`)
    } else {
      toast.success(ids.length === 1 ? 'Question deleted!' : `${ids.length} questions deleted!`)
    }

    setIsDeleting(false)
    setIsModalTrashActive(false)
    setPendingDeleteIds([])
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    await getQuestionsData(true)
  }

  const toggleActive = async (item: IQuestion) => {
    if (item.id == null || togglingId != null) return
    const nextActive = !item.is_active
    setTogglingId(item.id)
    setQuestions((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, is_active: nextActive } : entry)))

    const { data, error } = await supabase
      .from('questions')
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select('id')

    if (error || !data?.length) {
      setQuestions((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, is_active: item.is_active } : entry)))
      toast.error('Failed to update status.')
    }
    setTogglingId(null)
  }

  const handleSubmit = async (values: IQuestion) => {
    setIsSubmeting(true)
    if (values.id) {
      await updateQuestionData(values)
    } else {
      await insertQuestionData(values)
    }
    setIsSubmeting(false)
  }

  const [isModalInfoActive, setIsModalInfoActive] = useState(false)
  const [isModalTrashActive, setIsModalTrashActive] = useState(false)

  const handleModalSubmitBtn = () => {
    if (!formRef.current) return
    formRef.current.handleSubmit()
  }

  const handleCloseModal = () => {
    setOptions(initialQuestion.options)
    setQuestion(initialQuestion)
    setIsModalInfoActive(false)
    setIsModalTrashActive(false)
  }

  const openDelete = (ids: number[]) => {
    setPendingDeleteIds(ids)
    setIsModalTrashActive(true)
  }

  const closeTrash = () => {
    if (isDeleting) return
    setIsModalTrashActive(false)
    setPendingDeleteIds([])
  }

  const typeCode = (typeId: number | string | undefined) =>
    types.find((type) => String(type.id) === String(typeId))?.code

  const applyType = (typeId: number | string | undefined, current = options) => {
    const next = optionsForType(typeCode(typeId), current)
    if (next !== current) setOptions(next)
  }

  const handleChangeOption = (index: number, lang: keyof IOption, value: string | boolean) => {
    const newInputs = [...options]
    newInputs[index][lang] = value
    setOptions(newInputs)
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
      filteredQuestions.forEach((item) => {
        if (item.id != null) next.add(item.id)
      })
      return next
    })
  }

  const resetFilters = () => {
    setStatusFilter('all')
    setCategoryFilter('all')
    setTypeFilter('all')
    setCurrentPage(0)
  }

  const tabs: ITabs = [
    { id: 1, name: 'First step', content: <QuestionFormStepOne types={types} typeCode={typeCode(question.type_id)} /> },
    {
      id: 2,
      name: 'Second step',
      content: (
        <QuestionFormStepTwo options={options} typeCode={typeCode(question.type_id)} handleChangeOption={handleChangeOption} />
      ),
    },
  ]

  useEffect(() => {
    getQuestionsData()
  }, [])

  const formatDate = (value: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return format(date, 'dd/MM/yyyy')
  }

  const emptyMessage = searchQuery
    ? `No questions found for "${searchQuery}"`
    : filtersActive
      ? 'No questions match these filters.'
      : 'No questions yet.'

  return (
    <>
      <CardBoxModal
        title="Question"
        buttonColor="info"
        buttonLabel={isSubmeting ? 'Saving...' : 'Submit'}
        isActive={isModalInfoActive}
        onConfirm={handleModalSubmitBtn}
        onCancel={handleCloseModal}
      >
        <Formik
          innerRef={formRef}
          initialValues={question}
          enableReinitialize
          onSubmit={(values) => handleSubmit({ ...values, options })}
        >
          {({ values, setFieldValue }) => (
          <Form
            onChange={(event) => {
              const target = event.target as HTMLInputElement
              if (target.name !== 'type_id' || target.value === String(values.type_id)) return
              setFieldValue('type_id', Number(target.value))
              setQuestion((prev) => ({ ...prev, type_id: Number(target.value) }))
              applyType(target.value)
            }}
          >
            <Tabs tabs={tabs} />
          </Form>
          )}
        </Formik>
      </CardBoxModal>

      <CardBoxModal
        title={pendingDeleteIds.length > 1 ? 'Delete questions' : 'Confirm deletion'}
        buttonColor="danger"
        buttonLabel={isDeleting ? 'Deleting...' : pendingDeleteIds.length > 1 ? `Delete ${pendingDeleteIds.length}` : 'Delete'}
        isActive={isModalTrashActive}
        onConfirm={() => deleteQuestions(pendingDeleteIds)}
        onCancel={closeTrash}
      >
        {pendingDeleteIds.length > 1 ? (
          <div className="space-y-2">
            <p>
              Delete <b>{pendingDeleteIds.length}</b> questions?
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1 max-h-40 overflow-y-auto">
              {pendingQuestions.slice(0, 8).map((item) => (
                <li key={item.id}>{item.name_en || item.name_fr || `#${item.id}`}</li>
              ))}
              {pendingQuestions.length > 8 && (
                <li className="text-slate-400">and {pendingQuestions.length - 8} more</li>
              )}
            </ul>
          </div>
        ) : (
          <p>
            Are you sure you want to delete:{' '}
            <b>{pendingQuestions[0]?.name_en || pendingQuestions[0]?.name_fr || 'this question'}</b>?
          </p>
        )}
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">This action cannot be undone.</p>
      </CardBoxModal>

      <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-[16rem]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon path={mdiMagnify} size="16" w="" h="" />
            </span>
            <input
              type="text"
              placeholder="Search questions, sources, or ids..."
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
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value)
                setCurrentPage(0)
              }}
              className={selectClass}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {lookupLabel(categories, category.id)}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by type"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value)
                setCurrentPage(0)
              }}
              className={selectClass}
            >
              <option value="all">All types</option>
              {types.map((type) => (
                <option key={type.id} value={String(type.id)}>
                  {lookupLabel(types, type.id)}
                </option>
              ))}
            </select>
            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline px-1"
              >
                Clear filters
              </button>
            )}
            <Button
              color="info"
              icon={mdiPlus}
              label="Add"
              onClick={() => {
                setIsModalInfoActive(true)
                setOptions(initialQuestion.options)
                setQuestion(initialQuestion)
              }}
              small
              roundedFull
            />
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-indigo-800 dark:text-indigo-200">{selectedIds.size} selected</span>
            {selectedIds.size < filteredQuestions.length && (
              <button type="button" onClick={selectAllFiltered} className="text-indigo-600 dark:text-indigo-300 hover:underline">
                Select all {filteredQuestions.length}
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
              onClick={() => openDelete([...selectedIds])}
              small
              roundedFull
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-4 py-8">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : filteredQuestions.length === 0 ? (
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
                      label="Select questions on this page"
                    />
                  </th>
                  <th>Id</th>
                  <th className="question-col">Question</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Options</th>
                  <th>Category</th>
                  <th>Updated</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {questionsPaginated.map((item) => {
                  const selected = item.id != null && selectedIds.has(item.id)
                  const frenchDiffers = item.name_fr && item.name_fr !== item.name_en
                  return (
                    <tr key={item.id} className={selected ? 'is-selected' : undefined}>
                      <td data-label="Select" className="lg:w-10">
                        {item.id != null && (
                          <PageCheckbox
                            checked={selected}
                            indeterminate={false}
                            onChange={() => toggleRow(item.id as number)}
                            label={`Select question ${item.id}`}
                          />
                        )}
                      </td>
                      <td data-label="Id">
                        <span className="text-xs text-slate-400 dark:text-slate-500">#{item.id}</span>
                      </td>
                      <td data-label="Question" className="question-cell">
                        <p className="font-medium text-slate-800 dark:text-slate-100 leading-snug">{item.name_en || '—'}</p>
                        {frenchDiffers && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">{item.name_fr}</p>
                        )}
                      </td>
                      <td data-label="Status">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td data-label="Type">
                        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {lookupLabel(types, item.type_id)}
                        </span>
                      </td>
                      <td data-label="Source">
                        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap" title={item.source_text_fr}>
                          {item.source_text_en || '—'}
                        </span>
                      </td>
                      <td data-label="Options">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                          {Array.isArray(item.options) ? item.options.length : 0}
                        </span>
                      </td>
                      <td data-label="Category">
                        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {lookupLabel(categories, item.category_id)}
                        </span>
                      </td>
                      <td data-label="Updated" className="whitespace-nowrap">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(item.updated_at)}</span>
                      </td>
                      <td data-label="Created" className="whitespace-nowrap">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(item.created_at)}</span>
                      </td>
                      <td className="before:hidden lg:w-1 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <label className={`switch ${togglingId === item.id ? 'opacity-50' : ''}`} title={item.is_active ? 'Deactivate' : 'Activate'}>
                            <input
                              type="checkbox"
                              checked={item.is_active}
                              disabled={togglingId === item.id || item.id == null}
                              aria-label={item.is_active ? `Deactivate question ${item.id}` : `Activate question ${item.id}`}
                              onChange={() => toggleActive(item)}
                            />
                            <span className="check" />
                          </label>
                          <Button
                            color="info"
                            icon={mdiPencil}
                            onClick={() => {
                              setIsModalInfoActive(true)
                              setOptions(item.options)
                              setQuestion(item)
                            }}
                            small
                          />
                          <Button
                            color="danger"
                            icon={mdiTrashCan}
                            onClick={() => {
                              if (item.id != null) openDelete([item.id])
                            }}
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
                  Page {safePage + 1} of {numPages} · {filteredQuestions.length}
                  {filteredQuestions.length !== questions.length ? ` of ${questions.length}` : ''} questions
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

export default TableQuestions
