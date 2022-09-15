# playground-infra
A repo that can possibly accomodate code like https://github.com/ryuheechul/eb-sqs-imdsv2 that is related to experimenting with infrastructure.

## Pre-commit Checks
The root directory of this repo has been setup to assist linting and formatting and testing when committing so humans can spend less time on those aspects and bots can do their jobs.

Run `npm i` to install git hook after cloning this repo for development.

Then [./.husky/pre-commit] script will run every time before new commit for things like linting and formatting can be dealt with before pushing code.

### How It Works
Technologies belows are used to make that happen
- https://eslint.org/
- https://prettier.io/
- https://github.com/typicode/husky
- https://github.com/okonet/lint-staged

1. Husky gets installed when `npm i` via "prepare" stanza in `package.json`.
2. `./.husky/pre-commit` gets called when trying to `git commit` every time
3. `lint-staged` and other hooks are called
4. `lint-staged` use calls `eslint --fix`
5. `prettier` is integrated to `eslint` as a plugin

Edit these files to make changes:
- [.eslintrc.cjs](./.eslintrc.cjs)
- [.lintstagedrc.yml](./.lintstagedrc.yml)
- [.prettierrc.yml](./.prettierrc.yml)
- [.husky/pre-commit](./.husky/pre-commit)
