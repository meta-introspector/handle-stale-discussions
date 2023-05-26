"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLabelId = exports.whoAmI = exports.AddCommentToDiscussion = exports.updateDiscussionComment = exports.closeDiscussionAsOutdated = exports.closeDiscussionAsResolved = exports.markDiscussionCommentAsAnswer = exports.addLabelToDiscussion = exports.triggerReactionContentBasedAction = exports.remindAuthorForAction = exports.closeDiscussionsInAbsenceOfReaction = exports.processComments = exports.processDiscussions = exports.getDiscussionMetaData = exports.getTotalDiscussionCount = exports.getAnswerableDiscussionCategoryID = void 0;
const github = require("@actions/github");
const client_1 = require("./client");
const graphql_1 = require("./generated/graphql");
//getting answerable discussion category id
async function getAnswerableDiscussionCategoryID(actor, repoName) {
    const answerableCategoryID = [];
    const result = await (0, client_1.githubClient)().query({
        query: graphql_1.GetAnswerableDiscussionId,
        variables: {
            owner: actor,
            name: repoName
        },
    });
    if (!result.data.repository) {
        throw new Error(`Couldn't find repository id!`);
    }
    //iterate over discussion categories to get the id for answerable one
    result.data.repository.discussionCategories.edges?.forEach(element => {
        if (element?.node?.isAnswerable == true) {
            answerableCategoryID.push(element?.node?.id);
        }
    });
    if (answerableCategoryID.length === 0) {
        throw new Error("There are no Answerable category discussions in this repository");
    }
    return answerableCategoryID;
}
exports.getAnswerableDiscussionCategoryID = getAnswerableDiscussionCategoryID;
async function getTotalDiscussionCount(actor, repoName, categoryID) {
    const resultCountObject = await (0, client_1.githubClient)().query({
        query: graphql_1.GetDiscussionCount,
        variables: {
            owner: actor,
            name: repoName,
            categoryId: categoryID
        },
    });
    if (resultCountObject.error) {
        throw new Error("Error in reading discussions count");
    }
    console.log(`Total discussion count : ${resultCountObject.data.repository?.discussions.totalCount}`);
    return resultCountObject.data.repository?.discussions.totalCount;
}
exports.getTotalDiscussionCount = getTotalDiscussionCount;
//get all unlocked discussions data
async function getDiscussionMetaData(actor, repoName, categoryID, labelId) {
    const discussionsCount = await getTotalDiscussionCount(actor, repoName, categoryID);
    const discussions = await (0, client_1.githubClient)().query({
        query: graphql_1.GetDiscussionData,
        variables: {
            owner: actor,
            name: repoName,
            categoryID: categoryID,
            count: discussionsCount,
        },
    });
    if (discussions.error) {
        throw new Error("Error in retrieving discussions metadata");
    }
    //iterate over each discussion to process body text/comments/reactions
    await processDiscussions(discussions.data.repository?.discussions, labelId);
}
exports.getDiscussionMetaData = getDiscussionMetaData;
async function processDiscussions(discussions, labelId) {
    discussions.edges?.map(async (discussion) => {
        var discussionId = discussion?.node?.id ? discussion?.node?.id : "";
        if (discussionId === "") {
            throw new Error(`Can not proceed, discussionId is null!`);
        }
        else if (!discussion?.node?.locked) {
            console.log(`\n Current discussion id: ${discussionId}`);
            console.log(`Current discussion : ${discussion?.node?.bodyText}`);
            const author = discussion?.node?.author?.login;
            console.log(`Author of this discussions is: ${author}`);
            if (discussion?.node?.answer?.bodyText) {
                console.log(`Posted answer : ${discussion?.node?.answer?.bodyText}, No action needed `);
            }
            else {
                console.log("Checking reactions on latest comment provided on discussion ");
                await processComments(discussion?.node?.comments, author || "", discussionId, labelId);
            }
        }
        else {
            closeDiscussionAsResolved(discussionId);
        }
    });
}
exports.processDiscussions = processDiscussions;
async function processComments(comments, author, discussionId, labelId) {
    comments.edges?.forEach((comment) => {
        if (comment?.node?.bodyText) {
            if (comment.node.id === "") {
                throw new Error("Can not proceed with Null comment Id!");
            }
            //check for the presence of keyword - @bot proposed-answer
            if ((comment?.node?.bodyText.indexOf("@bot proposed-answer") >= 0) && (comment?.node?.reactions.nodes?.length != 0)) {
                //means answer was proposed earlier, check reactions to this comment
                console.log("Propose answer keyword found at : " + comment?.node?.bodyText.indexOf("@bot proposed-answer"));
                //if reaction is - heart/thumbs up/hooray, mark comment as answered else mention osds teammember to take a look
                comment?.node?.reactions.nodes?.forEach((reaction) => {
                    console.log(`Reaction to the latest comment is : ${reaction?.content}`);
                    triggerReactionContentBasedAction(reaction?.content, comment.node?.bodyText, discussionId, comment.node?.id, labelId);
                });
            }
            else if ((comment?.node?.bodyText.indexOf("@bot proposed-answer") >= 0) && (comment?.node?.reactions.nodes?.length == 0)) {
                //if keyword is found but no reaction/comment received by author, remind discussion author to take a look
                const updatedAt = comment?.node?.updatedAt;
                const commentDate = new Date(updatedAt.toString());
                console.log("No reactions found");
                remindAuthorForAction(commentDate, author, discussionId);
            }
            else if ((comment?.node?.bodyText.indexOf("Could you please take a look at the suggested answer. In absence of reply, we would be closing this discussion for staleness soon") >= 0) && (comment?.node?.reactions.nodes?.length == 0)) {
                const updatedAt = comment?.node?.updatedAt;
                const commentDate = new Date(updatedAt.toString());
                console.log("Discussion author has not responded in a while, so closing the discussion");
                closeDiscussionsInAbsenceOfReaction(commentDate, author, discussionId);
            }
            else {
                console.log("No answer proposed, no action needed ");
            }
        }
    });
}
exports.processComments = processComments;
//close discussion in absence of reaction, i.e. close stale discussions
function closeDiscussionsInAbsenceOfReaction(commentDate, author, discussionId) {
    const currentDate = new Date();
    const diffInMs = currentDate.getTime() - commentDate.getTime();
    const diffInHrs = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    console.log(`current date: ${currentDate} and the comment date : ${commentDate}`);
    if ((diffInDays >= 4)) {
        const responseText = "Closing the discussion fot staleness";
        console.log("Responsetext: " + responseText);
        AddCommentToDiscussion(discussionId, responseText);
        closeDiscussionAsOutdated(discussionId);
    }
}
exports.closeDiscussionsInAbsenceOfReaction = closeDiscussionsInAbsenceOfReaction;
//remind author to take action if he has not read the answer proposed by repo maintainer 
function remindAuthorForAction(commentDate, author, discussionId) {
    const currentDate = new Date();
    const diffInMs = currentDate.getTime() - commentDate.getTime();
    const diffInHrs = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    console.log(`current date: ${currentDate} and the comment date : ${commentDate}`);
    console.log(`Answer was proposed ${diffInDays} days and ${diffInHrs} hrs ago.`);
    if ((diffInDays >= 7)) {
        const responseText = "Hey @" + author + ", Could you please take a look at the suggested answer. In absence of reply, we would be closing this discussion for staleness soon.";
        console.log("Responsetext: " + responseText);
        AddCommentToDiscussion(discussionId, responseText);
    }
}
exports.remindAuthorForAction = remindAuthorForAction;
async function triggerReactionContentBasedAction(content, bodyText, discussionId, commentId, labelId) {
    console.log("Printing content reaction :  " + content);
    if (content.length === 0) {
        throw new Error("Null content reaction received, can not proceed");
    }
    if ((content === graphql_1.ReactionContent.ThumbsUp) || (content === graphql_1.ReactionContent.Heart) || (content === graphql_1.ReactionContent.Hooray) || (content === graphql_1.ReactionContent.Laugh) || (content === graphql_1.ReactionContent.Rocket)) {
        console.log("Thumbs Up| Heart received, Marking discussion as answered");
        //remove the keyword from the comment and upate comment
        const updatedText = bodyText.replace("@bot proposed-answer", 'Answer: ');
        console.log("updated text :" + updatedText);
        await updateDiscussionComment(commentId, updatedText);
        await markDiscussionCommentAsAnswer(commentId);
        await closeDiscussionAsResolved(discussionId);
    }
    else if ((content === graphql_1.ReactionContent.ThumbsDown) || (content === graphql_1.ReactionContent.Confused)) {
        console.log("Thumbs down received, adding label-attention to receive further attention from OSDS Team member");
        await addLabelToDiscussion(discussionId, labelId);
    }
}
exports.triggerReactionContentBasedAction = triggerReactionContentBasedAction;
//mutation- adding label "attention" to discussion for further traction by OSDS Team
async function addLabelToDiscussion(discussionId, labelId) {
    if (discussionId === "") {
        throw new Error("Invalid discussion id, can not proceed!");
    }
    console.log("discussion id : " + discussionId + "  labelid : " + labelId);
    const result = await (0, client_1.githubClient)().mutate({
        mutation: graphql_1.AddLabelToDiscussion,
        variables: {
            labelableId: discussionId,
            labelIds: labelId,
        }
    });
    if (result.errors) {
        throw new Error("Error in mutation of adding label to discussion, can not proceed!");
    }
    return result;
}
exports.addLabelToDiscussion = addLabelToDiscussion;
//mutation- marking  comment as answer for discusion
async function markDiscussionCommentAsAnswer(commentId) {
    const result = await (0, client_1.githubClient)().mutate({
        mutation: graphql_1.MarkDiscussionCommentAsAnswer,
        variables: {
            commentId
        }
    });
    if (result.errors) {
        throw new Error("Error in mutation of marking comment as answer, can not proceed");
    }
    return result;
}
exports.markDiscussionCommentAsAnswer = markDiscussionCommentAsAnswer;
//mutation- close discussion as resolved
async function closeDiscussionAsResolved(discussionId) {
    const result = await (0, client_1.githubClient)().mutate({
        mutation: graphql_1.CloseDiscussionAsResolved,
        variables: {
            discussionId
        }
    });
    if (result.errors) {
        throw new Error("Error in retrieving result discussion id");
    }
    return result.data?.closeDiscussion?.discussion?.id;
}
exports.closeDiscussionAsResolved = closeDiscussionAsResolved;
//mutation- close discussion as outdated
async function closeDiscussionAsOutdated(discussionId) {
    const result = await (0, client_1.githubClient)().mutate({
        mutation: graphql_1.CloseDiscussionAsOutdated,
        variables: {
            discussionId
        }
    });
    if (result.errors) {
        throw new Error("Error in closing outdated discussion");
    }
    return result.data?.closeDiscussion?.discussion?.id;
}
exports.closeDiscussionAsOutdated = closeDiscussionAsOutdated;
//mutation- updating comment text after removal of keyword
async function updateDiscussionComment(commentId, body) {
    const result = await (0, client_1.githubClient)().mutate({
        mutation: graphql_1.UpdateDiscussionComment,
        variables: {
            commentId,
            body
        }
    });
    if (result.errors) {
        throw new Error("Error in updating discussion comment");
    }
    return result;
}
exports.updateDiscussionComment = updateDiscussionComment;
async function AddCommentToDiscussion(discussionId, body) {
    if (discussionId === "") {
        throw new Error(`Couldn't create comment as discussionId is null!`);
    }
    console.log("discussioniD :: " + discussionId + " bodyText ::" + body);
    const result = await (0, client_1.githubClient)().mutate({
        mutation: graphql_1.AddDiscussionComment,
        variables: {
            discussionId,
            body,
        },
    });
    if (result.errors) {
        throw new Error("Mutation adding comment to discussion failed with error");
    }
}
exports.AddCommentToDiscussion = AddCommentToDiscussion;
async function whoAmI() {
    const owner = await (0, client_1.githubClient)().query({
        query: graphql_1.WhoAmI,
    });
    return owner.data.viewer.login;
}
exports.whoAmI = whoAmI;
async function getLabelId(owner, repoName, label) {
    const result = await (0, client_1.githubClient)().query({
        query: graphql_1.GetLabelId,
        variables: {
            owner: owner,
            name: repoName,
            labelName: label
        }
    });
    if (!result.data.repository?.label?.id) {
        throw new Error(`Couldn't find mentioned Label!`);
    }
    return result.data.repository?.label?.id;
}
exports.getLabelId = getLabelId;
async function main() {
    const owner = await whoAmI();
    console.log(`Owner of this repo : ${owner}`);
    const actor = github.context.actor;
    console.log(`Actor : ${actor}`);
    const repo = github.context.repo.repo;
    console.log(`Current repository : ${repo}`);
    const discussionCategoryIDList = await getAnswerableDiscussionCategoryID(actor, repo);
    const labelId = await getLabelId(actor, repo, "attention");
    console.log(`Label id for "attention" is  : ${labelId}`);
    // Iterate over all answerable discussion categories in repo
    for (const discussionCategoryID of discussionCategoryIDList) {
        console.log(`Iterating over discussionCategoryID : ${discussionCategoryID}`);
        //Get all unlocked discussions and iterate to check all conditions and take action
        await getDiscussionMetaData(actor, repo, discussionCategoryID, labelId);
    }
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMENBQTBDO0FBQzFDLHFDQUF3QztBQUN4QyxpREFVNkI7QUFFN0IsMkNBQTJDO0FBQ3BDLEtBQUssVUFBVSxpQ0FBaUMsQ0FBQyxLQUFhLEVBQUUsUUFBZ0I7SUFFbkYsTUFBTSxvQkFBb0IsR0FBYSxFQUFFLENBQUM7SUFDMUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLHFCQUFZLEdBQUUsQ0FBQyxLQUFLLENBQTBFO1FBQy9HLEtBQUssRUFBRSxtQ0FBeUI7UUFDaEMsU0FBUyxFQUFFO1lBQ1AsS0FBSyxFQUFFLEtBQUs7WUFDWixJQUFJLEVBQUUsUUFBUTtTQUNqQjtLQUNKLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7S0FDbkQ7SUFFRCxxRUFBcUU7SUFDckUsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNqRSxJQUFJLE9BQU8sRUFBRSxJQUFJLEVBQUUsWUFBWSxJQUFJLElBQUksRUFBRTtZQUNyQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztTQUNoRDtJQUNMLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUNyQztRQUNJLE1BQU0sSUFBSSxLQUFLLENBQUMsaUVBQWlFLENBQUMsQ0FBQztLQUN0RjtJQUVELE9BQU8sb0JBQW9CLENBQUM7QUFDaEMsQ0FBQztBQTVCRCw4RUE0QkM7QUFFTSxLQUFLLFVBQVUsdUJBQXVCLENBQUMsS0FBYSxFQUFFLFFBQWdC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LENBQUMsS0FBSyxDQUFDO0lBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBRWhDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztJQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRTVDLE1BQU0sd0JBQXdCLEdBQWEsTUFBTSxpQ0FBaUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFaEcsTUFBTSxPQUFPLEdBQVcsTUFBTSxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNuRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBRXpELDREQUE0RDtJQUM1RCxLQUFLLE1BQU0sb0JBQW9CLElBQUksd0JBQXdCLEVBQUU7UUFDekQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBRTdFLGtGQUFrRjtRQUNsRixNQUFNLHFCQUFxQixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDM0U7QUFDTCxDQUFDO0FBRUQsSUFBSSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEaXNjdXNzaW9uQ29tbWVudENvbm5lY3Rpb24sIERpc2N1c3Npb25Db25uZWN0aW9uIH0gZnJvbSAnQG9jdG9raXQvZ3JhcGhxbC1zY2hlbWEnO1xuaW1wb3J0ICogYXMgZ2l0aHViIGZyb20gJ0BhY3Rpb25zL2dpdGh1Yic7XG5pbXBvcnQgeyBnaXRodWJDbGllbnQgfSBmcm9tIFwiLi9jbGllbnRcIjtcbmltcG9ydCB7XG4gICAgR2V0QW5zd2VyYWJsZURpc2N1c3Npb25JZFF1ZXJ5LCBHZXRBbnN3ZXJhYmxlRGlzY3Vzc2lvbklkUXVlcnlWYXJpYWJsZXMsIEdldEFuc3dlcmFibGVEaXNjdXNzaW9uSWQsXG4gICAgR2V0RGlzY3Vzc2lvbkRhdGEsIEdldERpc2N1c3Npb25EYXRhUXVlcnksIEdldERpc2N1c3Npb25EYXRhUXVlcnlWYXJpYWJsZXMsXG4gICAgR2V0RGlzY3Vzc2lvbkNvdW50UXVlcnksIEdldERpc2N1c3Npb25Db3VudFF1ZXJ5VmFyaWFibGVzLCBHZXREaXNjdXNzaW9uQ291bnQsXG4gICAgUmVhY3Rpb25Db250ZW50LFxuICAgIE1hcmtEaXNjdXNzaW9uQ29tbWVudEFzQW5zd2VyTXV0YXRpb24sIE1hcmtEaXNjdXNzaW9uQ29tbWVudEFzQW5zd2VyLFxuICAgIEFkZERpc2N1c3Npb25Db21tZW50TXV0YXRpb24sIFVwZGF0ZURpc2N1c3Npb25Db21tZW50LCBVcGRhdGVEaXNjdXNzaW9uQ29tbWVudE11dGF0aW9uLCBcbiAgICBBZGREaXNjdXNzaW9uQ29tbWVudCwgV2hvQW1JLCBXaG9BbUlRdWVyeSwgXG4gICAgQ2xvc2VEaXNjdXNzaW9uQXNSZXNvbHZlZE11dGF0aW9uLCBDbG9zZURpc2N1c3Npb25Bc1Jlc29sdmVkLCBcbiAgICBDbG9zZURpc2N1c3Npb25Bc091dGRhdGVkTXV0YXRpb24sIENsb3NlRGlzY3Vzc2lvbkFzT3V0ZGF0ZWQsIEFkZExhYmVsVG9EaXNjdXNzaW9uTXV0YXRpb24sIEFkZExhYmVsVG9EaXNjdXNzaW9uLCBHZXRMYWJlbElkUXVlcnksIEdldExhYmVsSWQsIEFkZExhYmVsVG9EaXNjdXNzaW9uTXV0YXRpb25WYXJpYWJsZXNcbn0gZnJvbSBcIi4vZ2VuZXJhdGVkL2dyYXBocWxcIjtcblxuLy9nZXR0aW5nIGFuc3dlcmFibGUgZGlzY3Vzc2lvbiBjYXRlZ29yeSBpZFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFuc3dlcmFibGVEaXNjdXNzaW9uQ2F0ZWdvcnlJRChhY3Rvcjogc3RyaW5nLCByZXBvTmFtZTogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICBcbiAgICBjb25zdCBhbnN3ZXJhYmxlQ2F0ZWdvcnlJRDogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnaXRodWJDbGllbnQoKS5xdWVyeTxHZXRBbnN3ZXJhYmxlRGlzY3Vzc2lvbklkUXVlcnksIEdldEFuc3dlcmFibGVEaXNjdXNzaW9uSWRRdWVyeVZhcmlhYmxlcz4oe1xuICAgICAgICBxdWVyeTogR2V0QW5zd2VyYWJsZURpc2N1c3Npb25JZCxcbiAgICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgICAgICBvd25lcjogYWN0b3IsXG4gICAgICAgICAgICBuYW1lOiByZXBvTmFtZVxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKCFyZXN1bHQuZGF0YS5yZXBvc2l0b3J5KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGRuJ3QgZmluZCByZXBvc2l0b3J5IGlkIWApO1xuICAgIH1cblxuICAgIC8vaXRlcmF0ZSBvdmVyIGRpc2N1c3Npb24gY2F0ZWdvcmllcyB0byBnZXQgdGhlIGlkIGZvciBhbnN3ZXJhYmxlIG9uZVxuICAgIHJlc3VsdC5kYXRhLnJlcG9zaXRvcnkuZGlzY3Vzc2lvbkNhdGVnb3JpZXMuZWRnZXM/LmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGlmIChlbGVtZW50Py5ub2RlPy5pc0Fuc3dlcmFibGUgPT0gdHJ1ZSkge1xuICAgICAgICAgICAgYW5zd2VyYWJsZUNhdGVnb3J5SUQucHVzaChlbGVtZW50Py5ub2RlPy5pZCk7XG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgaWYgKGFuc3dlcmFibGVDYXRlZ29yeUlELmxlbmd0aCA9PT0gMClcbiAgICB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZXJlIGFyZSBubyBBbnN3ZXJhYmxlIGNhdGVnb3J5IGRpc2N1c3Npb25zIGluIHRoaXMgcmVwb3NpdG9yeVwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYW5zd2VyYWJsZUNhdGVnb3J5SUQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRUb3RhbERpc2N1c3Npb25Db3VudChhY3Rvcjogc3RyaW5nLCByZXBvTmFtZTogc3RyaW5nLCBjYXRlZ29yeUlEOiBzdHJpbmcpIHtcbiAgICBjb25zdCByZXN1bHRDb3VudE9iamVjdCA9IGF3YWl0IGdpdGh1YkNsaWVudCgpLnF1ZXJ5PEdldERpc2N1c3Npb25Db3VudFF1ZXJ5LCBHZXREaXNjdXNzaW9uQ291bnRRdWVyeVZhcmlhYmxlcz4oe1xuICAgICAgICBxdWVyeTogR2V0RGlzY3Vzc2lvbkNvdW50LFxuICAgICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgICAgIG93bmVyOiBhY3RvcixcbiAgICAgICAgICAgIG5hbWU6IHJlcG9OYW1lLFxuICAgICAgICAgICAgY2F0ZWdvcnlJZDogY2F0ZWdvcnlJRFxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3VsdENvdW50T2JqZWN0LmVycm9yKVxuICAgIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXJyb3IgaW4gcmVhZGluZyBkaXNjdXNzaW9ucyBjb3VudFwiKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgVG90YWwgZGlzY3Vzc2lvbiBjb3VudCA6ICR7cmVzdWx0Q291bnRPYmplY3QuZGF0YS5yZXBvc2l0b3J5Py5kaXNjdXNzaW9ucy50b3RhbENvdW50fWApO1xuICAgIHJldHVybiByZXN1bHRDb3VudE9iamVjdC5kYXRhLnJlcG9zaXRvcnk/LmRpc2N1c3Npb25zLnRvdGFsQ291bnQ7XG59XG5cbi8vZ2V0IGFsbCB1bmxvY2tlZCBkaXNjdXNzaW9ucyBkYXRhXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RGlzY3Vzc2lvbk1ldGFEYXRhKGFjdG9yOiBzdHJpbmcsIHJlcG9OYW1lOiBzdHJpbmcsIGNhdGVnb3J5SUQ6IHN0cmluZyxsYWJlbElkOiBzdHJpbmcpIHtcbiAgICBjb25zdCBkaXNjdXNzaW9uc0NvdW50ID0gYXdhaXQgZ2V0VG90YWxEaXNjdXNzaW9uQ291bnQoYWN0b3IsIHJlcG9OYW1lLCBjYXRlZ29yeUlEKTtcblxuICAgIGNvbnN0IGRpc2N1c3Npb25zID0gYXdhaXQgZ2l0aHViQ2xpZW50KCkucXVlcnk8R2V0RGlzY3Vzc2lvbkRhdGFRdWVyeSwgR2V0RGlzY3Vzc2lvbkRhdGFRdWVyeVZhcmlhYmxlcz4oe1xuICAgICAgICBxdWVyeTogR2V0RGlzY3Vzc2lvbkRhdGEsXG4gICAgICAgIHZhcmlhYmxlczoge1xuICAgICAgICAgICAgb3duZXI6IGFjdG9yLFxuICAgICAgICAgICAgbmFtZTogcmVwb05hbWUsXG4gICAgICAgICAgICBjYXRlZ29yeUlEOiBjYXRlZ29yeUlELFxuICAgICAgICAgICAgY291bnQ6IGRpc2N1c3Npb25zQ291bnQsXG4gICAgICAgIH0sXG4gICAgfSlcblxuICAgIGlmIChkaXNjdXNzaW9ucy5lcnJvcikge3Rocm93IG5ldyBFcnJvcihcIkVycm9yIGluIHJldHJpZXZpbmcgZGlzY3Vzc2lvbnMgbWV0YWRhdGFcIik7fVxuXG4gICAgLy9pdGVyYXRlIG92ZXIgZWFjaCBkaXNjdXNzaW9uIHRvIHByb2Nlc3MgYm9keSB0ZXh0L2NvbW1lbnRzL3JlYWN0aW9uc1xuICAgIGF3YWl0IHByb2Nlc3NEaXNjdXNzaW9ucyhkaXNjdXNzaW9ucy5kYXRhLnJlcG9zaXRvcnk/LmRpc2N1c3Npb25zIGFzIERpc2N1c3Npb25Db25uZWN0aW9uLCBsYWJlbElkKTtcbiAgIFxufVxuXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9jZXNzRGlzY3Vzc2lvbnMoZGlzY3Vzc2lvbnM6IERpc2N1c3Npb25Db25uZWN0aW9uLGxhYmVsSWQ6IHN0cmluZykge1xuICAgIGRpc2N1c3Npb25zLmVkZ2VzPy5tYXAoYXN5bmMgZGlzY3Vzc2lvbiA9PiB7XG4gICAgICAgIHZhciBkaXNjdXNzaW9uSWQgPSBkaXNjdXNzaW9uPy5ub2RlPy5pZCA/IGRpc2N1c3Npb24/Lm5vZGU/LmlkIDogXCJcIjtcblxuICAgICAgICBpZiAoZGlzY3Vzc2lvbklkID09PSBcIlwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgcHJvY2VlZCwgZGlzY3Vzc2lvbklkIGlzIG51bGwhYCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIWRpc2N1c3Npb24/Lm5vZGU/LmxvY2tlZCkge1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgXFxuIEN1cnJlbnQgZGlzY3Vzc2lvbiBpZDogJHtkaXNjdXNzaW9uSWR9YCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgQ3VycmVudCBkaXNjdXNzaW9uIDogJHtkaXNjdXNzaW9uPy5ub2RlPy5ib2R5VGV4dH1gKTtcblxuICAgICAgICAgICAgY29uc3QgYXV0aG9yID0gZGlzY3Vzc2lvbj8ubm9kZT8uYXV0aG9yPy5sb2dpbjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBBdXRob3Igb2YgdGhpcyBkaXNjdXNzaW9ucyBpczogJHthdXRob3J9YCk7XG5cbiAgICAgICAgICAgIGlmIChkaXNjdXNzaW9uPy5ub2RlPy5hbnN3ZXI/LmJvZHlUZXh0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFBvc3RlZCBhbnN3ZXIgOiAke2Rpc2N1c3Npb24/Lm5vZGU/LmFuc3dlcj8uYm9keVRleHR9LCBObyBhY3Rpb24gbmVlZGVkIGApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDaGVja2luZyByZWFjdGlvbnMgb24gbGF0ZXN0IGNvbW1lbnQgcHJvdmlkZWQgb24gZGlzY3Vzc2lvbiBcIik7XG4gICAgICAgICAgICAgICAgYXdhaXQgcHJvY2Vzc0NvbW1lbnRzKGRpc2N1c3Npb24/Lm5vZGU/LmNvbW1lbnRzIGFzIERpc2N1c3Npb25Db21tZW50Q29ubmVjdGlvbiwgYXV0aG9yIHx8IFwiXCIsIGRpc2N1c3Npb25JZCwgbGFiZWxJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgeyBcbiAgICAgICAgICAgICAgICBjbG9zZURpc2N1c3Npb25Bc1Jlc29sdmVkKGRpc2N1c3Npb25JZCk7XG4gICAgICAgICAgICB9XG4gICAgfSlcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NDb21tZW50cyhjb21tZW50czogRGlzY3Vzc2lvbkNvbW1lbnRDb25uZWN0aW9uLCBhdXRob3I6IHN0cmluZywgZGlzY3Vzc2lvbklkOiBzdHJpbmcsIGxhYmVsSWQ6IHN0cmluZykge1xuICAgIGNvbW1lbnRzLmVkZ2VzPy5mb3JFYWNoKChjb21tZW50KSA9PiB7XG4gICAgICAgIGlmIChjb21tZW50Py5ub2RlPy5ib2R5VGV4dCkge1xuICAgICAgICAgICAgaWYgKGNvbW1lbnQubm9kZS5pZCA9PT0gXCJcIilcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gbm90IHByb2NlZWQgd2l0aCBOdWxsIGNvbW1lbnQgSWQhXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2NoZWNrIGZvciB0aGUgcHJlc2VuY2Ugb2Yga2V5d29yZCAtIEBib3QgcHJvcG9zZWQtYW5zd2VyXG4gICAgICAgICAgICBpZiAoKGNvbW1lbnQ/Lm5vZGU/LmJvZHlUZXh0LmluZGV4T2YoXCJAYm90IHByb3Bvc2VkLWFuc3dlclwiKSA+PSAwKSAmJiAoY29tbWVudD8ubm9kZT8ucmVhY3Rpb25zLm5vZGVzPy5sZW5ndGggIT0gMCkpIHtcbiAgICAgICAgICAgICAgICAvL21lYW5zIGFuc3dlciB3YXMgcHJvcG9zZWQgZWFybGllciwgY2hlY2sgcmVhY3Rpb25zIHRvIHRoaXMgY29tbWVudFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHJvcG9zZSBhbnN3ZXIga2V5d29yZCBmb3VuZCBhdCA6IFwiICsgY29tbWVudD8ubm9kZT8uYm9keVRleHQuaW5kZXhPZihcIkBib3QgcHJvcG9zZWQtYW5zd2VyXCIpKTtcblxuICAgICAgICAgICAgICAgIC8vaWYgcmVhY3Rpb24gaXMgLSBoZWFydC90aHVtYnMgdXAvaG9vcmF5LCBtYXJrIGNvbW1lbnQgYXMgYW5zd2VyZWQgZWxzZSBtZW50aW9uIG9zZHMgdGVhbW1lbWJlciB0byB0YWtlIGEgbG9va1xuICAgICAgICAgICAgICAgIGNvbW1lbnQ/Lm5vZGU/LnJlYWN0aW9ucy5ub2Rlcz8uZm9yRWFjaCgocmVhY3Rpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlYWN0aW9uIHRvIHRoZSBsYXRlc3QgY29tbWVudCBpcyA6ICR7cmVhY3Rpb24/LmNvbnRlbnR9YCk7XG4gICAgICAgICAgICAgICAgICAgIHRyaWdnZXJSZWFjdGlvbkNvbnRlbnRCYXNlZEFjdGlvbihyZWFjdGlvbj8uY29udGVudCEgYXMgUmVhY3Rpb25Db250ZW50LCBjb21tZW50Lm5vZGU/LmJvZHlUZXh0ISwgZGlzY3Vzc2lvbklkLCBjb21tZW50Lm5vZGU/LmlkISxsYWJlbElkKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbHNlIGlmICgoY29tbWVudD8ubm9kZT8uYm9keVRleHQuaW5kZXhPZihcIkBib3QgcHJvcG9zZWQtYW5zd2VyXCIpID49IDApICYmIChjb21tZW50Py5ub2RlPy5yZWFjdGlvbnMubm9kZXM/Lmxlbmd0aCA9PSAwKSkge1xuICAgICAgICAgICAgICAgIC8vaWYga2V5d29yZCBpcyBmb3VuZCBidXQgbm8gcmVhY3Rpb24vY29tbWVudCByZWNlaXZlZCBieSBhdXRob3IsIHJlbWluZCBkaXNjdXNzaW9uIGF1dGhvciB0byB0YWtlIGEgbG9va1xuICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRBdCA9IGNvbW1lbnQ/Lm5vZGU/LnVwZGF0ZWRBdDtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21tZW50RGF0ZSA9IG5ldyBEYXRlKHVwZGF0ZWRBdC50b1N0cmluZygpKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTm8gcmVhY3Rpb25zIGZvdW5kXCIpO1xuICAgICAgICAgICAgICAgIHJlbWluZEF1dGhvckZvckFjdGlvbihjb21tZW50RGF0ZSwgYXV0aG9yISwgZGlzY3Vzc2lvbklkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKChjb21tZW50Py5ub2RlPy5ib2R5VGV4dC5pbmRleE9mKFwiQ291bGQgeW91IHBsZWFzZSB0YWtlIGEgbG9vayBhdCB0aGUgc3VnZ2VzdGVkIGFuc3dlci4gSW4gYWJzZW5jZSBvZiByZXBseSwgd2Ugd291bGQgYmUgY2xvc2luZyB0aGlzIGRpc2N1c3Npb24gZm9yIHN0YWxlbmVzcyBzb29uXCIpID49IDApICYmIChjb21tZW50Py5ub2RlPy5yZWFjdGlvbnMubm9kZXM/Lmxlbmd0aCA9PSAwKSkgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXBkYXRlZEF0ID0gY29tbWVudD8ubm9kZT8udXBkYXRlZEF0O1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbW1lbnREYXRlID0gbmV3IERhdGUodXBkYXRlZEF0LnRvU3RyaW5nKCkpO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJEaXNjdXNzaW9uIGF1dGhvciBoYXMgbm90IHJlc3BvbmRlZCBpbiBhIHdoaWxlLCBzbyBjbG9zaW5nIHRoZSBkaXNjdXNzaW9uXCIpO1xuICAgICAgICAgICAgICAgIGNsb3NlRGlzY3Vzc2lvbnNJbkFic2VuY2VPZlJlYWN0aW9uKGNvbW1lbnREYXRlLCBhdXRob3IhLCBkaXNjdXNzaW9uSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJObyBhbnN3ZXIgcHJvcG9zZWQsIG5vIGFjdGlvbiBuZWVkZWQgXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSlcbn1cblxuLy9jbG9zZSBkaXNjdXNzaW9uIGluIGFic2VuY2Ugb2YgcmVhY3Rpb24sIGkuZS4gY2xvc2Ugc3RhbGUgZGlzY3Vzc2lvbnNcbmV4cG9ydCBmdW5jdGlvbiBjbG9zZURpc2N1c3Npb25zSW5BYnNlbmNlT2ZSZWFjdGlvbihjb21tZW50RGF0ZTogRGF0ZSwgYXV0aG9yOiBzdHJpbmcsIGRpc2N1c3Npb25JZDogc3RyaW5nKXtcbiAgICBjb25zdCBjdXJyZW50RGF0ZTogRGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgZGlmZkluTXM6IG51bWJlciA9IGN1cnJlbnREYXRlLmdldFRpbWUoKSAtIGNvbW1lbnREYXRlLmdldFRpbWUoKTtcbiAgICBjb25zdCBkaWZmSW5IcnM6IG51bWJlciA9IE1hdGguZmxvb3IoZGlmZkluTXMgLyAoMTAwMCAqIDYwICogNjApKTtcbiAgICBjb25zdCBkaWZmSW5EYXlzOiBudW1iZXIgPSBNYXRoLmZsb29yKGRpZmZJbk1zIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpKTtcblxuICAgIGNvbnNvbGUubG9nKGBjdXJyZW50IGRhdGU6ICR7Y3VycmVudERhdGV9IGFuZCB0aGUgY29tbWVudCBkYXRlIDogJHtjb21tZW50RGF0ZX1gKTtcbiAgICBpZiAoKGRpZmZJbkRheXMgPj0gNCkpIHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2VUZXh0ID0gXCJDbG9zaW5nIHRoZSBkaXNjdXNzaW9uIGZvdCBzdGFsZW5lc3NcIjtcbiAgICAgICAgY29uc29sZS5sb2coXCJSZXNwb25zZXRleHQ6IFwiICsgcmVzcG9uc2VUZXh0KTtcbiAgICAgICAgQWRkQ29tbWVudFRvRGlzY3Vzc2lvbihkaXNjdXNzaW9uSWQsIHJlc3BvbnNlVGV4dCk7XG4gICAgICAgIGNsb3NlRGlzY3Vzc2lvbkFzT3V0ZGF0ZWQoZGlzY3Vzc2lvbklkKTtcbiAgICB9XG59XG5cbi8vcmVtaW5kIGF1dGhvciB0byB0YWtlIGFjdGlvbiBpZiBoZSBoYXMgbm90IHJlYWQgdGhlIGFuc3dlciBwcm9wb3NlZCBieSByZXBvIG1haW50YWluZXIgXG5leHBvcnQgZnVuY3Rpb24gcmVtaW5kQXV0aG9yRm9yQWN0aW9uKGNvbW1lbnREYXRlOiBEYXRlLCBhdXRob3I6IHN0cmluZywgZGlzY3Vzc2lvbklkOiBzdHJpbmcpIHtcbiAgICBjb25zdCBjdXJyZW50RGF0ZTogRGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3QgZGlmZkluTXM6IG51bWJlciA9IGN1cnJlbnREYXRlLmdldFRpbWUoKSAtIGNvbW1lbnREYXRlLmdldFRpbWUoKTtcbiAgICBjb25zdCBkaWZmSW5IcnM6IG51bWJlciA9IE1hdGguZmxvb3IoZGlmZkluTXMgLyAoMTAwMCAqIDYwICogNjApKTtcbiAgICBjb25zdCBkaWZmSW5EYXlzOiBudW1iZXIgPSBNYXRoLmZsb29yKGRpZmZJbk1zIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpKTtcblxuICAgIGNvbnNvbGUubG9nKGBjdXJyZW50IGRhdGU6ICR7Y3VycmVudERhdGV9IGFuZCB0aGUgY29tbWVudCBkYXRlIDogJHtjb21tZW50RGF0ZX1gKTtcbiAgICBjb25zb2xlLmxvZyhgQW5zd2VyIHdhcyBwcm9wb3NlZCAke2RpZmZJbkRheXN9IGRheXMgYW5kICR7ZGlmZkluSHJzfSBocnMgYWdvLmApO1xuXG4gICAgaWYgKChkaWZmSW5EYXlzID49IDcpKSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlVGV4dCA9IFwiSGV5IEBcIiArIGF1dGhvciArIFwiLCBDb3VsZCB5b3UgcGxlYXNlIHRha2UgYSBsb29rIGF0IHRoZSBzdWdnZXN0ZWQgYW5zd2VyLiBJbiBhYnNlbmNlIG9mIHJlcGx5LCB3ZSB3b3VsZCBiZSBjbG9zaW5nIHRoaXMgZGlzY3Vzc2lvbiBmb3Igc3RhbGVuZXNzIHNvb24uXCI7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiUmVzcG9uc2V0ZXh0OiBcIiArIHJlc3BvbnNlVGV4dCk7XG4gICAgICAgIEFkZENvbW1lbnRUb0Rpc2N1c3Npb24oZGlzY3Vzc2lvbklkLCByZXNwb25zZVRleHQpO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyaWdnZXJSZWFjdGlvbkNvbnRlbnRCYXNlZEFjdGlvbihjb250ZW50OiBSZWFjdGlvbkNvbnRlbnQsIGJvZHlUZXh0OiBzdHJpbmcsIGRpc2N1c3Npb25JZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZyxsYWJlbElkOiBzdHJpbmcpIHtcbiAgICBjb25zb2xlLmxvZyhcIlByaW50aW5nIGNvbnRlbnQgcmVhY3Rpb24gOiAgXCIgKyBjb250ZW50KTtcblxuICAgIGlmIChjb250ZW50Lmxlbmd0aCA9PT0gMClcbiAgICB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk51bGwgY29udGVudCByZWFjdGlvbiByZWNlaXZlZCwgY2FuIG5vdCBwcm9jZWVkXCIpO1xuICAgIH1cblxuICAgIGlmICgoY29udGVudCA9PT0gUmVhY3Rpb25Db250ZW50LlRodW1ic1VwKSB8fCAoY29udGVudCA9PT0gUmVhY3Rpb25Db250ZW50LkhlYXJ0KSB8fCAoY29udGVudCA9PT0gUmVhY3Rpb25Db250ZW50Lkhvb3JheSkgfHwgKGNvbnRlbnQgPT09IFJlYWN0aW9uQ29udGVudC5MYXVnaCkgfHwgKGNvbnRlbnQgPT09IFJlYWN0aW9uQ29udGVudC5Sb2NrZXQpKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiVGh1bWJzIFVwfCBIZWFydCByZWNlaXZlZCwgTWFya2luZyBkaXNjdXNzaW9uIGFzIGFuc3dlcmVkXCIpO1xuXG4gICAgICAgIC8vcmVtb3ZlIHRoZSBrZXl3b3JkIGZyb20gdGhlIGNvbW1lbnQgYW5kIHVwYXRlIGNvbW1lbnRcbiAgICAgICAgY29uc3QgdXBkYXRlZFRleHQgPSBib2R5VGV4dC5yZXBsYWNlKFwiQGJvdCBwcm9wb3NlZC1hbnN3ZXJcIiwgJ0Fuc3dlcjogJyk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlZCB0ZXh0IDpcIiArIHVwZGF0ZWRUZXh0KTtcbiAgICAgICAgYXdhaXQgdXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnQoY29tbWVudElkLCB1cGRhdGVkVGV4dCEpO1xuICAgICAgICBhd2FpdCAgbWFya0Rpc2N1c3Npb25Db21tZW50QXNBbnN3ZXIoY29tbWVudElkKTtcbiAgICAgICAgYXdhaXQgY2xvc2VEaXNjdXNzaW9uQXNSZXNvbHZlZChkaXNjdXNzaW9uSWQpO1xuICAgIH1cbiAgICBlbHNlIGlmICgoY29udGVudCA9PT0gUmVhY3Rpb25Db250ZW50LlRodW1ic0Rvd24pIHx8IChjb250ZW50ID09PSBSZWFjdGlvbkNvbnRlbnQuQ29uZnVzZWQpKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiVGh1bWJzIGRvd24gcmVjZWl2ZWQsIGFkZGluZyBsYWJlbC1hdHRlbnRpb24gdG8gcmVjZWl2ZSBmdXJ0aGVyIGF0dGVudGlvbiBmcm9tIE9TRFMgVGVhbSBtZW1iZXJcIik7XG4gICAgICAgIGF3YWl0IGFkZExhYmVsVG9EaXNjdXNzaW9uKGRpc2N1c3Npb25JZCxsYWJlbElkKTtcblxuICAgIH1cbn1cblxuLy9tdXRhdGlvbi0gYWRkaW5nIGxhYmVsIFwiYXR0ZW50aW9uXCIgdG8gZGlzY3Vzc2lvbiBmb3IgZnVydGhlciB0cmFjdGlvbiBieSBPU0RTIFRlYW1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRMYWJlbFRvRGlzY3Vzc2lvbihkaXNjdXNzaW9uSWQ6IHN0cmluZywgbGFiZWxJZDogc3RyaW5nKSB7XG4gICAgXG4gICAgaWYgKGRpc2N1c3Npb25JZCA9PT0gXCJcIilcbiAgICB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgZGlzY3Vzc2lvbiBpZCwgY2FuIG5vdCBwcm9jZWVkIVwiKTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhcImRpc2N1c3Npb24gaWQgOiBcIisgZGlzY3Vzc2lvbklkKyBcIiAgbGFiZWxpZCA6IFwiKyBsYWJlbElkKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdpdGh1YkNsaWVudCgpLm11dGF0ZTxBZGRMYWJlbFRvRGlzY3Vzc2lvbk11dGF0aW9uPih7XG4gICAgICAgIG11dGF0aW9uOiBBZGRMYWJlbFRvRGlzY3Vzc2lvbixcbiAgICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgICAgICBsYWJlbGFibGVJZCA6IGRpc2N1c3Npb25JZCxcbiAgICAgICAgICAgIGxhYmVsSWRzOiBsYWJlbElkLFxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAocmVzdWx0LmVycm9ycyl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIGluIG11dGF0aW9uIG9mIGFkZGluZyBsYWJlbCB0byBkaXNjdXNzaW9uLCBjYW4gbm90IHByb2NlZWQhXCIpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vbXV0YXRpb24tIG1hcmtpbmcgIGNvbW1lbnQgYXMgYW5zd2VyIGZvciBkaXNjdXNpb25cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcihjb21tZW50SWQ6IHN0cmluZykge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdpdGh1YkNsaWVudCgpLm11dGF0ZTxNYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlck11dGF0aW9uPih7XG4gICAgICAgIG11dGF0aW9uOiBNYXJrRGlzY3Vzc2lvbkNvbW1lbnRBc0Fuc3dlcixcbiAgICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgICAgICBjb21tZW50SWRcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3VsdC5lcnJvcnMpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBpbiBtdXRhdGlvbiBvZiBtYXJraW5nIGNvbW1lbnQgYXMgYW5zd2VyLCBjYW4gbm90IHByb2NlZWRcIik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vbXV0YXRpb24tIGNsb3NlIGRpc2N1c3Npb24gYXMgcmVzb2x2ZWRcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbG9zZURpc2N1c3Npb25Bc1Jlc29sdmVkKGRpc2N1c3Npb25JZDogc3RyaW5nKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2l0aHViQ2xpZW50KCkubXV0YXRlPENsb3NlRGlzY3Vzc2lvbkFzUmVzb2x2ZWRNdXRhdGlvbj4oe1xuICAgICAgICBtdXRhdGlvbjogQ2xvc2VEaXNjdXNzaW9uQXNSZXNvbHZlZCxcbiAgICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgICAgICBkaXNjdXNzaW9uSWRcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3VsdC5lcnJvcnMpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFcnJvciBpbiByZXRyaWV2aW5nIHJlc3VsdCBkaXNjdXNzaW9uIGlkXCIpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0LmRhdGE/LmNsb3NlRGlzY3Vzc2lvbj8uZGlzY3Vzc2lvbj8uaWQ7XG59XG5cbi8vbXV0YXRpb24tIGNsb3NlIGRpc2N1c3Npb24gYXMgb3V0ZGF0ZWRcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbG9zZURpc2N1c3Npb25Bc091dGRhdGVkKGRpc2N1c3Npb25JZDogc3RyaW5nKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2l0aHViQ2xpZW50KCkubXV0YXRlPENsb3NlRGlzY3Vzc2lvbkFzT3V0ZGF0ZWRNdXRhdGlvbj4oe1xuICAgICAgICBtdXRhdGlvbjogQ2xvc2VEaXNjdXNzaW9uQXNPdXRkYXRlZCxcbiAgICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgICAgICBkaXNjdXNzaW9uSWRcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYocmVzdWx0LmVycm9ycyl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIGluIGNsb3Npbmcgb3V0ZGF0ZWQgZGlzY3Vzc2lvblwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdC5kYXRhPy5jbG9zZURpc2N1c3Npb24/LmRpc2N1c3Npb24/LmlkO1xufVxuXG4vL211dGF0aW9uLSB1cGRhdGluZyBjb21tZW50IHRleHQgYWZ0ZXIgcmVtb3ZhbCBvZiBrZXl3b3JkXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnQoY29tbWVudElkOiBzdHJpbmcsIGJvZHk6IHN0cmluZykgIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnaXRodWJDbGllbnQoKS5tdXRhdGU8VXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnRNdXRhdGlvbj4oe1xuICAgICAgICBtdXRhdGlvbjogVXBkYXRlRGlzY3Vzc2lvbkNvbW1lbnQsXG4gICAgICAgIHZhcmlhYmxlczoge1xuICAgICAgICAgICAgY29tbWVudElkLFxuICAgICAgICAgICAgYm9keVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAocmVzdWx0LmVycm9ycyl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIGluIHVwZGF0aW5nIGRpc2N1c3Npb24gY29tbWVudFwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gQWRkQ29tbWVudFRvRGlzY3Vzc2lvbihkaXNjdXNzaW9uSWQ6IHN0cmluZywgYm9keTogc3RyaW5nKSB7XG4gICAgaWYgKGRpc2N1c3Npb25JZCA9PT0gXCJcIikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkbid0IGNyZWF0ZSBjb21tZW50IGFzIGRpc2N1c3Npb25JZCBpcyBudWxsIWApO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKFwiZGlzY3Vzc2lvbmlEIDo6IFwiICsgZGlzY3Vzc2lvbklkICsgXCIgYm9keVRleHQgOjpcIiArIGJvZHkpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdpdGh1YkNsaWVudCgpLm11dGF0ZTxBZGREaXNjdXNzaW9uQ29tbWVudE11dGF0aW9uPih7XG4gICAgICAgIG11dGF0aW9uOiBBZGREaXNjdXNzaW9uQ29tbWVudCxcbiAgICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgICAgICBkaXNjdXNzaW9uSWQsXG4gICAgICAgICAgICBib2R5LFxuICAgICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3VsdC5lcnJvcnMpXG4gICAge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXRhdGlvbiBhZGRpbmcgY29tbWVudCB0byBkaXNjdXNzaW9uIGZhaWxlZCB3aXRoIGVycm9yXCIpO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdob0FtSSgpIHtcbiAgICBjb25zdCBvd25lciA9IGF3YWl0IGdpdGh1YkNsaWVudCgpLnF1ZXJ5PFdob0FtSVF1ZXJ5Pih7XG4gICAgICAgIHF1ZXJ5OiBXaG9BbUksXG4gICAgICAgIH0sXG4gICAgKTtcblxuICAgIHJldHVybiBvd25lci5kYXRhLnZpZXdlci5sb2dpbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldExhYmVsSWQob3duZXI6IHN0cmluZywgcmVwb05hbWU6IHN0cmluZywgbGFiZWw6IHN0cmluZykge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdpdGh1YkNsaWVudCgpLnF1ZXJ5PEdldExhYmVsSWRRdWVyeT4oe1xuICAgICAgICBxdWVyeTogR2V0TGFiZWxJZCxcbiAgICAgICAgdmFyaWFibGVzOiB7XG4gICAgICAgICAgICBvd25lcjogb3duZXIsXG4gICAgICAgICAgICBuYW1lOiByZXBvTmFtZSxcbiAgICAgICAgICAgIGxhYmVsTmFtZSA6bGFiZWxcbiAgICAgICAgfVxuICAgICAgICB9LFxuICAgICk7XG4gICAgXG4gICAgaWYgKCFyZXN1bHQuZGF0YS5yZXBvc2l0b3J5Py5sYWJlbD8uaWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZG4ndCBmaW5kIG1lbnRpb25lZCBMYWJlbCFgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0LmRhdGEucmVwb3NpdG9yeT8ubGFiZWw/LmlkO1xufVxuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXG4gICAgY29uc3Qgb3duZXI6IHN0cmluZyA9IGF3YWl0IHdob0FtSSgpO1xuICAgIGNvbnNvbGUubG9nKGBPd25lciBvZiB0aGlzIHJlcG8gOiAke293bmVyfWApO1xuXG4gICAgY29uc3QgYWN0b3IgPSBnaXRodWIuY29udGV4dC5hY3RvcjtcbiAgICBjb25zb2xlLmxvZyhgQWN0b3IgOiAke2FjdG9yfWApO1xuXG4gICAgY29uc3QgcmVwbyA9IGdpdGh1Yi5jb250ZXh0LnJlcG8ucmVwbztcbiAgICBjb25zb2xlLmxvZyhgQ3VycmVudCByZXBvc2l0b3J5IDogJHtyZXBvfWApO1xuXG4gICAgY29uc3QgZGlzY3Vzc2lvbkNhdGVnb3J5SURMaXN0OiBzdHJpbmdbXSA9IGF3YWl0IGdldEFuc3dlcmFibGVEaXNjdXNzaW9uQ2F0ZWdvcnlJRChhY3RvciwgcmVwbyk7XG5cbiAgICBjb25zdCBsYWJlbElkOiBzdHJpbmcgPSBhd2FpdCBnZXRMYWJlbElkKGFjdG9yLCByZXBvLCBcImF0dGVudGlvblwiKTtcbiAgICBjb25zb2xlLmxvZyhgTGFiZWwgaWQgZm9yIFwiYXR0ZW50aW9uXCIgaXMgIDogJHtsYWJlbElkfWApO1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIGFsbCBhbnN3ZXJhYmxlIGRpc2N1c3Npb24gY2F0ZWdvcmllcyBpbiByZXBvXG4gICAgZm9yIChjb25zdCBkaXNjdXNzaW9uQ2F0ZWdvcnlJRCBvZiBkaXNjdXNzaW9uQ2F0ZWdvcnlJRExpc3QpIHtcbiAgICAgICAgY29uc29sZS5sb2coYEl0ZXJhdGluZyBvdmVyIGRpc2N1c3Npb25DYXRlZ29yeUlEIDogJHtkaXNjdXNzaW9uQ2F0ZWdvcnlJRH1gKTtcblxuICAgICAgICAvL0dldCBhbGwgdW5sb2NrZWQgZGlzY3Vzc2lvbnMgYW5kIGl0ZXJhdGUgdG8gY2hlY2sgYWxsIGNvbmRpdGlvbnMgYW5kIHRha2UgYWN0aW9uXG4gICAgICAgIGF3YWl0IGdldERpc2N1c3Npb25NZXRhRGF0YShhY3RvciwgcmVwbywgZGlzY3Vzc2lvbkNhdGVnb3J5SUQsIGxhYmVsSWQpO1xuICAgIH1cbn1cblxubWFpbigpOyJdfQ==