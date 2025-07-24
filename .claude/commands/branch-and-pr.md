Create a new branch from current changes, commit, and open a PR: $ARGUMENTS

This command helps transition from working on master to using PRs by:
1. Creating a new branch from uncommitted changes
2. Committing the changes with a descriptive message
3. Opening a PR with detailed information about the changes

Usage: `/branch-and-pr feature-name "Brief description of changes"`

Steps:
1. Check current git status to see what changes exist
2. Create a new branch based on the feature name provided
3. Stage all changes
4. Create a commit with a descriptive message based on the changes
5. Push the branch to origin
6. Create a PR with:
   - Title based on the changes made
   - Body with summary of changes and test plan
   - No Claude attribution in commit or PR

If no feature name is provided, generate one based on the changes detected.