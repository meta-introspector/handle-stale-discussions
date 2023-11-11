"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processComments = exports.processDiscussions = void 0;
const core = require("@actions/core");
const github = require("@actions/github");
const GithubDiscussionClient_1 = require("./GithubDiscussionClient");
const util_1 = require("./util");
const PAGE_SIZE = parseInt(core.getInput('page-size', { required: false })) || 50;
const GITHUB_BOT = core.getInput('github-bot', { required: false }) || 'github-actions';
const DAYS_UNTIL_STALE = parseFloat(core.getInput('days-until-stale', { required: false })) || 7;
const PROPOSED_ANSWER_KEYWORD = core.getInput('proposed-answer-keyword', { required: false }) || '@github-actions proposed-answer';
const closeLockedDiscussionsInput = core.getInput('close-locked-discussions', { required: false });
const CLOSE_LOCKED_DISCUSSIONS = closeLockedDiscussionsInput.toLowerCase() === 'false' ? false : true;
const closeAnsweredDiscussionsInput = core.getInput('close-answered-discussions', { required: false });
const CLOSE_ANSWERED_DISCUSSIONS = closeAnsweredDiscussionsInput.toLowerCase() === 'false' ? false : true;
const closeStaleAsAnsweredInput = core.getInput('close-stale-as-answered', { required: false });
const CLOSE_STALE_AS_ANSWERED = closeStaleAsAnsweredInput.toLowerCase() === 'false' ? false : true;
const CLOSE_FOR_STALENESS_RESPONSE_TEXT = core.getInput('stale-response-text', { required: false })
    || 'Closing the discussion for staleness. Please open a new discussion if you have further concerns.';
const INSTRUCTIONS_TEXT = core.getInput('instructions-response-text', { required: false })
    || 'Hello! A team member has suggested the above comment as the likely answer to this discussion thread. '
        + '\n \n * If you agree, please upvote that comment, or click on Mark as answer. I will automatically mark the discussion as answered with upvoted comment, next time I check. '
        + '\n \n * If this answer does not help you, please downvote the answer instead and let us know why it was not helpful. '
        + 'I will add a label to this discussion to gain attention from the team.';
const OPEN_DISCUSSION_INSTRUCTION_TEXT = core.getInput('open-discussion-instructions-text', { required: false })
    || 'Hello! Reopening discussion to make it searchable. ';
