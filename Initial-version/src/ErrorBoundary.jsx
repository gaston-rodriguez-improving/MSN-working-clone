import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error, info) {
    this.setState({ hasError: true });
  }

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        <div className="grid z-50 h-screen px-4 bg-white dark:bg-neutral-950 place-content-center">
          <div className="text-center">
            <h1 className="font-black text-gray-200 dark:text-neutral-800 text-9xl">{t('error')}</h1>

            <div className="fixed z-50 bottom-[69px] sm:bottom-5 right-[5px] sm:right-5 w-10 h-10 rounded-full bg-white dark:bg-neutral-950 flex justify-center items-center"/>

            <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-600 sm:text-4xl">
              Uhh!
            </p>

            <p className="mt-4 text-gray-500 dark:text-neutral-400">{t('title')}</p>

            <button 
              onClick={() => window.location.reload()}
              className="inline-block px-5 py-3 mt-6 text-sm font-medium text-white bg-indigo-700 dark:bg-sky-600 rounded hover:bg-indigo-600 focus:outline-none focus:ring">
              {t('button')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation('404')(ErrorBoundary);
