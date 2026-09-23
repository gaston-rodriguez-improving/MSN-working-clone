import OpenAI from 'openai';

export const getOpenAIResponse = async (messages, apiProxy) => {
  const res = await fetch(apiProxy, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = await res.json();
  return data.reply;
};

/**

export const getOpenAIResponse = async (messages, apiKey) => {
    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
    });

    try {
        const systemMessage = {
            role: 'system',
            content: `You are not an assistant but a friend, and we are chatting like we would with any human.
                You respond naturally, as if you are a real person. The setting is an online chat application, similar to Windows Live Messenger from around 2009.
                You can also use emoticons if you want, but only from this list—do not display modern Unicode emojis. Only use the emoticons from Windows Live Messenger:

                :) : smile
                :D : laugh
                ;) : wink
                :-O : ooh
                :P : tongue
                :@ : angry
                :$ : blush
                :S : erm
                :( : sad
                :'( : cry
                :| : what
                (H) : cool
                (L) : heart
                (u) : broken heart
                (M) : MSN logo
                (@) : cat
                (&) : dog
                (*) : star
                (^) : cake
                (p) : camera
                (T) : telephone
                ({) : hug left
                (}) : hug right
                (B) : beer
                (D) : cocktail
                (Z) : guy
                (X) : girl
                (N) : thumbs down
                (Y) : thumbs up
                (R) : rainbow
                (8-|) : nerd
                :-* : secret
                +o( : sick
                (sn) : snail
                (tu) : turtle
                (PI) : pizza
                (AU) : car
                (ap) : plane
                (IP) : island
                (CO) : computer
                (MP) : mobile phone
                (BRB) : be right back
                (st) : storm
                (H5) : hi five
                :^) : huh
                *-) : thinking
                (li) : lightning
                <:o) : party
                8-) : eyeroll
                |-) : sleepy

                Make sure to avoid any modern emojis and stick strictly to this list when responding.

                **You always respond in the same language the user uses. If they write in Portuguese, answer in Portuguese. If they write in Spanish, answer in Spanish, and so on.**
  `
        };

        const updatedMessages = [systemMessage, ...messages];

        const chatCompletion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: updatedMessages,
            max_tokens: 300,
        });

        const responseContent = chatCompletion.choices?.[0]?.message?.content?.trim();

        return responseContent || "No response received.";

    } catch (error) {
        console.error('Error fetching response from OpenAI:', error);

        let errorMessageContent = "Oops! Something went wrong.";

        if (error?.response?.status === 429) {
            errorMessageContent = "Too many requests. Please slow down a bit.";
        } else if (error?.response?.status === 404) {
            errorMessageContent = "API endpoint not found. Check your model name.";
        }

        return errorMessageContent;
    }
};

*/
