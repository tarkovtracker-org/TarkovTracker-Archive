# Development Documentation

This document provides instructions and guidelines for setting up a local development environment, running tests, and understanding key aspects of the project.

TODO: Add an overview header anchored list for each section in this. For example "# Environment Variables"

---

## Environment Variables

`.env` Documentation
TODO: Explain the purpose of the .env file and what each variable is or does and its purpose and if its optional or required. Also include links to the appropriate services, documentation, terms and privacy policies. Might be best to link internally to other more detailed markdown files for example Firebase.md, Analytics.md, Vite.md, etc.

### Firebase (Hosting, Auth, Firestore, Analytics, Optional)

TODO: Explain how firebase works when developing locally, the fact it hosts a static build at port 5000 using the emulators while but normally the vite server running on port 3000 should be primary due to HMR and other benefits and link to a Vite.md file to explain that more or maybe below here?

`VITE_FIREBASE_API_KEY`: Your Firebase API key.
`VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase Auth domain.
`VITE_FIREBASE_PROJECT_ID`: Your Firebase project ID.
`VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase Storage bucket.
`VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase Messaging sender ID.
`VITE_FIREBASE_APP_ID`: Your Firebase App ID.
`VITE_FIREBASE_MEASUREMENT_ID`: Your Firebase Measurement ID (optional, for analytics).

Firebase is used for hosting, authentication, Firestore database, and optional analytics. For setup instructions, refer to the Firebase documentation:
[Firebase Documentation](https://firebase.google.com/docs)

### Microsoft Clarity (Analytics, Optional)

`VITE_CLARITY_PROJECT_ID`: Set this variable to your Microsoft Clarity project ID to enable analytics tracking. If left unset, analytics will be disabled.

Microsoft Clarity is a free web analytics tool that provides insights into user behavior on websites. It offers features like session recordings, heatmaps, and click tracking to help improve user experience and identify issues.
For more information, visit the official website:
[Microsoft Clarity](https://clarity.microsoft.com/)

### Data Migration Endpoint

`VITE_PROGRESS_ENDPOINT`: URL of the data migration endpoint. Used for migrating user progress data. If left unset, migration features will be disabled.

### Development Options

`VITE_DEV_MODE`: Set this variable to enable development mode features. If left unset, development mode will be disabled.
`VITE_LOG_LEVEL`: Set the logging level for the application (e.g., debug, info, warn, error).

---
