# Fix: OneQR signed APK/AAB Gradle failure

## जाँच में क्या मिला
- Web bundle अब सफल है; नया failure केवल Android Gradle release step में है।
- Screenshot में असली Gradle error ऊपर छिपा है और केवल आखिरी stack trace/`exit code 1` दिख रहा है, इसलिए exact failing task अभी log से confirmed नहीं है।
- Project में Capacitor 8.4.1 और कुछ native plugins Java 21 target करते हैं, लेकिन workflow JDK 17 लगाकर patch script से dependencies को जबरन Java 17 में बदल रही है। यह release compilation के लिए सबसे बड़ा compatibility risk है।
- Signing setup keystore का store password और alias तो check करता है, लेकिन private-key password/signing operation को build से पहले verify नहीं करता।
- Gradle JVM heap अभी केवल 1536 MB है और failure log artifact में मिल जाता है, लेकिन workflow summary में असली `What went wrong` पर्याप्त साफ नहीं दिखता।

## बदलाव

### 1. Java/Gradle/Capacitor versions एक compatible line पर लाना
- GitHub Actions में Temurin JDK 21 use करेंगे, जो installed Capacitor 8 plugins के declared Java target से match करता है।
- Native patch script से third-party Gradle files को Java 17 में force-downgrade करने वाला हिस्सा हटाकर Java 21 validation लगाएंगे।
- App module compile options को Java 21 पर रखेंगे।
- मौजूदा Gradle 8.14.3 और Android Gradle Plugin 8.13.0 को बनाए रखेंगे; ये वर्तमान Capacitor dependencies के साथ aligned हैं।

### 2. Release signing को build से पहले पूरा verify करना
- Base64 decode में whitespace/newline-safe fallback और minimum file-size validation जोड़ेंगे।
- Store password, exact alias और private-key password—तीनों को `keytool` signing operation से verify करेंगे।
- `ANDROID_KEY_PASSWORD` खाली होने पर store password fallback रहेगा।
- `key.properties` को special-character-safe तरीके से generate करेंगे, ताकि password में `=`, `:`, `\\` आदि होने पर Gradle parsing न टूटे।
- Missing/invalid secret पर Gradle शुरू होने से पहले साफ Hindi/English error मिलेगा; secret values कभी print नहीं होंगी।

### 3. Gradle resource और failure diagnostics सुधारना
- Gradle heap को 4 GB और UTF-8 पर सेट करेंगे; daemon बंद ही रहेगा।
- Build command में plain console output और stacktrace रखेंगे।
- Failure होने पर log से `What went wrong`, failed task, compiler/resource/signing error और आसपास की relevant lines GitHub summary में दिखाएँगे।
- Full `android/build.log` artifact upload यथावत रहेगा।

### 4. OneQR release identity guard
- Build से पहले verify करेंगे कि resolved variant `oneqr`, package `app.karoonline.oneqr`, matching Firebase client और release signing config सभी मौजूद हैं।
- Shop/Quick/Ads या किसी अन्य variant को configure/change नहीं करेंगे।

## Verification
- Local read-only Gradle configuration check से Java target, application ID और release signing path validate करेंगे।
- Workflow YAML और patch output की consistency check करेंगे।
- फिर GitHub Actions में `Build Android App` → `oneqr` run करना होगा; success पर signed APK और `karo-oneqr-playstore-aab` artifacts दोनों बनेंगे।
- अगर secrets गलत हैं, नया preflight exact category बताएगा: base64, store password, alias या key password—generic Gradle exit code नहीं।
