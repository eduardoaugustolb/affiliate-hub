## [0.10.1](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.10.0...v0.10.1) (2026-10-30)

## [0.10.0](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.9.0...v0.10.0) (2026-10-30)


### Features

* **admin:** redesign dashboard with existing UI primitives ([2cfead1](https://github.com/eduardoaugustolb/affiliate-hub/commit/2cfead1dd47ec8429255aca1adbddff92ce14012))
* **api:** expose Instagram administration and signed webhook routes ([ac4cc0b](https://github.com/eduardoaugustolb/affiliate-hub/commit/ac4cc0b2493ec0c1688e05b7c8e0da37903cbfae))
* **instagram:** add official Meta transport and signed event adapter ([193fed6](https://github.com/eduardoaugustolb/affiliate-hub/commit/193fed6f1dab90390efd5a9bf15c16ebda01306b))
* **instagram:** model campaign triggers and outfit numbering ([2bf317a](https://github.com/eduardoaugustolb/affiliate-hub/commit/2bf317a358486ae3f4f2ac4d7ce0a7cf55607533))
* **instagram:** orchestrate campaign rules and durable event processing ([cfe70b6](https://github.com/eduardoaugustolb/affiliate-hub/commit/cfe70b61daa3318d09efa5c976eb5b6bd815230c))
* **instagram:** persist campaigns inbox and permanent send claims ([8ff85f4](https://github.com/eduardoaugustolb/affiliate-hub/commit/8ff85f4b948d0cb1bc904e743ba14bddff7d64de))

## [0.9.0](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.8.0...v0.9.0) (2026-10-24)


### Features

* add Black Hem storefront, catalog search and admin interface ([27fb82c](https://github.com/eduardoaugustolb/affiliate-hub/commit/27fb82c9a15a19fe23772fc0f00f07e5ad61516e))
* **mvp:** add public resolver and admin dashboard ([8ce5456](https://github.com/eduardoaugustolb/affiliate-hub/commit/8ce54567d94ba59e30db1cd2677c6acd2ceec209))

## [0.8.0](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.7.0...v0.8.0) (2026-10-16)


### Features

* **auth:** centralize session validation and protect product creation ([fc010e6](https://github.com/eduardoaugustolb/affiliate-hub/commit/fc010e630d4a5b887b49b740ab9d3313fe028ca5))
* **products:** add authenticated update and delete routes ([3097e4a](https://github.com/eduardoaugustolb/affiliate-hub/commit/3097e4afa470bc0d1cc56ebb7bfec113788e7d20))

## [0.7.0](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.6.3...v0.7.0) (2026-10-15)


### Features

* **auth:** register cookie authentication routes and API tests ([d2e396d](https://github.com/eduardoaugustolb/affiliate-hub/commit/d2e396d696d70a299881d967181431eaa81cbbcb))
* **database:** add Bun SQL adapter and explicit transactions ([11e3b3c](https://github.com/eduardoaugustolb/affiliate-hub/commit/11e3b3c082e90157ad805e288f3dee9dc482a610))
* **errors:** map bad requests to HTTP 400 ([8040063](https://github.com/eduardoaugustolb/affiliate-hub/commit/8040063736a1b5742dcb4fa986315f2116420279))
* **http:** add fluent responses and cookie support to REST server ([77ca380](https://github.com/eduardoaugustolb/affiliate-hub/commit/77ca3808bf2e0503b935b548ac3af0df2ba876b8))
* **http:** support request headers and response cookies in client ([0600780](https://github.com/eduardoaugustolb/affiliate-hub/commit/0600780e214c724d3c858e38e101290cc520b4ab))


### Bug Fixes

* **auth:** return raw tokens and reject expired sessions ([c3ccf80](https://github.com/eduardoaugustolb/affiliate-hub/commit/c3ccf8075dcea89595ea708547746bcc1e24a136))

