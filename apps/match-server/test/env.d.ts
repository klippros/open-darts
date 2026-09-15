declare module 'cloudflare:workers' {
  interface ProvidedEnv extends Env {
    MATCH: Env['MATCH']
  }
}
