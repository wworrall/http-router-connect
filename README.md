# `http-router-connect`

`http-router-connect` is an elegant and lightweight composable router written in Typescript that uses [`regexparam`](https://www.npmjs.com/package/regexparam) for request routing and supports connect-style middleware.

It has only one dependency: [`regexparam`](https://www.npmjs.com/package/regexparam). See `regexparam` for routing documentation.

## Why

`http-connect-router` was written to meet the needs of developers who want a familiar `express.js` and `connect`-middleware compatible API but don't want to adopt a server framework.

## Key Features

- Support composable/nested routers for easy code organisation.
- Supports the safe throwing of errors in asynchronous request handlers so no need for [`express-async-errors`](https://www.npmjs.com/package/express-async-errors). Phew.
- Child routers, middleware, and request handlers are all executed in the order they are registered - there is no hierarchy to be aware of.
- Parameterized requests are supported (as well as powerful routing capabilities) with [`regexparam`](https://www.npmjs.com/package/regexparam)

## Usage

[See example](./src/example.ts)

## Limitation

Some express middleware solutions are typed to require an express handler signature (express' own Request and Response types). Some can be used by just `// @ts-ignore` ing the type incompatibility, others actually require express specific methods which need to be polyfilled on a case-by-case basis.
