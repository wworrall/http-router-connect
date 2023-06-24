import http, { ServerResponse } from "node:http";
// change to import Router from "http-router-connect";
import Router, { NextFunction, RouterRequest } from ".";

// (optional) extend the RouterRequest interface as you wish.
// RouterRequest itself extends IncomingMessage from `node:http`.
export interface AppRequest<Params = any> extends RouterRequest<Params> {
  // e.g., added by a url parser middleware
  query: URLSearchParams;

  // e.g., added by your body parser middleware
  body: any;

  // e.g., added by session middleware e.g., cookieSession()
  session: any;

  // e.g., added by authentication middleware
  user: any;
}

// (optional) extend the http ServerResponse interface. Remember to actually
// add these methods in middleware
export interface AppResponse extends ServerResponse {
  status(code: number): AppResponse;
  json(data: any): AppResponse;
}

// middleware that adds the above methods to the response object
export function extendResponse(
  req: AppRequest,
  res: AppResponse,
  next: NextFunction
) {
  res.status = function (code: number) {
    this.statusCode = code;
    return this;
  };

  res.json = function (data: any) {
    this.setHeader("Content-Type", "application/json");
    this.end(JSON.stringify(data));
    return this;
  };

  next();
}

// here's another router that we can use for our api
const apiRouter = new Router<AppRequest, AppResponse>();
// add hello world api endpoint (will be accessible at GET /api/hello)
apiRouter.get("/hello", (req, res) => {
  res.json({ message: "Hello World!" });
});

// add hello name api endpoint (will be accessible at GET /api/hello/:name)
apiRouter.get("/hello/:name", (req, res) => {
  res.json({ message: `Hello ${req.params.name}!` });
});

// Ok, let's create our main app router
const app = new Router<AppRequest, AppResponse>();

// it makes sense to add middleware that extends request or response objects
// first
app.use(extendResponse);

// add other middleware here
// middleware is just a function that takes a request, response and next
// it will be executed in the order it is registered and takes the same precedence
// as request handlers registered with the router methods (get, post, etc.)
// middleware can be used on specific methods or all methods using the `use` method
// e.g., app.use(helmet());
// e.g., app.use(cookieSession());

// mount child routers. Again, routers are just middleware and are executed in
// the order they are registered
app.use("/api", apiRouter);

// add 404 handler here - will catch requests that haven't been served by any
// middleware or router
app.use(() => {
  throw new Error("Not Found");
  // or, if using 'http-errors':
  // throw new NotFound();
});

// set the error handler
// each router can have it's own error handler but, if not set, the error
// will bubble up to the parent router. Always set an error handler on the
// top level router to catch any errors that haven't been handled by any
// child router's error handler
app.setErrorHandler((err, req, res) => {
  console.error(err);
  res.status(err?.status || 500); // err.status is set by 'http-errors'
  res.json({
    message: err?.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
});

// finally, lets use our app to to handle requests
http
  .createServer((req, res) => {
    app.handleRequest(req as AppRequest, res as AppResponse);
  })
  .listen(3001, () => {
    console.log("Server listening at http://localhost:3001");
  });
