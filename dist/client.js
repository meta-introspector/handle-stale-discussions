"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubClient = void 0;
const core_1 = require("@apollo/client/core");
const core = require("@actions/core");
const cross_fetch_1 = require("cross-fetch");
function githubClient() {
    const tokenInput = core.getInput('github-token', { required: false });
    const token = tokenInput || process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error("You must provide a GitHub token as an input to this action, or as a `GITHUB_TOKEN` env variable. See the README for more info.");
    }
    return new core_1.ApolloClient({
        link: new core_1.HttpLink({
            uri: "https://api.github.com/graphql",
            headers: {
                authorization: `token ${token}`,
            },
            fetch: cross_fetch_1.default
        }),
        cache: new core_1.InMemoryCache(),
    });
}
exports.githubClient = githubClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4Q0FBa0c7QUFDbEcsc0NBQXNDO0FBQ3RDLDZDQUFnQztBQUVoQyxTQUFnQixZQUFZO0lBQzFCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDdEUsTUFBTSxLQUFLLEdBQUcsVUFBVSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO0lBQ3JELElBQUksQ0FBQyxLQUFLLEVBQUU7UUFDVixNQUFNLElBQUksS0FBSyxDQUNiLGdJQUFnSSxDQUNqSSxDQUFDO0tBQ0g7SUFFRCxPQUFPLElBQUksbUJBQVksQ0FBQztRQUN0QixJQUFJLEVBQUUsSUFBSSxlQUFRLENBQUM7WUFDakIsR0FBRyxFQUFFLGdDQUFnQztZQUNyQyxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLFNBQVMsS0FBSyxFQUFFO2FBQ2hDO1lBQ0QsS0FBSyxFQUFMLHFCQUFLO1NBQ04sQ0FBQztRQUNGLEtBQUssRUFBRSxJQUFJLG9CQUFhLEVBQUU7S0FDM0IsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQW5CRCxvQ0FtQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcG9sbG9DbGllbnQsIEh0dHBMaW5rLCBJbk1lbW9yeUNhY2hlLCBOb3JtYWxpemVkQ2FjaGVPYmplY3QgfSBmcm9tICdAYXBvbGxvL2NsaWVudC9jb3JlJ1xuaW1wb3J0ICogYXMgY29yZSBmcm9tICdAYWN0aW9ucy9jb3JlJztcbmltcG9ydCBmZXRjaCBmcm9tICdjcm9zcy1mZXRjaCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnaXRodWJDbGllbnQoKTogQXBvbGxvQ2xpZW50PE5vcm1hbGl6ZWRDYWNoZU9iamVjdD4ge1xuICBjb25zdCB0b2tlbklucHV0ID0gY29yZS5nZXRJbnB1dCgnZ2l0aHViLXRva2VuJywgeyByZXF1aXJlZDogZmFsc2UgfSk7XG4gIGNvbnN0IHRva2VuID0gdG9rZW5JbnB1dCB8fCBwcm9jZXNzLmVudi5HSVRIVUJfVE9LRU47XG4gIGlmICghdG9rZW4pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcIllvdSBtdXN0IHByb3ZpZGUgYSBHaXRIdWIgdG9rZW4gYXMgYW4gaW5wdXQgdG8gdGhpcyBhY3Rpb24sIG9yIGFzIGEgYEdJVEhVQl9UT0tFTmAgZW52IHZhcmlhYmxlLiBTZWUgdGhlIFJFQURNRSBmb3IgbW9yZSBpbmZvLlwiXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgQXBvbGxvQ2xpZW50KHtcbiAgICBsaW5rOiBuZXcgSHR0cExpbmsoe1xuICAgICAgdXJpOiBcImh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vZ3JhcGhxbFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBhdXRob3JpemF0aW9uOiBgdG9rZW4gJHt0b2tlbn1gLFxuICAgICAgfSxcbiAgICAgIGZldGNoXG4gICAgfSksXG4gICAgY2FjaGU6IG5ldyBJbk1lbW9yeUNhY2hlKCksXG4gIH0pO1xufVxuIl19