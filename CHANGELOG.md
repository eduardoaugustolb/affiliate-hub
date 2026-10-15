## [0.7.0](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.6.3...v0.7.0) (2026-10-15)


### Features

* **auth:** register cookie authentication routes and API tests ([d2e396d](https://github.com/eduardoaugustolb/affiliate-hub/commit/d2e396d696d70a299881d967181431eaa81cbbcb))
* **database:** add Bun SQL adapter and explicit transactions ([11e3b3c](https://github.com/eduardoaugustolb/affiliate-hub/commit/11e3b3c082e90157ad805e288f3dee9dc482a610))
* **errors:** map bad requests to HTTP 400 ([8040063](https://github.com/eduardoaugustolb/affiliate-hub/commit/8040063736a1b5742dcb4fa986315f2116420279))
* **http:** add fluent responses and cookie support to REST server ([77ca380](https://github.com/eduardoaugustolb/affiliate-hub/commit/77ca3808bf2e0503b935b548ac3af0df2ba876b8))
* **http:** support request headers and response cookies in client ([0600780](https://github.com/eduardoaugustolb/affiliate-hub/commit/0600780e214c724d3c858e38e101290cc520b4ab))


### Bug Fixes

* **auth:** return raw tokens and reject expired sessions ([c3ccf80](https://github.com/eduardoaugustolb/affiliate-hub/commit/c3ccf8075dcea89595ea708547746bcc1e24a136))

## [0.6.3](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.6.2...v0.6.3) (2026-10-14)

## [0.6.2](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.6.1...v0.6.2) (2026-10-12)


### Bug Fixes

* **products:** reject empty lookup codes ([c19b1dd](https://github.com/eduardoaugustolb/affiliate-hub/commit/c19b1dd54cee6be6e8182a5f965ce56bffd75985))

## [0.6.1](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.6.0...v0.6.1) (2026-10-12)


### Bug Fixes

* **ci:** remove unavailable husky prepare script ([7dc9126](https://github.com/eduardoaugustolb/affiliate-hub/commit/7dc9126d9d5153ae17e38722af8676500fb19fe2))

## [0.6.0](https://github.com/eduardoaugustolb/affiliate-hub/compare/v0.5.0...v0.6.0) (2026-10-12)


### Features

* add admin bootstrap script ([f7b19c5](https://github.com/eduardoaugustolb/affiliate-hub/commit/f7b19c5395a668293c972b9c25c3e4e9a2486e79))
* add user authentication sessions ([568b519](https://github.com/eduardoaugustolb/affiliate-hub/commit/568b519baa4e8f941c206f678c235bdb644f7831))
* **admin:** prompt for bootstrap credentials ([a6a929d](https://github.com/eduardoaugustolb/affiliate-hub/commit/a6a929d3246aadc48163ebf410dc88e37929f2a2))
* find first admin in user repository ([5a369c7](https://github.com/eduardoaugustolb/affiliate-hub/commit/5a369c79ebf46b686f15cea8a7de37f2decb159c))
* **infra:** create affiliate database automatically ([b6a8e01](https://github.com/eduardoaugustolb/affiliate-hub/commit/b6a8e01d58d11f86322cd17e7528a37ced674a00))
* restrict user creation to admins ([c301b49](https://github.com/eduardoaugustolb/affiliate-hub/commit/c301b4903c31ed37720223180e6390cae94322e7))


### Bug Fixes

* **api-ts:** remove unit of work on AuthenticateUser to receive repositories ([8fd912d](https://github.com/eduardoaugustolb/affiliate-hub/commit/8fd912d15b95f420a0557aa167f586ed844f3bce))

