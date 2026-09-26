import React from 'react'
import {
  IonList,
  IonItem,
  IonAvatar,
  IonSkeletonText,
  IonLabel,
  IonProgressBar,
} from "@ionic/react";
import { useTranslation } from 'react-i18next';

const ListLoading: React.FC = () => {
  const { t } = useTranslation()
  return (
    <>
    <IonProgressBar type="indeterminate"></IonProgressBar>
    <IonList aria-busy="true" aria-label={t('loading') ?? undefined}>
      {Array.from({ length: 4 }, (_, index) => <IonItem key={index}>
          <IonAvatar slot="start">
            <IonSkeletonText animated />
          </IonAvatar>
          <IonLabel>
            <h3>
              <IonSkeletonText animated style={{ width: '50%' }} />
            </h3>
            <p>
              <IonSkeletonText animated style={{ width: '80%' }} />
            </p>
            <p>
              <IonSkeletonText animated style={{ width: '60%' }} />
            </p>
          </IonLabel>
        </IonItem>)}
    </IonList>
    </>
  )
}

export default ListLoading
