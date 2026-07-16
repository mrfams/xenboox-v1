import { t } from "./server"
import { appRouter } from "@/server/routers/_app"

export const createCaller = t.createCallerFactory(appRouter)
