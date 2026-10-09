'use client'
import { createContext, useContext } from 'react'
import { DEFAULT_SITE_CONFIG } from '@/lib/site-modules'
export const SiteContext = createContext({
  config: DEFAULT_SITE_CONFIG,
  ready: false,
  preview: false,
  refresh: async () => {},
})
export const useSiteModules = () => useContext(SiteContext)
