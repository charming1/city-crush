# Firebase setup (analytics and cloud save)

1. console.firebase.google.com > Add project (turn on Google Analytics when asked).
2. Project settings > Your apps > Web (</>) > register the app. Copy the `firebaseConfig` values into `config.js` (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, `measurementId`).
3. Build > Authentication > Get started > Sign-in method > turn on **Anonymous**.
4. Build > Firestore Database > Create database. Then Rules tab, paste, and Publish:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /players/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
5. `python3 build.py`, then host `dist/city-crush.html` (Firebase Hosting: `npm i -g firebase-tools`, `firebase init hosting`, set the public folder to a folder holding that file renamed `index.html`, `firebase deploy`).
6. See players in Analytics > Realtime and Dashboard. Events logged: level_start, level_win, level_lose, ad_gate_shown, rewarded_ad_started, rewarded_ad_completed, country_unlocked. Saved progress is in Firestore > players.
