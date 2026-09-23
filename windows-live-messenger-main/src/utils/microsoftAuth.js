import { PublicClientApplication } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID;
const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const redirectUri = import.meta.env.VITE_MICROSOFT_REDIRECT_URI || window.location.origin;

const msalInstance = new PublicClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
});

let initialization;

const initializeMsal = async () => {
  if (!tenantId || !clientId) {
    throw new Error('Microsoft Entra SSO is not configured. Set the Microsoft tenant and client IDs.');
  }

  initialization ||= msalInstance.initialize();
  await initialization;
};

export const signInWithMicrosoft = async () => {
  await initializeMsal();
  const result = await msalInstance.loginPopup({
    scopes: ['openid', 'profile', 'email'],
    prompt: 'select_account',
  });

  return result.idToken;
};
