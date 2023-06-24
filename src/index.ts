import type { IncomingMessage, ServerResponse } from "node:http";
import { parse } from "regexparam";

export interface RouterRequest<Params = any> extends IncomingMessage {
  params: Params;
  path: string;
}

export type NextFunction = (error?: any) => void;

export type RouteHandler<
  Req extends RouterRequest,
  Res extends ServerResponse
> = (req: Req, res: Res, next: NextFunction) => void | Promise<void>;

type PrefixedRouteHandler<
  Req extends RouterRequest,
  Res extends ServerResponse
> = (
  req: Req,
  res: Res,
  next: NextFunction,
  pathPrefix?: string
) => void | Promise<void>;

interface Route<Req extends RouterRequest, Res extends ServerResponse> {
  path: string;
  handler: PrefixedRouteHandler<Req, Res>;
  isUseHandler?: boolean;
}

type Method = "GET" | "POST" | "OPTIONS" | "DELETE" | "PUT" | "PATCH";

class Router<Req extends RouterRequest, Res extends ServerResponse> {
  private routes: { [method in Method]: Route<Req, Res>[] };
  private errorHandler?: (error: any, req: Req, res: Res) => void;

  constructor() {
    // organise routes by method to speed up routing
    this.routes = {
      GET: [],
      POST: [],
      OPTIONS: [],
      DELETE: [],
      PUT: [],
      PATCH: [],
    };
  }

  public use(
    pathOrRouteHandler: string | RouteHandler<Req, Res> | Router<Req, Res>,
    ...handlers: Array<RouteHandler<Req, Res> | Router<Req, Res>>
  ): void {
    let path: string;
    if (
      typeof pathOrRouteHandler === "function" ||
      pathOrRouteHandler instanceof Router
    ) {
      handlers.unshift(pathOrRouteHandler);
      path = "";
    } else {
      path = pathOrRouteHandler;
    }

    for (const handler of handlers) {
      let handlerToAdd: PrefixedRouteHandler<Req, Res>;
      if (handler instanceof Router) {
        handlerToAdd = async (req, res, next, pathPrefix) => {
          await handler.handleRequest(req, res, next, pathPrefix);
        };
      } else {
        handlerToAdd = handler;
      }

      this.registerRoute("GET", path, handlerToAdd, true);
      this.registerRoute("POST", path, handlerToAdd, true);
      this.registerRoute("OPTIONS", path, handlerToAdd, true);
      this.registerRoute("DELETE", path, handlerToAdd, true);
      this.registerRoute("PUT", path, handlerToAdd, true);
      this.registerRoute("PATCH", path, handlerToAdd, true);
    }
  }

  public get(
    path: string,
    ...handlers: ((
      req: Req,
      res: Res,
      next: NextFunction
    ) => void | Promise<void>)[]
  ): void {
    for (const handler of handlers) {
      this.registerRoute("GET", path, handler);
    }
  }

  public post(
    path: string,
    ...handlers: ((
      req: Req,
      res: Res,
      next: NextFunction
    ) => void | Promise<void>)[]
  ): void {
    for (const handler of handlers) {
      this.registerRoute("POST", path, handler);
    }
  }

  public options(
    path: string,
    ...handlers: ((
      req: Req,
      res: Res,
      next: NextFunction
    ) => void | Promise<void>)[]
  ): void {
    for (const handler of handlers) {
      this.registerRoute("OPTIONS", path, handler);
    }
  }

  public delete(
    path: string,
    ...handlers: ((
      req: Req,
      res: Res,
      next: NextFunction
    ) => void | Promise<void>)[]
  ): void {
    for (const handler of handlers) {
      this.registerRoute("DELETE", path, handler);
    }
  }

  public put(
    path: string,
    ...handlers: ((
      req: Req,
      res: Res,
      next: NextFunction
    ) => void | Promise<void>)[]
  ): void {
    for (const handler of handlers) {
      this.registerRoute("PUT", path, handler);
    }
  }

  public patch(
    path: string,
    ...handlers: ((
      req: Req,
      res: Res,
      next: NextFunction
    ) => void | Promise<void>)[]
  ): void {
    for (const handler of handlers) {
      this.registerRoute("PATCH", path, handler);
    }
  }

  public async handleRequest(
    req: Req,
    res: Res,
    routerNext?: NextFunction,
    pathPrefix: string = ""
  ): Promise<void> {
    const method = req.method?.toUpperCase() as Method;
    req.path = req.url!.split("?")[0];

    for (const route of this.routes[method]) {
      const fullPath = pathPrefix + route.path;
      let testPath = fullPath;

      // when using '.use' we want to match all subpaths
      if (route.isUseHandler) testPath += "/*";

      const { keys, pattern } = parse(testPath);
      let match = pattern.exec(req.path);
      if (!match) {
        // try again with trailing slash
        match = pattern.exec(req.path + "/");
      }

      if (!match) continue;

      // it's a match!

      const params: Record<string, string> = {};
      for (let i = 0; i < keys.length; i++) {
        params[keys[i]] = match[i + 1];
      }
      req.params = params;

      let nextCalled = false;
      let handlerError: any = null;
      const thisNext = (error: any) => {
        nextCalled = true;
        handlerError = error;
      };

      try {
        await route.handler(req, res, thisNext, fullPath);
      } catch (error) {
        // an error was thrown not passed to next
        console.log("caught error", error);
        handlerError = error;
      }

      if (handlerError) {
        if (this.errorHandler) {
          this.errorHandler(handlerError, req, res);
          return;
        } else {
          throw handlerError; // throw to be caught by parent router
        }
      } else if (nextCalled) {
        // next was called, but no error was passed, try next route
        continue;
      } else {
        // next wasn't called, so we can return
        return;
      }
    }

    // if we got here, all matching routes have been tried with no errors
    // so we can call the next function if it exists to pass control back out
    // of this router
    if (routerNext) {
      routerNext();
    }
  }

  public setErrorHandler(
    handler: (error: any, req: Req, res: Res) => void
  ): void {
    this.errorHandler = handler;
  }

  private registerRoute(
    method: Method,
    path: string,
    handler: PrefixedRouteHandler<Req, Res>,
    isUseHandler: boolean = false
  ) {
    this.routes[method].push({ path, handler, isUseHandler });
  }
}

export default Router;
