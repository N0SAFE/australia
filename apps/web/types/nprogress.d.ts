declare module 'nprogress' {
  export interface NProgressOptions {
    minimum?: number
    template?: string
    easing?: string
    speed?: number
    trickle?: boolean
    trickleSpeed?: number
    showSpinner?: boolean
    parent?: string
  }

  export interface NProgress {
    configure(options: NProgressOptions): NProgress
    set(n: number): NProgress
    isStarted(): boolean
    start(): NProgress
    done(force?: boolean): NProgress
    inc(amount?: number): NProgress
    remove(): void
    isRendered(): boolean
    getPositioningCSS(): string
  }

  const nprogress: NProgress
  export default nprogress
}
