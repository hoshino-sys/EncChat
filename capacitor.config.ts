import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'top.nightstar.encchat',
  appName: '墨隐',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    backgroundColor: '#07080a',
    allowMixedContent: false,
  },
};

export default config;
