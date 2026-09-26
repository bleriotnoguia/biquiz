'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn, sendMagicLink } from '@/modules/auth/auth.actions'
import {
  selectIsLoggedInUser,
  selectSignInError,
  selectSignInStatus,
  selectMagicLinkError,
  selectMagicLinkStatus,
} from '@/modules/auth/auth.selectors'
import { CustomError } from '@biquiz/shared'
import { RequestStatus } from '@biquiz/shared'
import { useAppDispatch, useAppSelector } from '@/config/store'
import { useLoggedInUserData } from '@/hooks/useLoggedInUserData'

const LoginPage = () => {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const isLoggedInUser: boolean = useAppSelector(selectIsLoggedInUser)
  const signInError: CustomError | null = useAppSelector(selectSignInError)
  const signInStatus: RequestStatus = useAppSelector(selectSignInStatus)
  const magicLinkError: CustomError | null = useAppSelector(selectMagicLinkError)
  const magicLinkStatus: RequestStatus = useAppSelector(selectMagicLinkStatus)

  const { isLoggedInSession } = useLoggedInUserData(false)

  const [isMagicLinkMode, setIsMagicLinkMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isLoggedInUser || isLoggedInSession) {
      router.push('/admin')
    }
  }, [isLoggedInSession, isLoggedInUser, router])

  const onSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.target as HTMLFormElement)
    const formEntries = Object.fromEntries(formData)
    await dispatch(signIn({ email: formEntries.email as string, password: formEntries.password as string }))
  }

  const onSendMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.target as HTMLFormElement)
    const formEntries = Object.fromEntries(formData)
    await dispatch(sendMagicLink({ email: formEntries.email as string }))
  }

  const isPasswordLoading = signInStatus === RequestStatus.LOADING
  const isMagicLinkLoading = magicLinkStatus === RequestStatus.LOADING
  const magicLinkSent = magicLinkStatus === RequestStatus.COMPLETED

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl" />
        </div>
        <div className="relative z-10 text-center px-12">
          <div className="text-6xl mb-6">📖</div>
          <h1 className="text-4xl font-bold text-white mb-4">Biquiz Admin</h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Manage your Bible quiz content, categories, and questions from one place.
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors mb-8"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to home
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">Welcome back</h2>
            <p className="mt-2 text-gray-500 dark:text-slate-400">Sign in to your admin account</p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden mb-6">
            <button
              type="button"
              onClick={() => setIsMagicLinkMode(false)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                !isMagicLinkMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setIsMagicLinkMode(true)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                isMagicLinkMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              Magic link
            </button>
          </div>

          {!isMagicLinkMode ? (
            <form onSubmit={onSignIn} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {signInStatus === RequestStatus.FAILED && signInError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {signInError.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isPasswordLoading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm"
              >
                {isPasswordLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={onSendMagicLink} className="space-y-5">
              {magicLinkSent ? (
                <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-center">
                  <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <p className="text-green-700 dark:text-green-400 font-medium">Check your inbox</p>
                  <p className="text-green-600 dark:text-green-500 text-sm">
                    We sent a magic link to your email. Click it to sign in.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Enter your email and we&apos;ll send you a sign-in link — no password needed.
                  </p>

                  <div>
                    <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                      Email address
                    </label>
                    <input
                      id="magic-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  {magicLinkStatus === RequestStatus.FAILED && magicLinkError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {magicLinkError.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isMagicLinkLoading}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm"
                  >
                    {isMagicLinkLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending…
                      </span>
                    ) : (
                      'Send magic link'
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
