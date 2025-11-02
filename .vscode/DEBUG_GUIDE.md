# VS Code Debugging Guide for TarkovTracker

This guide explains how to use the VS Code debugger configurations in this project.

## Quick Start

1. **Open the Run and Debug panel:**
   - Click the play icon with a bug in the sidebar (4th icon from top)
   - Or press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac)

2. **Select a configuration** from the dropdown at the top

3. **Press F5** or click the green play button to start debugging

---

## Available Debug Configurations

### 🌐 Frontend Debugging

#### 1. **Debug Frontend (Chrome) - npm run dev**

**What it does:**

- Automatically runs `npm run dev`
- Launches Chrome with debugger attached
- Opens <http://localhost:3000>

**Use for:**

- Setting breakpoints in Vue components
- Stepping through frontend code
- Inspecting reactive state
- Debugging composables and stores

**How to use:**

1. Select this configuration
2. Press F5
3. Set breakpoints in your `.vue` or `.ts` files
4. Interact with the app to hit breakpoints

---

#### 2. **Debug Frontend (Edge) - npm run dev**

Same as above, but uses Microsoft Edge instead of Chrome.

---

#### 3. **Attach to Frontend (Chrome/Edge)**

**What it does:**

- Attaches to an already-running browser with remote debugging enabled

**Use when:**

- You already have the app running
- You want to debug without restarting the browser
- You're using a specific browser profile

**How to use:**

1. Start Chrome or Edge with `--remote-debugging-port=9222`:

   - **Windows (Chrome):**
     ```powershell
     "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
     ```
   - **macOS (Chrome):**
     ```bash
     /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
     ```
   - **Linux (Chrome):**
     ```bash
     google-chrome --remote-debugging-port=9222
     ```
   - **Edge (all platforms):** Replace the command with the Edge executable, e.g. `msedge --remote-debugging-port=9222`.

2. Navigate to <http://localhost:3000>
3. Select this configuration and press F5
4. VS Code attaches to the running browser

---

#### 4. **Debug Production Build (Chrome) - npm run dev:firebase**

**What it does:**

- Runs `npm run dev:firebase` (builds + starts all emulators)
- Launches Chrome to <http://localhost:5000>
- Debugs the production build

**Use for:**

- Debugging production-specific issues
- Testing minified/optimized code
- Verifying source maps work correctly

**Note:** Source maps point to `frontend/dist` instead of `frontend/src`

---

### 🔧 Backend/Functions Debugging

#### 5. **Attach to Cloud Functions**

**What it does:**

- Attaches to Cloud Functions emulator running in debug/inspect mode

**Prerequisites:**
Start emulators with inspect flag:

```bash
firebase emulators:start --inspect-functions
```

**Use for:**

- Debugging Cloud Functions code
- Stepping through API endpoints
- Inspecting function context and parameters

**How to use:**

1. Manually start emulators with `--inspect-functions`
2. Select this configuration
3. Press F5 to attach
4. Set breakpoints in `functions/src/**/*.ts`
5. Trigger function (via frontend or curl)

---

#### 6. **Debug Cloud Functions (Inspect Mode)**

**What it does:**

- Automatically runs `npm run emulators:backend` with debug enabled
- Attaches debugger to Functions emulator

**Use for:**

- Full backend debugging without manual setup
- Testing functions in isolation

**How to use:**

1. Select this configuration
2. Press F5
3. Set breakpoints in functions code
4. Trigger functions to hit breakpoints

---

### 🚀 Full Stack Debugging

#### 7. **Debug Full Stack (Frontend + Functions)** ⭐

**What it does:**

- Launches both frontend and backend debuggers simultaneously
- Runs in "compound" mode

**Use for:**

- End-to-end debugging
- Tracing requests from frontend → functions
- Multi-tier breakpoint debugging

**How to use:**

1. Make sure emulators are running with inspect mode:

   ```bash
   firebase emulators:start --inspect-functions
   ```

2. Select "Debug Full Stack"
3. Press F5
4. Set breakpoints in both frontend and backend
5. Trigger actions that span both tiers

**Pro tip:** You can see both debug sessions in the Call Stack panel!

---

## Debugging Tips & Tricks

### Setting Breakpoints

**In Code:**

- Click in the gutter (left of line numbers) to add a red dot
- `F9` toggles breakpoint on current line
- Right-click breakpoint for conditional breakpoints

**Conditional Breakpoints:**

```javascript
// Only break when user.id === 'specific-id'
// Right-click breakpoint → Edit Breakpoint → Expression
user.id === 'abc123'
```

