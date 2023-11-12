# MAC - Mini Audio Chatbot

MAC (Mini Audio Chatbot) is a demo application that seamlessly combines voice interaction with cutting-edge technologies. Powered by Vue.js and styled with Tailwind, MAC records your voice and responds in kind, providing a unique and engaging chat experience. Leveraging the OpenAI API, MAC ensures intelligent and context-aware chat completions, while also utilizing speech-to-text capabilities for enhanced user interaction. Elevating the experience further, ElevenLabs contributes customized voice responses, adding a personal touch to every interaction. Experience the future of conversational AI with MAC, where your voice is not only heard but also answered, creating a truly immersive and innovative chatbot encounter.

![A screenshot of the app.](/images/screenshot.png "A screenshot of the app.")

## Project Setup

1. Copy the Dotenv file.
```sh
cp .env.example .env
```

2. Populate all the fields.
```sh
VITE_OPENAI_KEY=
VITE_OPENAI_URL=
VITE_ELEVENLABS_KEY=
VITE_ELEVENLABS_URL=
VITE_ELEVENLABS_VOICE_ID=
```

3. Install and run the app.
```sh
npm install
npm run dev
```
