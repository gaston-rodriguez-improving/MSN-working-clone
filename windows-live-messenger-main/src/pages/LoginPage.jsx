import React, { useState, useEffect, useContext } from 'react';
import AvatarLarge from '../components/AvatarLarge';
import statusFrames from '../imports/statusFrames';
import Background from '../components/Background';
import Dropdown from '../components/Dropdown';
import { useNavigate } from 'react-router-dom';
import '7.css/dist/7.scoped.css';
import bg from '/assets/background/background.jpg';
import UnableToConnectModal from '../components/UnableToConnectModal';
import { AuthContext } from '../contexts/AuthContext';
import { signInWithMicrosoft } from '../utils/microsoftAuth';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showUnableToConnectModal, setShowUnableToConnectModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [status, setStatus] = useState('Available');
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberme') === 'true');
  const [rememberPassword, setRememberPassword] = useState(localStorage.getItem('rememberpassword') === 'true');
  const [signInAutomatically, setSignInAutomatically] = useState(localStorage.getItem('signinautomatically') === 'true');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(rememberMe ? localStorage.getItem('email') || '' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, loginWithMicrosoft } = useContext(AuthContext);

  const handleMicrosoftAuth = async () => {
    setIsSubmitting(true);
    try {
      const idToken = await signInWithMicrosoft();
      await loginWithMicrosoft(idToken);
      navigate('/');
    } catch (error) {
      setModalMessage(error.response?.data?.error || error.message || 'Unable to sign in with Microsoft.');
      setShowUnableToConnectModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('messenger_token')) {
      navigate('/');
    }
  }, [navigate]);

  const handleSignIn = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setModalMessage('Please enter a valid email in the format: example@example.com');
      setShowUnableToConnectModal(true);
      return;
    }
    if (!password) {
      setModalMessage('Please enter your password');
      setShowUnableToConnectModal(true);
      return;
    }
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        if (!username.trim()) throw new Error('Please enter a display name');
        await register({ email: normalizedEmail, username: username.trim(), password, status: status.toLowerCase() });
      } else {
        await login({ email: normalizedEmail, password });
      }
      localStorage.setItem('email', normalizedEmail);
      localStorage.setItem('status', status);
      localStorage.setItem('rememberme', rememberMe.toString());
      localStorage.setItem('rememberpassword', rememberPassword.toString());
      localStorage.setItem('signinautomatically', signInAutomatically.toString());
      localStorage.setItem('scene', '/assets/scenes/default_background.png');
      localStorage.setItem('colorScheme', '/assets/color_schemes/match_my_scene_color.png');
      navigate('/');
    } catch (error) {
      setModalMessage(error.response?.data?.error || 'Unable to sign in. Start the messenger server and try again.');
      setShowUnableToConnectModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };


  const options = [
    { value: 'Available', label: 'Available', image: statusFrames.onlineDot },
    { value: 'Busy', label: 'Busy', image: statusFrames.busyDot },
    { value: 'Away', label: 'Away', image: statusFrames.awayDot },
    {
      value: 'Offline',
      label: 'Appear offline',
      image: statusFrames.offlineDot,
    },
  ];

  return (
    <Background>
      <div className="bg-no-repeat bg-[length:100%_100px] h-screen" style={{ backgroundImage: `url(${bg})` }}>
        <div className="msn-font flex flex-col items-center w-full pt-4 win7 font-sans text-base">
          <AvatarLarge image={localStorage.getItem('rememberme') === 'true' ? localStorage.getItem('picture') : undefined} />
          <p className="mt-4 text-[28px] font-light text-[#1D2F7F]">Sign in</p>
          <p className="mb-4">Enter a name and a password to start chatting</p>

          <form onSubmit={handleSignIn} className="flex w-full max-w-[676px] flex-col items-center">
            <fieldset className="w-[calc(100%-2rem)] max-w-[640px]">
            <input
              className="w-full placeholder:italic"
              type="email"
              autoComplete="username"
              placeholder="Example555@hotmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {isRegistering && (
              <input
                className="w-full mt-2 placeholder:italic"
                type="text"
                placeholder="Display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            )}
            <input
              className="w-full mt-2 placeholder:italic"
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex my-4">
              <p>Sign in as:</p>
              <Dropdown options={options} value={status} onChange={setStatus} showStatusDots={true} showUserName={false} />
            </div>

            <div>
              <div className="mt-2">
                <input
                  type="checkbox"
                  id="rememberme"
                  checked={rememberMe}
                  onChange={(e) => {
                    setRememberMe(e.target.checked);
                    localStorage.setItem('rememberme', e.target.checked.toString());
                  }}
                />
                <label htmlFor="rememberme">Remember me</label>
              </div>
              <div className="mt-2">
                <input
                  type="checkbox"
                  id="rememberpassword"
                  checked={rememberPassword}
                  onChange={(e) => {
                    setRememberPassword(e.target.checked);
                    localStorage.setItem('rememberpassword', e.target.checked.toString());
                  }}
                />
                <label htmlFor="rememberpassword">Remember my password</label>
              </div>
              <div className="mt-2">
                <input
                  type="checkbox"
                  id="signinautomatically"
                  checked={signInAutomatically}
                  onChange={(e) => {
                    setSignInAutomatically(e.target.checked);
                    localStorage.setItem('signinautomatically', e.target.checked.toString());
                  }}
                />
                <label htmlFor="signinautomatically">Sign me in automatically</label>
              </div>
            </div>
            </fieldset>

            <div className="mt-4 flex w-[calc(100%-2rem)] max-w-[714px] flex-wrap items-center justify-center gap-2">
              <button type="submit" disabled={isSubmitting}>{isRegistering ? 'Create account' : 'Sign in'}</button>
              <button type="button" disabled={isSubmitting} onClick={() => setIsRegistering((value) => !value)}>
                {isRegistering ? 'I already have an account' : 'Create an account'}
              </button>
              <span aria-hidden="true">OR</span>
              <button type="button" disabled={isSubmitting} onClick={handleMicrosoftAuth} className="flex items-center gap-2">
                Sign In with Microsoft
                <span className="microsoft-logo" aria-label="Microsoft" role="img">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
      {showUnableToConnectModal && (
        <UnableToConnectModal setShowUnableToConnectModal={setShowUnableToConnectModal} errorMessage={modalMessage} />
      )}
    </Background>
  );
};

export default LoginPage;
