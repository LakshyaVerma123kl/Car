# DriveAI - AI-Navigated Car Dealership

A fully functional, single-page car dealership website for a fictional brand ("AeroMotors"), featuring a persistent AI assistant that not only chats but seamlessly navigates and manipulates the page content based on user queries.

## Live Demo
[Insert Vercel URL Here]

## Stack Choices & Architecture
- **Frontend**: Vite + React + TypeScript
  - *Why?* React provides excellent state management, which is crucial for handling the UI updates (filtering grids, updating comparisons, pre-filling forms) driven by the AI assistant. Vite ensures a fast, modern build process.
- **Styling**: Vanilla CSS with a Premium Design System
  - *Why?* To maintain complete control over custom micro-animations (like the AI highlight pulse) and glassmorphism effects without relying on utility classes, ensuring a bespoke premium aesthetic.
- **AI Integration**: Google Gemini API (gemini-2.5-flash)
  - *Why?* Gemini offers robust "Function Calling" (Tools) out of the box, allowing the AI to output structured data that the React application can execute to change state and scroll the page.

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd driveai
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   Create a `.env.local` file in the root directory and add your Google Gemini and Groq API keys:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

*Note on Security*: For the purpose of this assignment and zero-cost constraints, the Gemini API is called directly from the frontend using the Vite environment variable. In a real-world production application, these requests would be routed through a backend or Vercel Serverless Function to secure the API key.

## Handled Query Types & Examples

The AI assistant can handle 6 distinct types of UI-manipulating queries:

1. **Filtering the Grid**
   - *"Show me your SUVs under 20 lakhs"*
   - *"Do you have any sedans?"*
2. **Comparing Models**
   - *"Compare your top two models"*
   - *"Compare the Aether SUV and Nova Coupe"*
3. **Pre-filling Booking Form**
   - *"I'd like to book a test drive for your flagship model this Saturday in Kochi"*
   - *"Book the Nova Coupe for tomorrow"*
4. **Highlighting Recommendations**
   - *"Which car is best for a family of five?"* (Highlights the Aether SUV)
5. **Changing Currency**
   - *"Show me prices in dollars"*
   - *"Switch to INR"*
6. **General Navigation**
   - *"Take me to the features section"*
   - *"Where are the contact details?"*

## Next Steps (If I had another week)
- Move the Gemini API calls to a secure Vercel Serverless function (`api/chat.ts`).
- Add a 3D car configurator (using Three.js/React Three Fiber) allowing users to say "Change the car color to red" and see it update live.
- Add voice input recognition to let users speak to the assistant directly.
