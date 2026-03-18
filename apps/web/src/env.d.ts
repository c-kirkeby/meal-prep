/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

type Runtime = import("@astrojs/cloudflare").Runtime<Cloudflare.Env>

declare namespace App {
  interface Locals extends Runtime {}
}
