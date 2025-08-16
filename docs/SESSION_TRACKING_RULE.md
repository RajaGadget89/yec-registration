# Session Tracking Rule for Cursor

## Rule Name: Session Tracking Update

### Description
This rule ensures that the session tracking system is updated after completing any significant work on the YEC Registration project to maintain context continuity across chat sessions.

### When to Apply
- After completing any development work
- After fixing bugs or issues
- After creating new features
- After running tests
- After making configuration changes
- Before ending a chat session

### Required Actions

#### 1. Update Session Tracking System
After completing work, you MUST:

1. **Read the current session tracking document**:
   ```
   docs/SESSION_TRACKING_SYSTEM.md
   ```

2. **Use the session update template**:
   ```
   docs/SESSION_UPDATE_TEMPLATE.md
   ```

3. **Add a new session entry** to the Session History section in `SESSION_TRACKING_SYSTEM.md` with:
   - Session date and duration
   - Problem addressed
   - Solution implemented
   - Files created/modified
   - Commands used
   - Test results
   - Context for next session

4. **Update the Quick Reference section** in `SESSION_TRACKING_SYSTEM.md`:
   - Current project status
   - Key files modified recently
   - Active issues and solutions
   - Last updated date

#### 2. Update Quick Reference Card
Update `docs/SESSION_TRACKING_QUICK_REFERENCE.md` with:
- Current project status
- Recent work summary
- Key files modified
- Important commands
- Active issues

#### 3. Document Important Context
Ensure the following information is captured:
- **Problem Description**: What issue was being solved
- **Root Cause**: What caused the problem
- **Solution**: How it was fixed
- **Files Changed**: All files that were modified
- **Commands Used**: Important commands for reproduction
- **Test Results**: What tests were run and their results
- **Next Steps**: What should be done next
- **Warnings**: Any important notes or gotchas

### Template Usage

Use this format for session updates:

```markdown
### Session [YYYY-MM-DD]: [Brief Description]

#### Problem Addressed
- **Issue**: [Describe the main problem]
- **Error**: [If applicable, describe any errors]
- **Root Cause**: [What caused the issue]

#### Solution Implemented
1. [First solution step]
2. [Second solution step]
3. [Third solution step]

#### Files Created/Modified
- ✅ `[file-path]` - [Brief description of changes]
- ✅ `[file-path]` - [Brief description of changes]

#### Commands Used
```bash
[Command 1]
[Command 2]
```

#### Test Results
- **Tests Run**: [What tests were executed]
- **Results**: [Pass/Fail summary]
- **Issues Found**: [Any new issues discovered]

#### Context for Next Session
- **Current Status**: [Project phase and focus]
- **Active Issues**: [List any ongoing issues]
- **Next Steps**: [What should be done next]
- **Important Notes**: [Any warnings or important context]
```

### Verification Checklist

Before ending a session, verify:

- [ ] Session tracking document is updated
- [ ] Quick reference card is updated
- [ ] All files created/modified are documented
- [ ] Commands used are recorded
- [ ] Test results are documented
- [ ] Context for next session is clear
- [ ] Important warnings or notes are included

### Emergency Procedures

If context is lost in a new session:

1. **First**: Read `docs/SESSION_TRACKING_QUICK_REFERENCE.md`
2. **Second**: Read `docs/SESSION_TRACKING_SYSTEM.md`
3. **Third**: Check the memory-bank folder for additional context
4. **Fourth**: Review recent git commits for changes

### Integration with Existing Rules

This rule works with:
- CursorRIPER Framework rules
- User rules for code quality
- Documentation standards
- Testing requirements

### Example Implementation

When completing work, say:

"I have completed the work. Now I need to update the session tracking system to maintain context for future sessions."

Then proceed to update the documentation as specified above.

---

## Rule Activation

To activate this rule in Cursor:

1. Add this file to your `.cursor/rules/` directory
2. Reference it in your main rules file
3. Ensure it's loaded with other project rules

### Rule Priority
- **High Priority**: Must be executed after completing work
- **Context Critical**: Essential for maintaining project continuity
- **Documentation Required**: Updates must be comprehensive and accurate
