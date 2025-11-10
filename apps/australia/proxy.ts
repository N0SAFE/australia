// middleware.ts

import { stackMiddlewares } from './middlewares/utils/stackMiddlewares'
import { withHeaders } from './middlewares/WithHeaders'
import { withUnlock } from './middlewares/WithUnlock'
// import * as HealthCheckMiddleware from './middlewares/WithHealthCheck'
import * as AuthMiddleware from './middlewares/WithAuth'
import * as FirstLoadMiddleware from './middlewares/WithFirstLoad'
// import * as EnvMiddleware from './middlewares/WithEnv'
import type { Middleware } from './middlewares/utils/types'

const middlewares = [
    // EnvMiddleware,
    // HealthCheckMiddleware,
    // WithRedirect,
    AuthMiddleware,
    FirstLoadMiddleware,
    withUnlock,
    // withHeaders,
] satisfies Middleware[]

export default stackMiddlewares(middlewares)
