import FormField from '../Form/Field'
import { Field } from 'formik'
import { IOption } from '../../interfaces'
import FormCheckRadio from '../Form/CheckRadio'
import { TRUE_FALSE_CODE } from '@/modules/admin/utils/questionForm'

type Props = {
  options: IOption[] | null
  typeCode: string | undefined
  handleChangeOption: (index: number, lang: string, value: string | boolean) => void
}

const QuestionFormStepTwo = ({ options, typeCode, handleChangeOption }: Props) => {
  const isTrueFalse = typeCode === TRUE_FALSE_CODE

  return (
    <div className="space-y-4">
      {(options ?? []).map((option, i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Option {i + 1}
            </span>
            <FormCheckRadio type="switch" label="Correct answer">
              <Field
                type="checkbox"
                value={option.is_correct}
                checked={option.is_correct}
                onChange={(e) => handleChangeOption(i, 'is_correct', e.target.checked)}
                name={`option_${i + 1}_is_correct`}
              />
            </FormCheckRadio>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="English">
              <Field
                value={option.name_en ?? ''}
                readOnly={isTrueFalse}
                onChange={(e) => handleChangeOption(i, 'name_en', e.target.value)}
                name={`option_${i + 1}_name_en`}
                placeholder="Answer in English"
              />
            </FormField>
            <FormField label="French">
              <Field
                value={option.name_fr ?? ''}
                readOnly={isTrueFalse}
                onChange={(e) => handleChangeOption(i, 'name_fr', e.target.value)}
                name={`option_${i + 1}_name_fr`}
                placeholder="Réponse en Français"
              />
            </FormField>
          </div>
        </div>
      ))}

      <p className="text-xs text-slate-500 dark:text-slate-400">Mark exactly one answer as correct.</p>
    </div>
  )
}

export default QuestionFormStepTwo
