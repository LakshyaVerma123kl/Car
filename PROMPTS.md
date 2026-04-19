# AI Coding Assistant Prompts

Here are the key prompts used during the development of this challenge and how the AI assistant performed:

1. **Prompt**: "Create a Vite + React + TypeScript project with a premium dark mode UI, using vanilla CSS with glassmorphism effects for a car dealership. Include a Hero section and a Grid of 4 cars."
   - **Result**: Worked mostly well on the first try. I had to manually adjust some CSS variables and gradient animations to make it feel less generic and more 'premium' (adding specific hex codes and tweaking box shadows).

2. **Prompt**: "Write a dummy data file for 4 futuristic electric cars (SUV, Sedan, Coupe, Hypercar) with properties: id, name, type, price in lakhs, range, acceleration, seating, and an unsplash image URL."
   - **Result**: Worked perfectly. The AI selected great dummy Unsplash URLs and logical specs.

3. **Prompt**: "How do I implement Function Calling in the new `@google/genai` SDK in a React application to trigger state changes?"
   - **Result**: The AI provided the new syntax, but considering the constraints and simplicity needed, I prompted it again to use the raw `fetch` to the REST API for maximum stability and zero-dependency risk.

4. **Prompt**: "Create a React component for an AI chat widget that floats in the bottom right corner. It needs to handle a conversation history and use the Gemini API. Expose the `tools` array with a function schema for `filterModels` taking maxPrice and carType."
   - **Result**: Mostly worked, but the AI initially tried to mutate the `allCars` array directly. I had to correct it to maintain an `allCars` prop and a `filteredModels` state in the parent `App.tsx`.

5. **Prompt**: "Write the exact JSON schema for a Gemini Tool declaration that handles scrolling to sections (hero, models, comparison) and pre-filling a form (modelName, date, city)."
   - **Result**: Worked perfectly on the first try. The schema was exactly what the Gemini API required.

6. **Prompt**: "Update the AI Widget so that when a tool call is returned by Gemini, the React app executes it, updates the state, and then sends the result BACK to Gemini so the AI can formulate a natural language response like 'I have filtered the cars for you'."
   - **Result**: Required some debugging. The AI initially forgot to include the original conversation history in the second request, causing the model to lose context. I fixed this by appending the `functionResponse` message to the `contents` array correctly.
