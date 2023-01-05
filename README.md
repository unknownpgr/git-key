# @unknownpgr/git-key

<img src="./git-key-logo.png" style="width:80%; margin-left: 10%"/>

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
3. Run `yarn git-key hide` to encrypt secret files. Then, `encrypted-<hash>` file containing all secret files will be created, and a password for decryption will be displayed. If you did not provided password manually, it is generated from secret file hash. If you lose the password after secret file is deleted or modified, **there is no way to restore secrets.**
4. Now you can delete secret files. Running `yarn git-key clear` will delete all secret files listed in `.secrets`.
5. To restore secret files, run `yarn git-key reveal -p <password>`.

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

## Docs

- `yarn git-key hide [-v] [-p|--password <PASSWORD>]` : Encrypt secret files and return password.
- `yarn git-key clear [-v]` : Remove all files listed in `.secrets` file
- `yarn git-key reveal [-v] [-p|--password <PASSWORD>]` : Restore secret files with password. Notice that you do not have to provide encrypted file name. Encrypted file name will be retrieved from password.
- `yarn git-key nameof|name [-v] [-p|--password <PASSWORD>]` : Get encrypted file name without restoring files.

> - Password can be supplied by `GIT_KEY_PASSWORD` environment variable.
> - If both environment variable and command line parameter are supplied, command line parameter will be used.

### Options

- `-v` : Print logs. Default value is false.
