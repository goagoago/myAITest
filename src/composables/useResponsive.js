import { computed } from 'vue'
import { useBreakpoints } from '@vueuse/core'

const breakpoints = useBreakpoints({
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
})

export function useResponsive() {
  const isMobile = breakpoints.smaller('md')
  const isTablet = computed(() => breakpoints.between('md', 'lg').value)
  const isDesktop = breakpoints.greaterOrEqual('lg')

  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoints,
  }
}
