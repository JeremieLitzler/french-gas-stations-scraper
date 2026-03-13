import type { ErrorNextPage } from './ErrorNextPage'

export interface ErrorExtended extends ErrorNextPage, Error {
  customCode?: number
}