async function main() {
    const githubClient = new GithubDiscussionClient_1.GithubDiscussionClient();
    await githubClient.initializeAttentionLabelId();
    if ((0, util_1.triggeredByNewComment)()) {
        if (github.context.payload.comment?.body.indexOf(PROPOSED_ANSWER_KEYWORD) >= 0) {
            core.info('Comment created with proposed answer keyword. Adding instuctions reply to comment');
            githubClient.addInstructionTextReply(INSTRUCTIONS_TEXT, github.context.payload.discussion.node_id, github.context.payload.comment.node_id);
        }
        else {
            core.info('Comment created without proposed answer keyword. No action needed');
        }
    }
    else {
        await processDiscussions(githubClient);
    }
}
async function processDiscussions(githubClient) {
    const discussionCategoryIDList = await githubClient.getAnswerableDiscussionCategoryIDs();
    if (discussionCategoryIDList.length === 0) {
        core.info('No answerable discussions found. Exiting.');
        return;
    }
    for (const discussionCategoryID of discussionCategoryIDList) {
        let hasNextPage = true;
        let afterCursor = null;
        while (hasNextPage) {
            const discussions = await githubClient.getDiscussionsMetaData(discussionCategoryID, PAGE_SIZE, afterCursor);
            hasNextPage = discussions.pageInfo.hasNextPage;
            afterCursor = discussions.pageInfo.endCursor;
            for (const discussion of discussions.edges) {
                var discussionId = discussion?.node?.id ? discussion?.node?.id : "";
                var discussionNum = discussion?.node?.number ? discussion.node.number : 0;
                core.info(`Processing discussionId: ${discussionId} with number: ${discussionNum} and bodyText: ${discussion?.node?.bodyText}`);
                if (discussionId === "" || discussionNum === 0) {
                    core.warning(`Can not proceed checking discussion, discussionId is null!`);
                    continue;
                }
                else if (discussion?.node?.closed) {
                    //core.debug(`Discussion ${discussionId} is closed, so no action needed.`);
                    core.info("Reopening closed discussion: ${discussionId}");
                    reopenClosedDiscussion(discussionId, githubClient);
                    continue;
                }
                else if (discussion?.node?.locked && CLOSE_LOCKED_DISCUSSIONS) {
                    core.info(`Discussion ${discussionId} is locked, closing it as resolved`);
                    githubClient.closeDiscussionAsResolved(discussionId);
                    continue;
                }
                else if (discussion?.node?.answer != null && CLOSE_ANSWERED_DISCUSSIONS) {
                    core.info(`Discussion ${discussionId} is already answered, so closing it as resolved.`);
                    githubClient.closeDiscussionAsResolved(discussionId);
                    continue;
                }
                else {
                    await processComments(discussion, githubClient);
                }
            }
        }
    }
}
exports.processDiscussions = processDiscussions;
async function processComments(discussion, githubClient) {
    const discussionId = discussion.node?.id ? discussion.node?.id : "";
    const discussionNum = discussion.node?.number ? discussion.node?.number : 0;
    const commentCount = await githubClient.getDiscussionCommentCount(discussionNum);
    const comments = await githubClient.getCommentsMetaData(discussionNum, commentCount);
    if (commentCount !== 0) {
        for (const comment of comments.edges) {
            const commentId = comment?.node?.id;
            core.info(`Processing comment ${commentId} with bodytext: ${comment?.node?.bodyText}`);
            if (!comment?.node?.bodyText || !comment.node.id) {
                core.info(`Comment body or id is null in discussion ${discussionId}, skipping comment!`);
                continue;
            }
            if (!(0, util_1.containsKeyword)(comment, PROPOSED_ANSWER_KEYWORD)) {
                core.info(`No answer proposed on comment ${commentId}, no action needed!`);
                continue;
            }
            else {
                if ((0, util_1.containsNegativeReaction)(comment)) {
                    core.info(`Negative reaction received. Adding attention label to discussion ${discussionId} to receive further attention from a repository maintainer`);
                    githubClient.addAttentionLabelToDiscussion(discussionId);
                }
                else if ((0, util_1.containsPositiveReaction)(comment)) {
                    core.info(`Positive reaction received. Marking discussion ${discussionId} as answered, and editing answer to remove proposed answer keyword`);
                    markDiscussionCommentAsAnswer(comment, discussionId, githubClient);
                    //closeAndMarkAsAnswered(comment, discussionId, githubClient);
                }
                else if (!(0, util_1.hasReplies)(comment)) {
                    core.info(`Since this has no reply, adding instructions reply to comment ${commentId} in discussion ${discussionId}`);
                    githubClient.addInstructionTextReply(INSTRUCTIONS_TEXT, discussionId, commentId);
                }
                else if ((0, util_1.hasNonBotReply)(comment, GITHUB_BOT)) {
                    core.info(`Discussion ${discussionId} has a reply, but not an instructions reply. Adding attention label`);
                    githubClient.addAttentionLabelToDiscussion(discussionId);
                }
                else if ((0, util_1.exceedsDaysUntilStale)(comment, DAYS_UNTIL_STALE)) {
                    if (!CLOSE_STALE_AS_ANSWERED) {
                        core.info(`No one has responded or provided a reaction, marking discussion ${discussionId} as answered`);
                        markDiscussionCommentAsAnswer(comment, discussionId, githubClient);
                        //closeAndMarkAsAnswered(comment, discussionId, githubClient);
                    }
                    else {
                        core.info(`No action needed for discussion ${discussionId}`);
                        //closeDiscussionForStaleness(discussionId, githubClient);
                    }
                }
            }
        }
        ;
    }
    else {
        core.debug(`No comments found for discussion ${discussionId}, No action needed!`);
    }
}
exports.processComments = processComments;
function closeDiscussionForStaleness(discussionId, githubClient) {
    githubClient.addCommentToDiscussion(discussionId, CLOSE_FOR_STALENESS_RESPONSE_TEXT);
    githubClient.closeDiscussionAsOutdated(discussionId);
}
//This functioon is no longer used since we are marking the discussion as answered instead of closing it
/*
function closeAndMarkAsAnswered(comment: DiscussionCommentEdge, discussionId: string, githubClient: GithubDiscussionClient) {
  const bodyText = comment?.node?.bodyText!;
  const commentId = comment?.node?.id!;
  const updatedAnswerText = bodyText.replace(PROPOSED_ANSWER_KEYWORD, 'Answer: ');
  githubClient.updateDiscussionComment(commentId, updatedAnswerText);
  githubClient.markDiscussionCommentAsAnswer(commentId);
  githubClient.closeDiscussionAsResolved(discussionId);
}
*/
function markDiscussionCommentAsAnswer(comment, discussionId, githubClient) {
    const bodyText = comment?.node?.bodyText;
    const commentId = comment?.node?.id;
    const updatedAnswerText = bodyText.replace(PROPOSED_ANSWER_KEYWORD, 'Answer: ');
    githubClient.updateDiscussionComment(commentId, updatedAnswerText);
    githubClient.markDiscussionCommentAsAnswer(commentId);
}
function reopenClosedDiscussion(discussionId, githubClient) {
    githubClient.addCommentToDiscussion(discussionId, OPEN_DISCUSSION_INSTRUCTION_TEXT);
    githubClient.reopenDiscussion(discussionId);
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0Esc0NBQXNDO0FBQ3RDLDBDQUEwQztBQUMxQyxxRUFBa0U7QUFDbEUsaUNBQXVLO0FBR3ZLLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2xGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBQyxDQUFDLElBQUksZ0JBQWdCLENBQUM7QUFDdkYsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pHLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLGlDQUFpQyxDQUFDO0FBQ25JLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ25HLE1BQU0sd0JBQXdCLEdBQUcsMkJBQTJCLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN0RyxNQUFNLDZCQUE2QixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztBQUN2RyxNQUFNLDBCQUEwQixHQUFHLDZCQUE2QixDQUFDLFdBQVcsRUFBRSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDMUcsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7QUFDaEcsTUFBTSx1QkFBdUIsR0FBRyx5QkFBeUIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ25HLE1BQU0saUNBQWlDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQztPQUM5RixrR0FBa0csQ0FBQztBQUN4RyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUM7T0FDckYsdUdBQXVHO1VBQ3hHLDhLQUE4SztVQUM5Syx1SEFBdUg7VUFDdkgsd0VBQXdFLENBQUM7QUFDN0UsTUFBTSxnQ0FBZ0MsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDO09BQzNHLHFEQUFxRCxDQUFDO0FBRTNELEtBQUssVUFBVSxJQUFJO0lBQ2pCLE1BQU0sWUFBWSxHQUFHLElBQUksK0NBQXNCLEVBQUUsQ0FBQztJQUNsRCxNQUFNLFlBQVksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO0lBQ2hELElBQUksSUFBQSw0QkFBcUIsR0FBRSxFQUFFO1FBQzNCLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDOUUsSUFBSSxDQUFDLElBQUksQ0FBQyxtRkFBbUYsQ0FBQyxDQUFDO1lBQy9GLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUM5STthQUFNO1lBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxtRUFBbUUsQ0FBQyxDQUFDO1NBQ2hGO0tBQ0Y7U0FBTTtRQUNMLE1BQU0sa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUM7S0FDeEM7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLGtCQUFrQixDQUFDLFlBQW9DO0lBQzNFLE1BQU0sd0JBQXdCLEdBQWEsTUFBTSxZQUFZLENBQUMsa0NBQWtDLEVBQUUsQ0FBQztJQUNuRyxJQUFJLHdCQUF3QixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDekMsSUFBSSxDQUFDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1FBQ3ZELE9BQU87S0FDUjtJQUVELEtBQUssTUFBTSxvQkFBb0IsSUFBSSx3QkFBd0IsRUFBRTtRQUMzRCxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxXQUFXLEdBQWtCLElBQUksQ0FBQztRQUV0QyxPQUFPLFdBQVcsRUFBRTtZQUNsQixNQUFNLFdBQVcsR0FBRyxNQUFNLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsV0FBWSxDQUFDLENBQUM7WUFDN0csV0FBVyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1lBQy9DLFdBQVcsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFNBQVUsQ0FBQztZQUU5QyxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsQ0FBQyxLQUFNLEVBQUU7Z0JBQzNDLElBQUksWUFBWSxHQUFHLFVBQVUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxJQUFJLGFBQWEsR0FBRyxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUUsSUFBSSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsWUFBWSxpQkFBaUIsYUFBYSxrQkFBa0IsVUFBVSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUNoSSxJQUFJLFlBQVksS0FBSyxFQUFFLElBQUksYUFBYSxLQUFLLENBQUMsRUFBRTtvQkFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyw0REFBNEQsQ0FBQyxDQUFDO29CQUMzRSxTQUFTO2lCQUNWO3FCQUNJLElBQUksVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7b0JBQ2pDLDJFQUEyRTtvQkFDM0UsSUFBSSxDQUFDLElBQUksQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO29CQUMxRCxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7b0JBQ25ELFNBQVM7aUJBQ1Y7cUJBQ0ksSUFBSSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sSUFBSSx3QkFBd0IsRUFBRTtvQkFDN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLFlBQVksb0NBQW9DLENBQUMsQ0FBQztvQkFDMUUsWUFBWSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUNyRCxTQUFTO2lCQUNWO3FCQUNJLElBQUksVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLElBQUksSUFBSSxJQUFJLDBCQUEwQixFQUFFO29CQUN2RSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsWUFBWSxrREFBa0QsQ0FBQyxDQUFDO29CQUN4RixZQUFZLENBQUMseUJBQXlCLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQ3JELFNBQVM7aUJBQ1Y7cUJBQ0k7b0JBQ0gsTUFBTSxlQUFlLENBQUMsVUFBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO2lCQUNsRDthQUNGO1NBQ0Y7S0FDRjtBQUNILENBQUM7QUE5Q0QsZ0RBOENDO0FBRU0sS0FBSyxVQUFVLGVBQWUsQ0FBQyxVQUFrQyxFQUFFLFlBQW9DO0lBQzVHLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3BFLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVFLE1BQU0sWUFBWSxHQUFHLE1BQU0sWUFBWSxDQUFDLHlCQUF5QixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pGLE1BQU0sUUFBUSxHQUFHLE1BQU0sWUFBWSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUVyRixJQUFJLFlBQVksS0FBSyxDQUFDLEVBQUU7UUFDdEIsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsS0FBTSxFQUFFO1lBQ3JDLE1BQU0sU0FBUyxHQUFHLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLFNBQVMsbUJBQW1CLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN2RixJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsWUFBWSxxQkFBcUIsQ0FBQyxDQUFDO2dCQUN6RixTQUFTO2FBQ1Y7WUFDRCxJQUFJLENBQUMsSUFBQSxzQkFBZSxFQUFDLE9BQVEsRUFBRSx1QkFBdUIsQ0FBQyxFQUFFO2dCQUN2RCxJQUFJLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxTQUFTLHFCQUFxQixDQUFDLENBQUM7Z0JBQzNFLFNBQVM7YUFDVjtpQkFDSTtnQkFDSCxJQUFJLElBQUEsK0JBQXdCLEVBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsb0VBQW9FLFlBQVksNERBQTRELENBQUMsQ0FBQztvQkFDeEosWUFBWSxDQUFDLDZCQUE2QixDQUFDLFlBQVksQ0FBQyxDQUFDO2lCQUMxRDtxQkFDSSxJQUFJLElBQUEsK0JBQXdCLEVBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0RBQWtELFlBQVksb0VBQW9FLENBQUMsQ0FBQztvQkFDOUksNkJBQTZCLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDbkUsOERBQThEO2lCQUMvRDtxQkFDSSxJQUFJLENBQUMsSUFBQSxpQkFBVSxFQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLGlFQUFpRSxTQUFTLGtCQUFrQixZQUFZLEVBQUUsQ0FBQyxDQUFDO29CQUN0SCxZQUFZLENBQUMsdUJBQXVCLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLFNBQVUsQ0FBQyxDQUFDO2lCQUNuRjtxQkFDSSxJQUFJLElBQUEscUJBQWMsRUFBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLEVBQUU7b0JBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxZQUFZLHFFQUFxRSxDQUFDLENBQUM7b0JBQzNHLFlBQVksQ0FBQyw2QkFBNkIsQ0FBQyxZQUFZLENBQUMsQ0FBQztpQkFDMUQ7cUJBQ0ksSUFBSSxJQUFBLDRCQUFxQixFQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFO29CQUN6RCxJQUFJLENBQUMsdUJBQXVCLEVBQUU7d0JBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsbUVBQW1FLFlBQVksY0FBYyxDQUFDLENBQUM7d0JBQ3pHLDZCQUE2QixDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7d0JBQ25FLDhEQUE4RDtxQkFDL0Q7eUJBQ0k7d0JBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsWUFBWSxFQUFFLENBQUMsQ0FBQzt3QkFDN0QsMERBQTBEO3FCQUMzRDtpQkFDRjthQUNGO1NBQ0Y7UUFBQSxDQUFDO0tBQ0g7U0FDSTtRQUNILElBQUksQ0FBQyxLQUFLLENBQUMsb0NBQW9DLFlBQVkscUJBQXFCLENBQUMsQ0FBQztLQUNuRjtBQUNILENBQUM7QUFyREQsMENBcURDO0FBRUQsU0FBUywyQkFBMkIsQ0FBQyxZQUFvQixFQUFFLFlBQW9DO0lBQzdGLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztJQUNyRixZQUFZLENBQUMseUJBQXlCLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDdkQsQ0FBQztBQUVELHdHQUF3RztBQUN4Rzs7Ozs7Ozs7O0VBU0U7QUFFRixTQUFTLDZCQUE2QixDQUFDLE9BQThCLEVBQUUsWUFBb0IsRUFBRSxZQUFvQztJQUMvSCxNQUFNLFFBQVEsR0FBRyxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVMsQ0FBQztJQUMxQyxNQUFNLFNBQVMsR0FBRyxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUcsQ0FBQztJQUNyQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEYsWUFBWSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ25FLFlBQVksQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FBQyxZQUFvQixFQUFFLFlBQW9DO0lBQ3hGLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztJQUNwRixZQUFZLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUVELElBQUksRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgb2N0b2tpdCBmcm9tICdAb2N0b2tpdC9ncmFwaHFsLXNjaGVtYSc7XG5pbXBvcnQgKiBhcyBjb3JlIGZyb20gJ0BhY3Rpb25zL2NvcmUnO1xuaW1wb3J0ICogYXMgZ2l0aHViIGZyb20gJ0BhY3Rpb25zL2dpdGh1Yic7XG5pbXBvcnQgeyBHaXRodWJEaXNjdXNzaW9uQ2xpZW50IH0gZnJvbSBcIi4vR2l0aHViRGlzY3Vzc2lvbkNsaWVudFwiO1xuaW1wb3J0IHsgY29udGFpbnNLZXl3b3JkLCBjb250YWluc05lZ2F0aXZlUmVhY3Rpb24sIGNvbnRhaW5zUG9zaXRpdmVSZWFjdGlvbiwgZXhjZWVkc0RheXNVbnRpbFN0YWxlLCBoYXNSZXBsaWVzLCB0cmlnZ2VyZWRCeU5ld0NvbW1lbnQsIGhhc05vbkJvdFJlcGx5IH0gZnJvbSAnLi91dGlsJztcbmltcG9ydCB7IERpc2N1c3Npb25Db21tZW50RWRnZSwgTWFya0Rpc2N1c3Npb25Db21tZW50QXNBbnN3ZXIgfSBmcm9tICcuL2dlbmVyYXRlZC9ncmFwaHFsJztcblxuY29uc3QgUEFHRV9TSVpFID0gcGFyc2VJbnQoY29yZS5nZXRJbnB1dCgncGFnZS1zaXplJywgeyByZXF1aXJlZDogZmFsc2UgfSkpIHx8IDUwO1xuY29uc3QgR0lUSFVCX0JPVCA9IGNvcmUuZ2V0SW5wdXQoJ2dpdGh1Yi1ib3QnLCB7IHJlcXVpcmVkOiBmYWxzZX0pIHx8ICdnaXRodWItYWN0aW9ucyc7XG5jb25zdCBEQVlTX1VOVElMX1NUQUxFID0gcGFyc2VGbG9hdChjb3JlLmdldElucHV0KCdkYXlzLXVudGlsLXN0YWxlJywgeyByZXF1aXJlZDogZmFsc2UgfSkpIHx8IDc7XG5jb25zdCBQUk9QT1NFRF9BTlNXRVJfS0VZV09SRCA9IGNvcmUuZ2V0SW5wdXQoJ3Byb3Bvc2VkLWFuc3dlci1rZXl3b3JkJywgeyByZXF1aXJlZDogZmFsc2UgfSkgfHwgJ0BnaXRodWItYWN0aW9ucyBwcm9wb3NlZC1hbnN3ZXInO1xuY29uc3QgY2xvc2VMb2NrZWREaXNjdXNzaW9uc0lucHV0ID0gY29yZS5nZXRJbnB1dCgnY2xvc2UtbG9ja2VkLWRpc2N1c3Npb25zJywgeyByZXF1aXJlZDogZmFsc2UgfSk7XG5jb25zdCBDTE9TRV9MT0NLRURfRElTQ1VTU0lPTlMgPSBjbG9zZUxvY2tlZERpc2N1c3Npb25zSW5wdXQudG9Mb3dlckNhc2UoKSA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdHJ1ZTtcbmNvbnN0IGNsb3NlQW5zd2VyZWREaXNjdXNzaW9uc0lucHV0ID0gY29yZS5nZXRJbnB1dCgnY2xvc2UtYW5zd2VyZWQtZGlzY3Vzc2lvbnMnLCB7IHJlcXVpcmVkOiBmYWxzZSB9KTtcbmNvbnN0IENMT1NFX0FOU1dFUkVEX0RJU0NVU1NJT05TID0gY2xvc2VBbnN3ZXJlZERpc2N1c3Npb25zSW5wdXQudG9Mb3dlckNhc2UoKSA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdHJ1ZTtcbmNvbnN0IGNsb3NlU3RhbGVBc0Fuc3dlcmVkSW5wdXQgPSBjb3JlLmdldElucHV0KCdjbG9zZS1zdGFsZS1hcy1hbnN3ZXJlZCcsIHsgcmVxdWlyZWQ6IGZhbHNlIH0pO1xuY29uc3QgQ0xPU0VfU1RBTEVfQVNfQU5TV0VSRUQgPSBjbG9zZVN0YWxlQXNBbnN3ZXJlZElucHV0LnRvTG93ZXJDYXNlKCkgPT09ICdmYWxzZScgPyBmYWxzZSA6IHRydWU7XG5jb25zdCBDTE9TRV9GT1JfU1RBTEVORVNTX1JFU1BPTlNFX1RFWFQgPSBjb3JlLmdldElucHV0KCdzdGFsZS1yZXNwb25zZS10ZXh0JywgeyByZXF1aXJlZDogZmFsc2UgfSlcbiAgfHwgJ0Nsb3NpbmcgdGhlIGRpc2N1c3Npb24gZm9yIHN0YWxlbmVzcy4gUGxlYXNlIG9wZW4gYSBuZXcgZGlzY3Vzc2lvbiBpZiB5b3UgaGF2ZSBmdXJ0aGVyIGNvbmNlcm5zLic7XG5jb25zdCBJTlNUUlVDVElPTlNfVEVYVCA9IGNvcmUuZ2V0SW5wdXQoJ2luc3RydWN0aW9ucy1yZXNwb25zZS10ZXh0JywgeyByZXF1aXJlZDogZmFsc2UgfSlcbiAgfHwgJ0hlbGxvISBBIHRlYW0gbWVtYmVyIGhhcyBzdWdnZXN0ZWQgdGhlIGFib3ZlIGNvbW1lbnQgYXMgdGhlIGxpa2VseSBhbnN3ZXIgdG8gdGhpcyBkaXNjdXNzaW9uIHRocmVhZC4gJ1xuICArICdcXG4gXFxuICogSWYgeW91IGFncmVlLCBwbGVhc2UgdXB2b3RlIHRoYXQgY29tbWVudCwgb3IgY2xpY2sgb24gTWFyayBhcyBhbnN3ZXIuIEkgd2lsbCBhdXRvbWF0aWNhbGx5IG1hcmsgdGhlIGRpc2N1c3Npb24gYXMgYW5zd2VyZWQgd2l0aCB1cHZvdGVkIGNvbW1lbnQsIG5leHQgdGltZSBJIGNoZWNrLiAnXG4gICsgJ1xcbiBcXG4gKiBJZiB0aGlzIGFuc3dlciBkb2VzIG5vdCBoZWxwIHlvdSwgcGxlYXNlIGRvd252b3RlIHRoZSBhbnN3ZXIgaW5zdGVhZCBhbmQgbGV0IHVzIGtub3cgd2h5IGl0IHdhcyBub3QgaGVscGZ1bC4gJ1xuICArICdJIHdpbGwgYWRkIGEgbGFiZWwgdG8gdGhpcyBkaXNjdXNzaW9uIHRvIGdhaW4gYXR0ZW50aW9uIGZyb20gdGhlIHRlYW0uJztcbmNvbnN0IE9QRU5fRElTQ1VTU0lPTl9JTlNUUlVDVElPTl9URVhUID0gY29yZS5nZXRJbnB1dCgnb3Blbi1kaXNjdXNzaW9uLWluc3RydWN0aW9ucy10ZXh0JywgeyByZXF1aXJlZDogZmFsc2UgfSlcbiAgfHwgJ0hlbGxvISBSZW9wZW5pbmcgZGlzY3Vzc2lvbiB0byBtYWtlIGl0IHNlYXJjaGFibGUuICc7XG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG4gIGNvbnN0IGdpdGh1YkNsaWVudCA9IG5ldyBHaXRodWJEaXNjdXNzaW9uQ2xpZW50KCk7XG4gIGF3YWl0IGdpdGh1YkNsaWVudC5pbml0aWFsaXplQXR0ZW50aW9uTGFiZWxJZCgpO1xuICBpZiAodHJpZ2dlcmVkQnlOZXdDb21tZW50KCkpIHtcbiAgICBpZiAoZ2l0aHViLmNvbnRleHQucGF5bG9hZC5jb21tZW50Py5ib2R5LmluZGV4T2YoUFJPUE9TRURfQU5TV0VSX0tFWVdPUkQpID49IDApIHtcbiAgICAgIGNvcmUuaW5mbygnQ29tbWVudCBjcmVhdGVkIHdpdGggcHJvcG9zZWQgYW5zd2VyIGtleXdvcmQuIEFkZGluZyBpbnN0dWN0aW9ucyByZXBseSB0byBjb21tZW50Jyk7XG4gICAgICBnaXRodWJDbGllbnQuYWRkSW5zdHJ1Y3Rpb25UZXh0UmVwbHkoSU5TVFJVQ1RJT05TX1RFWFQsIGdpdGh1Yi5jb250ZXh0LnBheWxvYWQuZGlzY3Vzc2lvbiEubm9kZV9pZCwgZ2l0aHViLmNvbnRleHQucGF5bG9hZC5jb21tZW50IS5ub2RlX2lkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29yZS5pbmZvKCdDb21tZW50IGNyZWF0ZWQgd2l0aG91dCBwcm9wb3NlZCBhbnN3ZXIga2V5d29yZC4gTm8gYWN0aW9uIG5lZWRlZCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBhd2FpdCBwcm9jZXNzRGlzY3Vzc2lvbnMoZ2l0aHViQ2xpZW50KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0Rpc2N1c3Npb25zKGdpdGh1YkNsaWVudDogR2l0aHViRGlzY3Vzc2lvbkNsaWVudCkge1xuICBjb25zdCBkaXNjdXNzaW9uQ2F0ZWdvcnlJRExpc3Q6IHN0cmluZ1tdID0gYXdhaXQgZ2l0aHViQ2xpZW50LmdldEFuc3dlcmFibGVEaXNjdXNzaW9uQ2F0ZWdvcnlJRHMoKTtcbiAgaWYgKGRpc2N1c3Npb25DYXRlZ29yeUlETGlzdC5sZW5ndGggPT09IDApIHtcbiAgICBjb3JlLmluZm8oJ05vIGFuc3dlcmFibGUgZGlzY3Vzc2lvbnMgZm91bmQuIEV4aXRpbmcuJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZm9yIChjb25zdCBkaXNjdXNzaW9uQ2F0ZWdvcnlJRCBvZiBkaXNjdXNzaW9uQ2F0ZWdvcnlJRExpc3QpIHtcbiAgICBsZXQgaGFzTmV4dFBhZ2UgPSB0cnVlO1xuICAgIGxldCBhZnRlckN1cnNvcjogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgICB3aGlsZSAoaGFzTmV4dFBhZ2UpIHtcbiAgICAgIGNvbnN0IGRpc2N1c3Npb25zID0gYXdhaXQgZ2l0aHViQ2xpZW50LmdldERpc2N1c3Npb25zTWV0YURhdGEoZGlzY3Vzc2lvbkNhdGVnb3J5SUQsIFBBR0VfU0laRSwgYWZ0ZXJDdXJzb3IhKTtcbiAgICAgIGhhc05leHRQYWdlID0gZGlzY3Vzc2lvbnMucGFnZUluZm8uaGFzTmV4dFBhZ2U7XG4gICAgICBhZnRlckN1cnNvciA9IGRpc2N1c3Npb25zLnBhZ2VJbmZvLmVuZEN1cnNvciE7XG4gICAgXG4gICAgICBmb3IgKGNvbnN0IGRpc2N1c3Npb24gb2YgZGlzY3Vzc2lvbnMuZWRnZXMhKSB7XG4gICAgICAgIHZhciBkaXNjdXNzaW9uSWQgPSBkaXNjdXNzaW9uPy5ub2RlPy5pZCA/IGRpc2N1c3Npb24/Lm5vZGU/LmlkIDogXCJcIjtcbiAgICAgICAgdmFyIGRpc2N1c3Npb25OdW0gPSBkaXNjdXNzaW9uPy5ub2RlPy5udW1iZXIgPyBkaXNjdXNzaW9uLm5vZGUubnVtYmVyIDogMDtcbiAgICAgICAgY29yZS5pbmZvKGBQcm9jZXNzaW5nIGRpc2N1c3Npb25JZDogJHtkaXNjdXNzaW9uSWR9IHdpdGggbnVtYmVyOiAke2Rpc2N1c3Npb25OdW19IGFuZCBib2R5VGV4dDogJHtkaXNjdXNzaW9uPy5ub2RlPy5ib2R5VGV4dH1gKTtcbiAgICAgICAgaWYgKGRpc2N1c3Npb25JZCA9PT0gXCJcIiB8fCBkaXNjdXNzaW9uTnVtID09PSAwKSB7XG4gICAgICAgICAgY29yZS53YXJuaW5nKGBDYW4gbm90IHByb2NlZWQgY2hlY2tpbmcgZGlzY3Vzc2lvbiwgZGlzY3Vzc2lvbklkIGlzIG51bGwhYCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlzY3Vzc2lvbj8ubm9kZT8uY2xvc2VkKSB7XG4gICAgICAgICAgLy9jb3JlLmRlYnVnKGBEaXNjdXNzaW9uICR7ZGlzY3Vzc2lvbklkfSBpcyBjbG9zZWQsIHNvIG5vIGFjdGlvbiBuZWVkZWQuYCk7XG4gICAgICAgICAgY29yZS5pbmZvKFwiUmVvcGVuaW5nIGNsb3NlZCBkaXNjdXNzaW9uOiAke2Rpc2N1c3Npb25JZH1cIik7XG4gICAgICAgICAgcmVvcGVuQ2xvc2VkRGlzY3Vzc2lvbihkaXNjdXNzaW9uSWQsIGdpdGh1YkNsaWVudCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlzY3Vzc2lvbj8ubm9kZT8ubG9ja2VkICYmIENMT1NFX0xPQ0tFRF9ESVNDVVNTSU9OUykge1xuICAgICAgICAgIGNvcmUuaW5mbyhgRGlzY3Vzc2lvbiAke2Rpc2N1c3Npb25JZH0gaXMgbG9ja2VkLCBjbG9zaW5nIGl0IGFzIHJlc29sdmVkYCk7XG4gICAgICAgICAgZ2l0aHViQ2xpZW50LmNsb3NlRGlzY3Vzc2lvbkFzUmVzb2x2ZWQoZGlzY3Vzc2lvbklkKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXNjdXNzaW9uPy5ub2RlPy5hbnN3ZXIgIT0gbnVsbCAmJiBDTE9TRV9BTlNXRVJFRF9ESVNDVVNTSU9OUykge1xuICAgICAgICAgIGNvcmUuaW5mbyhgRGlzY3Vzc2lvbiAke2Rpc2N1c3Npb25JZH0gaXMgYWxyZWFkeSBhbnN3ZXJlZCwgc28gY2xvc2luZyBpdCBhcyByZXNvbHZlZC5gKTtcbiAgICAgICAgICBnaXRodWJDbGllbnQuY2xvc2VEaXNjdXNzaW9uQXNSZXNvbHZlZChkaXNjdXNzaW9uSWQpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHByb2Nlc3NDb21tZW50cyhkaXNjdXNzaW9uISwgZ2l0aHViQ2xpZW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0NvbW1lbnRzKGRpc2N1c3Npb246IG9jdG9raXQuRGlzY3Vzc2lvbkVkZ2UsIGdpdGh1YkNsaWVudDogR2l0aHViRGlzY3Vzc2lvbkNsaWVudCkge1xuICBjb25zdCBkaXNjdXNzaW9uSWQgPSBkaXNjdXNzaW9uLm5vZGU/LmlkID8gZGlzY3Vzc2lvbi5ub2RlPy5pZCA6IFwiXCI7XG4gIGNvbnN0IGRpc2N1c3Npb25OdW0gPSBkaXNjdXNzaW9uLm5vZGU/Lm51bWJlciA/IGRpc2N1c3Npb24ubm9kZT8ubnVtYmVyIDogMDtcbiAgY29uc3QgY29tbWVudENvdW50ID0gYXdhaXQgZ2l0aHViQ2xpZW50LmdldERpc2N1c3Npb25Db21tZW50Q291bnQoZGlzY3Vzc2lvbk51bSk7XG4gIGNvbnN0IGNvbW1lbnRzID0gYXdhaXQgZ2l0aHViQ2xpZW50LmdldENvbW1lbnRzTWV0YURhdGEoZGlzY3Vzc2lvbk51bSwgY29tbWVudENvdW50KTtcblxuICBpZiAoY29tbWVudENvdW50ICE9PSAwKSB7XG4gICAgZm9yIChjb25zdCBjb21tZW50IG9mIGNvbW1lbnRzLmVkZ2VzISkge1xuICAgICAgY29uc3QgY29tbWVudElkID0gY29tbWVudD8ubm9kZT8uaWQ7XG4gICAgICBjb3JlLmluZm8oYFByb2Nlc3NpbmcgY29tbWVudCAke2NvbW1lbnRJZH0gd2l0aCBib2R5dGV4dDogJHtjb21tZW50Py5ub2RlPy5ib2R5VGV4dH1gKTtcbiAgICAgIGlmICghY29tbWVudD8ubm9kZT8uYm9keVRleHQgfHwgIWNvbW1lbnQubm9kZS5pZCkge1xuICAgICAgICBjb3JlLmluZm8oYENvbW1lbnQgYm9keSBvciBpZCBpcyBudWxsIGluIGRpc2N1c3Npb24gJHtkaXNjdXNzaW9uSWR9LCBza2lwcGluZyBjb21tZW50IWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICghY29udGFpbnNLZXl3b3JkKGNvbW1lbnQhLCBQUk9QT1NFRF9BTlNXRVJfS0VZV09SRCkpIHtcbiAgICAgICAgY29yZS5pbmZvKGBObyBhbnN3ZXIgcHJvcG9zZWQgb24gY29tbWVudCAke2NvbW1lbnRJZH0sIG5vIGFjdGlvbiBuZWVkZWQhYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmIChjb250YWluc05lZ2F0aXZlUmVhY3Rpb24oY29tbWVudCkpIHtcbiAgICAgICAgICBjb3JlLmluZm8oYE5lZ2F0aXZlIHJlYWN0aW9uIHJlY2VpdmVkLiBBZGRpbmcgYXR0ZW50aW9uIGxhYmVsIHRvIGRpc2N1c3Npb24gJHtkaXNjdXNzaW9uSWR9IHRvIHJlY2VpdmUgZnVydGhlciBhdHRlbnRpb24gZnJvbSBhIHJlcG9zaXRvcnkgbWFpbnRhaW5lcmApO1xuICAgICAgICAgIGdpdGh1YkNsaWVudC5hZGRBdHRlbnRpb25MYWJlbFRvRGlzY3Vzc2lvbihkaXNjdXNzaW9uSWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNvbnRhaW5zUG9zaXRpdmVSZWFjdGlvbihjb21tZW50KSkge1xuICAgICAgICAgIGNvcmUuaW5mbyhgUG9zaXRpdmUgcmVhY3Rpb24gcmVjZWl2ZWQuIE1hcmtpbmcgZGlzY3Vzc2lvbiAke2Rpc2N1c3Npb25JZH0gYXMgYW5zd2VyZWQsIGFuZCBlZGl0aW5nIGFuc3dlciB0byByZW1vdmUgcHJvcG9zZWQgYW5zd2VyIGtleXdvcmRgKTtcbiAgICAgICAgICBtYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcihjb21tZW50LCBkaXNjdXNzaW9uSWQsIGdpdGh1YkNsaWVudCk7XG4gICAgICAgICAgLy9jbG9zZUFuZE1hcmtBc0Fuc3dlcmVkKGNvbW1lbnQsIGRpc2N1c3Npb25JZCwgZ2l0aHViQ2xpZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghaGFzUmVwbGllcyhjb21tZW50KSkge1xuICAgICAgICAgIGNvcmUuaW5mbyhgU2luY2UgdGhpcyBoYXMgbm8gcmVwbHksIGFkZGluZyBpbnN0cnVjdGlvbnMgcmVwbHkgdG8gY29tbWVudCAke2NvbW1lbnRJZH0gaW4gZGlzY3Vzc2lvbiAke2Rpc2N1c3Npb25JZH1gKTtcbiAgICAgICAgICBnaXRodWJDbGllbnQuYWRkSW5zdHJ1Y3Rpb25UZXh0UmVwbHkoSU5TVFJVQ1RJT05TX1RFWFQsIGRpc2N1c3Npb25JZCwgY29tbWVudElkISk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaGFzTm9uQm90UmVwbHkoY29tbWVudCwgR0lUSFVCX0JPVCkpIHtcbiAgICAgICAgICBjb3JlLmluZm8oYERpc2N1c3Npb24gJHtkaXNjdXNzaW9uSWR9IGhhcyBhIHJlcGx5LCBidXQgbm90IGFuIGluc3RydWN0aW9ucyByZXBseS4gQWRkaW5nIGF0dGVudGlvbiBsYWJlbGApO1xuICAgICAgICAgIGdpdGh1YkNsaWVudC5hZGRBdHRlbnRpb25MYWJlbFRvRGlzY3Vzc2lvbihkaXNjdXNzaW9uSWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGV4Y2VlZHNEYXlzVW50aWxTdGFsZShjb21tZW50LCBEQVlTX1VOVElMX1NUQUxFKSkge1xuICAgICAgICAgIGlmICghQ0xPU0VfU1RBTEVfQVNfQU5TV0VSRUQpIHtcbiAgICAgICAgICAgIGNvcmUuaW5mbyhgTm8gb25lIGhhcyByZXNwb25kZWQgb3IgcHJvdmlkZWQgYSByZWFjdGlvbiwgbWFya2luZyBkaXNjdXNzaW9uICR7ZGlzY3Vzc2lvbklkfSBhcyBhbnN3ZXJlZGApO1xuICAgICAgICAgICAgbWFya0Rpc2N1c3Npb25Db21tZW50QXNBbnN3ZXIoY29tbWVudCwgZGlzY3Vzc2lvbklkLCBnaXRodWJDbGllbnQpO1xuICAgICAgICAgICAgLy9jbG9zZUFuZE1hcmtBc0Fuc3dlcmVkKGNvbW1lbnQsIGRpc2N1c3Npb25JZCwgZ2l0aHViQ2xpZW50KTtcbiAgICAgICAgICB9IFxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29yZS5pbmZvKGBObyBhY3Rpb24gbmVlZGVkIGZvciBkaXNjdXNzaW9uICR7ZGlzY3Vzc2lvbklkfWApO1xuICAgICAgICAgICAgLy9jbG9zZURpc2N1c3Npb25Gb3JTdGFsZW5lc3MoZGlzY3Vzc2lvbklkLCBnaXRodWJDbGllbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cbiAgZWxzZSB7XG4gICAgY29yZS5kZWJ1ZyhgTm8gY29tbWVudHMgZm91bmQgZm9yIGRpc2N1c3Npb24gJHtkaXNjdXNzaW9uSWR9LCBObyBhY3Rpb24gbmVlZGVkIWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNsb3NlRGlzY3Vzc2lvbkZvclN0YWxlbmVzcyhkaXNjdXNzaW9uSWQ6IHN0cmluZywgZ2l0aHViQ2xpZW50OiBHaXRodWJEaXNjdXNzaW9uQ2xpZW50KSB7XG4gIGdpdGh1YkNsaWVudC5hZGRDb21tZW50VG9EaXNjdXNzaW9uKGRpc2N1c3Npb25JZCwgQ0xPU0VfRk9SX1NUQUxFTkVTU19SRVNQT05TRV9URVhUKTtcbiAgZ2l0aHViQ2xpZW50LmNsb3NlRGlzY3Vzc2lvbkFzT3V0ZGF0ZWQoZGlzY3Vzc2lvbklkKTtcbn1cblxuLy9UaGlzIGZ1bmN0aW9vbiBpcyBubyBsb25nZXIgdXNlZCBzaW5jZSB3ZSBhcmUgbWFya2luZyB0aGUgZGlzY3Vzc2lvbiBhcyBhbnN3ZXJlZCBpbnN0ZWFkIG9mIGNsb3NpbmcgaXRcbi8qXG5mdW5jdGlvbiBjbG9zZUFuZE1hcmtBc0Fuc3dlcmVkKGNvbW1lbnQ6IERpc2N1c3Npb25Db21tZW50RWRnZSwgZGlzY3Vzc2lvbklkOiBzdHJpbmcsIGdpdGh1YkNsaWVudDogR2l0aHViRGlzY3Vzc2lvbkNsaWVudCkge1xuICBjb25zdCBib2R5VGV4dCA9IGNvbW1lbnQ/Lm5vZGU/LmJvZHlUZXh0ITtcbiAgY29uc3QgY29tbWVudElkID0gY29tbWVudD8ubm9kZT8uaWQhO1xuICBjb25zdCB1cGRhdGVkQW5zd2VyVGV4dCA9IGJvZHlUZXh0LnJlcGxhY2UoUFJPUE9TRURfQU5TV0VSX0tFWVdPUkQsICdBbnN3ZXI6ICcpO1xuICBnaXRodWJDbGllbnQudXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnQoY29tbWVudElkLCB1cGRhdGVkQW5zd2VyVGV4dCk7XG4gIGdpdGh1YkNsaWVudC5tYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcihjb21tZW50SWQpO1xuICBnaXRodWJDbGllbnQuY2xvc2VEaXNjdXNzaW9uQXNSZXNvbHZlZChkaXNjdXNzaW9uSWQpO1xufVxuKi9cblxuZnVuY3Rpb24gbWFya0Rpc2N1c3Npb25Db21tZW50QXNBbnN3ZXIoY29tbWVudDogRGlzY3Vzc2lvbkNvbW1lbnRFZGdlLCBkaXNjdXNzaW9uSWQ6IHN0cmluZywgZ2l0aHViQ2xpZW50OiBHaXRodWJEaXNjdXNzaW9uQ2xpZW50KSB7XG4gIGNvbnN0IGJvZHlUZXh0ID0gY29tbWVudD8ubm9kZT8uYm9keVRleHQhO1xuICBjb25zdCBjb21tZW50SWQgPSBjb21tZW50Py5ub2RlPy5pZCE7XG4gIGNvbnN0IHVwZGF0ZWRBbnN3ZXJUZXh0ID0gYm9keVRleHQucmVwbGFjZShQUk9QT1NFRF9BTlNXRVJfS0VZV09SRCwgJ0Fuc3dlcjogJyk7XG4gIGdpdGh1YkNsaWVudC51cGRhdGVEaXNjdXNzaW9uQ29tbWVudChjb21tZW50SWQsIHVwZGF0ZWRBbnN3ZXJUZXh0KTtcbiAgZ2l0aHViQ2xpZW50Lm1hcmtEaXNjdXNzaW9uQ29tbWVudEFzQW5zd2VyKGNvbW1lbnRJZCk7XG59XG5cbmZ1bmN0aW9uIHJlb3BlbkNsb3NlZERpc2N1c3Npb24oZGlzY3Vzc2lvbklkOiBzdHJpbmcsIGdpdGh1YkNsaWVudDogR2l0aHViRGlzY3Vzc2lvbkNsaWVudCkge1xuICBnaXRodWJDbGllbnQuYWRkQ29tbWVudFRvRGlzY3Vzc2lvbihkaXNjdXNzaW9uSWQsIE9QRU5fRElTQ1VTU0lPTl9JTlNUUlVDVElPTl9URVhUKTtcbiAgZ2l0aHViQ2xpZW50LnJlb3BlbkRpc2N1c3Npb24oZGlzY3Vzc2lvbklkKTtcbn1cblxubWFpbigpO1xuIl19