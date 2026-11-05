/**
 * Client shim for `@tanstack/react-start` to allow running the full application
 * in a standard Vite React environment without Cloudflare/Nitro SSR bundle errors.
 */

export function createServerFn(options?: { method?: string }) {
  let _validator: ((input: any) => any) | null = null;
  let _handler: ((ctx: { data: any; context: any }) => Promise<any>) | null = null;

  const builder: any = {
    inputValidator(fn: (input: any) => any) {
      _validator = fn;
      return builder;
    },
    middleware(_mws: any[]) {
      return builder;
    },
    handler(fn: (ctx: { data: any; context: any }) => Promise<any>) {
      _handler = fn;
      const callable: any = async (args?: { data?: any }) => {
        let inputData = args?.data;
        if (_validator) {
          try {
            inputData = _validator(inputData);
          } catch {
            // validator fallback
          }
        }
        return await _handler!({ data: inputData, context: {} });
      };
      callable.handler = _handler;
      callable.options = options;
      return callable;
    },
  };

  return builder;
}

export function useServerFn<T>(fn: T): T {
  return fn;
}

export function createMiddleware(_options?: any) {
  return {
    server: (fn: any) => fn,
    client: (fn: any) => fn,
  };
}

export function createCsrfMiddleware(_options?: any) {
  return () => {};
}

export function createStart(_fn?: any) {
  return {
    handler: () => {},
  };
}
