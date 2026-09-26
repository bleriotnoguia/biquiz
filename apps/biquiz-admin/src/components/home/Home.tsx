import React from 'react'
import TwoColApp from './TwoColApp'
import NavbarCenterMenu from './NavbarCenterMenu'
import RedirectLoggedInToDashboard from './RedirectLoggedInToDashboard'

export const Home = () => {
  return (
    <>
      <RedirectLoggedInToDashboard />
      <NavbarCenterMenu />
      <TwoColApp />
    </>
  )
}
