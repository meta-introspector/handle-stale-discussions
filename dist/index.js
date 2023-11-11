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
                    //core.debug(`Discussion ${discussionId} is closed, so no action needed.`);
                    core.info("Reopening closed discussion: ${discussionId}");
                    reopenClosedDiscussion(discussionId, githubClient);
                }
                else if (discussion?.node?.closed) {
                    core.debug(`Discussion ${discussionId} is closed, so no action needed.`);
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
                core.warning(`Comment body or id is null in discussion ${discussionId}, skipping comment!`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0Esc0NBQXNDO0FBQ3RDLDBDQUEwQztBQUMxQyxxRUFBa0U7QUFDbEUsaUNBQXVLO0FBR3ZLLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2xGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBQyxDQUFDLElBQUksZ0JBQWdCLENBQUM7QUFDdkYsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pHLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLGlDQUFpQyxDQUFDO0FBQ25JLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ25HLE1BQU0sd0JBQXdCLEdBQUcsMkJBQTJCLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN0RyxNQUFNLDZCQUE2QixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztBQUN2RyxNQUFNLDBCQUEwQixHQUFHLDZCQUE2QixDQUFDLFdBQVcs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b2tpdCBmcm9tICdAb2N0b2tpdC9ncmFwaHFsLXNjaGVtYSc7XG5pbXBvcnQgKiBhcyBjb3JlIGZyb20gJ0BhY3Rpb25zL2NvcmUnO1xuaW1wb3J0ICogYXMgZ2l0aHViIGZyb20gJ0BhY3Rpb25zL2dpdGh1Yic7XG5pbXBvcnQgeyBHaXRodWJEaXNjdXNzaW9uQ2xpZW50IH0gZnJvbSBcIi4vR2l0aHViRGlzY3Vzc2lvbkNsaWVudFwiO1xuaW1wb3J0IHsgY29udGFpbnNLZXl3b3JkLCBjb250YWluc05lZ2F0aXZlUmVhY3Rpb24sIGNvbnRhaW5zUG9zaXRpdmVSZWFjdGlvbiwgZXhjZWVkc0RheXNVbnRpbFN0YWxlLCBoYXNSZXBsaWVzLCB0cmlnZ2VyZWRCeU5ld0NvbW1lbnQsIGhhc05vbkJvdFJlcGx5IH0gZnJvbSAnLi91dGlsJztcbmltcG9ydCB7IERpc2N1c3Npb25Db21tZW50RWRnZSwgTWFya0Rpc2N1c3Npb25Db21tZW50QXNBbnN3ZXIgfSBmcm9tICcuL2dlbmVyYXRlZC9ncmFwaHFsJztcblxuY29uc3QgUEFHRV9TSVpFID0gcGFyc2VJbnQoY29yZS5nZXRJbnB1dCgncGFnZS1zaXplJywgeyByZXF1aXJlZDogZmFsc2UgfSkpIHx8IDUwO1xuY29uc3QgR0lUSFVCX0JPVCA9IGNvcmUuZ2V0SW5wdXQoJ2dpdGh1Yi1ib3QnLCB7IHJlcXVpcmVkOiBmYWxzZX0pIHx8ICdnaXRodWItYWN0aW9ucyc7XG5jb25zdCBEQVlTX1VOVElMX1NUQUxFID0gcGFyc2VGbG9hdChjb3JlLmdldElucHV0KCdkYXlzLXVudGlsLXN0YWxlJywgeyByZXF1aXJlZDogZmFsc2UgfSkpIHx8IDc7XG5jb25zdCBQUk9QT1NFRF9BTlNXRVJfS0VZV09SRCA9IGNvcmUuZ2V0SW5wdXQoJ3Byb3Bvc2VkLWFuc3dlci1rZXl3b3JkJywgeyByZXF1aXJlZDogZmFsc2UgfSkgfHwgJ0BnaXRodWItYWN0aW9ucyBwcm9wb3NlZC1hbnN3ZXInO1xuY29uc3QgY2xvc2VMb2NrZWREaXNjdXNzaW9uc0lucHV0ID0gY29yZS5nZXRJbnB1dCgnY2xvc2UtbG9ja2VkLWRpc2N1c3Npb25zJywgeyByZXF1aXJlZDogZmFsc2UgfSk7XG5jb25zdCBDTE9TRV9MT0NLRURfRElTQ1VTU0lPTlMgPSBjbG9zZUxvY2tlZERpc2N1c3Npb25zSW5wdXQudG9Mb3dlckNhc2UoKSA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdHJ1ZTtcbmNvbnN0IGNsb3NlQW5zd2VyZWREaXNjdXNzaW9uc0lucHV0ID0gY29yZS5nZXRJbnB1dCgnY2xvc2UtYW5zd2VyZWQtZGlzY3Vzc2lvbnMnLCB7IHJlcXVpcmVkOiBmYWxzZSB9KTtcbmNvbnN0IENMT1NFX0FOU1dFUkVEX0RJU0NVU1NJT05TID0gY2xvc2VBbnN3ZXJlZERpc2N1c3Npb25zSW5wdXQudG9Mb3dlckNhc2UoKSA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdHJ1ZTtcbmNvbnN0IGNsb3NlU3RhbGVBc0Fuc3dlcmVkSW5wdXQgPSBjb3JlLmdldElucHV0KCdjbG9zZS1zdGFsZS1hcy1hbnN3ZXJlZCcsIHsgcmVxdWlyZWQ6IGZhbHNlIH0pO1xuY29uc3QgQ0xPU0VfU1RBTEVfQVNfQU5TV0VSRUQgPSBjbG9zZVN0YWxlQXNBbnN3ZXJlZElucHV0LnRvTG93ZXJDYXNlKCkgPT09ICdmYWxzZScgPyBmYWxzZSA6IHRydWU7XG5jb25zdCBDTE9TRV9GT1JfU1RBTEVORVNTX1JFU1BPTlNFX1RFWFQgPSBjb3JlLmdldElucHV0KCdzdGFsZS1yZXNwb25zZS10ZXh0JywgeyByZXF1aXJlZDogZmFsc2UgfSlcbiAgfHwgJ0Nsb3NpbmcgdGhlIGRpc2N1c3Npb24gZm9yIHN0YWxlbmVzcy4gUGxlYXNlIG9wZW4gYSBuZXcgZGlzY3Vzc2lvbiBpZiB5b3UgaGF2ZSBmdXJ0aGVyIGNvbmNlcm5zLic7XG5jb25zdCBJTlNUUlVDVElPTlNfVEVYVCA9IGNvcmUuZ2V0SW5wdXQoJ2luc3RydWN0aW9ucy1yZXNwb25zZS10ZXh0JywgeyByZXF1aXJlZDogZmFsc2UgfSlcbnx8ICdIZWxsbyEgQSB0ZWFtIG1lbWJlciBoYXMgc3VnZ2VzdGVkIHRoZSBhYm92ZSBjb21tZW50IGFzIHRoZSBsaWtlbHkgYW5zd2VyIHRvIHRoaXMgZGlzY3Vzc2lvbiB0aHJlYWQuICdcbisgJ1xcbiBcXG4gKiBJZiB5b3UgYWdyZWUsIHBsZWFzZSB1cHZvdGUgdGhhdCBjb21tZW50LCBvciBjbGljayBvbiBNYXJrIGFzIGFuc3dlci4gSSB3aWxsIGF1dG9tYXRpY2FsbHkgbWFyayB0aGUgZGlzY3Vzc2lvbiBhcyBhbnN3ZXJlZCB3aXRoIHVwdm90ZWQgY29tbWVudCwgbmV4dCB0aW1lIEkgY2hlY2suICcgIFxuKyAnXFxuIFxcbiAqIElmIHRoaXMgYW5zd2VyIGRvZXMgbm90IGhlbHAgeW91LCBwbGVhc2UgZG93bnZvdGUgdGhlIGFuc3dlciBpbnN0ZWFkIGFuZCBsZXQgdXMga25vdyB3aHkgaXQgd2FzIG5vdCBoZWxwZnVsLiAnXG4gICsgJ0kgd2lsbCBhZGQgYSBsYWJlbCB0byB0aGlzIGRpc2N1c3Npb24gdG8gZ2FpbiBhdHRlbnRpb24gZnJvbSB0aGUgdGVhbS4nO1xuY29uc3QgT1BFTl9ESVNDVVNTSU9OX0lOU1RSVUNUSU9OX1RFWFQgPSBjb3JlLmdldElucHV0KCdvcGVuLWRpc2N1c3Npb24taW5zdHJ1Y3Rpb25zLXRleHQnLCB7IHJlcXVpcmVkOiBmYWxzZSB9KVxuICB8fCAnSGVsbG8hIFJlb3BlbmluZyBkaXNjdXNzaW9uIHRvIG1ha2UgaXQgc2VhcmNoYWJsZS4gJztcblxuYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcbiAgY29uc3QgZ2l0aHViQ2xpZW50ID0gbmV3IEdpdGh1YkRpc2N1c3Npb25DbGllbnQoKTtcbiAgYXdhaXQgZ2l0aHViQ2xpZW50LmluaXRpYWxpemVBdHRlbnRpb25MYWJlbElkKCk7XG4gIGlmICh0cmlnZ2VyZWRCeU5ld0NvbW1lbnQoKSkge1xuICAgIGlmIChnaXRodWIuY29udGV4dC5wYXlsb2FkLmNvbW1lbnQ/LmJvZHkuaW5kZXhPZihQUk9QT1NFRF9BTlNXRVJfS0VZV09SRCkgPj0gMCkge1xuICAgICAgY29yZS5pbmZvKCdDb21tZW50IGNyZWF0ZWQgd2l0aCBwcm9wb3NlZCBhbnN3ZXIga2V5d29yZC4gQWRkaW5nIGluc3R1Y3Rpb25zIHJlcGx5IHRvIGNvbW1lbnQnKTtcbiAgICAgIGdpdGh1YkNsaWVudC5hZGRJbnN0cnVjdGlvblRleHRSZXBseShJTlNUUlVDVElPTlNfVEVYVCwgZ2l0aHViLmNvbnRleHQucGF5bG9hZC5kaXNjdXNzaW9uIS5ub2RlX2lkLCBnaXRodWIuY29udGV4dC5wYXlsb2FkLmNvbW1lbnQhLm5vZGVfaWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb3JlLmluZm8oJ0NvbW1lbnQgY3JlYXRlZCB3aXRob3V0IHByb3Bvc2VkIGFuc3dlciBrZXl3b3JkLiBObyBhY3Rpb24gbmVlZGVkJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGF3YWl0IHByb2Nlc3NEaXNjdXNzaW9ucyhnaXRodWJDbGllbnQpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9jZXNzRGlzY3Vzc2lvbnMoZ2l0aHViQ2xpZW50OiBHaXRodWJEaXNjdXNzaW9uQ2xpZW50KSB7XG4gIGNvbnN0IGRpc2N1c3Npb25DYXRlZ29yeUlETGlzdDogc3RyaW5nW10gPSBhd2FpdCBnaXRodWJDbGllbnQuZ2V0QW5zd2VyYWJsZURpc2N1c3Npb25DYXRlZ29yeUlEcygpO1xuICBpZiAoZGlzY3Vzc2lvbkNhdGVnb3J5SURMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIGNvcmUuaW5mbygnTm8gYW5zd2VyYWJsZSBkaXNjdXNzaW9ucyBmb3VuZC4gRXhpdGluZy4nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBmb3IgKGNvbnN0IGRpc2N1c3Npb25DYXRlZ29yeUlEIG9mIGRpc2N1c3Npb25DYXRlZ29yeUlETGlzdCkge1xuICAgIGxldCBoYXNOZXh0UGFnZSA9IHRydWU7XG4gICAgbGV0IGFmdGVyQ3Vyc29yOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgIHdoaWxlIChoYXNOZXh0UGFnZSkge1xuICAgICAgY29uc3QgZGlzY3Vzc2lvbnMgPSBhd2FpdCBnaXRodWJDbGllbnQuZ2V0RGlzY3Vzc2lvbnNNZXRhRGF0YShkaXNjdXNzaW9uQ2F0ZWdvcnlJRCwgUEFHRV9TSVpFLCBhZnRlckN1cnNvciEpO1xuICAgICAgaGFzTmV4dFBhZ2UgPSBkaXNjdXNzaW9ucy5wYWdlSW5mby5oYXNOZXh0UGFnZTtcbiAgICAgIGFmdGVyQ3Vyc29yID0gZGlzY3Vzc2lvbnMucGFnZUluZm8uZW5kQ3Vyc29yITtcbiAgICBcbiAgICAgIGZvciAoY29uc3QgZGlzY3Vzc2lvbiBvZiBkaXNjdXNzaW9ucy5lZGdlcyEpIHtcbiAgICAgICAgdmFyIGRpc2N1c3Npb25JZCA9IGRpc2N1c3Npb24/Lm5vZGU/LmlkID8gZGlzY3Vzc2lvbj8ubm9kZT8uaWQgOiBcIlwiO1xuICAgICAgICB2YXIgZGlzY3Vzc2lvbk51bSA9IGRpc2N1c3Npb24/Lm5vZGU/Lm51bWJlciA/IGRpc2N1c3Npb24ubm9kZS5udW1iZXIgOiAwO1xuICAgICAgICBjb3JlLmluZm8oYFByb2Nlc3NpbmcgZGlzY3Vzc2lvbklkOiAke2Rpc2N1c3Npb25JZH0gd2l0aCBudW1iZXI6ICR7ZGlzY3Vzc2lvbk51bX0gYW5kIGJvZHlUZXh0OiAke2Rpc2N1c3Npb24/Lm5vZGU/LmJvZHlUZXh0fWApO1xuICAgICAgICBpZiAoZGlzY3Vzc2lvbklkID09PSBcIlwiIHx8IGRpc2N1c3Npb25OdW0gPT09IDApIHtcbiAgICAgICAgICAvL2NvcmUuZGVidWcoYERpc2N1c3Npb24gJHtkaXNjdXNzaW9uSWR9IGlzIGNsb3NlZCwgc28gbm8gYWN0aW9uIG5lZWRlZC5gKTtcbiAgICAgICAgICBjb3JlLmluZm8oXCJSZW9wZW5pbmcgY2xvc2VkIGRpc2N1c3Npb246ICR7ZGlzY3Vzc2lvbklkfVwiKTtcbiAgICAgICAgICByZW9wZW5DbG9zZWREaXNjdXNzaW9uKGRpc2N1c3Npb25JZCwgZ2l0aHViQ2xpZW50KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXNjdXNzaW9uPy5ub2RlPy5jbG9zZWQpIHtcbiAgICAgICAgICBjb3JlLmRlYnVnKGBEaXNjdXNzaW9uICR7ZGlzY3Vzc2lvbklkfSBpcyBjbG9zZWQsIHNvIG5vIGFjdGlvbiBuZWVkZWQuYCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZGlzY3Vzc2lvbj8ubm9kZT8ubG9ja2VkICYmIENMT1NFX0xPQ0tFRF9ESVNDVVNTSU9OUykge1xuICAgICAgICAgIGNvcmUuaW5mbyhgRGlzY3Vzc2lvbiAke2Rpc2N1c3Npb25JZH0gaXMgbG9ja2VkLCBjbG9zaW5nIGl0IGFzIHJlc29sdmVkYCk7XG4gICAgICAgICAgZ2l0aHViQ2xpZW50LmNsb3NlRGlzY3Vzc2lvbkFzUmVzb2x2ZWQoZGlzY3Vzc2lvbklkKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChkaXNjdXNzaW9uPy5ub2RlPy5hbnN3ZXIgIT0gbnVsbCAmJiBDTE9TRV9BTlNXRVJFRF9ESVNDVVNTSU9OUykge1xuICAgICAgICAgIGNvcmUuaW5mbyhgRGlzY3Vzc2lvbiAke2Rpc2N1c3Npb25JZH0gaXMgYWxyZWFkeSBhbnN3ZXJlZCwgc28gY2xvc2luZyBpdCBhcyByZXNvbHZlZC5gKTtcbiAgICAgICAgICBnaXRodWJDbGllbnQuY2xvc2VEaXNjdXNzaW9uQXNSZXNvbHZlZChkaXNjdXNzaW9uSWQpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHByb2Nlc3NDb21tZW50cyhkaXNjdXNzaW9uISwgZ2l0aHViQ2xpZW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0NvbW1lbnRzKGRpc2N1c3Npb246IG9jdG9raXQuRGlzY3Vzc2lvbkVkZ2UsIGdpdGh1YkNsaWVudDogR2l0aHViRGlzY3Vzc2lvbkNsaWVudCkge1xuICBjb25zdCBkaXNjdXNzaW9uSWQgPSBkaXNjdXNzaW9uLm5vZGU/LmlkID8gZGlzY3Vzc2lvbi5ub2RlPy5pZCA6IFwiXCI7XG4gIGNvbnN0IGRpc2N1c3Npb25OdW0gPSBkaXNjdXNzaW9uLm5vZGU/Lm51bWJlciA/IGRpc2N1c3Npb24ubm9kZT8ubnVtYmVyIDogMDtcbiAgY29uc3QgY29tbWVudENvdW50ID0gYXdhaXQgZ2l0aHViQ2xpZW50LmdldERpc2N1c3Npb25Db21tZW50Q291bnQoZGlzY3Vzc2lvbk51bSk7XG4gIGNvbnN0IGNvbW1lbnRzID0gYXdhaXQgZ2l0aHViQ2xpZW50LmdldENvbW1lbnRzTWV0YURhdGEoZGlzY3Vzc2lvbk51bSwgY29tbWVudENvdW50KTtcblxuICBpZiAoY29tbWVudENvdW50ICE9PSAwKSB7XG4gICAgZm9yIChjb25zdCBjb21tZW50IG9mIGNvbW1lbnRzLmVkZ2VzISkge1xuICAgICAgY29uc3QgY29tbWVudElkID0gY29tbWVudD8ubm9kZT8uaWQ7XG4gICAgICBjb3JlLmluZm8oYFByb2Nlc3NpbmcgY29tbWVudCAke2NvbW1lbnRJZH0gd2l0aCBib2R5dGV4dDogJHtjb21tZW50Py5ub2RlPy5ib2R5VGV4dH1gKTtcbiAgICAgIGlmICghY29tbWVudD8ubm9kZT8uYm9keVRleHQgfHwgIWNvbW1lbnQubm9kZS5pZCkge1xuICAgICAgICBjb3JlLndhcm5pbmcoYENvbW1lbnQgYm9keSBvciBpZCBpcyBudWxsIGluIGRpc2N1c3Npb24gJHtkaXNjdXNzaW9uSWR9LCBza2lwcGluZyBjb21tZW50IWApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICghY29udGFpbnNLZXl3b3JkKGNvbW1lbnQhLCBQUk9QT1NFRF9BTlNXRVJfS0VZV09SRCkpIHtcbiAgICAgICAgY29yZS5pbmZvKGBObyBhbnN3ZXIgcHJvcG9zZWQgb24gY29tbWVudCAke2NvbW1lbnRJZH0sIG5vIGFjdGlvbiBuZWVkZWQhYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGlmIChjb250YWluc05lZ2F0aXZlUmVhY3Rpb24oY29tbWVudCkpIHtcbiAgICAgICAgICBjb3JlLmluZm8oYE5lZ2F0aXZlIHJlYWN0aW9uIHJlY2VpdmVkLiBBZGRpbmcgYXR0ZW50aW9uIGxhYmVsIHRvIGRpc2N1c3Npb24gJHtkaXNjdXNzaW9uSWR9IHRvIHJlY2VpdmUgZnVydGhlciBhdHRlbnRpb24gZnJvbSBhIHJlcG9zaXRvcnkgbWFpbnRhaW5lcmApO1xuICAgICAgICAgIGdpdGh1YkNsaWVudC5hZGRBdHRlbnRpb25MYWJlbFRvRGlzY3Vzc2lvbihkaXNjdXNzaW9uSWQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGNvbnRhaW5zUG9zaXRpdmVSZWFjdGlvbihjb21tZW50KSkge1xuICAgICAgICAgIGNvcmUuaW5mbyhgUG9zaXRpdmUgcmVhY3Rpb24gcmVjZWl2ZWQuIE1hcmtpbmcgZGlzY3Vzc2lvbiAke2Rpc2N1c3Npb25JZH0gYXMgYW5zd2VyZWQsIGFuZCBlZGl0aW5nIGFuc3dlciB0byByZW1vdmUgcHJvcG9zZWQgYW5zd2VyIGtleXdvcmRgKTtcbiAgICAgICAgICBtYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcihjb21tZW50LCBkaXNjdXNzaW9uSWQsIGdpdGh1YkNsaWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIWhhc1JlcGxpZXMoY29tbWVudCkpIHtcbiAgICAgICAgICBjb3JlLmluZm8oYFNpbmNlIHRoaXMgaGFzIG5vIHJlcGx5LCBhZGRpbmcgaW5zdHJ1Y3Rpb25zIHJlcGx5IHRvIGNvbW1lbnQgJHtjb21tZW50SWR9IGluIGRpc2N1c3Npb24gJHtkaXNjdXNzaW9uSWR9YCk7XG4gICAgICAgICAgZ2l0aHViQ2xpZW50LmFkZEluc3RydWN0aW9uVGV4dFJlcGx5KElOU1RSVUNUSU9OU19URVhULCBkaXNjdXNzaW9uSWQsIGNvbW1lbnRJZCEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGhhc05vbkJvdFJlcGx5KGNvbW1lbnQsIEdJVEhVQl9CT1QpKSB7XG4gICAgICAgICAgY29yZS5pbmZvKGBEaXNjdXNzaW9uICR7ZGlzY3Vzc2lvbklkfSBoYXMgYSByZXBseSwgYnV0IG5vdCBhbiBpbnN0cnVjdGlvbnMgcmVwbHkuIEFkZGluZyBhdHRlbnRpb24gbGFiZWxgKTtcbiAgICAgICAgICBnaXRodWJDbGllbnQuYWRkQXR0ZW50aW9uTGFiZWxUb0Rpc2N1c3Npb24oZGlzY3Vzc2lvbklkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChleGNlZWRzRGF5c1VudGlsU3RhbGUoY29tbWVudCwgREFZU19VTlRJTF9TVEFMRSkpIHtcbiAgICAgICAgICBpZiAoIUNMT1NFX1NUQUxFX0FTX0FOU1dFUkVEKSB7XG4gICAgICAgICAgICBjb3JlLmluZm8oYE5vIG9uZSBoYXMgcmVzcG9uZGVkIG9yIHByb3ZpZGVkIGEgcmVhY3Rpb24sIG1hcmtpbmcgZGlzY3Vzc2lvbiAke2Rpc2N1c3Npb25JZH0gYXMgYW5zd2VyZWRgKTtcbiAgICAgICAgICAgIG1hcmtEaXNjdXNzaW9uQ29tbWVudEFzQW5zd2VyKGNvbW1lbnQsIGRpc2N1c3Npb25JZCwgZ2l0aHViQ2xpZW50KTtcbiAgICAgICAgICAgIC8vY2xvc2VBbmRNYXJrQXNBbnN3ZXJlZChjb21tZW50LCBkaXNjdXNzaW9uSWQsIGdpdGh1YkNsaWVudCk7XG4gICAgICAgICAgfSBcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvcmUuaW5mbyhgTm8gYWN0aW9uIG5lZWRlZCBmb3IgZGlzY3Vzc2lvbiAke2Rpc2N1c3Npb25JZH1gKTtcbiAgICAgICAgICAgIC8vY2xvc2VEaXNjdXNzaW9uRm9yU3RhbGVuZXNzKGRpc2N1c3Npb25JZCwgZ2l0aHViQ2xpZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGVsc2Uge1xuICAgIGNvcmUuZGVidWcoYE5vIGNvbW1lbnRzIGZvdW5kIGZvciBkaXNjdXNzaW9uICR7ZGlzY3Vzc2lvbklkfSwgTm8gYWN0aW9uIG5lZWRlZCFgKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjbG9zZURpc2N1c3Npb25Gb3JTdGFsZW5lc3MoZGlzY3Vzc2lvbklkOiBzdHJpbmcsIGdpdGh1YkNsaWVudDogR2l0aHViRGlzY3Vzc2lvbkNsaWVudCkge1xuICBnaXRodWJDbGllbnQuYWRkQ29tbWVudFRvRGlzY3Vzc2lvbihkaXNjdXNzaW9uSWQsIENMT1NFX0ZPUl9TVEFMRU5FU1NfUkVTUE9OU0VfVEVYVCk7XG4gIGdpdGh1YkNsaWVudC5jbG9zZURpc2N1c3Npb25Bc091dGRhdGVkKGRpc2N1c3Npb25JZCk7XG59XG5cbi8vVGhpcyBmdW5jdGlvb24gaXMgbm8gbG9uZ2VyIHVzZWQgc2luY2Ugd2UgYXJlIG1hcmtpbmcgdGhlIGRpc2N1c3Npb24gYXMgYW5zd2VyZWQgaW5zdGVhZCBvZiBjbG9zaW5nIGl0XG4vKlxuZnVuY3Rpb24gY2xvc2VBbmRNYXJrQXNBbnN3ZXJlZChjb21tZW50OiBEaXNjdXNzaW9uQ29tbWVudEVkZ2UsIGRpc2N1c3Npb25JZDogc3RyaW5nLCBnaXRodWJDbGllbnQ6IEdpdGh1YkRpc2N1c3Npb25DbGllbnQpIHtcbiAgY29uc3QgYm9keVRleHQgPSBjb21tZW50Py5ub2RlPy5ib2R5VGV4dCE7XG4gIGNvbnN0IGNvbW1lbnRJZCA9IGNvbW1lbnQ/Lm5vZGU/LmlkITtcbiAgY29uc3QgdXBkYXRlZEFuc3dlclRleHQgPSBib2R5VGV4dC5yZXBsYWNlKFBST1BPU0VEX0FOU1dFUl9LRVlXT1JELCAnQW5zd2VyOiAnKTtcbiAgZ2l0aHViQ2xpZW50LnVwZGF0ZURpc2N1c3Npb25Db21tZW50KGNvbW1lbnRJZCwgdXBkYXRlZEFuc3dlclRleHQpO1xuICBnaXRodWJDbGllbnQubWFya0Rpc2N1c3Npb25Db21tZW50QXNBbnN3ZXIoY29tbWVudElkKTtcbiAgZ2l0aHViQ2xpZW50LmNsb3NlRGlzY3Vzc2lvbkFzUmVzb2x2ZWQoZGlzY3Vzc2lvbklkKTtcbn1cbiovXG5cbmZ1bmN0aW9uIG1hcmtEaXNjdXNzaW9uQ29tbWVudEFzQW5zd2VyKGNvbW1lbnQ6IERpc2N1c3Npb25Db21tZW50RWRnZSwgZGlzY3Vzc2lvbklkOiBzdHJpbmcsIGdpdGh1YkNsaWVudDogR2l0aHViRGlzY3Vzc2lvbkNsaWVudCkge1xuICBjb25zdCBib2R5VGV4dCA9IGNvbW1lbnQ/Lm5vZGU/LmJvZHlUZXh0ITtcbiAgY29uc3QgY29tbWVudElkID0gY29tbWVudD8ubm9kZT8uaWQhO1xuICBjb25zdCB1cGRhdGVkQW5zd2VyVGV4dCA9IGJvZHlUZXh0LnJlcGxhY2UoUFJPUE9TRURfQU5TV0VSX0tFWVdPUkQsICdBbnN3ZXI6ICcpO1xuICBnaXRodWJDbGllbnQudXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnQoY29tbWVudElkLCB1cGRhdGVkQW5zd2VyVGV4dCk7XG4gIGdpdGh1YkNsaWVudC5tYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcihjb21tZW50SWQpO1xufVxuXG5mdW5jdGlvbiByZW9wZW5DbG9zZWREaXNjdXNzaW9uKGRpc2N1c3Npb25JZDogc3RyaW5nLCBnaXRodWJDbGllbnQ6IEdpdGh1YkRpc2N1c3Npb25DbGllbnQpIHtcbiAgZ2l0aHViQ2xpZW50LmFkZENvbW1lbnRUb0Rpc2N1c3Npb24oZGlzY3Vzc2lvbklkLCBPUEVOX0RJU0NVU1NJT05fSU5TVFJVQ1RJT05fVEVYVCk7XG4gIGdpdGh1YkNsaWVudC5yZW9wZW5EaXNjdXNzaW9uKGRpc2N1c3Npb25JZCk7XG59XG5cbm1haW4oKTtcbiJdfQ==