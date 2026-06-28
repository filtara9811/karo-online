## Problem

GitHub build is failing at **Capacitor sync (android)** with:

```text
[fatal] The Capacitor CLI requires NodeJS >=22.0.0
```

This is not an Android resource/signing/google-services issue. The workflow currently sets Node.js to **20**, while the installed Capacitor packages are **8.x**, which require **Node 22 or newer**.

## Plan

1. **Update GitHub Actions Node version**
   - Change `.github/workflows/main.yml` from `node-version: '20'` to `node-version: '22'`.
   - Keep JDK at **17**, because Android/Gradle Java compatibility was already stabilized around Java 17.

2. **Add a fast version check before sync**
   - Add a workflow step after Bun setup to print:
     - `node --version`
     - `bun --version`
     - `java -version`
   - This will make future logs clear before the build reaches Capacitor/Gradle.

3. **Keep the existing Android build fixes intact**
   - Do not change signing, google-services, resources, Gradle SDK, package name, or native files in this fix.
   - The current error happens before those later steps, so changing them now would risk creating another new issue.

4. **Expected next run**
   - The workflow should pass the **Capacitor sync (android)** step.
   - If a later Gradle/resource/signing error appears, the existing `--stacktrace --info` Gradle logging should reveal the exact next issue.

## After implementation

Re-run GitHub Actions manually with **Run workflow**. If it fails again, it should now fail later than Capacitor sync, and the logs will show the real Android-side error.