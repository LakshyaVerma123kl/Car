# Learnings from the DriveAI Challenge

Building an AI that not only talks but genuinely "drives" the UI of a website was a fascinating challenge that pushed me to rethink how frontend state interacts with backend AI logic.

## What Was New to Me

1. **LLM Function Calling (Tools)**
   Prior to this challenge, I had mostly used LLMs for generating text (chatbots, summarization). Exposing my React component's internal state setters (like `setFilteredModels` or `scrollToSection`) directly to the LLM via a structured JSON schema was entirely new. It felt like bridging the gap between a pure text interface and a graphical user interface.

2. **Two-Step AI Interaction Loop**
   I initially thought the AI would just return a tool call and I would execute it. I quickly realized that to make it feel like a *conversation*, I had to execute the tool in React, take the result (e.g., "Filtered 2 SUVs"), and send it *back* to the LLM in a follow-up request so it could generate a natural-sounding confirmation message ("I've updated the grid to show our SUVs under 20 lakhs"). Handling this asynchronous flow cleanly in React without causing weird UI jumps was a great learning experience.

## How I Figured It Out

- **Documentation**: I heavily relied on the [Google Gemini API Documentation for Function Calling](https://ai.google.dev/gemini-api/docs/function-calling). Their examples on how to structure the `tools` array and handle the `functionCall` and `functionResponse` roles were crucial.
- **Trial and Error**: My first attempt at the prompt resulted in the LLM trying to filter cars that didn't exist in my dummy data. I had to iteratively refine the `systemInstruction` to explicitly tell the AI what cars existed and what its role was.

## Challenges & Trade-offs

- **Security vs. Simplicity**: The constraints of the challenge (free tiers, simple submission) led me to put the API call logic directly in the React frontend. I know this is a bad practice for production (as it exposes the API key). If I were building this for real, I would definitely proxy these requests through a Vercel Serverless Function or an Express backend. 
- **Vanilla CSS vs. Frameworks**: Being restricted from Tailwind forced me to revisit CSS Variables and native flexbox/grid. Building a glassmorphism UI from scratch was surprisingly refreshing and resulted in highly performant, clean code, even if it took slightly longer than just chaining utility classes.

This challenge was incredibly fun and fundamentally changed how I view the future of web interfaces—moving from point-and-click to intent-driven navigation.
