"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubClient = void 0;
const core_1 = require("@apollo/client/core");
const cross_fetch_1 = require("cross-fetch");
function githubClient() {
    if (!process.env.GITHUB_TOKEN) {
        throw new Error("You need to provide a Github personal access token as `GITHUB_TOKEN` env variable. See README for more info.");
    }
    return new core_1.ApolloClient({
        link: new core_1.HttpLink({
            uri: "https://api.github.com/graphql",
            headers: {
                authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
            fetch: cross_fetch_1.default
        }),
        cache: new core_1.InMemoryCache(),
    });
}
exports.githubClient = githubClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4Q0FBZ0c7QUFDaEcsNkNBQWdDO0FBRWhDLFNBQWdCLFlBQVk7SUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQ2IsOEdBQThHLENBQy9HLENBQUM7S0FDSDtJQUVELE9BQU8sSUFBSSxtQkFBWSxDQUFDO1FBQ3RCLElBQUksRUFBRSxJQUFJLGVBQVEsQ0FBQztZQUNqQixHQUFHLEVBQUUsZ0NBQWdDO1lBQ3JDLE9BQU8sRUFBRTtnQkFDUCxhQUFhLEVBQUUsU0FBUyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRTthQUNuRDtZQUNELEtBQUssRUFBTCxxQkFBSztTQUNOLENBQUM7UUFDRixLQUFLLEVBQUUsSUFBSSxvQkFBYSxFQUFFO0tBQzNCLENBQUMsQ0FBQztBQUNMLENBQUM7QUFqQkgsb0NBaUJHIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBcG9sbG9DbGllbnQsIEh0dHBMaW5rLCBJbk1lbW9yeUNhY2hlLCBOb3JtYWxpemVkQ2FjaGVPYmplY3R9IGZyb20gJ0BhcG9sbG8vY2xpZW50L2NvcmUnXG5pbXBvcnQgZmV0Y2ggZnJvbSAnY3Jvc3MtZmV0Y2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2l0aHViQ2xpZW50KCk6IEFwb2xsb0NsaWVudDxOb3JtYWxpemVkQ2FjaGVPYmplY3Q+IHtcbiAgICBpZiAoIXByb2Nlc3MuZW52LkdJVEhVQl9UT0tFTikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIllvdSBuZWVkIHRvIHByb3ZpZGUgYSBHaXRodWIgcGVyc29uYWwgYWNjZXNzIHRva2VuIGFzIGBHSVRIVUJfVE9LRU5gIGVudiB2YXJpYWJsZS4gU2VlIFJFQURNRSBmb3IgbW9yZSBpbmZvLlwiXG4gICAgICApO1xuICAgIH1cbiAgXG4gICAgcmV0dXJuIG5ldyBBcG9sbG9DbGllbnQoe1xuICAgICAgbGluazogbmV3IEh0dHBMaW5rKHtcbiAgICAgICAgdXJpOiBcImh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vZ3JhcGhxbFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvbjogYHRva2VuICR7cHJvY2Vzcy5lbnYuR0lUSFVCX1RPS0VOfWAsXG4gICAgICAgIH0sXG4gICAgICAgIGZldGNoXG4gICAgICB9KSxcbiAgICAgIGNhY2hlOiBuZXcgSW5NZW1vcnlDYWNoZSgpLFxuICAgIH0pO1xuICB9Il19