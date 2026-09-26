import { mdiAccessPoint, mdiTableBorder } from '@mdi/js'
import React from 'react'
import Button from '@/modules/admin/components/Button'
import CardBox from '@/modules/admin/components/CardBox'

import SectionMain from '@/modules/admin/components/Section/Main'
import SectionTitleLineWithButton from '@/modules/admin/components/Section/TitleLineWithButton'
import TableCategories from '@/modules/admin/components/Table/Categories'

const CategoriesPage = () => {
  return (
    <>
      <SectionMain wide>
        <SectionTitleLineWithButton icon={mdiTableBorder} title="Categories" main>
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

        <CardBox className="mb-6" hasTable>
          <TableCategories />
        </CardBox>
      </SectionMain>
    </>
  )
}

export default CategoriesPage
