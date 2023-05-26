"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@apollo/client/core");
const graphql_1 = require("../src/generated/graphql");
//import { gql } from 'apollo-server';
//import { MyMutation, MyQuery } from './myGraphQLQueries';
beforeEach(() => {
    jest.resetModules();
});
const client = new core_1.ApolloClient({
    uri: 'https://api.github.com/graphql',
    headers: {
        'x-api-key': 'key-redacted',
    },
    cache: new core_1.InMemoryCache(),
});
describe('Update Discussion comment mutation', () => {
    const commentId = 'abcd1234';
    const updatedCommentText = 'Updated comment text';
    it('should make a successful mutation to my GraphQL API', async () => {
        // Define the expected result of the mutation
        const expectedResult = {
            data: {
                updateDiscussionComment: {
                    id: commentId,
                },
            },
        };
        // Set up the mocked response for the mutation
        const mockResponse = {
            data: {
                updateDiscussionComment: {
                    id: commentId,
                },
            },
        };
        client.mutate = jest.fn().mockResolvedValueOnce(mockResponse);
        // Execute the mutation
        const result = await client.mutate({
            mutation: graphql_1.UpdateDiscussionComment,
            variables: {
                commentId,
                body: updatedCommentText,
            }
        });
        // Verify that the mutation was called with the correct arguments
        expect(client.mutate).toHaveBeenCalledWith({
            mutation: graphql_1.UpdateDiscussionComment,
            variables: {
                commentId,
                body: updatedCommentText
            }
        });
        // Verify that the result of the mutation matches the expected result
        expect(result).toEqual(expectedResult);
    });
});
describe('Add Discussion comment ', () => {
    const discussionId = 'discussion1234';
    const text = 'Add comment text';
    it('add discussion comment using mutation', async () => {
        // Define the expected result of the mutation
        const expectedResult = {
            data: {
                addDiscussionComment: {
                    commentId: 'comment123',
                },
            },
        };
        // Set up the mocked response for the mutation
        const mockResponse = {
            data: {
                addDiscussionComment: {
                    commentId: 'comment123',
                },
            },
        };
        client.mutate = jest.fn().mockResolvedValueOnce(mockResponse);
        // Execute the mutation
        const result = await client.mutate({
            mutation: graphql_1.AddDiscussionComment,
            variables: {
                discussionId,
                body: text,
            }
        });
        // Verify that the mutation was called with the correct arguments
        expect(client.mutate).toHaveBeenCalledWith({
            mutation: graphql_1.AddDiscussionComment,
            variables: {
                discussionId,
                body: text,
            }
        });
        // Verify that the result of the mutation matches the expected result
        expect(result).toEqual(expectedResult);
    });
});
describe('Mark discussion as answered ', () => {
    const commentId = 'comment123';
    it('Mark discussion comment as answer', async () => {
        // Define the expected result of the mutation
        const expectedResult = {
            data: {
                markDiscussionCommentAsAnswer: {
                    clientMutationId: 'mutation123',
                },
            },
        };
        // Set up the mocked response for the mutation
        const mockResponse = {
            data: {
                markDiscussionCommentAsAnswer: {
                    clientMutationId: 'mutation123',
                },
            },
        };
        client.mutate = jest.fn().mockResolvedValueOnce(mockResponse);
        // Execute the mutation
        const result = await client.mutate({
            mutation: graphql_1.MarkDiscussionCommentAsAnswer,
            variables: {
                commentId
            }
        });
        // Verify that the mutation was called with the correct arguments
        expect(client.mutate).toHaveBeenCalledWith({
            mutation: graphql_1.MarkDiscussionCommentAsAnswer,
            variables: {
                commentId
            }
        });
        // Verify that the result of the mutation matches the expected result
        expect(result).toEqual(expectedResult);
    });
});
describe('Get total discussion count', () => {
    it('Get total discussion count for categoryId', async () => {
        // Define the expected result of the mutation
        const expectedResult = {
            data: {
                totalCount: 10,
            },
        };
        // Set up the mocked response for the mutation
        const mockResponse = {
            data: {
                totalCount: 10,
            },
        };
        client.query = jest.fn().mockResolvedValueOnce(mockResponse);
        // Execute the mutation
        const result = await client.query({
            query: graphql_1.GetDiscussionCount,
            variables: {
                owner: "testOwner",
                name: 'repoName',
                categoryId: 'category123'
            }
        });
        // Verify that the mutation was called with the correct arguments
        expect(client.query).toHaveBeenCalledWith({
            query: graphql_1.GetDiscussionCount,
            variables: {
                owner: "testOwner",
                name: 'repoName',
                categoryId: 'category123'
            }
        });
        // Verify that the result of the mutation matches the expected result
        expect(result).toEqual(expectedResult);
    });
});
describe('Get answerable discussion category id ', () => {
    it('Get answerable discussion category Id', async () => {
        // Define the expected result of the mutation
        const expectedResult = {
            data: {
                isAnswerable: true,
                id: 'id123'
            }
        };
        // Set up the mocked response for the mutation
        const mockResponse = {
            data: {
                isAnswerable: true,
                id: 'id123'
            }
        };
        client.query = jest.fn().mockResolvedValueOnce(mockResponse);
        // Execute the mutation
        const result = await client.query({
            query: graphql_1.GetAnswerableDiscussionId,
            variables: {
                owner: 'owner123',
                name: 'repo123'
            }
        });
        // Verify that the mutation was called with the correct arguments
        expect(client.query).toHaveBeenCalledWith({
            query: graphql_1.GetAnswerableDiscussionId,
            variables: {
                owner: 'owner123',
                name: 'repo123'
            }
        });
        // Verify that the result of the mutation matches the expected result
        expect(result).toEqual(expectedResult);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3QvaW5kZXgudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDhDQUFrRTtBQUNsRSxzREFBc0s7QUFDdEssc0NBQXNDO0FBQ3RDLDJEQUEyRDtBQUUzRCxVQUFVLENBQUMsR0FBRyxFQUFFO0lBQ2QsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxNQUFNLEdBQUcsSUFBSSxtQkFBWSxDQUFDO0lBQzlCLEdBQUcsRUFBRSxnQ0FBZ0M7SUFDckMsT0FBTyxFQUFFO1FBQ1AsV0FBVyxFQUFFLGNBQWM7S0FDNUI7SUFDRCxLQUFLLEVBQUUsSUFBSSxvQkFBYSxFQUFFO0NBQzNCLENBQUMsQ0FBQztBQUVILFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7SUFDbEQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDO0lBQzdCLE1BQU0sa0JBQWtCLEdBQUcsc0JBQXNCLENBQUM7SUFFbEQsRUFBRSxDQUFDLHFEQUFxRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25FLDZDQUE2QztRQUM3QyxNQUFNLGNBQWMsR0FBRztZQUNyQixJQUFJLEVBQUU7Z0JBQ0osdUJBQXVCLEVBQUU7b0JBQ3ZCLEVBQUUsRUFBRSxTQUFTO2lCQUNkO2FBQ0Y7U0FDRixDQUFDO1FBRUYsOENBQThDO1FBQzlDLE1BQU0sWUFBWSxHQUFHO1lBQ25CLElBQUksRUFBRTtnQkFDSix1QkFBdUIsRUFBRTtvQkFDdkIsRUFBRSxFQUFFLFNBQVM7aUJBQ2Q7YUFDRjtTQUNGLENBQUM7UUFFRixNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU5RCx1QkFBdUI7UUFDdkIsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2pD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QUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBvbGxvQ2xpZW50LCBJbk1lbW9yeUNhY2hlIH0gZnJvbSAnQGFwb2xsby9jbGllbnQvY29yZSc7XG5pbXBvcnQgeyBVcGRhdGVEaXNjdXNzaW9uQ29tbWVudCAsQWRkRGlzY3Vzc2lvbkNvbW1lbnQsIE1hcmtEaXNjdXNzaW9uQ29tbWVudEFzQW5zd2VyLCBHZXREaXNjdXNzaW9uQ291bnQsIEdldEFuc3dlcmFibGVEaXNjdXNzaW9uSWR9IGZyb20gJy4uL3NyYy9nZW5lcmF0ZWQvZ3JhcGhxbCc7XG4vL2ltcG9ydCB7IGdxbCB9IGZyb20gJ2Fwb2xsby1zZXJ2ZXInO1xuLy9pbXBvcnQgeyBNeU11dGF0aW9uLCBNeVF1ZXJ5IH0gZnJvbSAnLi9teUdyYXBoUUxRdWVyaWVzJztcblxuYmVmb3JlRWFjaCgoKSA9PiB7XG4gIGplc3QucmVzZXRNb2R1bGVzKCk7XG59KTtcblxuY29uc3QgY2xpZW50ID0gbmV3IEFwb2xsb0NsaWVudCh7XG4gIHVyaTogJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20vZ3JhcGhxbCcsXG4gIGhlYWRlcnM6IHtcbiAgICAneC1hcGkta2V5JzogJ2tleS1yZWRhY3RlZCcsXG4gIH0sXG4gIGNhY2hlOiBuZXcgSW5NZW1vcnlDYWNoZSgpLFxufSk7XG5cbmRlc2NyaWJlKCdVcGRhdGUgRGlzY3Vzc2lvbiBjb21tZW50IG11dGF0aW9uJywgKCkgPT4ge1xuICBjb25zdCBjb21tZW50SWQgPSAnYWJjZDEyMzQnO1xuICBjb25zdCB1cGRhdGVkQ29tbWVudFRleHQgPSAnVXBkYXRlZCBjb21tZW50IHRleHQnO1xuICBcbiAgaXQoJ3Nob3VsZCBtYWtlIGEgc3VjY2Vzc2Z1bCBtdXRhdGlvbiB0byBteSBHcmFwaFFMIEFQSScsIGFzeW5jICgpID0+IHtcbiAgICAvLyBEZWZpbmUgdGhlIGV4cGVjdGVkIHJlc3VsdCBvZiB0aGUgbXV0YXRpb25cbiAgICBjb25zdCBleHBlY3RlZFJlc3VsdCA9IHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgdXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnQ6IHtcbiAgICAgICAgICBpZDogY29tbWVudElkLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gU2V0IHVwIHRoZSBtb2NrZWQgcmVzcG9uc2UgZm9yIHRoZSBtdXRhdGlvblxuICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgdXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnQ6IHtcbiAgICAgICAgICBpZDogY29tbWVudElkLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgY2xpZW50Lm11dGF0ZSA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1Jlc3BvbnNlKTtcblxuICAgIC8vIEV4ZWN1dGUgdGhlIG11dGF0aW9uXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50Lm11dGF0ZSh7XG4gICAgICBtdXRhdGlvbjogVXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnQsXG4gICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgY29tbWVudElkLFxuICAgICAgICBib2R5OiB1cGRhdGVkQ29tbWVudFRleHQsXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBWZXJpZnkgdGhhdCB0aGUgbXV0YXRpb24gd2FzIGNhbGxlZCB3aXRoIHRoZSBjb3JyZWN0IGFyZ3VtZW50c1xuICAgIGV4cGVjdChjbGllbnQubXV0YXRlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aCh7XG4gICAgICBtdXRhdGlvbjogVXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnQsXG4gICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgY29tbWVudElkLFxuICAgICAgICBib2R5OiB1cGRhdGVkQ29tbWVudFRleHRcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFZlcmlmeSB0aGF0IHRoZSByZXN1bHQgb2YgdGhlIG11dGF0aW9uIG1hdGNoZXMgdGhlIGV4cGVjdGVkIHJlc3VsdFxuICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWRSZXN1bHQpO1xuICB9KTtcbn0pXG5cbmRlc2NyaWJlKCdBZGQgRGlzY3Vzc2lvbiBjb21tZW50ICcsICgpID0+IHtcbiAgY29uc3QgZGlzY3Vzc2lvbklkID0gJ2Rpc2N1c3Npb24xMjM0JztcbiAgY29uc3QgdGV4dCA9ICdBZGQgY29tbWVudCB0ZXh0JztcbiAgXG4gIGl0KCdhZGQgZGlzY3Vzc2lvbiBjb21tZW50IHVzaW5nIG11dGF0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIERlZmluZSB0aGUgZXhwZWN0ZWQgcmVzdWx0IG9mIHRoZSBtdXRhdGlvblxuICAgIGNvbnN0IGV4cGVjdGVkUmVzdWx0ID0ge1xuICAgICAgZGF0YToge1xuICAgICAgICBhZGREaXNjdXNzaW9uQ29tbWVudDoge1xuICAgICAgICAgIGNvbW1lbnRJZDogJ2NvbW1lbnQxMjMnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gU2V0IHVwIHRoZSBtb2NrZWQgcmVzcG9uc2UgZm9yIHRoZSBtdXRhdGlvblxuICAgIGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgYWRkRGlzY3Vzc2lvbkNvbW1lbnQ6IHtcbiAgICAgICAgICBjb21tZW50SWQ6ICdjb21tZW50MTIzJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGNsaWVudC5tdXRhdGUgPSBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWVPbmNlKG1vY2tSZXNwb25zZSk7XG5cbiAgICAvLyBFeGVjdXRlIHRoZSBtdXRhdGlvblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5tdXRhdGUoe1xuICAgICAgbXV0YXRpb246IEFkZERpc2N1c3Npb25Db21tZW50LFxuICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgIGRpc2N1c3Npb25JZCxcbiAgICAgICAgYm9keTogdGV4dCxcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFZlcmlmeSB0aGF0IHRoZSBtdXRhdGlvbiB3YXMgY2FsbGVkIHdpdGggdGhlIGNvcnJlY3QgYXJndW1lbnRzXG4gICAgZXhwZWN0KGNsaWVudC5tdXRhdGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICAgIG11dGF0aW9uOiBBZGREaXNjdXNzaW9uQ29tbWVudCxcbiAgICAgIHZhcmlhYmxlczoge1xuICAgICAgICBkaXNjdXNzaW9uSWQsXG4gICAgICAgIGJvZHk6IHRleHQsXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBWZXJpZnkgdGhhdCB0aGUgcmVzdWx0IG9mIHRoZSBtdXRhdGlvbiBtYXRjaGVzIHRoZSBleHBlY3RlZCByZXN1bHRcbiAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKGV4cGVjdGVkUmVzdWx0KTtcbiAgfSk7XG59KVxuXG5cbmRlc2NyaWJlKCdNYXJrIGRpc2N1c3Npb24gYXMgYW5zd2VyZWQgJywgKCkgPT4ge1xuICBjb25zdCBjb21tZW50SWQgPSAnY29tbWVudDEyMyc7XG4gIFxuICBpdCgnTWFyayBkaXNjdXNzaW9uIGNvbW1lbnQgYXMgYW5zd2VyJywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIERlZmluZSB0aGUgZXhwZWN0ZWQgcmVzdWx0IG9mIHRoZSBtdXRhdGlvblxuICAgIGNvbnN0IGV4cGVjdGVkUmVzdWx0ID0ge1xuICAgICAgZGF0YToge1xuICAgICAgICBtYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcjoge1xuICAgICAgICAgIGNsaWVudE11dGF0aW9uSWQ6ICdtdXRhdGlvbjEyMycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBTZXQgdXAgdGhlIG1vY2tlZCByZXNwb25zZSBmb3IgdGhlIG11dGF0aW9uXG4gICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xuICAgICAgZGF0YToge1xuICAgICAgICBtYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcjoge1xuICAgICAgICAgIGNsaWVudE11dGF0aW9uSWQ6ICdtdXRhdGlvbjEyMycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICBjbGllbnQubXV0YXRlID0gamVzdC5mbigpLm1vY2tSZXNvbHZlZFZhbHVlT25jZShtb2NrUmVzcG9uc2UpO1xuXG4gICAgLy8gRXhlY3V0ZSB0aGUgbXV0YXRpb25cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQubXV0YXRlKHtcbiAgICAgIG11dGF0aW9uOiBNYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcixcbiAgICAgIHZhcmlhYmxlczoge1xuICAgICAgICBjb21tZW50SWRcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFZlcmlmeSB0aGF0IHRoZSBtdXRhdGlvbiB3YXMgY2FsbGVkIHdpdGggdGhlIGNvcnJlY3QgYXJndW1lbnRzXG4gICAgZXhwZWN0KGNsaWVudC5tdXRhdGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICAgIG11dGF0aW9uOiBNYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcixcbiAgICAgIHZhcmlhYmxlczoge1xuICAgICAgICBjb21tZW50SWRcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFZlcmlmeSB0aGF0IHRoZSByZXN1bHQgb2YgdGhlIG11dGF0aW9uIG1hdGNoZXMgdGhlIGV4cGVjdGVkIHJlc3VsdFxuICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWRSZXN1bHQpO1xuICB9KTtcbn0pXG5cbmRlc2NyaWJlKCdHZXQgdG90YWwgZGlzY3Vzc2lvbiBjb3VudCcsICgpID0+IHtcbiAgXG4gIGl0KCdHZXQgdG90YWwgZGlzY3Vzc2lvbiBjb3VudCBmb3IgY2F0ZWdvcnlJZCcsIGFzeW5jICgpID0+IHtcbiAgICAvLyBEZWZpbmUgdGhlIGV4cGVjdGVkIHJlc3VsdCBvZiB0aGUgbXV0YXRpb25cbiAgICBjb25zdCBleHBlY3RlZFJlc3VsdCA9IHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgdG90YWxDb3VudDogMTAsXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyBTZXQgdXAgdGhlIG1vY2tlZCByZXNwb25zZSBmb3IgdGhlIG11dGF0aW9uXG4gICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xuICAgICAgZGF0YToge1xuICAgICAgICB0b3RhbENvdW50OiAxMCxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGNsaWVudC5xdWVyeSA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1Jlc3BvbnNlKTtcblxuICAgIC8vIEV4ZWN1dGUgdGhlIG11dGF0aW9uXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LnF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBHZXREaXNjdXNzaW9uQ291bnQsXG4gICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgb3duZXI6IFwidGVzdE93bmVyXCIsXG4gICAgICAgIG5hbWU6ICdyZXBvTmFtZScsXG4gICAgICAgIGNhdGVnb3J5SWQ6ICdjYXRlZ29yeTEyMydcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFZlcmlmeSB0aGF0IHRoZSBtdXRhdGlvbiB3YXMgY2FsbGVkIHdpdGggdGhlIGNvcnJlY3QgYXJndW1lbnRzXG4gICAgZXhwZWN0KGNsaWVudC5xdWVyeSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgcXVlcnk6IEdldERpc2N1c3Npb25Db3VudCxcbiAgICAgIHZhcmlhYmxlczoge1xuICAgICAgICBvd25lcjogXCJ0ZXN0T3duZXJcIixcbiAgICAgICAgbmFtZTogJ3JlcG9OYW1lJyxcbiAgICAgICAgY2F0ZWdvcnlJZDogJ2NhdGVnb3J5MTIzJ1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVmVyaWZ5IHRoYXQgdGhlIHJlc3VsdCBvZiB0aGUgbXV0YXRpb24gbWF0Y2hlcyB0aGUgZXhwZWN0ZWQgcmVzdWx0XG4gICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChleHBlY3RlZFJlc3VsdCk7XG4gIH0pO1xufSlcblxuZGVzY3JpYmUoJ0dldCBhbnN3ZXJhYmxlIGRpc2N1c3Npb24gY2F0ZWdvcnkgaWQgJywgKCkgPT4ge1xuICBcbiAgaXQoJ0dldCBhbnN3ZXJhYmxlIGRpc2N1c3Npb24gY2F0ZWdvcnkgSWQnLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gRGVmaW5lIHRoZSBleHBlY3RlZCByZXN1bHQgb2YgdGhlIG11dGF0aW9uXG4gICAgY29uc3QgZXhwZWN0ZWRSZXN1bHQgPSB7XG4gICAgICBkYXRhOiAge1xuICAgICAgICAgIGlzQW5zd2VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBpZDogJ2lkMTIzJ1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNldCB1cCB0aGUgbW9ja2VkIHJlc3BvbnNlIGZvciB0aGUgbXV0YXRpb25cbiAgICBjb25zdCBtb2NrUmVzcG9uc2UgPSB7XG4gICAgICBkYXRhOiAge1xuICAgICAgICBpc0Fuc3dlcmFibGU6IHRydWUsXG4gICAgICAgIGlkOiAnaWQxMjMnXG4gICAgICAgfVxuICAgIH1cblxuICAgIGNsaWVudC5xdWVyeSA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UobW9ja1Jlc3BvbnNlKTtcblxuICAgIC8vIEV4ZWN1dGUgdGhlIG11dGF0aW9uXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LnF1ZXJ5KHtcbiAgICAgIHF1ZXJ5OiBHZXRBbnN3ZXJhYmxlRGlzY3Vzc2lvbklkLFxuICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgIG93bmVyOiAnb3duZXIxMjMnLFxuICAgICAgICBuYW1lOiAncmVwbzEyMydcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFZlcmlmeSB0aGF0IHRoZSBtdXRhdGlvbiB3YXMgY2FsbGVkIHdpdGggdGhlIGNvcnJlY3QgYXJndW1lbnRzXG4gICAgZXhwZWN0KGNsaWVudC5xdWVyeSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgcXVlcnk6IEdldEFuc3dlcmFibGVEaXNjdXNzaW9uSWQsXG4gICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgb3duZXI6ICdvd25lcjEyMycsXG4gICAgICAgIG5hbWU6ICdyZXBvMTIzJ1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVmVyaWZ5IHRoYXQgdGhlIHJlc3VsdCBvZiB0aGUgbXV0YXRpb24gbWF0Y2hlcyB0aGUgZXhwZWN0ZWQgcmVzdWx0XG4gICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChleHBlY3RlZFJlc3VsdCk7XG4gIH0pO1xufSkiXX0=