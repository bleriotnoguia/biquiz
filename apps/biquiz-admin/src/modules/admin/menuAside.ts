import {
  mdiAccountCircle,
  mdiViewDashboard,
  mdiHelpCircleOutline,
  mdiTagMultiple,
  mdiUpload,
  mdiFlagOutline,
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
    href: '/admin/reports',
    label: 'Reports',
    icon: mdiFlagOutline,
  },
  {
    href: '/admin/profile',
    label: 'Profile',
    icon: mdiAccountCircle,
  },
]

export default menuAside
