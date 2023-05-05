## Run below commands for the installing the required packages
- npm install --save graphql
- npm install --save-dev typescript ts-node
- npm install @actions/github

### Generating types from Github Graphql Schema
* Run below commands 
```
npm install --save-dev @octokit/graphql-schema @graphql-codegen/cli

npx graphql-codegen init

```
* After you run above statement, select below options for setup-
    - What type of application are you building? ◉ Backend - API or server
    -  Where is your schema?: src/generated/github-schema-loader.ts
    - Pick plugins: 
        ◉ TypeScript (required by other typescript plugins)
        ◉ TypeScript Resolvers (strongly typed resolve functions)
        ◯ TypeScript MongoDB (typed MongoDB objects)
        ❯◉ TypeScript GraphQL document nodes (embedded GraphQL document)
    - Where to write the output: (src/generated/graphql.ts)
    - Do you want to generate an introspection file? (Y/n) n
    - How to name the config file? (codegen.yml)
    - What script in package.json should run the codegen? codegen
* Run these commands
```
npm install

npm install --save @apollo/client cross-fetch

npm install --save-dev @graphql-codegen/typescript-operations

npm run codegen

```
If there is error in generating the codegen with above command, pls copy/paste this code in codegen.yml file and rerun the command ``` npm run codegen```

 ```
 # codegen.yml
overwrite: true
schema: "src/generated/github-schema-loader.ts"
generates:
  src/generated/graphql.ts:
    plugins:
      - "typescript"
      - "typescript-resolvers"
      - "typescript-document-nodes"
      - "typescript-operations"

require:
  - ts-node/register

documents:
  - src/queries/*.graphql
  - src/mutations/*.graphql
 ```

### Updating schema
* Run this command - ```npm update @octokit/graphql-schema```

Once schema is updated, rerun the command to update codegen file -``` npm run codegen```

## Testing with Jest framework
* Install by running this - ```npm install --save-dev jest```
- Add following to your Package.json

`
{
  "scripts": {
    "test": "jest"
  }
}
`
* Finish the setup by running these -

```
npm install --save-dev ts-jest

npm install --save-dev @jest/globals

npm install --save-dev @types/jest

npx ts-jest config:init
```