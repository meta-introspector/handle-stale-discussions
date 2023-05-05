## AWS Stale Discussion Bot

### Purpose

OSDS will mark answerable discussions with keyword `@bot prposed-answer`, along with proposed answer. Based on reaction received , the appropriate action is taken to close/update the discussion. After N number of days in absence of any action, it's closed.

### Different scenarios

* Normal case: Discussion is opened, OSDS answers it, says @bot proposed-answer.
Bot then comments the thread with instructions to the customer. If the customer
marks the discussion as answered, the bot removes keyword and closes the discussion as resolved. If the customer does not mark the discussion as answered, the bot ask OSDS to take another look and help the customer.

* Edge case: The submitter thumbs down the proposed-answer. If that happens, a label `attention` is added , for further traction by OSDS Team.

* Edge case: The discussion gets locked. Bot will take no action on locked
discussions.

* Edge case: The discussion gets moved. Bot should take normal actions on moved
discussions unless it gets moved into a category that's not answerable, in which case the bot will comment that it's unable to do anything further.

* Edge case: Bot waits for submitter's response/reaction on the suggested answer. If there is no response after 7 days, a reminder is sent to submitter to take action on proposed answer. In absence of response for next 4 days, discussion is closed as being outdated.

* Edge case: There are multiple proposed answers. Newer proposed answers will take precedence over older ones.

## Setup

Follow this [Setup guide](SETUP.md).

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

