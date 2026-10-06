import { PublicClientApplication } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_AZURE_AD_TENANT_ID;
const clientId = import.meta.env.VITE_AZURE_AD_CLIENT_ID;
const configuredRedirectUri = import.meta.env.VITE_AZURE_AD_REDIRECT_URI;
// The v5 popup bridge communicates on a same-origin BroadcastChannel.
const redirectUri = import.meta.env.DEV
  ? `${window.location.origin}/redirect.html`
  : configuredRedirectUri || `${window.location.origin}/redirect.html`;

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
    throw new Error('Azure AD SSO is not configured. Set the Azure AD tenant and client IDs.');
  }

  initialization ||= msalInstance.initialize();
  await initialization;
};

let loginFlight;

export const signInWithMicrosoft = () => {
  // Share an in-flight popup request instead of starting a second interaction.
  if (loginFlight) return loginFlight;
  loginFlight = (async () => {
    await initializeMsal();
    try {
      const result = await msalInstance.loginPopup({
        scopes: ['openid', 'profile', 'email'],
        prompt: 'select_account',
      });
      if (import.meta.env.DEV) {
        const claims = result.idTokenClaims || {};
        console.info('Microsoft login claims (development only)', {
          availableClaims: Object.keys(claims),
          tenantId: claims.tid,
          userId: claims.oid,
          groups: claims.groups,
          roles: claims.roles,
          department: claims.department,
          companyName: claims.companyName,
          groupOverage: Boolean(claims.hasgroups || claims._claim_names?.groups),
        });
      }
      return result.idToken;
    } catch (error) {
      if (error.errorCode === 'interaction_in_progress') {
        throw new Error('A Microsoft sign-in is already in progress. Close its sign-in popup, resume any paused debugger, and reopen this page in a new tab to try again.');
      }
      if (error.errorCode === 'timed_out') {
        throw new Error(`Microsoft sign-in did not return to this page. Complete the sign-in popup and check that ${redirectUri} is registered as a Single-page application redirect URI in Entra.`);
      }
      throw error;
    }
  })().finally(() => { loginFlight = null; });
  return loginFlight;
};
