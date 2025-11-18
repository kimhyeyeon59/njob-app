import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.njobtracker.sideincome',
  appName: 'N잡 수입 관리',
  webDir: 'build',
  server: {
    allowNavigation: [
      '*.googleusercontent.com',
      '*.googleapis.com'
    ],
    androidScheme: 'https'
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
      googleWebClientId: '176646550330-hldo4q2h7spib1h3p4jj0jonal2t3pmj.apps.googleusercontent.com'
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
