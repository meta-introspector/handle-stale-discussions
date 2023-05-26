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
        throw new Error("You must provide a GitHub token as an input to this action, or as a `GITHUB_TOKEN` env variable. See README for more info.");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4Q0FBZ0c7QUFDaEcsc0NBQXNDO0FBQ3RDLDZDQUFnQztBQUVoQyxTQUFnQixZQUFZO0lBQ3hCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDdEUsTUFBTSxLQUFLLEdBQUcsVUFBVSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO0lBQ3JELElBQUksQ0FBQyxLQUFLLEVBQUU7UUFDVixNQUFNLElBQUksS0FBSyxDQUNiLDRIQUE0SCxDQUM3SCxDQUFDO0tBQ0g7SUFFRCxPQUFPLElBQUksbUJBQVksQ0FBQztRQUN0QixJQUFJLEVBQUUsSUFBSSxlQUFRLENBQUM7WUFDakIsR0FBRyxFQUFFLGdDQUFnQztZQUNyQyxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLFNBQVMsS0FBSyxFQUFFO2FBQ2hDO1lBQ0QsS0FBSyxFQUFMLHFCQUFLO1NBQ04sQ0FBQztRQUNGLEtBQUssRUFBRSxJQUFJLG9CQUFhLEVBQUU7S0FDM0IsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQW5CSCxvQ0FtQkciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0Fwb2xsb0NsaWVudCwgSHR0cExpbmssIEluTWVtb3J5Q2FjaGUsIE5vcm1hbGl6ZWRDYWNoZU9iamVjdH0gZnJvbSAnQGFwb2xsby9jbGllbnQvY29yZSdcbmltcG9ydCAqIGFzIGNvcmUgZnJvbSAnQGFjdGlvbnMvY29yZSc7XG5pbXBvcnQgZmV0Y2ggZnJvbSAnY3Jvc3MtZmV0Y2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2l0aHViQ2xpZW50KCk6IEFwb2xsb0NsaWVudDxOb3JtYWxpemVkQ2FjaGVPYmplY3Q+IHtcbiAgICBjb25zdCB0b2tlbklucHV0ID0gY29yZS5nZXRJbnB1dCgnZ2l0aHViLXRva2VuJywgeyByZXF1aXJlZDogZmFsc2UgfSk7XG4gICAgY29uc3QgdG9rZW4gPSB0b2tlbklucHV0IHx8IHByb2Nlc3MuZW52LkdJVEhVQl9UT0tFTjtcbiAgICBpZiAoIXRva2VuKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiWW91IG11c3QgcHJvdmlkZSBhIEdpdEh1YiB0b2tlbiBhcyBhbiBpbnB1dCB0byB0aGlzIGFjdGlvbiwgb3IgYXMgYSBgR0lUSFVCX1RPS0VOYCBlbnYgdmFyaWFibGUuIFNlZSBSRUFETUUgZm9yIG1vcmUgaW5mby5cIlxuICAgICAgKTtcbiAgICB9XG4gIFxuICAgIHJldHVybiBuZXcgQXBvbGxvQ2xpZW50KHtcbiAgICAgIGxpbms6IG5ldyBIdHRwTGluayh7XG4gICAgICAgIHVyaTogXCJodHRwczovL2FwaS5naXRodWIuY29tL2dyYXBocWxcIixcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb246IGB0b2tlbiAke3Rva2VufWAsXG4gICAgICAgIH0sXG4gICAgICAgIGZldGNoXG4gICAgICB9KSxcbiAgICAgIGNhY2hlOiBuZXcgSW5NZW1vcnlDYWNoZSgpLFxuICAgIH0pO1xuICB9XG4iXX0=