# OneQR Android build: exact failure diagnosis and permanent fix

## अभी क्या confirmed है
- Latest committed pipeline web bundle के लिए 8 GB Node heap और Android build के लिए 4 GB Gradle heap use कर रही है।
- Workflow, app module और Capacitor-generated module Java 21 पर aligned हैं।
- Build से पहले keystore file, store password, alias और key password की verification मौजूद है।
- OneQR package guard `app.karoonline.oneqr` और matching Firebase client को verify करता है।
- Latest failed GitHub run का वास्तविक `What went wrong`/failed task अभी उपलब्ध नहीं है; केवल `exit code 1` से root cause तय करना सुरक्षित नहीं होगा।

## Fix plan

### 1. Latest failure को exact step तक isolate करना
- आपके अगले screenshot में failed step का नाम, `What went wrong`, failed Gradle task और पहली `Caused by` line पढ़ेंगे।
- अगर screenshot incomplete हुआ तो workflow के `android-gradle-build-log` artifact में उसी error signature को confirm करेंगे।
- Failure को चार categories में classify करेंगे: signing secret, Firebase/package identity, Gradle/plugin compilation, या Android resource/native source error।

### 2. Confirmed root cause का targeted fix
- केवल उस file/config को बदलेंगे जिसे latest log जिम्मेदार बताता है; Java/heap/secrets पर फिर अनुमान से बदलाव नहीं करेंगे।
- Signing failure होने पर main build और quick keystore verifier का व्यवहार एक जैसा करेंगे, including legacy secret fallback/alias handling जहाँ आवश्यक हो।
- Gradle/plugin failure होने पर incompatible DSL rewrite या plugin version को उसके exact failing module में ठीक करेंगे।
- Resource/package failure होने पर generated OneQR application ID, manifest, Java namespace और Firebase client alignment ठीक करेंगे।

### 3. Pipeline को repeat-failure proof बनाना
- जिस category में failure मिला, उसके लिए Gradle शुरू होने से पहले explicit preflight guard जोड़ेंगे।
- GitHub Summary में exact failed task और actionable error हमेशा दिखेगा; generic `exit code 1` अकेला नहीं रहेगा।
- Existing OneQR-only scope बनाए रखेंगे; Shop, Quick, Ads या बाकी variants configure नहीं होंगे।

## Verification
- Workflow YAML, patch script और generated Android config की consistency check करेंगे।
- Available local checks से OneQR package, Firebase mapping, Java target और signing configuration validate करेंगे।
- फिर केवल एक GitHub run करना होगा: `Build Android App` → `oneqr`।
- Success criteria: signed release APK और `karo-oneqr-playstore-aab` दोनों artifacts बनें; failure होने पर summary में exact actionable reason दिखे।

## आपसे अगला input
- Latest failed step खोलकर `What went wrong` से पहली `Caused by` line तक screenshot भेजें। Secret values screenshot में न दिखाएँ।