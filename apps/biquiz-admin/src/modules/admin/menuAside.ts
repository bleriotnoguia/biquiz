import {
  mdiAccountCircle,
  mdiViewDashboard,
  mdiHelpCircleOutline,
  mdiTagMultiple,
  mdiUpload,
} from '@mdi/js'
import { MenuAsideItem } from './interfaces'

const menuAside: MenuAsideItem[] = [
  {
    href: '/admin',
    icon: mdiViewDashboard,
    label: 'Dashboard',
  },
  {
    href: '/admin/questions',
    label: 'Questions',
    icon: mdiHelpCircleOutline,
  },
  {
    href: '/admin/categories',
    label: 'Categories',
    icon: mdiTagMultiple,
  },
  {
    href: '/admin/import',
    label: 'Import',
    icon: mdiUpload,
  },
  {
    href: '/admin/profile',
    label: 'Profile',
    icon: mdiAccountCircle,
  },
]

export default menuAside
