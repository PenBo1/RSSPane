import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'zh',
    permissions: [
      'sidePanel',
      'alarms',
      'storage',
    ],
    host_permissions: ['<all_urls>'],
    icons: {
      16: 'icon/16.png',
      24: 'icon/24.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    action: {
      default_icon: {
        16: 'icon/16.png',
        24: 'icon/24.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        96: 'icon/96.png',
        128: 'icon/128.png',
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});