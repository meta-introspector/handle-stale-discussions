import { ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core'
import * as core from '@actions/core';
import fetch from 'cross-fetch';

export function githubClient(): ApolloClient<NormalizedCacheObject> {
  const tokenInput = core.getInput('github-token', { required: false });
  const token = tokenInput || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "You must provide a GitHub token as an input to this action, or as a `GITHUB_TOKEN` env variable. See the README for more info."
    );
  }

  return new ApolloClient({
    link: new HttpLink({
      uri: "https://api.github.com/graphql",
      headers: {
        authorization: `token ${token}`,
      },
      fetch
    }),
    cache: new InMemoryCache(),
  });
}
