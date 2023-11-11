<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';

type Message = {
    role: 'system'|'user'|'assistant',
    content: string,
};

type Data = {
    isRecording: boolean,
    mediaRecorder: MediaRecorder|null,
    audioChunks: Blob[],
    conversation: Message[],
    convertedSpeech: string,
    assistantResponse: string,
    audioConversation: Blob[],
}

const appData = ref({
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    conversation: [],
    convertedSpeech: '',
    assistantResponse: '',
    audioConversation: [],
} as Data);

const utterResponse = async () => {
    const urlParams = new URLSearchParams();
    urlParams.append('optimize_streaming_latency', '0');
    urlParams.append('output_format', 'mp3_44100_128');

    const endpoint = import.meta.env.VITE_ELEVENLABS_URL +
        `/text-to-speech/${import.meta.env.VITE_ELEVENLABS_VOICE_ID}?` +
        urlParams.toString();

    axios.post(
        endpoint,
        {
            text: appData.value.assistantResponse,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true
            }
        },
        {
            headers: {
                'xi-api-key': import.meta.env.VITE_ELEVENLABS_KEY,
                Accept: 'audio/mpeg'
            },
            responseType: 'blob',
        }
    ).then(({ data }) => {
        const audio = new Audio(URL.createObjectURL(data));
        audio.play();
    });
};

const converseBot = () => {
    console.log(`user: ${appData.value.convertedSpeech}`);
    appData.value.conversation.push({
        role: 'user',
        content: appData.value.convertedSpeech,
    });

    axios.post(
        import.meta.env.VITE_OPENAI_URL + '/chat/completions',
        {
            model: 'gpt-3.5-turbo',
            messages: appData.value.conversation,
            stream: false,
        },
        {
            headers: {
                Authorization: 'Bearer ' + import.meta.env.VITE_OPENAI_KEY,
                Accept: 'application/json'
            }
        }
    ).then(({ data }) => {
        const message: {role: 'assistant', content: string} = data.choices[0].message;
        appData.value.conversation.push(message);
        appData.value.assistantResponse = message.content;
        console.log(`assistant: ${appData.value.assistantResponse}`);
        utterResponse();
    });
};

const convertToText = () => {
    const audioBlob = new Blob(appData.value.audioChunks, { type: 'audio/mpeg' });
    const formData = new FormData();

    formData.append('file', audioBlob, 'recording.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');

    appData.value.audioConversation.push(audioBlob);

    axios.post(
        import.meta.env.VITE_OPENAI_URL + '/audio/translations',
        formData,
        {
            headers: {
                Authorization: 'Bearer ' + import.meta.env.VITE_OPENAI_KEY,
                Accept: 'application/json'
            }
        }
    ).then(({ data }) => {
        appData.value.convertedSpeech = data.text;
        converseBot();
    });

    appData.value.audioChunks = [];
};

const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        appData.value.mediaRecorder = new MediaRecorder(stream);

        appData.value.mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                appData.value.audioChunks.push(event.data);
            }
        };

        appData.value.mediaRecorder.onstop = convertToText;

        appData.value.mediaRecorder.start();
        appData.value.isRecording = true;
    } catch (error) {
        console.error('Error accessing microphone:', error);
    }
};

const stopRecording = () => {
    if (appData.value.mediaRecorder && appData.value.mediaRecorder.state === 'recording') {
        appData.value.mediaRecorder.stop();
        appData.value.isRecording = false;
    }
};
</script>

<template>
    <div id="app">
        <button @click="startRecording" :disabled="appData.isRecording">Start Recording</button>
        <button @click="stopRecording" :disabled="!appData.isRecording">Stop Recording</button>
    </div>
</template>

<style scoped>
header {
    line-height: 1.5;
}

.logo {
    display: block;
    margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
    header {
        display: flex;
        place-items: center;
        padding-right: calc(var(--section-gap) / 2);
    }

    .logo {
        margin: 0 2rem 0 0;
    }

    header .wrapper {
        display: flex;
        place-items: flex-start;
        flex-wrap: wrap;
    }
}
</style>
