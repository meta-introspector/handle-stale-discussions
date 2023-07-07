"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggeredByNewComment = exports.hasNonBotReply = exports.hasReplies = exports.exceedsDaysUntilStale = exports.containsKeyword = exports.hasReaction = exports.containsNegativeReaction = exports.containsPositiveReaction = exports.isNegativeReaction = exports.isPositiveReaction = exports.daysSinceComment = void 0;
const github = require("@actions/github");
const graphql_1 = require("./generated/graphql");
function daysSinceComment(comment) {
    const currentDate = new Date();
    const commentDate = new Date(comment.node?.updatedAt.toString());
    const diffInMs = currentDate.getTime() - commentDate.getTime();
    const diffInDays = diffInMs / (1000 * 3600 * 24);
    return diffInDays;
}
exports.daysSinceComment = daysSinceComment;
function isPositiveReaction(content) {
    return ((content === graphql_1.ReactionContent.ThumbsUp) || (content === graphql_1.ReactionContent.Heart) || (content === graphql_1.ReactionContent.Hooray) || (content === graphql_1.ReactionContent.Laugh) || (content === graphql_1.ReactionContent.Rocket));
}
exports.isPositiveReaction = isPositiveReaction;
function isNegativeReaction(content) {
    return ((content === graphql_1.ReactionContent.ThumbsDown) || (content === graphql_1.ReactionContent.Confused));
}
exports.isNegativeReaction = isNegativeReaction;
function containsPositiveReaction(comment) {
    return comment.node?.reactions.nodes?.some(reaction => {
        return isPositiveReaction(reaction?.content);
    });
}
exports.containsPositiveReaction = containsPositiveReaction;
function containsNegativeReaction(comment) {
    return comment.node?.reactions.nodes?.some(reaction => {
        return isNegativeReaction(reaction?.content);
    });
}
exports.containsNegativeReaction = containsNegativeReaction;
function hasReaction(comment) {
    return comment?.node?.reactions.nodes?.length !== 0;
}
exports.hasReaction = hasReaction;
function containsKeyword(comment, text) {
    return comment?.node?.bodyText?.indexOf(text) >= 0;
}
exports.containsKeyword = containsKeyword;
function exceedsDaysUntilStale(comment, staleTimeDays) {
    return (daysSinceComment(comment) >= staleTimeDays);
}
exports.exceedsDaysUntilStale = exceedsDaysUntilStale;
function hasReplies(comment) {
    return comment.node?.replies.edges?.some(reply => {
        return (reply?.node?.bodyText.length !== 0);
    });
}
exports.hasReplies = hasReplies;
function hasNonBotReply(comments, GITHUB_BOT) {
    return comments.node?.replies.edges?.some(comment => {
        return (comment?.node?.author?.login != GITHUB_BOT);
    });
}
exports.hasNonBotReply = hasNonBotReply;
function triggeredByNewComment() {
    if (github.context.eventName === 'discussion_comment' && github.context.payload.action === 'created') {
        return true;
    }
    else {
        return false;
    }
}
exports.triggeredByNewComment = triggeredByNewComment;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDBDQUEwQztBQUMxQyxpREFBMEc7QUFFMUcsU0FBZ0IsZ0JBQWdCLENBQUMsT0FBOEI7SUFDN0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUMvQixNQUFNLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDL0QsTUFBTSxVQUFVLEdBQUcsUUFBUSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNqRCxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBTkQsNENBTUM7QUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxPQUF3QjtJQUN6RCxPQUFPLENBQUMsQ0FBQyxPQUFPLEtBQUsseUJBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyx5QkFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLHlCQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUsseUJBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyx5QkFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDaE4sQ0FBQztBQUZELGdEQUVDO0FBRUQsU0FBZ0Isa0JBQWtCLENBQUMsT0FBd0I7SUFDekQsT0FBTyxDQUFDLENBQUMsT0FBTyxLQUFLLHlCQUFlLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUsseUJBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQzlGLENBQUM7QUFGRCxnREFFQztBQUVELFNBQWdCLHdCQUF3QixDQUFDLE9BQThCO0lBQ3JFLE9BQU8sT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNwRCxPQUFPLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxPQUFRLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUUsQ0FBQztBQUNOLENBQUM7QUFKRCw0REFJQztBQUVELFNBQWdCLHdCQUF3QixDQUFDLE9BQThCO0lBQ3JFLE9BQU8sT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUNwRCxPQUFPLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxPQUFRLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUUsQ0FBQztBQUNOLENBQUM7QUFKRCw0REFJQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxPQUE4QjtJQUN4RCxPQUFPLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLEtBQUssQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFGRCxrQ0FFQztBQUVELFNBQWdCLGVBQWUsQ0FBQyxPQUE4QixFQUFFLElBQVk7SUFDMUUsT0FBTyxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFGRCwwQ0FFQztBQUVELFNBQWdCLHFCQUFxQixDQUFDLE9BQThCLEVBQUUsYUFBcUI7SUFDekYsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFGRCxzREFFQztBQUVELFNBQWdCLFVBQVUsQ0FBQyxPQUE4QjtJQUN2RCxPQUFPLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDL0MsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM5QyxDQUFDLENBQUUsQ0FBQztBQUNOLENBQUM7QUFKRCxnQ0FJQztBQUVELFNBQWdCLGNBQWMsQ0FBQyxRQUErQixFQUFFLFVBQWtCO0lBQ2hGLE9BQU8sUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNsRCxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxJQUFJLFVBQVUsQ0FBQyxDQUFDO0lBQ3RELENBQUMsQ0FBRSxDQUFDO0FBQ04sQ0FBQztBQUpELHdDQUlDO0FBRUQsU0FBZ0IscUJBQXFCO0lBQ25DLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEtBQUssb0JBQW9CLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRTtRQUNwRyxPQUFPLElBQUksQ0FBQztLQUNiO1NBQU07UUFDTCxPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQztBQU5ELHNEQU1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgb2N0b2tpdCBmcm9tIFwiQG9jdG9raXQvZ3JhcGhxbC1zY2hlbWFcIjtcbmltcG9ydCAqIGFzIGdpdGh1YiBmcm9tIFwiQGFjdGlvbnMvZ2l0aHViXCI7XG5pbXBvcnQgeyBEaXNjdXNzaW9uQ29tbWVudENvbm5lY3Rpb24sIERpc2N1c3Npb25Db21tZW50RWRnZSwgUmVhY3Rpb25Db250ZW50IH0gZnJvbSBcIi4vZ2VuZXJhdGVkL2dyYXBocWxcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGRheXNTaW5jZUNvbW1lbnQoY29tbWVudDogRGlzY3Vzc2lvbkNvbW1lbnRFZGdlKTogbnVtYmVyIHtcbiAgY29uc3QgY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBjb21tZW50RGF0ZSA9IG5ldyBEYXRlKGNvbW1lbnQubm9kZT8udXBkYXRlZEF0LnRvU3RyaW5nKCkpO1xuICBjb25zdCBkaWZmSW5NcyA9IGN1cnJlbnREYXRlLmdldFRpbWUoKSAtIGNvbW1lbnREYXRlLmdldFRpbWUoKTtcbiAgY29uc3QgZGlmZkluRGF5cyA9IGRpZmZJbk1zIC8gKDEwMDAgKiAzNjAwICogMjQpO1xuICByZXR1cm4gZGlmZkluRGF5cztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUG9zaXRpdmVSZWFjdGlvbihjb250ZW50OiBSZWFjdGlvbkNvbnRlbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuICgoY29udGVudCA9PT0gUmVhY3Rpb25Db250ZW50LlRodW1ic1VwKSB8fCAoY29udGVudCA9PT0gUmVhY3Rpb25Db250ZW50LkhlYXJ0KSB8fCAoY29udGVudCA9PT0gUmVhY3Rpb25Db250ZW50Lkhvb3JheSkgfHwgKGNvbnRlbnQgPT09IFJlYWN0aW9uQ29udGVudC5MYXVnaCkgfHwgKGNvbnRlbnQgPT09IFJlYWN0aW9uQ29udGVudC5Sb2NrZXQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmVnYXRpdmVSZWFjdGlvbihjb250ZW50OiBSZWFjdGlvbkNvbnRlbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuICgoY29udGVudCA9PT0gUmVhY3Rpb25Db250ZW50LlRodW1ic0Rvd24pIHx8IChjb250ZW50ID09PSBSZWFjdGlvbkNvbnRlbnQuQ29uZnVzZWQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbnRhaW5zUG9zaXRpdmVSZWFjdGlvbihjb21tZW50OiBEaXNjdXNzaW9uQ29tbWVudEVkZ2UpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbW1lbnQubm9kZT8ucmVhY3Rpb25zLm5vZGVzPy5zb21lKHJlYWN0aW9uID0+IHtcbiAgICByZXR1cm4gaXNQb3NpdGl2ZVJlYWN0aW9uKHJlYWN0aW9uPy5jb250ZW50ISk7XG4gIH0pITtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbnRhaW5zTmVnYXRpdmVSZWFjdGlvbihjb21tZW50OiBEaXNjdXNzaW9uQ29tbWVudEVkZ2UpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbW1lbnQubm9kZT8ucmVhY3Rpb25zLm5vZGVzPy5zb21lKHJlYWN0aW9uID0+IHtcbiAgICByZXR1cm4gaXNOZWdhdGl2ZVJlYWN0aW9uKHJlYWN0aW9uPy5jb250ZW50ISk7XG4gIH0pITtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc1JlYWN0aW9uKGNvbW1lbnQ6IERpc2N1c3Npb25Db21tZW50RWRnZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gY29tbWVudD8ubm9kZT8ucmVhY3Rpb25zLm5vZGVzPy5sZW5ndGggIT09IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb250YWluc0tleXdvcmQoY29tbWVudDogRGlzY3Vzc2lvbkNvbW1lbnRFZGdlLCB0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvbW1lbnQ/Lm5vZGU/LmJvZHlUZXh0Py5pbmRleE9mKHRleHQpISA+PSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhjZWVkc0RheXNVbnRpbFN0YWxlKGNvbW1lbnQ6IERpc2N1c3Npb25Db21tZW50RWRnZSwgc3RhbGVUaW1lRGF5czogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiAoZGF5c1NpbmNlQ29tbWVudChjb21tZW50KSA+PSBzdGFsZVRpbWVEYXlzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc1JlcGxpZXMoY29tbWVudDogRGlzY3Vzc2lvbkNvbW1lbnRFZGdlKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb21tZW50Lm5vZGU/LnJlcGxpZXMuZWRnZXM/LnNvbWUocmVwbHkgPT4ge1xuICAgIHJldHVybiAocmVwbHk/Lm5vZGU/LmJvZHlUZXh0Lmxlbmd0aCAhPT0gMCk7XG4gIH0pITtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc05vbkJvdFJlcGx5KGNvbW1lbnRzOiBEaXNjdXNzaW9uQ29tbWVudEVkZ2UsIEdJVEhVQl9CT1Q6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gY29tbWVudHMubm9kZT8ucmVwbGllcy5lZGdlcz8uc29tZShjb21tZW50ID0+IHtcbiAgICByZXR1cm4gKGNvbW1lbnQ/Lm5vZGU/LmF1dGhvcj8ubG9naW4gIT0gR0lUSFVCX0JPVCk7XG4gIH0pITtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRyaWdnZXJlZEJ5TmV3Q29tbWVudCgpIHtcbiAgaWYgKGdpdGh1Yi5jb250ZXh0LmV2ZW50TmFtZSA9PT0gJ2Rpc2N1c3Npb25fY29tbWVudCcgJiYgZ2l0aHViLmNvbnRleHQucGF5bG9hZC5hY3Rpb24gPT09ICdjcmVhdGVkJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19