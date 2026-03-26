# API Key Configuration

Heya uses Google's Gemini models to power its AI agents. To use the application, you must provide your own API key.

## How to get a Gemini API Key
1. Visit the [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a new API key.
3. Copy the key.

## Adding the key to Heya
1. Open **Settings** in the bottom left corner.
2. Navigate to the **API Keys** tab.
3. Paste your key into the Google Gemini field and click **Save**.

## Security
Your API keys are stored securely in your private user document in Firestore. They are only used to make requests to the Gemini API on your behalf.