**Logpoints (no code changes needed):**

```javascript
// Right-click line → Add Logpoint
// Logs without stopping execution
User: {user.name}, ID: {user.id}
```

---

### Debug Console

While paused at a breakpoint, use the Debug Console (bottom panel) to:

- Evaluate expressions: `user.name`
- Call functions: `console.log(this.data)`
- Modify variables: `this.count = 10`

---

### Watch Expressions

Add expressions to the "Watch" panel to monitor values:

- `fireuser.loggedIn`
- `this.$route.params`
- `useUserStore().preferences`

---

### Call Stack Navigation

Click entries in the Call Stack panel to jump between:

- Your code
- Framework code (Vue, Firebase)
- Library code (Apollo, Pinia)

**Pro tip:** Use `skipFiles: ["<node_internals>/**"]` to hide Node.js internals

---

### Source Maps

Your build generates source maps (`.map` files) that let you debug original TypeScript/Vue code instead of compiled JavaScript.

**Check if source maps are working:**

1. Set a breakpoint in a `.vue` file
2. If it hits → source maps working ✅
3. If it shows compiled JS → check `vite.config.ts` has `sourcemap: true`

---

## Common Issues

### "Breakpoint set but not yet bound"

**Cause:** Source maps not loaded yet
**Fix:** Wait a few seconds, or reload the page

### "Cannot connect to runtime process"

**Cause:** Server not started or wrong port
**Fix:** Check if `npm run dev` is running on port 3000

### "Debugger attached but breakpoints not hitting"

**Cause:** Source map path mismatch
**Fix:** Check `sourceMapPathOverrides` in `launch.json`

### Functions debugging not working

**Cause:** Emulators not running in inspect mode
**Fix:** Start with `firebase emulators:start --inspect-functions`

---

## Debugging Workflow Examples

### Example 1: Debug a Vue Component Issue

1. Set breakpoint in `frontend/src/features/tasks/TaskList.vue` at line where bug occurs
2. Select "Debug Frontend (Chrome)"
3. Press F5
4. Navigate to the Tasks page
5. Breakpoint hits → inspect component state in Variables panel
6. Step through with F10 (step over) or F11 (step into)
7. Fix the issue
8. Hot reload applies changes automatically

---

### Example 2: Debug a Cloud Function

1. Set breakpoint in `functions/src/handlers/team.ts` in `createTeam` function
2. Start emulators with inspect: `firebase emulators:start --inspect-functions`
3. Select "Attach to Cloud Functions"
4. Press F5
5. In frontend, trigger team creation
6. Breakpoint hits → inspect request parameters
7. Step through Firestore transaction code
8. Check Variables panel for transaction state

---

### Example 3: Debug Frontend → Backend Flow

1. Set breakpoint in frontend at API call (e.g., `createTeam()`)
2. Set breakpoint in backend at function handler
3. Start emulators with `firebase emulators:start --inspect-functions`
4. Select "Debug Full Stack"
5. Press F5
6. Trigger the action
7. Frontend breakpoint hits first → inspect request payload
8. Continue (F5) → backend breakpoint hits → inspect on server side

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Start/Continue | F5 |
| Stop | Shift+F5 |
| Restart | Ctrl+Shift+F5 |
| Step Over | F10 |
| Step Into | F11 |
| Step Out | Shift+F11 |
| Toggle Breakpoint | F9 |
| Debug Console | Ctrl+Shift+Y |

---

## Advanced: Custom Launch Configurations

Want to add your own? Edit `.vscode/launch.json`:

```json
{
  "name": "My Custom Debug Config",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000/specific-route",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

---

## Browser DevTools vs VS Code Debugger

### Use Browser DevTools When

- ✅ Inspecting DOM/CSS
- ✅ Network tab analysis
- ✅ Performance profiling
- ✅ Console logging
- ✅ Quick Vue DevTools inspection

### Use VS Code Debugger When

- ✅ Setting complex conditional breakpoints
- ✅ Debugging backend + frontend together
- ✅ Working in a single IDE
- ✅ Debugging TypeScript source (not compiled JS)
- ✅ Long debugging sessions with many breakpoints

**Best practice:** Use both! VS Code for code-level debugging, browser for UI/network/performance.

---

## Resources

- [VS Code Debugging Docs](https://code.visualstudio.com/docs/editor/debugging)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Vite Source Maps](https://vitejs.dev/config/build-options.html#build-sourcemap)
- [Firebase Functions Debugging](https://firebase.google.com/docs/functions/local-emulator#instrument_functions_for_debugging)

---

Happy debugging! 🐛🔍
