# @unknownpgr/git-key

Fast, simple, minimalist secret management CLI tool.

You can track secrets in git.

## Getting Started

1. Run `yarn add @unknownpgr/git-key` to install git-key.
2. Create `.secrets` file containing list of secret files. Below is an example of `.secrets` file.
   ```
   src/.env
   src/my-secrets.json
   .env
   ```
3. Run `yarn git-key hide` to encrypt secret files. `.secrets.encrypted` file containing all secret file will be created, and a password for decryption will be displayed. This password is randomly generated. If you lost the password, **there are no way of restoring secrets**.
4. Now you can delete secret files. To delete all secret files listed in `.secrets`, run `yarn git-key clear`.
5. To restore secret files, run `yarn git-key reveal -p PASSWORD_FROM_GIT_KEY_HIDE`.

Below is a scenario of using git-key.

```shell
$ echo PASSWORD="Very sensitive password" > .env
$ echo .env > .secrets
$ yarn git-key hide
yarn run v1.22.19
$ /workspaces/test-module/node_modules/.bin/git-key hide
YrjDgqZgqO2jqncMYaVSsu3SrOhGqLORehPR6U1X+ac=
Done in 0.12s.
$ rm .env
$ yarn git-key reveal -p YrjDgqZgqO2jqncMYaVSsu3SrOhGqLORehPR6U1X+ac=
yarn run v1.22.19
$ /workspaces/test-module/node_modules/.bin/git-key reveal -p YrjDgqZgqO2jqncMYaVSsu3SrOhGqLORehPR6U1X+ac=
Done in 0.11s.
$ cat .env
PASSWORD=Very sensitive password
$
```
