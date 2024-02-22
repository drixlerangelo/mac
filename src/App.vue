<script setup lang="ts">
const OPENAI_KEY = prompt('Enter your OpenAI API Key');

import { ref } from 'vue';
import axios from 'axios';

type Message = {
    role: 'system'|'user'|'assistant',
    content: string,
    audio?: string,
};

type Data = {
    isRecording: boolean,
    mediaRecorder: MediaRecorder|null,
    audioChunks: Blob[],
    conversation: Message[],
    convertedSpeech: string,
    assistantResponse: string,
    audioConversation: Blob[],
    userText: string,
}

const appData = ref({
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    conversation: [],
    convertedSpeech: '',
    assistantResponse: '',
    audioConversation: [],
    userText: '',
} as Data);

const utterResponse = async (message: Message) => {
    appData.value.assistantResponse = message.content;
    console.log(`assistant: ${appData.value.assistantResponse}`);

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
        const audioSrc: string = URL.createObjectURL(data);
        const audio = new Audio(audioSrc);
        message.audio = audioSrc;
        appData.value.conversation.push(message);
        audio.play();
    }).catch(({ response }: { response: Response }) => {
        if (response.status === 401) {
            message.audio = '';
            appData.value.conversation.push(message);
        }
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
            messages: appData.value.conversation.map((message: Message) => {
                let {audio, ...rest} = message;
                return rest;
            }),
            stream: false,
        },
        {
            headers: {
                Authorization: 'Bearer ' + OPENAI_KEY,
                Accept: 'application/json'
            }
        }
    ).then(({ data }) => {
        const message: {role: 'assistant', content: string} = data.choices[0].message;
        utterResponse(message);
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
                Authorization: 'Bearer ' + OPENAI_KEY,
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

const passText = (event: KeyboardEvent) => {
    if (event.code === 'Enter') {
        appData.value.convertedSpeech = appData.value.userText;
        appData.value.userText = '';
        converseBot();
    }
}
</script>

<template>
    <div class="bg-indigo-950 h-screen flex flex-col justify-between items-center">
        <div></div>

        <div v-if="OPENAI_KEY" class="max-w-3xl w-full p-4 bg-violet-700 rounded-lg shadow-md">
            <div class="mb-4">
            <div class="h-96 p-5 bg-indigo-950 overflow-auto">
                <div class="flex flex-col">

                    <div v-for="(message, index) in appData.conversation" :key="index">
                        <div v-if="message.role === 'user'" class="flex items-start justify-start pb-5">
                            <div class="h-16 w-16 bg-purple-500 rounded-full mr-2 px-4 py-5">YOU</div>

                            <div class="max-w-4/6 bg-purple-700 p-3 rounded-lg">
                                <p class="text-sm text-purple-50">
                                    {{ message.content }}
                                </p>
                            </div>
                        </div>

                        <div v-else-if="message.role === 'assistant'" class="flex items-start justify-end pb-5">
                            <div class="w-4/6 bg-purple-700 p-3 rounded-lg">
                                <p class="text-sm text-purple-50">
                                    {{ message.content }}
                                </p>
                                <br>
                                <audio v-if="message.audio !== ''" controls class="w-3/6 h-6" :src="message.audio"></audio>
                            </div>

                            <div class="h-16 w-16 bg-purple-500 rounded-full ml-2 px-4 py-5">MAC</div>
                        </div>

                    </div>
                </div>
            </div>
            </div>

            <div class="flex flex-row">
                <textarea class="basis-3/4"
                    v-model="appData.userText"
                    rows="1"
                    @keyup="passText" />

                <div class="basis-1/4 h-16 bg-purple-950 p-2 text-center">
                    <button
                        type="button"
                        class="bg-red-950 p-3 rounded-full"
                        @click="startRecording"
                        :hidden="appData.isRecording || appData.userText.length > 0">
                        START RECORDING
                    </button>

                    <button
                        type="button"
                        class="bg-zinc-200 p-3 rounded-full"
                        @click="stopRecording"
                        :hidden="!appData.isRecording">
                        STOP RECORDING
                    </button>
                </div>
            </div>
        </div>

        <div v-else class="max-w-3xl w-full p-4 bg-violet-700 rounded-lg shadow-md">
            <h1 class="text-center">Sorry, you won't be able to use the tool.</h1>
        </div>
        <div>MAC - Mini AI Chatbot. A demo by drixlerangelo.</div>
    </div>
</template>
