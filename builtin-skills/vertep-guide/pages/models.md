# Models and connections

Molfar and your apps need an AI model to answer. This page explains how to connect one, choose which models show up, and set up pictures and speech. It all lives in Settings.

## Connections

A connection is a saved link to a provider or server. Open Settings, then "Connections and models", then "Add connection". The provider list offers:

- Well-known providers: pick one and paste its API key.
- "Subscriptions (OAuth)": you sign in instead of pasting a key.
- "Local model": Ollama, LM Studio, llama.cpp and others running on your own computer.
- "Custom endpoint": any server that speaks one of the supported formats, such as OpenAI-compatible.

A connection reads "Connected" once it has a key (or needs none) and "Needs key" otherwise. That is not a test that the model works. Keys are stored on this computer only.

## Choosing which models show up

One connection can bring hundreds of models. In the list below the connections:

- Tick the models the pickers should show. If nothing is ticked, all show.
- Star the ones you switch between. These form the "Quick switch" and come first in model pickers, in Molfar's chats and in apps.
- Use the sliders icon to open a model's own settings.

## Per-model settings

A model's settings include its context window, max output tokens, reasoning, prices (in dollars per million tokens), a prompt cache check and the sampling parameters such as penalties and Min P. "Recommended settings" can fill in sensible values, and Revert goes back. Separate blocks can apply to Molfar, to chat replies in apps, or to an individual plugin. Fields you leave off are not sent.

## Vision model

Apps send pictures to this model, for example to describe a character from a portrait. "Auto" takes the cheapest model that can read pictures. If none of yours can, add a connection with one.

## Images

"Images" in Settings sets up picture generation for every app. You can add image models from your connections, or image servers: a ComfyUI, an AUTOMATIC1111 or Forge server started with its API on, or any service with an images endpoint. Starred image models become favorites. Molfar picks among them by what each is for, and Roleplay lists them first in its picker.

## Speech

"Speech" gives text-to-speech to every app. Free Edge voices work out of the box; each has a "Test" button. You can also "Add endpoint" for a speech service (OpenAI, Groq or a local server) with a model name, a default voice and a key.

## Cost and small models

- Molfar shows a cost estimate before big tasks and paid pictures. See "Cost checks" in Settings, Molfar.
- A model with a small context window can drown in Molfar's full instructions. "Small-model mode" sends a shorter prompt. Its default, Auto, switches on at 32k tokens or less, or when the size is unknown.

See also [[settings]] and [[first-steps]].
