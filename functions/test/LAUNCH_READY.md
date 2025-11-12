# 🚀 EMULATOR TEST MIGRATION - LAUNCH READY

**Status**: ✅ **FOUNDATION COMPLETE** - Developers can start immediately  
**Date**: November 12, 2025  
**Branch**: `refactor/directory-restructure`

---

## ✅ Infrastructure Complete (1,518 lines)

### Core Files Ready

| File | Lines | Purpose |
|------|-------|---------|
| `test/helpers/emulatorSetup.ts` | 404 | Admin SDK, resetDb(), seedDb(), assertions |
| `test/helpers/testPatterns.ts` | 360 | Test templates & patterns |
| `test/helpers/seedData.ts` | 457 | Pre-built fixtures & SeedBuilder |
| `test/globalSetup.ts` | 214 | Auto-start emulators, process cleanup |
| `vitest.config.js` | 32 | Updated for globalSetup, emulator timeouts |

### Documentation Ready

| File | Lines | Purpose |
|------|-------|---------|
| `test/DEV_WORK.md` | 501 | **👈 START HERE** - Complete conversion guide |
| `test/REFACTOR_STATUS.md` | 439 | Phase 2 plan, rationale, metrics |

---

## 👥 Developer Assignments (Zero Conflicts)

### Dev A: Middleware Tests (7 files, ~6-10 hours)

**Start with SIMPLE**:
- ✅ `middleware/permissions.test.ts` (simplest)
- `middleware/auth.test.ts`
- `middleware/validation.test.ts`

**Then MODERATE**:
- `middleware/errorHandling.test.ts`
- `middleware/firebase.test.ts`
- `middleware/rateLimiting.test.ts`
- `middleware/teamMiddleware.test.ts`

### Dev B: Utilities Tests (13 files, ~14-20 hours)

**Start with SIMPLE**:
- ✅ `utils/helpers.test.ts` (simplest)
- `utils/dateUtils.test.ts`
- `utils/validation.test.ts`

**Then MODERATE**:
- `utils/firestore.test.ts`
- `utils/tokenUtils.test.ts`
- `utils/teamUtils.test.ts`
- Edge case files (5 files in `edge-cases/`)

### Dev C: Teams/Tokens Tests (8 files, ~10-15 hours)

**Start with SIMPLE**:
- ✅ `app/app.test.ts` (simplest)
- `services/TeamService.test.ts`
- `services/UIDGenerator.test.ts`

**Then MODERATE**:
- `handlers/teams/createTeamHandler.test.ts`
- `handlers/teams/updateTeamHandler.test.ts`
- `handlers/tokens/createTokenHandler.test.ts`
- `handlers/tokens/updateTokenHandler.test.ts`
- `handlers/tokens/deleteTokenHandler.test.ts`

---

## 📖 How to Start (Each Developer)

### 1. Read the Guide (15 minutes)

```bash
# Open this in your editor:
functions/test/DEV_WORK.md
```

Key sections:
- **Basic Conversion Pattern** (lines 1-60)
- **5-Step Conversion Process** (lines 70-150)
- **Your specific section** (Dev A/B/C assignments)

### 2. Pick Your First File (5 minutes)

Choose the **SIMPLE** file from your section above.

### 3. Follow the 5 Steps (30-60 min per file)

From `DEV_WORK.md`:

1. **Remove Firebase mock declarations** (`vi.mock('firebase-admin')`)
2. **Update imports** (add emulator helpers)
3. **Update beforeEach/afterEach** (use `resetDb()`)
4. **Convert test setup** (use `seedDb()`)
5. **Run tests** (`npm test -- your-file.test.ts`)

### 4. Verify & Move On

```bash
# Test your specific file
npm test -- functions/test/middleware/permissions.test.ts

# When it passes, commit and move to next file
git add functions/test/middleware/permissions.test.ts
git commit -m "test: migrate permissions.test to emulator"
```

---

## 🎯 Success Metrics

### Before (Mock Hell)
- **726 lines** of custom Firestore in `setup.ts`
- **161 lines** in `__mocks__/firebase.ts`
- **297 lines** in `mocks.ts`
- **192 lines** in `helpers/firebaseMocks.ts`
- **40+ files** with inline `vi.mock()` declarations
- **Total: 1,376 lines** of technical debt

### After (Real Firestore)
- ✅ Use Firebase Local Emulator Suite
- ✅ Real transaction semantics
- ✅ Real FieldValue operations
- ✅ Cleaner test code
- ✅ **~1,376 lines deleted**

---

## 📋 Work Tracking

### Simple Files (Start Here - All Devs)

- [ ] `middleware/permissions.test.ts` - **Dev A**
- [ ] `utils/helpers.test.ts` - **Dev B**
- [ ] `app/app.test.ts` - **Dev C**

### Moderate Files (After Simple Ones)

**Dev A**: 4 more middleware files  
**Dev B**: 10 more utility files  
**Dev C**: 5 more team/token files

### Complex Files (Claude Handles These)

⚠️ **Do NOT touch these** - too complex:

- `services/TokenService.test.ts` (720 lines)
- `api/apiv2.test.ts` (825 lines)
- `handlers/userDeletionHandler.test.ts` (759 lines)
- `services/ProgressService*.test.ts` (3 variants)

---

## 🆘 Common Questions

### Q: "My tests fail with 'Cannot read property of undefined'"
**A**: You forgot to `await resetDb()` in `beforeEach`. See DEV_WORK.md Step 3.

### Q: "Emulators aren't starting"
**A**: Check that `globalSetup.ts` is configured in `vitest.config.js`. Already done ✅

### Q: "How do I seed test data?"
**A**: Use pre-built fixtures from `seedData.ts`:
```typescript
import { seedPresets } from '../helpers/seedData';
beforeEach(async () => {
  await resetDb();
  await seedDb(seedPresets.singleUser); // 1 user + progress
});
```

### Q: "Can I still mock external APIs (Tarkov.dev)?"
**A**: Yes! Only Firebase mocks are removed. External API mocks stay:
```typescript
vi.mock('axios'); // Still OK
```

### Q: "My file isn't in the list - should I convert it?"
**A**: No. Only convert files assigned to you. Report unknowns to Claude.

---

## 🚦 Next Steps

### Immediate (Next 2 Hours)
1. Each dev reads `DEV_WORK.md` (15 min)
2. Each dev converts their **first SIMPLE file** (45 min)
3. Each dev verifies tests pass (5 min)
4. Share status in Slack/Discord

### This Week (30-50 dev-hours total)
- **Dev A**: Converts 7 middleware files
- **Dev B**: Converts 13 utility files
- **Dev C**: Converts 8 team/token files
- **Claude**: Converts 6 complex files when devs finish

### End Result
- ✅ All 36 test files use emulators
- ✅ Delete 1,376 lines of mock infrastructure
- ✅ Cleaner, more maintainable tests
- ✅ Real Firebase semantics in tests

---

## 📞 Support

**Questions?** Check `DEV_WORK.md` first. Still stuck? Ask in:
- `#tarkovtracker-dev` Slack channel
- GitHub Discussion on this PR
- Tag @claude for complex issues

---

## ✅ Pre-Flight Checklist

- [x] Core infrastructure complete (1,518 lines)
- [x] Documentation complete (940 lines)
- [x] Vitest config updated
- [x] Global setup configured
- [x] Test patterns documented
- [x] Seed fixtures ready
- [x] Developer assignments clear
- [x] Success criteria defined

**🎉 ALL SYSTEMS GO - DEVELOPERS CAN START NOW! 🎉**
