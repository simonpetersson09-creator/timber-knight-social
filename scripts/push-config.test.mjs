import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('APNs success and failure are forwarded to Capacitor', () => {
  const delegate = read('ios/App/App/AppDelegate.swift');
  assert.match(delegate, /didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data/);
  assert.match(delegate, /post\(\s*name: \.capacitorDidRegisterForRemoteNotifications,\s*object: deviceToken\s*\)/);
  assert.match(delegate, /didFailToRegisterForRemoteNotificationsWithError error: Error/);
  assert.match(delegate, /post\(\s*name: \.capacitorDidFailToRegisterForRemoteNotifications,\s*object: error\s*\)/);
});

test('entitlements are referenced in both app build configurations', () => {
  assert.match(read('ios/App/App/App.entitlements'), /<key>aps-environment<\/key>\s*<string>\$\(APS_ENVIRONMENT\)<\/string>/);
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.match(project, /APS_ENVIRONMENT = development;/);
  assert.match(project, /APS_ENVIRONMENT = production;/);
  assert.equal((project.match(/CODE_SIGN_ENTITLEMENTS = App\/App.entitlements;/g) || []).length, 2);
  assert.match(project, /lastKnownFileType = text.plist.entitlements; path = App.entitlements/);
  assert.match(project, /com.apple.Push = \{ enabled = 1; \};/);
});

test('Firebase is optional locally and enforceable in CI', () => {
  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /if \(servicesJSON.isFile\(\)\) \{\s*apply plugin: 'com.google.gms.google-services'/);
  assert.match(gradle, /gradleProperty\('requirePushConfig'\)/);
  assert.match(gradle, /throw new GradleException/);
  assert.doesNotMatch(gradle, /catch\(Exception/);
  assert.match(read('android/app/src/main/AndroidManifest.xml'), /android.permission.POST_NOTIFICATIONS/);
});
