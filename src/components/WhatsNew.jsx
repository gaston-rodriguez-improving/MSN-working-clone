import { useState, useEffect } from 'react';
import divider from '/assets/general/divider.png';

const messages = [
    "Una foto por día, amigos y firmas: volvé a <a href='/fotolog' class='link'>Fotolog</a>!",
    "Add your favorite songs and share what you're listening to on <a target='_blank' rel='noopener noreferrer' href='/winamp' class='link'>Winamp</a>!",
    "If you want to know the secrets of this project, please <a target='_blank' rel='noreferrer' href='https://www.youtube.com/watch?v=5SZYz7lZRRI&list=RD5SZYz7lZRRI&start_radio=1' class='link'>click here</a>",
    "Share your feedback: <a target='_blank' rel='noopener noreferrer' href='https://forms.cloud.microsoft/r/Fic8vz75Aa' class='link'>MSN Feedback Experience – Fill out form</a>",
  ];

const WhatsNew = () => {
  const [content, setContent] = useState(0);
  const [fadeClass, setFadeClass] = useState('fade-in');


  useEffect(() => {
    const intervalId = setInterval(() => {
      setFadeClass('fade-out');
      setTimeout(() => {
        setContent((prevContent) => (prevContent + 1) % messages.length);
        setFadeClass('fade-in');
      }, 500);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handlePrevious = () => {
    setFadeClass('fade-out');
    setTimeout(() => {
      setContent((prevContent) => (prevContent - 1 + messages.length) % messages.length);
      setFadeClass('fade-in');
    }, 500);
  };

  const handleNext = () => {
    setFadeClass('fade-out');
    setTimeout(() => {
      setContent((prevContent) => (prevContent + 1) % messages.length);
      setFadeClass('fade-in');
    }, 500);
  };

  return (
    <div className="px-4 pb-11">
      <div className="w-full">
        <img src={divider} alt="" className="mix-blend-multiply" />
      </div>
      <div className="flex gap-1 pt-2 items-center">
        <p className="text-[16px] text-[#1D2F7F]">What&apos;s new</p>
        <div className="ml-3 whats-new-arrow-previous" onClick={handlePrevious}></div>
        <div className="whats-new-arrow-next" onClick={handleNext}></div>
        <div className="ml-2 whats-new-settings"></div>
      </div>
      <p className={fadeClass} dangerouslySetInnerHTML={{ __html: messages[content] }} />
    </div>
  );
};

export default WhatsNew;
