/* eslint-env node */
// react-native-volume-manager only ships for iOS and Android, so it cannot be built for Apple TV.
// The app uses it for the volume gesture on Android phones and tablets only; keep it out of the
// Apple project so tvOS builds are unaffected.
module.exports = {
  dependencies: {
    'react-native-volume-manager': { platforms: { ios: null } },
  },
};
